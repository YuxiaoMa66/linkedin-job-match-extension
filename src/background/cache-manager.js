const CACHE_PREFIX = 'match_result_v3_';
const CURRENT_CACHE_VERSION = 3;
const LEGACY_CACHE_PREFIX = 'match_result_';
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function buildCacheKey(jobId, cacheContext) {
  return `${CACHE_PREFIX}${cacheContext.resumeHash}_${cacheContext.scoringProfileHash}_${cacheContext.modelKeyHash}_${jobId}`;
}

function buildSummary(jobId, jdData, matchData, cacheContext) {
  const sponsorship = matchData?.sponsorshipAssessment || {};
  const metadata = matchData?.metadata || {};
  const scoringProfile = cacheContext?.scoringProfile || {};
  const sourceType = jdData?.sourceType === 'inserted' ? 'inserted' : 'linkedin';

  return {
    jobId,
    sourceType,
    title: jdData?.title || '',
    company: jdData?.company || '',
    location: jdData?.location || '',
    url: jdData?.url || '',
    sourceUrl: jdData?.sourceUrl || jdData?.url || '',
    jdLanguage: metadata.jdLanguage || 'Unknown',
    requiredExperience: metadata.requiredExperience || null,
    requiredLanguages: Array.isArray(metadata.requiredLanguages) ? metadata.requiredLanguages : [],
    score: matchData?.overallMatchPercent ?? null,
    analyzedAt: metadata.analysisTimestamp || new Date().toISOString(),
    analysisPreset: scoringProfile.analysisPreset || metadata.analysisPreset || 'balanced',
    promptTuningMode: scoringProfile.promptTuningMode || metadata.promptTuningMode || 'balanced',
    isCustomProfile: scoringProfile.isCustomProfile === true || metadata.isCustomProfile === true,
    includeSponsorshipInScore: scoringProfile.includeSponsorshipInScore !== false && metadata.includeSponsorshipInScore !== false,
    weightsApplied: metadata.weightsApplied || scoringProfile.weightsApplied || {},
    modelKey: cacheContext?.modelKey || metadata.modelKey || '',
    promptVersion: cacheContext?.promptVersion || metadata.promptVersion || 'v1',
    timing: metadata.timing || null,
    kmEligible: sponsorship.kmEligible === true || sponsorship.indRegistered === true,
    sponsorshipLabel: sponsorship.kmEligible === true || sponsorship.indRegistered === true ? 'KM' : null,
    sponsorshipCompany: sponsorship.registryMatchedName || null,
    sponsorshipConfidence: sponsorship.registryConfidence || null,
  };
}

function isExpired(timestamp) {
  return !timestamp || (Date.now() - timestamp > ONE_MONTH_MS);
}

export const CacheManager = {
  async saveResult(jobId, cacheContext, jdData, matchData) {
    if (!jobId || !cacheContext?.resumeHash || !cacheContext?.scoringProfileHash || !cacheContext?.modelKeyHash || !matchData) {
      return;
    }

    const key = buildCacheKey(jobId, cacheContext);
    await chrome.storage.local.set({
      [key]: {
        version: CURRENT_CACHE_VERSION,
        timestamp: Date.now(),
        resumeHash: cacheContext.resumeHash,
        jobId,
        scoringProfileHash: cacheContext.scoringProfileHash,
        modelKeyHash: cacheContext.modelKeyHash,
        promptVersion: cacheContext.promptVersion || 'v1',
        summary: buildSummary(jobId, jdData, matchData, cacheContext),
        data: matchData,
      },
    });
  },

  async getEntry(jobId, cacheContext) {
    if (!jobId || !cacheContext?.resumeHash || !cacheContext?.scoringProfileHash || !cacheContext?.modelKeyHash) {
      return null;
    }

    const key = buildCacheKey(jobId, cacheContext);
    const result = await chrome.storage.local.get(key);
    const payload = result[key];

    if (!payload) {
      return null;
    }

    if (isExpired(payload.timestamp)) {
      await chrome.storage.local.remove(key);
      return null;
    }

    return payload;
  },

  async getResult(jobId, cacheContext) {
    const entry = await this.getEntry(jobId, cacheContext);
    return entry?.data || null;
  },

  async deleteEntry(jobId, cacheContext) {
    if (!jobId || !cacheContext?.resumeHash || !cacheContext?.scoringProfileHash || !cacheContext?.modelKeyHash) {
      return false;
    }

    const key = buildCacheKey(jobId, cacheContext);
    await chrome.storage.local.remove(key);
    return true;
  },

  async getEntries(jobIds, cacheContext) {
    if (!Array.isArray(jobIds) || !jobIds.length || !cacheContext?.resumeHash || !cacheContext?.scoringProfileHash || !cacheContext?.modelKeyHash) {
      return [];
    }

    const uniqueJobIds = [...new Set(jobIds.filter(Boolean))];
    const keys = uniqueJobIds.map(jobId => buildCacheKey(jobId, cacheContext));
    const storage = await chrome.storage.local.get(keys);
    const expiredKeys = [];
    const entries = [];

    for (const jobId of uniqueJobIds) {
      const key = buildCacheKey(jobId, cacheContext);
      const payload = storage[key];

      if (!payload) {
        continue;
      }

      if (isExpired(payload.timestamp)) {
        expiredKeys.push(key);
        continue;
      }

      entries.push(payload);
    }

    if (expiredKeys.length) {
      await chrome.storage.local.remove(expiredKeys);
    }

    return entries;
  },

  async cleanupExpired() {
    const allStorage = await chrome.storage.local.get(null);
    const keysToRemove = [];

    for (const [key, value] of Object.entries(allStorage)) {
      if (key.startsWith(CACHE_PREFIX)) {
        if (isExpired(value?.timestamp) || value?.version !== CURRENT_CACHE_VERSION) {
          keysToRemove.push(key);
        }
      }

      if (key.startsWith(LEGACY_CACHE_PREFIX) && !key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length) {
      await chrome.storage.local.remove(keysToRemove);
    }
  },

  async listEntries(cacheContext, options = {}) {
    if (!cacheContext?.resumeHash || !cacheContext?.scoringProfileHash || !cacheContext?.modelKeyHash) {
      return [];
    }

    const allStorage = await chrome.storage.local.get(null);
    const entries = [];
    const keysToRemove = [];
    const sourceTypeFilter = options.sourceType || null;

    for (const [key, value] of Object.entries(allStorage)) {
      if (!key.startsWith(CACHE_PREFIX)) {
        continue;
      }

      if (value?.resumeHash !== cacheContext.resumeHash
        || value?.scoringProfileHash !== cacheContext.scoringProfileHash
        || value?.modelKeyHash !== cacheContext.modelKeyHash) {
        continue;
      }

      if (isExpired(value?.timestamp) || value?.version !== CURRENT_CACHE_VERSION) {
        keysToRemove.push(key);
        continue;
      }

      const entrySourceType = value?.summary?.sourceType || 'linkedin';
      if (sourceTypeFilter && entrySourceType !== sourceTypeFilter) {
        continue;
      }

      entries.push(value);
    }

    if (keysToRemove.length) {
      await chrome.storage.local.remove(keysToRemove);
    }

    entries.sort((a, b) => new Date(b?.summary?.analyzedAt || 0) - new Date(a?.summary?.analyzedAt || 0));
    return entries;
  },
};
