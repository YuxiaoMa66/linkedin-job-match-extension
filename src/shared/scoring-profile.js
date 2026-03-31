import {
  ANALYSIS_PRESET_OPTIONS,
  DEFAULT_ANALYSIS_PRESET,
  DEFAULT_MODEL_CONFIG,
  ItemNames,
  PRESET_WEIGHT_PROFILES,
  SCORING_ITEM_ORDER,
} from './constants.js';

export function getPresetOptionMap() {
  return ANALYSIS_PRESET_OPTIONS.reduce((acc, option) => {
    acc[option.id] = option;
    return acc;
  }, {});
}

export function getPresetLabel(presetId) {
  return getPresetOptionMap()[presetId]?.label || getPresetOptionMap()[DEFAULT_ANALYSIS_PRESET]?.label || 'Balanced';
}

export function getPresetWeights(presetId = DEFAULT_ANALYSIS_PRESET) {
  return {
    ...(PRESET_WEIGHT_PROFILES[presetId] || PRESET_WEIGHT_PROFILES[DEFAULT_ANALYSIS_PRESET]),
  };
}

export function sanitizeCustomWeights(weights) {
  const sanitized = {};
  for (const itemName of SCORING_ITEM_ORDER) {
    const value = Number.parseFloat(weights?.[itemName]);
    if (Number.isFinite(value) && value > 0) {
      sanitized[itemName] = value;
    }
  }
  return sanitized;
}

export function normalizeWeights(weights, includeSponsorship = true) {
  const allowedItems = includeSponsorship
    ? SCORING_ITEM_ORDER
    : SCORING_ITEM_ORDER.filter(itemName => itemName !== ItemNames.SPONSORSHIP);

  const filtered = {};
  let total = 0;

  for (const itemName of allowedItems) {
    const raw = Number.parseFloat(weights?.[itemName]);
    const value = Number.isFinite(raw) && raw > 0 ? raw : 0;
    filtered[itemName] = value;
    total += value;
  }

  if (total <= 0) {
    const fallback = includeSponsorship
      ? getPresetWeights(DEFAULT_ANALYSIS_PRESET)
      : normalizeWeights(getPresetWeights(DEFAULT_ANALYSIS_PRESET), false);
    return fallback;
  }

  const normalized = {};
  for (const itemName of allowedItems) {
    normalized[itemName] = Number((filtered[itemName] / total).toFixed(6));
  }

  return normalized;
}

export function hasCustomWeights(config) {
  return config?.useCustomWeights === true && Object.keys(sanitizeCustomWeights(config?.customWeights)).length > 0;
}

export function getEffectiveWeights(config, includeSponsorship = true) {
  const source = hasCustomWeights(config)
    ? sanitizeCustomWeights(config.customWeights)
    : getPresetWeights(config?.analysisPreset || DEFAULT_ANALYSIS_PRESET);
  return normalizeWeights(source, includeSponsorship);
}

export function buildScoringProfile(config, includeSponsorship = true) {
  const presetId = config?.analysisPreset || DEFAULT_ANALYSIS_PRESET;
  const promptTuningMode = config?.promptTuningMode || presetId;
  const includeSponsorshipInScore = config?.includeSponsorshipInScore !== false && includeSponsorship;
  const weightsApplied = getEffectiveWeights(config, includeSponsorshipInScore);
  const isCustomProfile = hasCustomWeights(config);

  return {
    analysisPreset: presetId,
    promptTuningMode,
    isCustomProfile,
    includeSponsorshipInScore,
    additionalPromptInstructions: typeof config?.additionalPromptInstructions === 'string'
      ? config.additionalPromptInstructions.trim()
      : '',
    customPromptTemplate: typeof config?.customPromptTemplate === 'string'
      ? config.customPromptTemplate.trim()
      : '',
    weightsApplied,
  };
}

export function normalizeBaseUrl(baseUrl = '') {
  const trimmed = String(baseUrl || '').trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    const normalizedPath = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${normalizedPath}`;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export function buildModelKey(config = DEFAULT_MODEL_CONFIG) {
  return [
    config?.provider || DEFAULT_MODEL_CONFIG.provider,
    normalizeBaseUrl(config?.baseUrl || DEFAULT_MODEL_CONFIG.baseUrl),
    config?.modelId || DEFAULT_MODEL_CONFIG.modelId,
  ].join('::');
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeysDeep(value[key]);
        return acc;
      }, {});
  }

  return value;
}

export async function hashValue(value) {
  const normalized = JSON.stringify(sortKeysDeep(value));
  const buffer = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildCacheContext(config, resumeHash, promptVersion = 'v1') {
  const scoringProfile = buildScoringProfile(config, true);
  const modelKey = buildModelKey(config);

  return {
    resumeHash,
    promptVersion,
    modelKey,
    modelKeyHash: await hashValue(modelKey),
    scoringProfile,
    scoringProfileHash: await hashValue({
      analysisPreset: scoringProfile.analysisPreset,
      promptTuningMode: scoringProfile.promptTuningMode,
      isCustomProfile: scoringProfile.isCustomProfile,
      includeSponsorshipInScore: scoringProfile.includeSponsorshipInScore,
      additionalPromptInstructions: scoringProfile.additionalPromptInstructions,
      customPromptTemplate: scoringProfile.customPromptTemplate,
      weightsApplied: scoringProfile.weightsApplied,
    }),
  };
}
