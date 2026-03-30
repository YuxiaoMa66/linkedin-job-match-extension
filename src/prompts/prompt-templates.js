/**
 * Prompt templates used by the matching engine.
 */

export function buildMatchingPrompt(jdData, resumeText, isNetherlands, sponsorshipContext) {
  const activeWeights = isNetherlands
    ? `
- Skills & Experience Relevance: 0.30
- Responsibility Coverage: 0.25
- Years of Experience: 0.15
- Education & Certifications: 0.15
- Language & Location: 0.10
- Sponsorship Fit: 0.05`
    : `
- Skills & Experience Relevance: 0.316
- Responsibility Coverage: 0.263
- Years of Experience: 0.158
- Education & Certifications: 0.158
- Language & Location: 0.105`;

  const sponsorshipInstructions = isNetherlands
    ? `
This is a Netherlands role. You must include "Sponsorship Fit" in matchBreakdown.

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

Scoring guidance:
- Skills & Experience Relevance: compare required and preferred skills with the resume.
- Responsibility Coverage: compare JD responsibilities with demonstrated experience.
- Years of Experience: if the JD does not explicitly state a years requirement, use a cautious estimate and set confidenceImpact to "lower".
- Education & Certifications: evaluate degree fit, field fit, and certifications.
- Language & Location: evaluate language fit and location fit. If the role is clearly remote, do not over-penalize location.

Active weights:
${activeWeights}

${sponsorshipInstructions}

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

Return the JSON object only.`;

  return { systemPrompt, userPrompt };
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
