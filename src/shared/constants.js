export const Actions = Object.freeze({
  PAGE_DETECTED: 'PAGE_DETECTED',
  JD_EXTRACTED: 'JD_EXTRACTED',
  JD_EXTRACT_FAILED: 'JD_EXTRACT_FAILED',
  GET_JOB_LIST: 'GET_JOB_LIST',
  FOCUS_JOB: 'FOCUS_JOB',
  INJECT_SCORE: 'INJECT_SCORE',
  REFRESH_SCORES: 'REFRESH_SCORES',

  RESUME_UPLOADED: 'RESUME_UPLOADED',
  CLEAR_RESUME: 'CLEAR_RESUME',
  START_ANALYSIS: 'START_ANALYSIS',
  START_BATCH_ANALYSIS: 'START_BATCH_ANALYSIS',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  GET_CONFIG: 'GET_CONFIG',
  GET_JD_DATA: 'GET_JD_DATA',
  GET_CACHED_SCORES: 'GET_CACHED_SCORES',
  TEST_CONNECTION: 'TEST_CONNECTION',

  ANALYSIS_PROGRESS: 'ANALYSIS_PROGRESS',
  ANALYSIS_RESULT: 'ANALYSIS_RESULT',
  ANALYSIS_ERROR: 'ANALYSIS_ERROR',
  CONFIG_LOADED: 'CONFIG_LOADED',
  JD_DATA: 'JD_DATA',
});

export const ConfidenceImpact = Object.freeze({
  RAISE: 'raise',
  LOWER: 'lower',
  NONE: 'none',
});

export const SponsorshipSignal = Object.freeze({
  INCLUDED: 'included',
  NOT_INCLUDED: 'notIncluded',
  UNAVAILABLE: 'unavailable',
});

export const SponsorshipImpactType = Object.freeze({
  INCREASE: 'increase',
  NO_CHANGE: 'noChange',
  DECREASE: 'decrease',
  ONLY_LOWER_CONFIDENCE: 'onlyLowerConfidence',
});

export const DegradationTrigger = Object.freeze({
  FIELD_MISSING_RESUME: 'FIELD_MISSING_RESUME',
  FIELD_MISSING_JD: 'FIELD_MISSING_JD',
  FIELD_MISSING_BOTH: 'FIELD_MISSING_BOTH',
  REF_LOCATE_FAIL: 'REF_LOCATE_FAIL',
  PARSE_CONFLICT_LANG: 'PARSE_CONFLICT_LANG',
  PARSE_CONFLICT_LOC: 'PARSE_CONFLICT_LOC',
  MODEL_NO_OUTPUT: 'MODEL_NO_OUTPUT',
  MODEL_FIELD_MISSING: 'MODEL_FIELD_MISSING',
  MODEL_TRUNCATED: 'MODEL_TRUNCATED',
  MODEL_NO_EVIDENCE: 'MODEL_NO_EVIDENCE',
  SPONSOR_DATA_UNAVAIL: 'SPONSOR_DATA_UNAVAIL',
  JD_EXTRACT_FAIL: 'JD_EXTRACT_FAIL',
  RESUME_PARSE_FAIL: 'RESUME_PARSE_FAIL',
});

export const ConfidenceLevel = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

export const TRIGGER_CONFIDENCE_MAP = Object.freeze({
  [DegradationTrigger.FIELD_MISSING_RESUME]: ConfidenceLevel.MEDIUM,
  [DegradationTrigger.FIELD_MISSING_JD]: ConfidenceLevel.MEDIUM,
  [DegradationTrigger.FIELD_MISSING_BOTH]: ConfidenceLevel.LOW,
  [DegradationTrigger.REF_LOCATE_FAIL]: ConfidenceLevel.MEDIUM,
  [DegradationTrigger.PARSE_CONFLICT_LANG]: ConfidenceLevel.MEDIUM,
  [DegradationTrigger.PARSE_CONFLICT_LOC]: ConfidenceLevel.MEDIUM,
  [DegradationTrigger.MODEL_NO_OUTPUT]: ConfidenceLevel.LOW,
  [DegradationTrigger.MODEL_FIELD_MISSING]: ConfidenceLevel.MEDIUM,
  [DegradationTrigger.MODEL_TRUNCATED]: ConfidenceLevel.MEDIUM,
  [DegradationTrigger.MODEL_NO_EVIDENCE]: ConfidenceLevel.MEDIUM,
  [DegradationTrigger.SPONSOR_DATA_UNAVAIL]: ConfidenceLevel.LOW,
  [DegradationTrigger.JD_EXTRACT_FAIL]: ConfidenceLevel.LOW,
  [DegradationTrigger.RESUME_PARSE_FAIL]: ConfidenceLevel.LOW,
});

export const ItemNames = Object.freeze({
  SKILLS: 'Skills & Experience Relevance',
  RESPONSIBILITY: 'Responsibility Coverage',
  YEARS: 'Years of Experience',
  EDUCATION: 'Education & Certifications',
  LANG_LOCATION: 'Language & Location',
  SPONSORSHIP: 'Sponsorship Fit',
});

export const WEIGHTS_WITH_SPONSOR = Object.freeze({
  [ItemNames.SKILLS]: 0.30,
  [ItemNames.RESPONSIBILITY]: 0.25,
  [ItemNames.YEARS]: 0.15,
  [ItemNames.EDUCATION]: 0.15,
  [ItemNames.LANG_LOCATION]: 0.10,
  [ItemNames.SPONSORSHIP]: 0.05,
});

export const WEIGHTS_NO_SPONSOR = Object.freeze({
  [ItemNames.SKILLS]: 0.316,
  [ItemNames.RESPONSIBILITY]: 0.263,
  [ItemNames.YEARS]: 0.158,
  [ItemNames.EDUCATION]: 0.158,
  [ItemNames.LANG_LOCATION]: 0.105,
});

export const DEFAULT_MODEL_CONFIG = Object.freeze({
  provider: 'openai',
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  modelId: 'gpt-4o',
  modelIds: ['gpt-4o'],
  maxTokens: 4096,
  temperature: 0.1,
  timeoutMs: 60000,
  maxRetries: 2,
  autoAnalyzeCount: 0,
  providerProfiles: {},
});

export const PROVIDERS = Object.freeze([
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com' },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
  { id: 'gemini', name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai' },
  { id: 'poe', name: 'Poe', baseUrl: 'https://api.poe.com/v1' },
  { id: 'custom', name: 'Custom', baseUrl: '' },
]);
