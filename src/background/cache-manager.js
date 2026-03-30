const CACHE_PREFIX = 'match_result_v2_';
const LEGACY_CACHE_PREFIX = 'match_result_';
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function buildCacheKey(jobId, resumeHash) {
  return `${CACHE_PREFIX}${resumeHash}_${jobId}`;
}

function buildSummary(jobId, jdData, matchData) {
  const sponsorship = matchData?.sponsorshipAssessment || {};
  return {
    jobId,
    title: jdData?.title || '',
    company: jdData?.company || '',
    location: jdData?.location || '',
    url: jdData?.url || '',
    jdLanguage: matchData?.metadata?.jdLanguage || 'Unknown',
    requiredExperience: matchData?.metadata?.requiredExperience || null,
    requiredLanguages: Array.isArray(matchData?.metadata?.requiredLanguages) ? matchData.metadata.requiredLanguages : [],
    score: matchData?.overallMatchPercent ?? null,
    analyzedAt: matchData?.metadata?.analysisTimestamp || new Date().toISOString(),
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
  async saveResult(jobId, resumeHash, jdData, matchData) {
    if (!jobId || !resumeHash || !matchData) {
      return;
    }

    const key = buildCacheKey(jobId, resumeHash);
    await chrome.storage.local.set({
      [key]: {
        version: 2,
        timestamp: Date.now(),
        resumeHash,
        jobId,
        summary: buildSummary(jobId, jdData, matchData),
        data: matchData,
      },
    });
  },

  async getEntry(jobId, resumeHash) {
    if (!jobId || !resumeHash) {
      return null;
    }

    const key = buildCacheKey(jobId, resumeHash);
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

  async getResult(jobId, resumeHash) {
    const entry = await this.getEntry(jobId, resumeHash);
    return entry?.data || null;
  },

  async getEntries(jobIds, resumeHash) {
    if (!Array.isArray(jobIds) || !jobIds.length || !resumeHash) {
      return [];
    }

    const uniqueJobIds = [...new Set(jobIds.filter(Boolean))];
    const keys = uniqueJobIds.map(jobId => buildCacheKey(jobId, resumeHash));
    const storage = await chrome.storage.local.get(keys);
    const expiredKeys = [];
    const entries = [];

    for (const jobId of uniqueJobIds) {
      const key = buildCacheKey(jobId, resumeHash);
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
        if (isExpired(value?.timestamp)) {
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
};
