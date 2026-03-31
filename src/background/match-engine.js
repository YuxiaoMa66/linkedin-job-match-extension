import { callLLM } from './llm-adapter.js';
import { isNetherlands, buildSponsorshipContext } from './sponsor-checker.js';
import { buildMatchingPrompt, MATCH_PROMPT_VERSION } from '../prompts/prompt-templates.js';
import { validateAndRepair, safeParseJSON, buildFallbackResult } from '../shared/schema-validator.js';
import { computeDegradation, applyPenalty, getTriggersForItem, buildDegradationEvidence } from '../shared/degradation.js';
import {
  DegradationTrigger,
  ConfidenceImpact,
  ItemNames,
  ScoringPresets,
} from '../shared/constants.js';
import { buildScoringProfile, getEffectiveWeights } from '../shared/scoring-profile.js';

export async function runAnalysis(jdData, resumeText, modelConfig, onProgress = () => {}) {
  const startedAt = Date.now();
  const timings = {
    totalMs: 0,
    extractMs: 0,
    llmMs: 0,
    parseMs: 0,
    repairMs: 0,
    usedRetry: false,
    cacheHit: false,
  };
  const triggers = [];

  onProgress('validation', 'Validating the job description and resume...');

  if (!jdData?.description || jdData.description.length < 50) {
    triggers.push(DegradationTrigger.JD_EXTRACT_FAIL);
    if (!jdData?.description) {
      timings.totalMs = Date.now() - startedAt;
      return wrapWithMetadata(
        buildFallbackResult('Job description extraction failed.'),
        modelConfig,
        triggers,
        0,
        jdData,
        null,
        timings,
      );
    }
  }

  if (!resumeText || resumeText.length < 50) {
    triggers.push(DegradationTrigger.RESUME_PARSE_FAIL);
    if (!resumeText) {
      timings.totalMs = Date.now() - startedAt;
      return wrapWithMetadata(
        buildFallbackResult('Resume parsing failed.'),
        modelConfig,
        triggers,
        0,
        jdData,
        null,
        timings,
      );
    }
  }

  onProgress('detection', 'Checking whether this role is in the Netherlands...');
  const detectionStartedAt = Date.now();
  const nlJob = isNetherlands(jdData.location, jdData.description);
  let sponsorshipSnapshot = null;
  const scoringProfile = buildScoringProfile(modelConfig, nlJob);

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
  timings.extractMs = Date.now() - detectionStartedAt;

  onProgress('analysis', 'Calling the AI model...');
  const { systemPrompt, userPrompt } = buildMatchingPrompt(
    jdData,
    resumeText,
    nlJob,
    sponsorshipSnapshot?.contextText || null,
    scoringProfile,
  );

  let llmResponse;
  try {
    const llmStartedAt = Date.now();
    llmResponse = await callLLM(modelConfig, { systemPrompt, userPrompt });
    timings.llmMs = Date.now() - llmStartedAt;
  } catch (error) {
    triggers.push(DegradationTrigger.MODEL_NO_OUTPUT);
    timings.totalMs = Date.now() - startedAt;
    return wrapWithMetadata(
      buildFallbackResult(`AI model call failed: ${error.message}`),
      modelConfig,
      triggers,
      0,
      jdData,
      scoringProfile,
      timings,
    );
  }

  if (llmResponse.finishReason === 'length') {
    triggers.push(DegradationTrigger.MODEL_TRUNCATED);
  }

  onProgress('parsing', 'Parsing the AI response...');
  const parseStartedAt = Date.now();
  let parsed = safeParseJSON(llmResponse.content);
  timings.parseMs = Date.now() - parseStartedAt;

  if (!parsed) {
    onProgress('retry', 'First parse failed, retrying once...');
    try {
      timings.usedRetry = true;
      const retryConfig = { ...modelConfig, temperature: modelConfig.temperature + 0.05 };
      const retryStartedAt = Date.now();
      const retryResponse = await callLLM(retryConfig, { systemPrompt, userPrompt });
      timings.llmMs += Date.now() - retryStartedAt;
      const retryParseStartedAt = Date.now();
      parsed = safeParseJSON(retryResponse.content);
      timings.parseMs += Date.now() - retryParseStartedAt;
    } catch {
      // Retry is best effort.
    }

    if (!parsed) {
      triggers.push(DegradationTrigger.MODEL_NO_OUTPUT);
      timings.totalMs = Date.now() - startedAt;
      return wrapWithMetadata(
        buildFallbackResult('AI returned a response that could not be parsed as JSON.'),
        modelConfig,
        triggers,
        0,
        jdData,
        scoringProfile,
        timings,
      );
    }
  }

  const repairStartedAt = Date.now();
  const { valid, data } = validateAndRepair(parsed);
  timings.repairMs = Date.now() - repairStartedAt;
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
  const weights = getEffectiveWeights(modelConfig, scoringProfile.includeSponsorshipInScore === true);

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

  const rawScore = calculateWeightedScore(data.matchBreakdown, weights);
  data.overallMatchPercent = applyPenalty(rawScore, degradation);

  for (const item of data.matchBreakdown) {
    if (weights[item.itemName] !== undefined) {
      item.weight = weights[item.itemName];
    }
  }

  if (!nlJob || scoringProfile.includeSponsorshipInScore !== true) {
    data.matchBreakdown = data.matchBreakdown.filter(item => item.itemName !== ItemNames.SPONSORSHIP);
    if (data.sponsorshipAssessment && !nlJob) {
      data.sponsorshipAssessment.conclusion = 'Not supported';
      data.sponsorshipAssessment.sponsorshipImpactOnOverall = 'noChange';
      data.sponsorshipAssessment.indRegistered = null;
      data.sponsorshipAssessment.kmEligible = false;
    }
    if (data.sponsorshipAssessment && nlJob && scoringProfile.includeSponsorshipInScore !== true) {
      data.sponsorshipAssessment.sponsorshipImpactOnOverall = 'noChange';
      data.sponsorshipAssessment.uncertaintyNote = 'The candidate marked sponsorship as not needed for this evaluation, so it was excluded from scoring.';
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
  applyDeterministicSponsorshipOutcome(data, scoringProfile, sponsorshipSnapshot, nlJob);
  applySponsorshipRequirementGate(data, scoringProfile, sponsorshipSnapshot, nlJob);

  onProgress('complete', 'Analysis complete.');
  timings.totalMs = Date.now() - startedAt;
  return wrapWithMetadata(data, modelConfig, triggers, rawScore, jdData, scoringProfile, timings);
}

function applySponsorshipRequirementGate(data, scoringProfile, sponsorshipSnapshot, nlJob) {
  if (
    !nlJob
    || scoringProfile?.includeSponsorshipInScore !== true
    || scoringProfile?.analysisPreset !== ScoringPresets.SPONSORSHIP_FIRST
  ) {
    return;
  }

  const sponsorshipDecision = getDeterministicSponsorshipDecision(sponsorshipSnapshot);
  const confidentNoSponsorMatch = sponsorshipDecision.hardBlock === true;

  if (!confidentNoSponsorMatch) {
    return;
  }

  data.overallMatchPercent = 0;

  const sponsorshipAssessment = data.sponsorshipAssessment || {};
  sponsorshipAssessment.conclusion = sponsorshipDecision.conclusion;
  sponsorshipAssessment.sponsorshipImpactOnOverall = 'decrease';
  sponsorshipAssessment.indRegistered = false;
  sponsorshipAssessment.kmEligible = false;
  sponsorshipAssessment.uncertaintyNote = sponsorshipDecision.note || 'Because sponsorship is required and the registry check strongly suggests the employer is not a recognized sponsor, the overall match was forced to 0.';
  sponsorshipAssessment.evidence = Array.isArray(sponsorshipAssessment.evidence) ? sponsorshipAssessment.evidence : [];
  if (!sponsorshipAssessment.evidence.includes(sponsorshipDecision.evidenceLine)) {
    sponsorshipAssessment.evidence.push(sponsorshipDecision.evidenceLine);
  }
  data.sponsorshipAssessment = sponsorshipAssessment;

  const sponsorshipItem = Array.isArray(data.matchBreakdown)
    ? data.matchBreakdown.find(item => item.itemName === ItemNames.SPONSORSHIP)
    : null;

  if (sponsorshipItem) {
    sponsorshipItem.score = 0;
    sponsorshipItem.confidenceImpact = 'lower';
    sponsorshipItem.evidence = Array.isArray(sponsorshipItem.evidence) ? sponsorshipItem.evidence : [];
    sponsorshipItem.prosCons = sponsorshipItem.prosCons || { strengths: [], gaps: [] };
    sponsorshipItem.prosCons.gaps = Array.isArray(sponsorshipItem.prosCons.gaps) ? sponsorshipItem.prosCons.gaps : [];
    if (!sponsorshipItem.evidence.includes(`[SPONSORSHIP-HIGHLIGHT] ${sponsorshipDecision.evidenceLine}`)) {
      sponsorshipItem.evidence.push(`[SPONSORSHIP-HIGHLIGHT] ${sponsorshipDecision.evidenceLine}`);
    }
    if (!sponsorshipItem.prosCons.gaps.includes(`[SPONSORSHIP-HIGHLIGHT] ${sponsorshipDecision.gapLine}`)) {
      sponsorshipItem.prosCons.gaps.push(`[SPONSORSHIP-HIGHLIGHT] ${sponsorshipDecision.gapLine}`);
    }
  }

  data.gaps = Array.isArray(data.gaps) ? data.gaps : [];
  if (!data.gaps.includes(sponsorshipDecision.gapLine)) {
    data.gaps.unshift(sponsorshipDecision.gapLine);
  }
}

function applyDeterministicSponsorshipOutcome(data, scoringProfile, sponsorshipSnapshot, nlJob) {
  if (!nlJob || scoringProfile?.includeSponsorshipInScore !== true) {
    return;
  }

  const sponsorshipItem = Array.isArray(data.matchBreakdown)
    ? data.matchBreakdown.find(item => item.itemName === ItemNames.SPONSORSHIP)
    : null;

  if (!sponsorshipItem) {
    return;
  }

  const decision = getDeterministicSponsorshipDecision(sponsorshipSnapshot);
  sponsorshipItem.score = decision.score;
  sponsorshipItem.sponsorshipSignal = 'included';
  sponsorshipItem.confidenceImpact = decision.confidenceImpact;
  sponsorshipItem.evidence = Array.isArray(sponsorshipItem.evidence) ? sponsorshipItem.evidence : [];
  sponsorshipItem.prosCons = sponsorshipItem.prosCons || { strengths: [], gaps: [] };
  sponsorshipItem.prosCons.strengths = Array.isArray(sponsorshipItem.prosCons.strengths) ? sponsorshipItem.prosCons.strengths : [];
  sponsorshipItem.prosCons.gaps = Array.isArray(sponsorshipItem.prosCons.gaps) ? sponsorshipItem.prosCons.gaps : [];

  if (!sponsorshipItem.evidence.includes(`[SPONSORSHIP-HIGHLIGHT] ${decision.evidenceLine}`)) {
    sponsorshipItem.evidence.push(`[SPONSORSHIP-HIGHLIGHT] ${decision.evidenceLine}`);
  }

  if (decision.score >= 100) {
    if (!sponsorshipItem.prosCons.strengths.includes(`[SPONSORSHIP-HIGHLIGHT] ${decision.strengthLine}`)) {
      sponsorshipItem.prosCons.strengths.push(`[SPONSORSHIP-HIGHLIGHT] ${decision.strengthLine}`);
    }
  } else {
    if (!sponsorshipItem.prosCons.gaps.includes(`[SPONSORSHIP-HIGHLIGHT] ${decision.gapLine}`)) {
      sponsorshipItem.prosCons.gaps.push(`[SPONSORSHIP-HIGHLIGHT] ${decision.gapLine}`);
    }
  }

  const assessment = data.sponsorshipAssessment || {};
  assessment.conclusion = decision.conclusion;
  assessment.confidence = decision.confidence;
  assessment.sponsorshipImpactOnOverall = decision.impact;
  assessment.evidence = Array.isArray(assessment.evidence) ? assessment.evidence : [];
  if (!assessment.evidence.includes(decision.evidenceLine)) {
    assessment.evidence.push(decision.evidenceLine);
  }
  if (decision.note) {
    assessment.uncertaintyNote = decision.note;
  }
  if (decision.indRegistered !== undefined) {
    assessment.indRegistered = decision.indRegistered;
  }
  assessment.kmEligible = decision.kmEligible;
  data.sponsorshipAssessment = assessment;
}

function getDeterministicSponsorshipDecision(sponsorshipSnapshot) {
  const registry = sponsorshipSnapshot?.registry || null;
  const hasPositiveKeywords = Array.isArray(sponsorshipSnapshot?.keywords) && sponsorshipSnapshot.keywords.length > 0;
  const hasNegativeKeywords = Array.isArray(sponsorshipSnapshot?.noSponsorshipKeywords) && sponsorshipSnapshot.noSponsorshipKeywords.length > 0;
  const registryFound = registry?.found === true;
  const registryConfidence = registry?.confidence || 'low';

  if (registryFound && hasNegativeKeywords) {
    return {
      score: 0,
      confidence: 'high',
      impact: 'decrease',
      confidenceImpact: 'lower',
      indRegistered: true,
      kmEligible: true,
      hardBlock: true,
      conclusion: 'The employer appears in the IND register, but the job description says sponsorship is not offered.',
      evidenceLine: 'The employer matches the IND register, but the JD explicitly says sponsorship is not offered.',
      gapLine: 'You marked sponsorship as required, but this job explicitly says sponsorship is not offered.',
      strengthLine: '',
      note: 'Registry status is positive, but the JD explicitly overrides it by saying sponsorship is not provided.',
    };
  }

  if (!registryFound && hasNegativeKeywords) {
    return {
      score: 0,
      confidence: 'high',
      impact: 'decrease',
      confidenceImpact: 'lower',
      indRegistered: false,
      kmEligible: false,
      hardBlock: true,
      conclusion: 'The job description explicitly says sponsorship is not offered, and the employer was not confirmed in the IND register.',
      evidenceLine: 'The JD explicitly says sponsorship is not offered, and the IND register did not confirm the employer as a recognized sponsor.',
      gapLine: 'You marked sponsorship as required, but this job explicitly says sponsorship is not offered and the employer was not confirmed as a recognized sponsor.',
      strengthLine: '',
      note: 'Explicit no-sponsorship language in the JD overrides weaker positive wording.',
    };
  }

  if (registryFound) {
    return {
      score: 100,
      confidence: registryConfidence === 'low' ? 'medium' : registryConfidence,
      impact: 'increase',
      confidenceImpact: 'raise',
      indRegistered: true,
      kmEligible: true,
      hardBlock: false,
      conclusion: 'The employer appears to be a recognized sponsor for candidates who need sponsorship.',
      evidenceLine: 'The employer matches the IND recognized sponsor register.',
      gapLine: '',
      strengthLine: 'The employer appears to support sponsorship for candidates who need it.',
      note: hasPositiveKeywords ? 'The JD also contains positive sponsorship language.' : '',
    };
  }

  if (!registryFound && hasPositiveKeywords) {
    return {
      score: 25,
      confidence: registryConfidence === 'high' ? 'medium' : 'low',
      impact: 'onlyLowerConfidence',
      confidenceImpact: 'lower',
      indRegistered: false,
      kmEligible: false,
      hardBlock: false,
      conclusion: 'The JD suggests sponsorship support, but the employer was not confirmed in the IND register.',
      evidenceLine: 'The JD contains sponsorship-friendly language, but the IND register did not confirm the employer as a recognized sponsor.',
      gapLine: 'Sponsorship support is unclear because the JD is positive but the registry match is negative.',
      strengthLine: '',
      note: 'Conflicting sponsorship signals were found between the JD and the IND register.',
    };
  }

  return {
    score: 0,
    confidence: registryConfidence === 'high' ? 'high' : 'medium',
    impact: 'decrease',
    confidenceImpact: 'lower',
    indRegistered: false,
    kmEligible: false,
    hardBlock: registryConfidence === 'high',
    conclusion: 'The employer does not appear to be a recognized sponsor for a candidate who needs sponsorship.',
    evidenceLine: 'The IND register did not confirm this employer as a recognized sponsor.',
    gapLine: 'You marked sponsorship as required, and this employer does not appear to be a recognized sponsor.',
    strengthLine: '',
    note: registryConfidence === 'high'
      ? 'The registry check strongly suggests the employer is not a recognized sponsor.'
      : 'The registry did not confirm sponsorship support for this employer.',
  };
}

function calculateWeightedScore(breakdown, weights) {
  let total = 0;

  for (const item of breakdown) {
    const weight = weights[item.itemName];
    if (weight !== undefined) {
      total += item.score * weight;
    }
  }

  return Math.round(total);
}

function wrapWithMetadata(data, modelConfig, triggers, rawScore, jdData = null, scoringProfile = null, timings = null) {
  const degradation = computeDegradation(triggers);
  const effectiveScoringProfile = scoringProfile || buildScoringProfile(modelConfig, true);

  return {
    ...data,
    metadata: {
      analysisTimestamp: new Date().toISOString(),
      modelUsed: modelConfig.modelId || 'unknown',
      modelKey: `${modelConfig.provider || 'unknown'}::${modelConfig.modelId || 'unknown'}`,
      jdLanguage: typeof jdData === 'string' ? jdData : detectJobLanguage(jdData),
      requiredExperience: extractRequiredExperience(jdData),
      requiredLanguages: extractRequiredLanguages(jdData),
      analysisPreset: effectiveScoringProfile.analysisPreset,
      promptTuningMode: effectiveScoringProfile.promptTuningMode,
      isCustomProfile: effectiveScoringProfile.isCustomProfile === true,
      includeSponsorshipInScore: effectiveScoringProfile.includeSponsorshipInScore === true,
      weightsApplied: effectiveScoringProfile.weightsApplied,
      promptVersion: MATCH_PROMPT_VERSION,
      degradationTriggers: [...new Set(triggers)],
      penaltyCoefficient: degradation.penaltyCoefficient,
      capLimit: degradation.capLimit,
      rawScoreBeforePenalty: rawScore,
      timing: modelConfig.enableDiagnostics === false ? null : (timings || null),
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
