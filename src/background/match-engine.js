import { callLLM } from './llm-adapter.js';
import { isNetherlands, buildSponsorshipContext } from './sponsor-checker.js';
import { buildMatchingPrompt } from '../prompts/prompt-templates.js';
import { validateAndRepair, safeParseJSON, buildFallbackResult } from '../shared/schema-validator.js';
import { computeDegradation, applyPenalty, getTriggersForItem, buildDegradationEvidence } from '../shared/degradation.js';
import {
  DegradationTrigger,
  ConfidenceImpact,
  WEIGHTS_WITH_SPONSOR,
  WEIGHTS_NO_SPONSOR,
  ItemNames,
} from '../shared/constants.js';

export async function runAnalysis(jdData, resumeText, modelConfig, onProgress = () => {}) {
  const triggers = [];

  onProgress('validation', 'Validating the job description and resume...');

  if (!jdData?.description || jdData.description.length < 50) {
    triggers.push(DegradationTrigger.JD_EXTRACT_FAIL);
    if (!jdData?.description) {
      return wrapWithMetadata(
        buildFallbackResult('Job description extraction failed.'),
        modelConfig,
        triggers,
        0,
      );
    }
  }

  if (!resumeText || resumeText.length < 50) {
    triggers.push(DegradationTrigger.RESUME_PARSE_FAIL);
    if (!resumeText) {
      return wrapWithMetadata(
        buildFallbackResult('Resume parsing failed.'),
        modelConfig,
        triggers,
        0,
      );
    }
  }

  onProgress('detection', 'Checking whether this role is in the Netherlands...');
  const nlJob = isNetherlands(jdData.location, jdData.description);
  let sponsorshipSnapshot = null;

  if (nlJob) {
    onProgress('sponsorship', 'Checking the IND recognized sponsor registry...');
    try {
      sponsorshipSnapshot = await buildSponsorshipContext(
        jdData.company,
        jdData.location,
        jdData.description,
      );
    } catch (error) {
      triggers.push(DegradationTrigger.SPONSOR_DATA_UNAVAIL);
      sponsorshipSnapshot = {
        contextText: `IND lookup failed: ${error.message}`,
        registry: null,
        keywords: [],
        kmEligible: false,
        displayLabel: null,
      };
    }
  }

  onProgress('analysis', 'Calling the AI model...');
  const { systemPrompt, userPrompt } = buildMatchingPrompt(
    jdData,
    resumeText,
    nlJob,
    sponsorshipSnapshot?.contextText || null,
  );

  let llmResponse;
  try {
    llmResponse = await callLLM(modelConfig, { systemPrompt, userPrompt });
  } catch (error) {
    triggers.push(DegradationTrigger.MODEL_NO_OUTPUT);
    return wrapWithMetadata(
      buildFallbackResult(`AI model call failed: ${error.message}`),
      modelConfig,
      triggers,
      0,
    );
  }

  if (llmResponse.finishReason === 'length') {
    triggers.push(DegradationTrigger.MODEL_TRUNCATED);
  }

  onProgress('parsing', 'Parsing the AI response...');
  let parsed = safeParseJSON(llmResponse.content);

  if (!parsed) {
    onProgress('retry', 'First parse failed, retrying once...');
    try {
      const retryConfig = { ...modelConfig, temperature: modelConfig.temperature + 0.05 };
      const retryResponse = await callLLM(retryConfig, { systemPrompt, userPrompt });
      parsed = safeParseJSON(retryResponse.content);
    } catch {
      // Retry is best effort.
    }

    if (!parsed) {
      triggers.push(DegradationTrigger.MODEL_NO_OUTPUT);
      return wrapWithMetadata(
        buildFallbackResult('AI returned a response that could not be parsed as JSON.'),
        modelConfig,
        triggers,
        0,
      );
    }
  }

  const { valid, data } = validateAndRepair(parsed);
  if (!valid) {
    triggers.push(DegradationTrigger.MODEL_FIELD_MISSING);
  }

  for (const item of data.matchBreakdown) {
    if (!item.evidence || item.evidence.length === 0) {
      triggers.push(DegradationTrigger.MODEL_NO_EVIDENCE);
      break;
    }
  }

  onProgress('scoring', 'Calculating the final score...');
  const degradation = computeDegradation(triggers);

  for (const item of data.matchBreakdown) {
    const itemTriggers = getTriggersForItem(item.itemName, triggers);
    if (!itemTriggers.length) {
      continue;
    }

    item.confidenceImpact = ConfidenceImpact.LOWER;
    for (const trigger of itemTriggers) {
      const note = buildDegradationEvidence(trigger);
      if (!item.evidence.includes(note)) {
        item.evidence.push(note);
      }
    }
  }

  const rawScore = calculateWeightedScore(data.matchBreakdown, nlJob);
  data.overallMatchPercent = applyPenalty(rawScore, degradation);

  const weights = nlJob ? WEIGHTS_WITH_SPONSOR : WEIGHTS_NO_SPONSOR;
  for (const item of data.matchBreakdown) {
    if (weights[item.itemName] !== undefined) {
      item.weight = weights[item.itemName];
    }
  }

  if (!nlJob) {
    data.matchBreakdown = data.matchBreakdown.filter(item => item.itemName !== ItemNames.SPONSORSHIP);
    if (data.sponsorshipAssessment) {
      data.sponsorshipAssessment.conclusion = 'Not supported';
      data.sponsorshipAssessment.sponsorshipImpactOnOverall = 'noChange';
      data.sponsorshipAssessment.indRegistered = null;
      data.sponsorshipAssessment.kmEligible = false;
    }
    for (const item of data.matchBreakdown) {
      item.sponsorshipSignal = 'unavailable';
    }
  }

  const sponsorshipAssessment = data.sponsorshipAssessment || {};
  if (sponsorshipSnapshot?.registry) {
    sponsorshipAssessment.registryMatchedName = sponsorshipSnapshot.registry.matchedName || null;
    sponsorshipAssessment.registryConfidence = sponsorshipSnapshot.registry.confidence || null;
    sponsorshipAssessment.registryScore = sponsorshipSnapshot.registry.score ?? null;
    sponsorshipAssessment.kmEligible = sponsorshipSnapshot.kmEligible === true;
    if (sponsorshipSnapshot.registry.found) {
      sponsorshipAssessment.indRegistered = true;
    }
  }
  data.sponsorshipAssessment = sponsorshipAssessment;

  onProgress('complete', 'Analysis complete.');
  return wrapWithMetadata(data, modelConfig, triggers, rawScore, jdData);
}

function calculateWeightedScore(breakdown, nlJob) {
  const weights = nlJob ? WEIGHTS_WITH_SPONSOR : WEIGHTS_NO_SPONSOR;
  let total = 0;

  for (const item of breakdown) {
    const weight = weights[item.itemName];
    if (weight !== undefined) {
      total += item.score * weight;
    }
  }

  return Math.round(total);
}

function wrapWithMetadata(data, modelConfig, triggers, rawScore, jdData = null) {
  const degradation = computeDegradation(triggers);

  return {
    ...data,
    metadata: {
      analysisTimestamp: new Date().toISOString(),
      modelUsed: modelConfig.modelId || 'unknown',
      jdLanguage: typeof jdData === 'string' ? jdData : detectJobLanguage(jdData),
      requiredExperience: extractRequiredExperience(jdData),
      requiredLanguages: extractRequiredLanguages(jdData),
      degradationTriggers: [...new Set(triggers)],
      penaltyCoefficient: degradation.penaltyCoefficient,
      capLimit: degradation.capLimit,
      rawScoreBeforePenalty: rawScore,
    },
  };
}

function detectJobLanguage(jdData) {
  const text = `${jdData?.title || ''}\n${jdData?.description || ''}`.trim();
  if (!text) {
    return 'Unknown';
  }

  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'Chinese';
  }

  const scores = [
    { label: 'English', score: countMatches(text, [' the ', ' and ', ' with ', ' for ', ' experience ', ' role ', ' responsibilities ', ' you ', ' your ']) },
    { label: 'Dutch', score: countMatches(text, [' de ', ' het ', ' een ', ' en ', ' van ', ' voor ', ' met ', ' ervaring ', ' werkzaamheden ']) },
    { label: 'German', score: countMatches(text, [' der ', ' die ', ' das ', ' und ', ' mit ', ' fuer ', ' für ', ' erfahrung ', ' aufgaben ']) },
    { label: 'French', score: countMatches(text, [' le ', ' la ', ' les ', ' des ', ' pour ', ' avec ', ' expérience ', ' responsabilit' ]) },
    { label: 'Spanish', score: countMatches(text, [' el ', ' la ', ' los ', ' para ', ' con ', ' experiencia ', ' responsabilidades ']) },
  ];

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].label : 'English';
}

function countMatches(text, patterns) {
  const normalized = ` ${text.toLowerCase()} `;
  return patterns.reduce((sum, pattern) => sum + (normalized.includes(pattern) ? 1 : 0), 0);
}

function extractRequiredExperience(jdData) {
  const text = `${jdData?.title || ''}\n${jdData?.description || ''}`;
  if (!text.trim()) {
    return null;
  }

  const patterns = [
    /(\d+)\s*\+?\s*(?:to|-)\s*(\d+)\s+years?/i,
    /minimum of\s+(\d+)\s+years?/i,
    /at least\s+(\d+)\s+years?/i,
    /(\d+)\+?\s+years?\s+of\s+experience/i,
    /(\d+)\+?\s+years?\s+experience/i,
    /(\d+)\s+years?\s+relevant experience/i,
    /(\d+)\s+yrs?\s+experience/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    if (match[2]) {
      return `${match[1]}-${match[2]}y`;
    }

    return `${match[1]}y+`;
  }

  if (/\bintern(ship)?\b/i.test(text) || /\bgraduate\b/i.test(text) || /\bentry level\b/i.test(text)) {
    return '0-1y';
  }

  return null;
}

function extractRequiredLanguages(jdData) {
  const text = `${jdData?.title || ''}\n${jdData?.description || ''}`.toLowerCase();
  if (!text.trim()) {
    return [];
  }

  const languagePatterns = [
    { label: 'English', patterns: [/\benglish\b/, /\bfluent in english\b/, /\bprofessional english\b/] },
    { label: 'Dutch', patterns: [/\bdutch\b/, /\bnederlands\b/] },
    { label: 'German', patterns: [/\bgerman\b/, /\bdeutsch\b/] },
    { label: 'French', patterns: [/\bfrench\b/, /\bfrancais\b/, /\bfrançais\b/] },
    { label: 'Spanish', patterns: [/\bspanish\b/, /\bespanol\b/, /\bespañol\b/] },
    { label: 'Italian', patterns: [/\bitalian\b/, /\bitaliano\b/] },
    { label: 'Portuguese', patterns: [/\bportuguese\b/, /\bportugues\b/, /\bportuguês\b/] },
    { label: 'Chinese', patterns: [/\bchinese\b/, /\bmandarin\b/, /\bcantonese\b/] },
    { label: 'Japanese', patterns: [/\bjapanese\b/] },
  ];

  const matches = [];
  for (const candidate of languagePatterns) {
    if (candidate.patterns.some(pattern => pattern.test(text))) {
      matches.push(candidate.label);
    }
  }

  return matches.slice(0, 3);
}
