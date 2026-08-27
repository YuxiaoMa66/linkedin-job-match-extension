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
  GET_POSITION_LIBRARY: 'GET_POSITION_LIBRARY',
  GET_MANUAL_JOBS: 'GET_MANUAL_JOBS',
  UPSERT_MANUAL_JOB: 'UPSERT_MANUAL_JOB',
  DELETE_MANUAL_JOB: 'DELETE_MANUAL_JOB',
  START_MANUAL_ANALYSIS: 'START_MANUAL_ANALYSIS',
  DETECT_INSERTED_JOB: 'DETECT_INSERTED_JOB',
  TOGGLE_SAVE_POSITION: 'TOGGLE_SAVE_POSITION',
  DELETE_HISTORY_ENTRY: 'DELETE_HISTORY_ENTRY',
  DELETE_SAVED_POSITION: 'DELETE_SAVED_POSITION',

  ANALYSIS_PROGRESS: 'ANALYSIS_PROGRESS',
  ANALYSIS_RESULT: 'ANALYSIS_RESULT',
  ANALYSIS_ERROR: 'ANALYSIS_ERROR',
  CONFIG_LOADED: 'CONFIG_LOADED',
  JD_DATA: 'JD_DATA',
});

export const SOURCE_TYPES = Object.freeze({
  LINKEDIN: 'linkedin',
  INDEED: 'indeed',
  INSERTED: 'inserted',
});

export const SOURCE_LABELS = Object.freeze({
  [SOURCE_TYPES.LINKEDIN]: 'LinkedIn',
  [SOURCE_TYPES.INDEED]: 'Indeed',
  [SOURCE_TYPES.INSERTED]: 'Inserted',
});

export function normalizeSourceType(value) {
  return Object.values(SOURCE_TYPES).includes(value)
    ? value
    : SOURCE_TYPES.LINKEDIN;
}

export function getSourceLabel(value) {
  return SOURCE_LABELS[normalizeSourceType(value)];
}

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

export const ScoringPresets = Object.freeze({
  STRICT: 'strict',
  BALANCED: 'balanced',
  POTENTIAL: 'potential',
  SPONSORSHIP_FIRST: 'sponsorship-first',
});

export const PromptTuningModes = Object.freeze({
  STRICT: 'strict',
  BALANCED: 'balanced',
  POTENTIAL: 'potential',
  SPONSORSHIP_FIRST: 'sponsorship-first',
});

export const ErrorTypes = Object.freeze({
  CONFIG_MISSING: 'CONFIG_MISSING',
  AUTH_FAILED: 'AUTH_FAILED',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  NETWORK_FAILED: 'NETWORK_FAILED',
  LINKEDIN_CONTEXT_UNAVAILABLE: 'LINKEDIN_CONTEXT_UNAVAILABLE',
  JD_EXTRACTION_FAILED: 'JD_EXTRACTION_FAILED',
  RESUME_PARSE_FAILED: 'RESUME_PARSE_FAILED',
  MODEL_OUTPUT_INVALID: 'MODEL_OUTPUT_INVALID',
  CACHE_MISMATCH: 'CACHE_MISMATCH',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
});

export const DEFAULT_ANALYSIS_PRESET = ScoringPresets.BALANCED;

export const TITLE_SIGNAL_KEYS = Object.freeze({
  KM: 'km',
  JD_LANGUAGE: 'jdLanguage',
  REQUIRED_LANGUAGE: 'requiredLanguage',
  EXPERIENCE: 'experience',
  KEYWORD: 'keyword',
});

export const TITLE_SIGNAL_ORDER = Object.freeze([
  TITLE_SIGNAL_KEYS.KM,
  TITLE_SIGNAL_KEYS.JD_LANGUAGE,
  TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE,
  TITLE_SIGNAL_KEYS.EXPERIENCE,
]);

export const TITLE_SIGNAL_LABELS = Object.freeze({
  [TITLE_SIGNAL_KEYS.KM]: 'KM sponsor tag',
  [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: 'JD language',
  [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: 'Required language',
  [TITLE_SIGNAL_KEYS.EXPERIENCE]: 'Experience years',
  [TITLE_SIGNAL_KEYS.KEYWORD]: 'JD keyword',
});

export const TITLE_COLOR_SCHEMES = Object.freeze({
  default: Object.freeze({
    label: 'Default',
    colors: Object.freeze({
      [TITLE_SIGNAL_KEYS.KM]: '#2563eb',
      [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: '#7c3aed',
      [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: '#0f766e',
      [TITLE_SIGNAL_KEYS.EXPERIENCE]: '#b45309',
      [TITLE_SIGNAL_KEYS.KEYWORD]: '#be123c',
    }),
  }),
  colorblind: Object.freeze({
    label: 'Color-blind friendly',
    colors: Object.freeze({
      [TITLE_SIGNAL_KEYS.KM]: '#0072b2',
      [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: '#d55e00',
      [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: '#009e73',
      [TITLE_SIGNAL_KEYS.EXPERIENCE]: '#e69f00',
      [TITLE_SIGNAL_KEYS.KEYWORD]: '#cc79a7',
    }),
  }),
});

export const TITLE_KEYWORD_STYLES = Object.freeze([
  Object.freeze({ id: 'tag', label: 'Tag', example: 'KEY: SQL' }),
  Object.freeze({ id: 'bracket', label: 'Bracket', example: '[SQL]' }),
  Object.freeze({ id: 'spark', label: 'Spark', example: '✦ SQL' }),
]);

export const PROVIDER_RECOMMENDED_MODELS = Object.freeze({
  openai: 'gpt-5-mini',
  anthropic: 'claude-haiku-4-5-20251001',
  gemini: 'gemini-3.5-flash-lite',
});

// Kept only for upgrade cleanup. This is never offered as a new default or
// inserted into a provider's Saved models list.
export const LEGACY_MODEL_IDS = Object.freeze(['gpt-4o']);

export const DEFAULT_TITLE_DISPLAY_SETTINGS = Object.freeze({
  colorScheme: 'default',
  visibleSignals: Object.freeze({
    [TITLE_SIGNAL_KEYS.KM]: true,
    [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: true,
    [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: true,
    [TITLE_SIGNAL_KEYS.EXPERIENCE]: true,
    [TITLE_SIGNAL_KEYS.KEYWORD]: false,
  }),
  customColors: Object.freeze({ ...TITLE_COLOR_SCHEMES.default.colors }),
  keywordList: Object.freeze([]),
  keywordStyle: 'tag',
});

export function normalizeHexColor(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const candidate = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(candidate)) {
    return candidate;
  }

  if (/^#[0-9a-f]{3}$/.test(candidate)) {
    return `#${candidate.slice(1).split('').map(char => `${char}${char}`).join('')}`;
  }

  return fallback;
}

export function normalizeModelList(value, activeModel = '', fallbackModel = '') {
  const candidates = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,]/)
      : [];
  const legacyIds = new Set(LEGACY_MODEL_IDS.map(modelId => modelId.toLocaleLowerCase()));
  const normalize = candidate => typeof candidate === 'string' ? candidate.trim() : '';
  const isLegacy = modelId => legacyIds.has(modelId.toLocaleLowerCase());
  const models = [];

  for (const candidate of candidates) {
    const modelId = normalize(candidate);
    if (!modelId || isLegacy(modelId) || models.includes(modelId)) {
      continue;
    }
    models.push(modelId);
  }

  const normalizedActiveModel = normalize(activeModel);
  const normalizedFallbackModel = normalize(fallbackModel);
  const preferredModel = normalizedActiveModel && !isLegacy(normalizedActiveModel)
    ? normalizedActiveModel
    : normalizedFallbackModel;
  if (preferredModel && !isLegacy(preferredModel) && !models.includes(preferredModel)) {
    models.unshift(preferredModel);
  }

  if (!models.length && normalizedFallbackModel && !isLegacy(normalizedFallbackModel)) {
    models.push(normalizedFallbackModel);
  }

  return models;
}

export function normalizeKeywordList(value) {
  const candidates = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,]/)
      : [];
  const seen = new Set();
  const keywords = [];

  for (const candidate of candidates) {
    const keyword = String(candidate || '').replace(/\s+/g, ' ').trim();
    const key = keyword.toLocaleLowerCase();
    if (!keyword || seen.has(key)) {
      continue;
    }
    seen.add(key);
    keywords.push(keyword.slice(0, 80));
    if (keywords.length >= 5) {
      break;
    }
  }

  return keywords;
}

export function normalizeTitleDisplaySettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const scheme = source.colorScheme === 'custom'
    || Object.prototype.hasOwnProperty.call(TITLE_COLOR_SCHEMES, source.colorScheme)
    ? source.colorScheme
    : DEFAULT_TITLE_DISPLAY_SETTINGS.colorScheme;
  const defaultColors = TITLE_COLOR_SCHEMES.default.colors;
  const sourceColors = source.customColors && typeof source.customColors === 'object'
    ? source.customColors
    : {};
  const customColors = Object.fromEntries(
    Object.keys(defaultColors).map(key => [
      key,
      normalizeHexColor(sourceColors[key], defaultColors[key]),
    ]),
  );
  const visibleSignals = Object.fromEntries(
    Object.keys(DEFAULT_TITLE_DISPLAY_SETTINGS.visibleSignals).map(key => {
      const configuredValue = source.visibleSignals?.[key];
      const defaultValue = DEFAULT_TITLE_DISPLAY_SETTINGS.visibleSignals[key];
      return [
        key,
        configuredValue === undefined ? defaultValue : configuredValue !== false,
      ];
    }),
  );
  const keywordStyle = TITLE_KEYWORD_STYLES.some(style => style.id === source.keywordStyle)
    ? source.keywordStyle
    : DEFAULT_TITLE_DISPLAY_SETTINGS.keywordStyle;

  return {
    colorScheme: scheme,
    visibleSignals,
    customColors,
    keywordList: normalizeKeywordList(source.keywordList),
    keywordStyle,
  };
}

export function getTitleDisplayColors(settings) {
  const normalized = normalizeTitleDisplaySettings(settings);
  if (normalized.colorScheme !== 'custom') {
    return { ...TITLE_COLOR_SCHEMES[normalized.colorScheme].colors };
  }
  return { ...normalized.customColors };
}

export function getContrastTextColor(value) {
  const hex = normalizeHexColor(value, '#000000').slice(1);
  const luminance = getRelativeLuminance(hex);
  const darkLuminance = getRelativeLuminance('251b12');
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
  return darkContrast > whiteContrast ? '#251b12' : '#ffffff';
}

function getRelativeLuminance(hex) {
  const channels = [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map(channel => (
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

export function findKeywordMatches(text, keywordList) {
  const normalizedText = String(text || '').replace(/\s+/g, ' ').toLocaleLowerCase();
  if (!normalizedText) {
    return [];
  }

  return normalizeKeywordList(keywordList).filter(keyword => (
    normalizedText.includes(keyword.replace(/\s+/g, ' ').toLocaleLowerCase())
  ));
}

export const PRESET_WEIGHT_PROFILES = Object.freeze({
  [ScoringPresets.STRICT]: Object.freeze({
    [ItemNames.SKILLS]: 0.32,
    [ItemNames.RESPONSIBILITY]: 0.24,
    [ItemNames.YEARS]: 0.20,
    [ItemNames.EDUCATION]: 0.10,
    [ItemNames.LANG_LOCATION]: 0.10,
    [ItemNames.SPONSORSHIP]: 0.04,
  }),
  [ScoringPresets.BALANCED]: Object.freeze({
    [ItemNames.SKILLS]: 0.30,
    [ItemNames.RESPONSIBILITY]: 0.25,
    [ItemNames.YEARS]: 0.15,
    [ItemNames.EDUCATION]: 0.15,
    [ItemNames.LANG_LOCATION]: 0.10,
    [ItemNames.SPONSORSHIP]: 0.05,
  }),
  [ScoringPresets.POTENTIAL]: Object.freeze({
    [ItemNames.SKILLS]: 0.32,
    [ItemNames.RESPONSIBILITY]: 0.28,
    [ItemNames.YEARS]: 0.08,
    [ItemNames.EDUCATION]: 0.12,
    [ItemNames.LANG_LOCATION]: 0.12,
    [ItemNames.SPONSORSHIP]: 0.08,
  }),
  [ScoringPresets.SPONSORSHIP_FIRST]: Object.freeze({
    [ItemNames.SKILLS]: 0.24,
    [ItemNames.RESPONSIBILITY]: 0.18,
    [ItemNames.YEARS]: 0.10,
    [ItemNames.EDUCATION]: 0.08,
    [ItemNames.LANG_LOCATION]: 0.10,
    [ItemNames.SPONSORSHIP]: 0.30,
  }),
});

export const ANALYSIS_PRESET_OPTIONS = Object.freeze([
  { id: ScoringPresets.STRICT, label: 'Strict' },
  { id: ScoringPresets.BALANCED, label: 'Balanced' },
  { id: ScoringPresets.POTENTIAL, label: 'Potential' },
  { id: ScoringPresets.SPONSORSHIP_FIRST, label: 'Sponsorship-first' },
]);

export const SCORING_ITEM_ORDER = Object.freeze([
  ItemNames.SKILLS,
  ItemNames.RESPONSIBILITY,
  ItemNames.YEARS,
  ItemNames.EDUCATION,
  ItemNames.LANG_LOCATION,
  ItemNames.SPONSORSHIP,
]);

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
  modelId: PROVIDER_RECOMMENDED_MODELS.openai,
  modelIds: [PROVIDER_RECOMMENDED_MODELS.openai],
  maxTokens: 4096,
  temperature: 0.1,
  timeoutMs: 60000,
  maxRetries: 2,
  autoAnalyzeCount: 0,
  analysisPreset: DEFAULT_ANALYSIS_PRESET,
  promptTuningMode: PromptTuningModes.BALANCED,
  includeSponsorshipInScore: true,
  useCustomWeights: false,
  customWeights: {},
  additionalPromptInstructions: '',
  customPromptTemplate: '',
  enableDiagnostics: true,
  providerProfiles: {},
  titleDisplaySettings: DEFAULT_TITLE_DISPLAY_SETTINGS,
});

export const PROVIDERS = Object.freeze([
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com' },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
  { id: 'gemini', name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai' },
  { id: 'poe', name: 'Poe', baseUrl: 'https://api.poe.com/v1' },
  { id: 'custom', name: 'Custom', baseUrl: '' },
]);
