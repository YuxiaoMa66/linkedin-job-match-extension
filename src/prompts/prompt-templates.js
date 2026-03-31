/**
 * Prompt templates used by the matching engine.
 */

export const MATCH_PROMPT_VERSION = 'v4';

export function buildMatchingPrompt(jdData, resumeText, isNetherlands, sponsorshipContext, scoringProfile) {
  const weightsApplied = scoringProfile?.weightsApplied || {};
  const includeSponsorshipInScore = scoringProfile?.includeSponsorshipInScore === true;
  const hasCustomPromptTemplate = typeof scoringProfile?.customPromptTemplate === 'string'
    && scoringProfile.customPromptTemplate.trim().length > 0;
  const activeWeights = Object.entries(weightsApplied)
    .map(([itemName, weight]) => `- ${itemName}: ${Number(weight).toFixed(3)}`)
    .join('\n');

  const tuningInstructions = hasCustomPromptTemplate
    ? scoringProfile.customPromptTemplate.trim()
    : getPromptTuningInstructions(scoringProfile?.promptTuningMode);
  const additionalInstructions = scoringProfile?.additionalPromptInstructions
    ? `\nAdditional user instructions:\n${scoringProfile.additionalPromptInstructions}`
    : '';

  const sponsorshipInstructions = isNetherlands && includeSponsorshipInScore
    ? `
This is a Netherlands role, and the candidate needs employer sponsorship.
You must include "Sponsorship Fit" in matchBreakdown and treat sponsorship viability as relevant to overall fit.

Use this precomputed IND sponsorship context:
${sponsorshipContext || 'No sponsorship context available.'}

Rules for Sponsorship Fit:
- itemName must be exactly "Sponsorship Fit"
- sponsorshipSignal should usually be "included" unless data is clearly unavailable
- include at least one evidence string containing "[SPONSORSHIP-HIGHLIGHT]"
- include at least one prosCons.strengths or prosCons.gaps entry containing "[SPONSORSHIP-HIGHLIGHT]"

Rules for sponsorshipAssessment:
- country must be "Netherlands"
- conclusion must be a short sentence
- confidence must be "high", "medium", or "low"
- sponsorshipImpactOnOverall must be one of "increase", "noChange", "decrease", "onlyLowerConfidence"
- indRegistered may be true, false, or null`
    : `
This is not a Netherlands role.
- Do not include "Sponsorship Fit" in matchBreakdown
- sponsorshipAssessment must still be present with a neutral conclusion
- set sponsorshipImpactOnOverall to "noChange"
- set indRegistered to null`;

  const sponsorshipExclusionInstructions = isNetherlands && !includeSponsorshipInScore
    ? `
This is a Netherlands role, but the candidate does not need employer sponsorship for this run.

Rules:
- Do not include "Sponsorship Fit" in matchBreakdown
- sponsorshipAssessment must still be present and may describe sponsorship evidence
- sponsorshipImpactOnOverall must be "noChange"
- make it clear in the conclusion or evidence that sponsorship was not needed for this evaluation`
    : '';

  const systemPrompt = `You are a strict job match scoring engine.

Return exactly one valid JSON object.
Do not wrap the JSON in markdown.
Do not add any explanation before or after the JSON.

Required top-level keys:
- overallMatchPercent
- matchBreakdown
- strengths
- gaps
- sponsorshipAssessment

matchBreakdown must be an array of objects, and each object must include:
- itemName
- score
- weight
- evidence
- prosCons
- confidenceImpact
- sponsorshipSignal

Allowed item names:
- Skills & Experience Relevance
- Responsibility Coverage
- Years of Experience
- Education & Certifications
- Language & Location
- Sponsorship Fit

Rules:
1. score must be an integer from 0 to 100.
2. weight must be a positive decimal.
3. evidence must quote or closely reference specific resume or JD content.
4. Never invent facts that are not supported by the resume or JD.
5. If evidence is partial or uncertain, set confidenceImpact to "lower".
6. confidenceImpact must be one of "raise", "lower", "none".
7. sponsorshipSignal must be one of "included", "notIncluded", "unavailable".
8. strengths and gaps must be concise global summary bullets.
9. If data is missing, use empty arrays, null, or a cautious explanation.
10. Follow the requested analysis style while still grounding every claim in the resume and JD.

Scoring guidance:
- Skills & Experience Relevance: compare required and preferred skills with the resume.
- Responsibility Coverage: compare JD responsibilities with demonstrated experience.
- Years of Experience: if the JD does not explicitly state a years requirement, use a cautious estimate and set confidenceImpact to "lower".
- Education & Certifications: evaluate degree fit, field fit, and certifications.
- Language & Location: evaluate language fit and location fit. If the role is clearly remote, do not over-penalize location.

Active weights:
${activeWeights}

Analysis style guidance:
${tuningInstructions}

${sponsorshipInstructions}
${sponsorshipExclusionInstructions}

Output JSON shape:
{
  "overallMatchPercent": 0,
  "matchBreakdown": [
    {
      "itemName": "Skills & Experience Relevance",
      "score": 0,
      "weight": 0.30,
      "evidence": ["..."],
      "prosCons": {
        "strengths": ["..."],
        "gaps": ["..."]
      },
      "confidenceImpact": "none",
      "sponsorshipSignal": "unavailable"
    }
  ],
  "strengths": ["..."],
  "gaps": ["..."],
  "sponsorshipAssessment": {
    "conclusion": "...",
    "evidence": ["..."],
    "confidence": "low",
    "uncertaintyNote": "...",
    "sponsorshipImpactOnOverall": "onlyLowerConfidence",
    "country": "Unknown",
    "indRegistered": null
  }
}`;

  const userPrompt = `Job title: ${jdData.title || 'Unknown'}
Company: ${jdData.company || 'Unknown'}
Location: ${jdData.location || 'Unknown'}

Job description:
${jdData.description || 'No job description available.'}

Resume:
${resumeText || 'No resume available.'}

Selected scoring preset: ${scoringProfile?.analysisPreset || 'balanced'}
Prompt tuning mode: ${scoringProfile?.promptTuningMode || scoringProfile?.analysisPreset || 'balanced'}
Custom weights enabled: ${scoringProfile?.isCustomProfile === true ? 'yes' : 'no'}
Candidate needs sponsorship: ${includeSponsorshipInScore ? 'yes' : 'no'}
${additionalInstructions}

Return the JSON object only.`;

  return { systemPrompt, userPrompt };
}

export function getPromptTuningInstructions(mode = 'balanced') {
  switch (mode) {
    case 'strict':
      return `Treat missing must-have requirements conservatively.
- Penalize missing core skills more strongly.
- Be stricter about explicit years-of-experience requirements.
- Do not inflate fit based on vague transferable potential alone.`;
    case 'potential':
      return `Favor growth potential when evidence supports it.
- Give more credit to transferable responsibilities and adjacent skills.
- Do not over-penalize limited years of experience when the JD does not require strict seniority.
- Surface upside in strengths when the candidate can plausibly grow into the role.`;
    case 'sponsorship-first':
      return `Prioritize sponsorship viability for Netherlands roles.
- Make sponsorship and KM evidence more prominent in strengths and gaps.
- Treat unclear sponsorship signals as an important source of uncertainty.
- Do not let a strong profile completely hide sponsorship risk.`;
    case 'balanced':
    default:
      return `Keep the evaluation balanced and practical.
- Compare skills, responsibilities, experience, language, and sponsorship without over-indexing on one dimension.
- Avoid extreme penalties unless the JD clearly requires them.`;
  }
}

export function buildResumeExtractionPrompt(resumeText) {
  const systemPrompt = `You are a resume extraction engine. Return valid JSON only.
{
  "name": "string",
  "skills": ["string"],
  "experience": [{ "title": "string", "company": "string", "duration": "string", "description": "string" }],
  "education": [{ "degree": "string", "field": "string", "institution": "string", "year": "string" }],
  "certifications": ["string"],
  "languages": [{ "language": "string", "level": "string" }],
  "totalYearsExperience": null
}
If a field is unknown, use [] or null. Do not invent facts.`;

  return { systemPrompt, userPrompt: resumeText };
}

export function buildJDExtractionPrompt(jdText) {
  const systemPrompt = `You are a job description extraction engine. Return valid JSON only.
{
  "title": "string",
  "company": "string",
  "location": "string",
  "country": "string",
  "requiredSkills": { "mustHave": ["string"], "niceToHave": ["string"] },
  "responsibilities": ["string"],
  "yearsRequired": null,
  "educationRequired": null,
  "languageRequirements": [{ "language": "string", "level": "string" }],
  "mentionsSponsorshipOrVisa": false,
  "sponsorshipKeywords": ["string"],
  "isRemote": false
}
If a field is unknown, use [] or null. Do not invent facts.`;

  return { systemPrompt, userPrompt: jdText };
}
