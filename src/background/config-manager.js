// ─────────────────────────────────────────────────
// Config Manager — persistent config via chrome.storage
// ─────────────────────────────────────────────────
import {
  DEFAULT_MODEL_CONFIG,
  PROVIDERS,
  PROVIDER_RECOMMENDED_MODELS,
  normalizeModelList,
  normalizeTitleDisplaySettings,
} from '../shared/constants.js';

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
      const providerProfiles = normalizeProviderProfiles(saved.providerProfiles, merged);
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
        titleDisplaySettings: normalizeTitleDisplaySettings(merged.titleDisplaySettings),
      };
    }
  } catch (err) {
    console.warn('[ConfigManager] Failed to load config:', err);
  }
  return {
    ...DEFAULT_MODEL_CONFIG,
    providerProfiles: normalizeProviderProfiles(DEFAULT_MODEL_CONFIG.providerProfiles, DEFAULT_MODEL_CONFIG),
    titleDisplaySettings: normalizeTitleDisplaySettings(DEFAULT_MODEL_CONFIG.titleDisplaySettings),
  };
}

/**
 * Save the model configuration to chrome.storage.local.
 * @param {object} config
 */
export async function saveConfig(config) {
  try {
    const merged = { ...DEFAULT_MODEL_CONFIG, ...config };
    const providerProfiles = normalizeProviderProfiles(merged.providerProfiles, merged);
    if (merged.provider) {
      const fallbackModel = getProviderFallbackModel(merged.provider);
      const modelIds = normalizeModelList(merged.modelIds, merged.modelId, fallbackModel);
      const modelId = modelIds[0] || fallbackModel;
      providerProfiles[merged.provider] = {
        ...getDefaultProfile(merged.provider),
        ...providerProfiles[merged.provider],
        baseUrl: merged.baseUrl,
        apiKey: merged.apiKey,
        modelId,
        modelIds,
        maxTokens: merged.maxTokens,
        temperature: merged.temperature,
        timeoutMs: merged.timeoutMs,
        maxRetries: merged.maxRetries,
      };
    }

    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        ...merged,
        modelId: merged.provider
          ? providerProfiles[merged.provider].modelId
          : merged.modelId,
        modelIds: merged.provider
          ? providerProfiles[merged.provider].modelIds
          : merged.modelIds,
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
        titleDisplaySettings: normalizeTitleDisplaySettings(merged.titleDisplaySettings),
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

function normalizeProviderProfiles(profiles, fallbackConfig = {}) {
  const normalized = {};
  const activeProvider = fallbackConfig.provider || DEFAULT_MODEL_CONFIG.provider;

  for (const provider of PROVIDERS) {
    const existing = profiles?.[provider.id] || {};
    const defaultProfile = getDefaultProfile(provider.id);
    const fallbackModel = getProviderFallbackModel(provider.id);
    const isActiveProvider = provider.id === activeProvider;
    const sourceModelIds = existing.modelIds !== undefined
      ? existing.modelIds
      : (isActiveProvider ? fallbackConfig.modelIds : []);
    const sourceActiveModel = existing.modelId !== undefined
      ? existing.modelId
      : (isActiveProvider ? fallbackConfig.modelId : '');
    const modelIds = normalizeModelList(sourceModelIds, sourceActiveModel, fallbackModel);

    normalized[provider.id] = {
      ...defaultProfile,
      ...existing,
      baseUrl: existing.baseUrl || (isActiveProvider ? fallbackConfig.baseUrl : '') || defaultProfile.baseUrl,
      apiKey: existing.apiKey ?? (isActiveProvider ? fallbackConfig.apiKey : '') ?? '',
      modelId: modelIds[0] || fallbackModel,
      modelIds,
      maxTokens: existing.maxTokens ?? (isActiveProvider ? fallbackConfig.maxTokens : null) ?? defaultProfile.maxTokens,
      temperature: existing.temperature ?? (isActiveProvider ? fallbackConfig.temperature : null) ?? defaultProfile.temperature,
      timeoutMs: existing.timeoutMs ?? (isActiveProvider ? fallbackConfig.timeoutMs : null) ?? defaultProfile.timeoutMs,
      maxRetries: existing.maxRetries ?? (isActiveProvider ? fallbackConfig.maxRetries : null) ?? defaultProfile.maxRetries,
    };
  }

  return normalized;
}

function getProviderProfile(providerId, providerProfiles, fallbackConfig) {
  const fallbackModel = getProviderFallbackModel(providerId);
  const profile = providerProfiles?.[providerId] || getDefaultProfile(providerId);
  const modelIds = normalizeModelList(profile.modelIds, profile.modelId, fallbackModel);

  return {
    ...getDefaultProfile(providerId),
    ...profile,
    modelId: modelIds[0] || fallbackModel,
    modelIds,
    baseUrl: profile.baseUrl
      || fallbackConfig.baseUrl
      || getDefaultProfile(providerId).baseUrl,
  };
}

function getProviderFallbackModel(providerId) {
  return PROVIDER_RECOMMENDED_MODELS[providerId] || DEFAULT_MODEL_CONFIG.modelId;
}

function getDefaultProfile(providerId) {
  const provider = PROVIDERS.find(item => item.id === providerId);
  const fallbackModel = getProviderFallbackModel(providerId);
  return {
    baseUrl: provider?.baseUrl || '',
    apiKey: '',
    modelId: fallbackModel,
    modelIds: [fallbackModel],
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
