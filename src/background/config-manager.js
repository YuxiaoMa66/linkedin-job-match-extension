// ─────────────────────────────────────────────────
// Config Manager — persistent config via chrome.storage
// ─────────────────────────────────────────────────
import { DEFAULT_MODEL_CONFIG, PROVIDERS } from '../shared/constants.js';

const STORAGE_KEY = 'ljm_config';

/**
 * Load the model configuration from chrome.storage.local.
 * @returns {Promise<object>}
 */
export async function loadConfig() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const saved = result[STORAGE_KEY];
    if (saved && typeof saved === 'object') {
      const merged = { ...DEFAULT_MODEL_CONFIG, ...saved };
      const providerProfiles = normalizeProviderProfiles(saved.providerProfiles);
      const activeProfile = getProviderProfile(merged.provider, providerProfiles, merged);

      return {
        ...merged,
        ...activeProfile,
        providerProfiles,
        analysisPreset: merged.analysisPreset || DEFAULT_MODEL_CONFIG.analysisPreset,
        promptTuningMode: merged.promptTuningMode || merged.analysisPreset || DEFAULT_MODEL_CONFIG.promptTuningMode,
        includeSponsorshipInScore: merged.includeSponsorshipInScore !== false,
        useCustomWeights: merged.useCustomWeights === true,
        customWeights: normalizeCustomWeights(merged.customWeights),
        additionalPromptInstructions: typeof merged.additionalPromptInstructions === 'string'
          ? merged.additionalPromptInstructions
          : '',
        customPromptTemplate: typeof merged.customPromptTemplate === 'string'
          ? merged.customPromptTemplate
          : '',
        enableDiagnostics: merged.enableDiagnostics !== false,
      };
    }
  } catch (err) {
    console.warn('[ConfigManager] Failed to load config:', err);
  }
  return {
    ...DEFAULT_MODEL_CONFIG,
    providerProfiles: normalizeProviderProfiles(DEFAULT_MODEL_CONFIG.providerProfiles),
  };
}

/**
 * Save the model configuration to chrome.storage.local.
 * @param {object} config
 */
export async function saveConfig(config) {
  try {
    const merged = { ...DEFAULT_MODEL_CONFIG, ...config };
    const providerProfiles = normalizeProviderProfiles(merged.providerProfiles);
    if (merged.provider) {
      providerProfiles[merged.provider] = {
        ...getDefaultProfile(merged.provider),
        ...providerProfiles[merged.provider],
        baseUrl: merged.baseUrl,
        apiKey: merged.apiKey,
        modelId: merged.modelId,
        modelIds: Array.isArray(merged.modelIds) ? merged.modelIds : [],
        maxTokens: merged.maxTokens,
        temperature: merged.temperature,
        timeoutMs: merged.timeoutMs,
        maxRetries: merged.maxRetries,
      };
    }

    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        ...merged,
        providerProfiles,
        analysisPreset: merged.analysisPreset || DEFAULT_MODEL_CONFIG.analysisPreset,
        promptTuningMode: merged.promptTuningMode || merged.analysisPreset || DEFAULT_MODEL_CONFIG.promptTuningMode,
        includeSponsorshipInScore: merged.includeSponsorshipInScore !== false,
        useCustomWeights: merged.useCustomWeights === true,
        customWeights: normalizeCustomWeights(merged.customWeights),
        additionalPromptInstructions: typeof merged.additionalPromptInstructions === 'string'
          ? merged.additionalPromptInstructions
          : '',
        customPromptTemplate: typeof merged.customPromptTemplate === 'string'
          ? merged.customPromptTemplate
          : '',
        enableDiagnostics: merged.enableDiagnostics !== false,
        _savedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[ConfigManager] Failed to save config:', err);
    throw err;
  }
}

/**
 * Check if API key is configured.
 */
export async function isConfigured() {
  const config = await loadConfig();
  return !!(config.apiKey && config.apiKey.trim());
}

function normalizeProviderProfiles(profiles) {
  const normalized = {};

  for (const provider of PROVIDERS) {
    normalized[provider.id] = {
      ...getDefaultProfile(provider.id),
      ...(profiles?.[provider.id] || {}),
    };
  }

  return normalized;
}

function getProviderProfile(providerId, providerProfiles, fallbackConfig) {
  return {
    ...getDefaultProfile(providerId),
    ...(providerProfiles?.[providerId] || {}),
    baseUrl: providerProfiles?.[providerId]?.baseUrl
      || fallbackConfig.baseUrl
      || getDefaultProfile(providerId).baseUrl,
  };
}

function getDefaultProfile(providerId) {
  const provider = PROVIDERS.find(item => item.id === providerId);
  return {
    baseUrl: provider?.baseUrl || '',
    apiKey: '',
    modelId: DEFAULT_MODEL_CONFIG.modelId,
    modelIds: [...DEFAULT_MODEL_CONFIG.modelIds],
    maxTokens: DEFAULT_MODEL_CONFIG.maxTokens,
    temperature: DEFAULT_MODEL_CONFIG.temperature,
    timeoutMs: DEFAULT_MODEL_CONFIG.timeoutMs,
    maxRetries: DEFAULT_MODEL_CONFIG.maxRetries,
  };
}

function normalizeCustomWeights(customWeights) {
  if (!customWeights || typeof customWeights !== 'object') {
    return {};
  }

  return Object.entries(customWeights).reduce((acc, [key, value]) => {
    const numericValue = Number.parseFloat(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      acc[key] = numericValue;
    }
    return acc;
  }, {});
}
