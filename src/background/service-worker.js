import { Actions, DegradationTrigger, ErrorTypes } from '../shared/constants.js';
import { loadConfig, saveConfig } from './config-manager.js';
import { CacheManager } from './cache-manager.js';
import { runAnalysis } from './match-engine.js';
import { callLLM } from './llm-adapter.js';
import { MATCH_PROMPT_VERSION } from '../prompts/prompt-templates.js';
import { buildCacheContext } from '../shared/scoring-profile.js';
import { PositionManager } from './position-manager.js';
import { safeParseJSON } from '../shared/schema-validator.js';
import {
  loadPersistentResume,
  savePersistentResume,
  clearPersistentResume,
} from './resume-manager.js';

let currentJDData = null;
let currentResume = null;
let isAnalyzing = false;
const DEFAULT_BATCH_CONCURRENCY = 3;

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.warn('[SW] sidePanel setup error:', err));

CacheManager.cleanupExpired().catch(err => console.warn('[SW] cache cleanup failed:', err));
warmResumeState();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.type) {
    return;
  }

  switch (msg.type) {
    case Actions.JD_EXTRACTED:
      handleJDExtracted(msg.payload);
      sendResponse({ ok: true });
      break;

    case Actions.JD_EXTRACT_FAILED:
      handleJDExtractFailed(msg.payload);
      sendResponse({ ok: true });
      break;

    case Actions.RESUME_UPLOADED:
      handleResumeUploaded(msg.payload, sendResponse);
      return true;

    case Actions.CLEAR_RESUME:
      handleResumeCleared(sendResponse);
      return true;

    case Actions.START_ANALYSIS:
      handleStartAnalysis(msg.payload, sendResponse);
      return true;

    case Actions.START_BATCH_ANALYSIS:
      handleBatchAnalysis(msg.payload, sendResponse);
      return true;

    case Actions.UPDATE_CONFIG:
      handleUpdateConfig(msg.payload, sendResponse);
      return true;

    case Actions.GET_CONFIG:
      handleGetConfig(sendResponse);
      return true;

    case Actions.GET_JD_DATA:
      handleGetJDData(sendResponse);
      return true;

    case Actions.GET_CACHED_SCORES:
      handleGetCachedScores(msg.payload, sendResponse);
      return true;

    case Actions.TEST_CONNECTION:
      handleTestConnection(msg.payload, sendResponse);
      return true;

    case Actions.GET_POSITION_LIBRARY:
      handleGetPositionLibrary(sendResponse);
      return true;

    case Actions.GET_MANUAL_JOBS:
      handleGetManualJobs(sendResponse);
      return true;

    case Actions.UPSERT_MANUAL_JOB:
      handleUpsertManualJob(msg.payload, sendResponse);
      return true;

    case Actions.DELETE_MANUAL_JOB:
      handleDeleteManualJob(msg.payload, sendResponse);
      return true;

    case Actions.START_MANUAL_ANALYSIS:
      handleStartManualAnalysis(msg.payload, sendResponse);
      return true;

    case Actions.DETECT_INSERTED_JOB:
      handleDetectInsertedJob(msg.payload, sendResponse);
      return true;

    case Actions.TOGGLE_SAVE_POSITION:
      handleToggleSavePosition(msg.payload, sendResponse);
      return true;

    case Actions.DELETE_HISTORY_ENTRY:
      handleDeleteHistoryEntry(msg.payload, sendResponse);
      return true;

    case Actions.DELETE_SAVED_POSITION:
      handleDeleteSavedPosition(msg.payload, sendResponse);
      return true;

    default:
      sendResponse({ ok: false, error: 'Unknown action' });
  }
});

async function warmResumeState() {
  currentResume = await loadPersistentResume();
}

async function ensureResumeLoaded() {
  if (!currentResume?.text) {
    currentResume = await loadPersistentResume();
  }
  return currentResume;
}

async function getActiveTab() {
  const currentWindowTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (currentWindowTabs[0]) {
    return currentWindowTabs[0];
  }

  const lastFocusedTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return lastFocusedTabs[0] || null;
}

async function fetchCurrentJDData(forceRefresh = false) {
  if (!forceRefresh && currentJDData?.description) {
    return currentJDData;
  }

  const activeTab = await getActiveTab();
  if (!activeTab?.id) {
    return currentJDData;
  }

  try {
    const response = await sendTabMessageWithInjection(activeTab.id, { type: Actions.GET_JD_DATA });
    if (response?.payload) {
      currentJDData = response.payload;
    }
  } catch {
    // Ignore tab connection failures and fall back to in-memory data.
  }

  return currentJDData;
}

async function tryInjectScore(tabId, jobId, score) {
  if (!tabId || !jobId || typeof score !== 'number') {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: Actions.INJECT_SCORE,
      payload: { jobId, score },
    });
  } catch {
    // Badge injection is best effort.
  }
}

async function ensureLinkedInContentScript(tabId) {
  if (!tabId) {
    return false;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content/index.js'],
    });
    return true;
  } catch {
    return false;
  }
}

async function sendTabMessageWithInjection(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    const injected = await ensureLinkedInContentScript(tabId);
    if (!injected) {
      throw error;
    }

    await delay(150);
    return chrome.tabs.sendMessage(tabId, message);
  }
}

function buildAnalysisPayload(result, jdData, extra = {}) {
  return {
    ...result,
    jobId: jdData?.jobId || null,
    sourceType: jdData?.sourceType || 'linkedin',
    jobTitle: jdData?.title || '',
    company: jdData?.company || '',
    location: jdData?.location || '',
    jobUrl: jdData?.url || '',
    sourceUrl: jdData?.sourceUrl || jdData?.url || '',
    ...extra,
  };
}

function buildCachedResponse(entry, includeResult = false) {
  const metadata = entry.data?.metadata || {};
  const response = {
    jobId: entry.jobId,
    sourceType: entry.summary?.sourceType || 'linkedin',
    score: entry.summary?.score ?? null,
    analyzedAt: entry.summary?.analyzedAt || null,
    title: entry.summary?.title || '',
    company: entry.summary?.company || '',
    location: entry.summary?.location || '',
    url: entry.summary?.url || '',
    sourceUrl: entry.summary?.sourceUrl || entry.summary?.url || '',
    jdLanguage: entry.summary?.jdLanguage || entry.data?.metadata?.jdLanguage || 'Unknown',
    requiredExperience: entry.summary?.requiredExperience || entry.data?.metadata?.requiredExperience || null,
    requiredLanguages: entry.summary?.requiredLanguages || entry.data?.metadata?.requiredLanguages || [],
    kmEligible: entry.summary?.kmEligible === true,
    sponsorshipLabel: entry.summary?.sponsorshipLabel || null,
    sponsorshipCompany: entry.summary?.sponsorshipCompany || null,
    sponsorshipConfidence: entry.summary?.sponsorshipConfidence || null,
    analysisPreset: entry.summary?.analysisPreset || metadata.analysisPreset || 'balanced',
    promptTuningMode: entry.summary?.promptTuningMode || metadata.promptTuningMode || 'balanced',
    isCustomProfile: entry.summary?.isCustomProfile === true || metadata.isCustomProfile === true,
    includeSponsorshipInScore: entry.summary?.includeSponsorshipInScore !== false && metadata.includeSponsorshipInScore !== false,
    weightsApplied: entry.summary?.weightsApplied || metadata.weightsApplied || {},
    timing: entry.summary?.timing || metadata.timing || null,
  };

  if (includeResult) {
    response.result = entry.data;
  }

  return response;
}

function buildSavedPositionResponse(position) {
  return {
    positionKey: position.positionKey,
    jobId: position.jobId,
    sourceType: position.sourceType || 'linkedin',
    title: position.title || '',
    company: position.company || '',
    location: position.location || '',
    url: position.url || '',
    sourceUrl: position.sourceUrl || position.url || '',
    savedAt: position.savedAt || null,
    updatedAt: position.updatedAt || null,
    score: position.lastResult?.overallMatchPercent ?? position.summary?.score ?? null,
    result: position.lastResult || null,
    summary: position.summary || null,
  };
}

function shouldIgnoreCachedEntry(entry) {
  const result = entry?.data;
  const triggers = result?.metadata?.degradationTriggers || [];
  if (result?.overallMatchPercent !== 0) {
    return false;
  }

  return triggers.includes(DegradationTrigger.MODEL_NO_OUTPUT)
    || triggers.includes(DegradationTrigger.MODEL_FIELD_MISSING)
    || triggers.includes(DegradationTrigger.JD_EXTRACT_FAIL);
}

async function maybeBroadcastCachedResult(jdData) {
  const resume = await ensureResumeLoaded();
  if (!resume?.hash || !jdData?.jobId) {
    return;
  }

  const config = await loadConfig();
  const cacheContext = await buildCacheContext(config, resume.hash, MATCH_PROMPT_VERSION);
  const cachedEntry = await CacheManager.getEntry(jdData.jobId, cacheContext);
  if (!cachedEntry || shouldIgnoreCachedEntry(cachedEntry)) {
    return;
  }

  const activeTab = await getActiveTab();
  await tryInjectScore(activeTab?.id, jdData.jobId, cachedEntry.summary?.score);
  broadcast({
    type: Actions.ANALYSIS_RESULT,
    payload: buildAnalysisPayload(cachedEntry.data, jdData, {
      fromCache: true,
      cachedAt: cachedEntry.summary?.analyzedAt || null,
    }),
  });
}

function handleJDExtracted(payload) {
  currentJDData = payload;
  broadcast({ type: Actions.JD_DATA, payload });
  maybeBroadcastCachedResult(payload).catch(err => {
    console.warn('[SW] Failed to broadcast cached result:', err);
  });
}

function handleJDExtractFailed(payload) {
  currentJDData = {
    title: payload?.partialData?.title || '',
    company: payload?.partialData?.company || '',
    location: payload?.partialData?.location || '',
    description: '',
    extractionConfidence: 'failed',
    error: payload?.error,
    jobId: payload?.jobId || payload?.partialData?.jobId || null,
    url: payload?.partialData?.url || '',
  };
  broadcast({ type: Actions.JD_DATA, payload: currentJDData });
}

async function handleResumeUploaded(payload, sendResponse) {
  try {
    currentResume = await savePersistentResume(payload);
    sendResponse({
      ok: true,
      data: {
        fileName: currentResume.fileName,
        hash: currentResume.hash,
        updatedAt: currentResume.updatedAt,
      },
    });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to save resume.' });
  }
}

async function handleResumeCleared(sendResponse) {
  try {
    currentResume = null;
    await clearPersistentResume();
    sendResponse({ ok: true });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to clear resume.' });
  }
}

async function runAnalysisForJob(jdData, resume, config, options = {}) {
  const cacheContext = await buildCacheContext(config, resume.hash, MATCH_PROMPT_VERSION);
  const forceRefresh = options.forceRefresh === true;
  const activeTab = options.injectScore !== false ? await getActiveTab() : null;

  if (!forceRefresh && jdData.jobId && resume.hash) {
    const cachedEntry = await CacheManager.getEntry(jdData.jobId, cacheContext);
    if (cachedEntry && !shouldIgnoreCachedEntry(cachedEntry)) {
      if (options.injectScore !== false) {
        await tryInjectScore(activeTab?.id, jdData.jobId, cachedEntry.summary?.score);
      }
      const cachedPayload = buildAnalysisPayload(cachedEntry.data, jdData, {
        fromCache: true,
        cachedAt: cachedEntry.summary?.analyzedAt || null,
        ...options.payloadExtras,
      });
      return { fromCache: true, payload: cachedPayload, result: cachedEntry.data, cacheContext };
    }
  }

  if (options.broadcastProgress !== false) {
    broadcast({
      type: Actions.ANALYSIS_PROGRESS,
      payload: { stage: 'start', message: options.startMessage || 'Starting analysis...' },
    });
  }

  const result = await runAnalysis(
    jdData,
    resume.text,
    config,
    options.progressCallback || ((stage, message) => {
      broadcast({ type: Actions.ANALYSIS_PROGRESS, payload: { stage, message } });
    }),
  );

  if (jdData.jobId && resume.hash && !shouldIgnoreCachedEntry({ data: result })) {
    await CacheManager.saveResult(jdData.jobId, cacheContext, jdData, result);
  }

  if (options.injectScore !== false) {
    await tryInjectScore(activeTab?.id, jdData.jobId, result.overallMatchPercent);
  }

  const resultPayload = buildAnalysisPayload(result, jdData, {
    fromCache: false,
    ...options.payloadExtras,
  });

  await PositionManager.updateSavedPositionResult(jdData.jobId, jdData.sourceType || 'linkedin', resultPayload, {
    score: result.overallMatchPercent,
    analyzedAt: result.metadata?.analysisTimestamp || new Date().toISOString(),
  });

  return { fromCache: false, payload: resultPayload, result, cacheContext };
}

async function handleStartAnalysis(requestPayload, sendResponse) {
  if (isAnalyzing) {
    sendResponse({ ok: false, error: 'Analysis is already running.' });
    return;
  }

  const resume = await ensureResumeLoaded();
  if (!resume?.text) {
    sendResponse({ ok: false, error: 'Please upload a resume first.' });
    return;
  }

  isAnalyzing = true;

  try {
    const config = await loadConfig();

    if (!config.apiKey?.trim()) {
      sendResponse({ ok: false, error: 'Please configure an API key first.', errorType: ErrorTypes.CONFIG_MISSING });
      return;
    }

    const jdData = await fetchCurrentJDData(true) || {
      title: '',
      company: '',
      location: '',
      description: '',
      extractionConfidence: 'failed',
      jobId: null,
      url: '',
    };

    const forceRefresh = requestPayload?.forceRefresh === true;
    const analysisRun = await runAnalysisForJob(jdData, resume, config, { forceRefresh });
    broadcast({ type: Actions.ANALYSIS_RESULT, payload: analysisRun.payload });
    sendResponse({ ok: true, cached: analysisRun.fromCache, data: analysisRun.payload });
  } catch (err) {
    const normalizedError = normalizeUserFacingError(err);
    broadcast({ type: Actions.ANALYSIS_ERROR, payload: normalizedError });
    sendResponse({ ok: false, ...normalizedError });
  } finally {
    isAnalyzing = false;
  }
}

async function handleStartManualAnalysis(requestPayload, sendResponse) {
  if (isAnalyzing) {
    sendResponse({ ok: false, error: 'Analysis is already running.' });
    return;
  }

  const resume = await ensureResumeLoaded();
  if (!resume?.text) {
    sendResponse({ ok: false, error: 'Please upload a resume first.' });
    return;
  }

  isAnalyzing = true;

  try {
    const config = await loadConfig();
    if (!config.apiKey?.trim()) {
      sendResponse({ ok: false, error: 'Please configure an API key first.', errorType: ErrorTypes.CONFIG_MISSING });
      return;
    }

    const manualJob = await PositionManager.getManualJob(requestPayload?.manualJobId);
    if (!manualJob?.manualJobId || !manualJob?.description) {
      sendResponse({ ok: false, error: 'The inserted job could not be found.' });
      return;
    }

    const jdData = {
      jobId: manualJob.manualJobId,
      sourceType: 'inserted',
      title: manualJob.title || 'Inserted job',
      company: manualJob.company || '',
      location: manualJob.location || '',
      description: manualJob.description || '',
      extractionConfidence: 'manual',
      url: manualJob.sourceUrl || '',
      sourceUrl: manualJob.sourceUrl || '',
      manualJobId: manualJob.manualJobId,
      timestamp: manualJob.updatedAt || new Date().toISOString(),
    };

    const analysisRun = await runAnalysisForJob(jdData, resume, config, {
      forceRefresh: requestPayload?.forceRefresh === true,
      injectScore: false,
      startMessage: `Analyzing inserted job: ${manualJob.title || manualJob.manualJobId}`,
    });

    await PositionManager.markManualJobAnalyzed(manualJob.manualJobId, analysisRun.payload?.metadata?.analysisTimestamp || new Date().toISOString());
    broadcast({ type: Actions.ANALYSIS_RESULT, payload: analysisRun.payload });
    sendResponse({ ok: true, cached: analysisRun.fromCache, data: analysisRun.payload });
  } catch (err) {
    const normalizedError = normalizeUserFacingError(err);
    broadcast({ type: Actions.ANALYSIS_ERROR, payload: normalizedError });
    sendResponse({ ok: false, ...normalizedError });
  } finally {
    isAnalyzing = false;
  }
}

async function handleBatchAnalysis(requestPayload, sendResponse) {
  if (isAnalyzing) {
    sendResponse({ ok: false, error: 'Analysis is already running.' });
    return;
  }

  const resume = await ensureResumeLoaded();
  if (!resume?.text) {
    sendResponse({ ok: false, error: 'Please upload a resume first.' });
    return;
  }

  isAnalyzing = true;

  try {
    const config = await loadConfig();
    const cacheContext = await buildCacheContext(config, resume.hash, MATCH_PROMPT_VERSION);
    if (!config.apiKey?.trim()) {
      throw new Error('Please configure an API key first.');
    }

    await CacheManager.cleanupExpired();

    const activeTab = await getActiveTab();
    if (!activeTab?.id) {
      throw new Error('Cannot connect to the active LinkedIn tab.');
    }

    const listResponse = await sendTabMessageWithInjection(activeTab.id, { type: Actions.GET_JOB_LIST });
    let jobs = Array.isArray(listResponse?.jobs) ? listResponse.jobs : [];

    if (Array.isArray(requestPayload?.jobIds) && requestPayload.jobIds.length) {
      const allowedIds = new Set(requestPayload.jobIds);
      jobs = jobs.filter(job => allowedIds.has(job.jobId));
    } else if (requestPayload?.batchSize && requestPayload.batchSize !== 'all') {
      jobs = jobs.slice(0, Math.max(1, Number.parseInt(requestPayload.batchSize, 10) || 10));
    }

    if (!jobs.length) {
      throw new Error('No jobs were detected on the current page.');
    }

    const forceRefresh = requestPayload?.forceRefresh === true;
    const extractedJobs = [];

    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      broadcast({
        type: Actions.ANALYSIS_PROGRESS,
        payload: {
          stage: 'queue',
          message: `Processing ${index + 1}/${jobs.length}: ${job.title || job.company || job.jobId}`,
        },
      });

      const cachedEntry = !forceRefresh ? await CacheManager.getEntry(job.jobId, cacheContext) : null;
      if (cachedEntry) {
        if (shouldIgnoreCachedEntry(cachedEntry)) {
          // Skip degraded cached entries and re-run analysis for a clean result.
        } else {
          await tryInjectScore(activeTab.id, job.jobId, cachedEntry.summary?.score);
          broadcast({
            type: Actions.ANALYSIS_RESULT,
            payload: buildAnalysisPayload(
              cachedEntry.data,
              {
                jobId: job.jobId,
                title: cachedEntry.summary?.title || job.title,
                company: cachedEntry.summary?.company || job.company,
                location: cachedEntry.summary?.location || '',
                url: cachedEntry.summary?.url || '',
              },
              {
                fromCache: true,
                cachedAt: cachedEntry.summary?.analyzedAt || null,
                batchIndex: index,
                totalBatch: jobs.length,
              }
            ),
          });
          continue;
        }
      }

      await sendTabMessageWithInjection(activeTab.id, {
        type: Actions.FOCUS_JOB,
        payload: { jobId: job.jobId },
      });

      const jdData = await waitForJobDetails(activeTab.id, job.jobId);
      if (!jdData) {
        broadcast({
          type: Actions.ANALYSIS_ERROR,
          payload: { error: `Skipped ${job.title || job.jobId} because the job details never loaded.` },
        });
        continue;
      }

      extractedJobs.push({ job, jdData, index });
    }

    await runWithConcurrency(
      extractedJobs,
      Math.max(1, Number.parseInt(requestPayload?.maxParallel, 10) || DEFAULT_BATCH_CONCURRENCY),
      async ({ job, jdData, index }) => {
        const result = await runAnalysis(jdData, resume.text, config, (stage, message) => {
          broadcast({
            type: Actions.ANALYSIS_PROGRESS,
            payload: {
              stage,
              message: `${index + 1}/${jobs.length}: ${message}`,
            },
          });
        });

        if (!shouldIgnoreCachedEntry({ data: result })) {
          await CacheManager.saveResult(job.jobId, cacheContext, jdData, result);
        }
        await tryInjectScore(activeTab.id, job.jobId, result.overallMatchPercent);

        const resultPayload = buildAnalysisPayload(result, jdData, {
          fromCache: false,
          batchIndex: index,
          totalBatch: jobs.length,
        });
        await PositionManager.updateSavedPositionResult(job.jobId, jdData.sourceType || 'linkedin', resultPayload, {
          score: result.overallMatchPercent,
          analyzedAt: result.metadata?.analysisTimestamp || new Date().toISOString(),
        });

        broadcast({
          type: Actions.ANALYSIS_RESULT,
          payload: resultPayload,
        });
      },
    );

    broadcast({
      type: Actions.ANALYSIS_PROGRESS,
      payload: { stage: 'complete', message: 'Batch analysis finished.' },
    });
    sendResponse({ ok: true, analyzedCount: jobs.length });
  } catch (err) {
    const normalizedError = normalizeUserFacingError(err);
    broadcast({ type: Actions.ANALYSIS_ERROR, payload: normalizedError });
    sendResponse({ ok: false, ...normalizedError });
  } finally {
    isAnalyzing = false;
  }
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) {
        return;
      }
      await worker(item);
    }
  });

  await Promise.all(runners);
}

async function waitForJobDetails(tabId, jobId) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await delay(700);

    try {
      const response = await sendTabMessageWithInjection(tabId, { type: Actions.GET_JD_DATA });
      const jdData = response?.payload;

      if (jdData?.jobId === jobId && jdData.description?.length > 80) {
        currentJDData = jdData;
        return jdData;
      }
    } catch {
      // Keep waiting while LinkedIn re-renders.
    }
  }

  return null;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleUpdateConfig(payload, sendResponse) {
  try {
    await saveConfig(payload);
    sendResponse({ ok: true });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to save config.' });
  }
}

async function handleGetConfig(sendResponse) {
  try {
    const config = await loadConfig();
    sendResponse({ ok: true, data: config });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to load config.' });
  }
}

async function handleGetJDData(sendResponse) {
  try {
    const jdData = await fetchCurrentJDData(true);
    if (jdData) {
      sendResponse({ ok: true, data: jdData });
      return;
    }
    sendResponse({ ok: false, error: 'Unable to read job data from the current page.' });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Unable to read job data.' });
  }
}

async function handleGetCachedScores(payload, sendResponse) {
  try {
    await CacheManager.cleanupExpired();

    const resume = await ensureResumeLoaded();
    if (!resume?.hash) {
      sendResponse({ ok: true, resumeAvailable: false, entries: [] });
      return;
    }

    const jobIds = Array.isArray(payload?.jobIds) ? payload.jobIds : [];
    const config = await loadConfig();
    const cacheContext = await buildCacheContext(config, resume.hash, MATCH_PROMPT_VERSION);
    const entries = (await CacheManager.getEntries(jobIds, cacheContext))
      .filter(entry => !shouldIgnoreCachedEntry(entry));
    sendResponse({
      ok: true,
      resumeAvailable: true,
      resumeHash: resume.hash,
      entries: entries.map(entry => buildCachedResponse(entry, payload?.includeResult)),
    });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Unable to read cached scores.' });
  }
}

async function handleTestConnection(payload, sendResponse) {
  try {
    const config = {
      ...(await loadConfig()),
      ...(payload || {}),
    };

    if (!config.apiKey?.trim()) {
      sendResponse({ ok: false, error: 'Please provide an API key first.' });
      return;
    }

    const testResponse = await runConnectionTest(config);
    sendResponse({ ok: true, data: testResponse });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Connection test failed.' });
  }
}

async function handleGetManualJobs(sendResponse) {
  try {
    const jobs = await PositionManager.listManualJobs();
    sendResponse({ ok: true, data: jobs });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to load inserted jobs.' });
  }
}

async function handleUpsertManualJob(payload, sendResponse) {
  try {
    if (!payload?.title?.trim() || !payload?.description?.trim()) {
      sendResponse({ ok: false, error: 'Inserted jobs need at least a title and a description.' });
      return;
    }

    const job = await PositionManager.upsertManualJob({
      manualJobId: payload.manualJobId || '',
      title: payload.title.trim(),
      company: payload.company?.trim() || '',
      location: payload.location?.trim() || '',
      description: payload.description.trim(),
      sourceUrl: payload.sourceUrl?.trim() || '',
      rawInput: payload.rawInput?.trim() || '',
    });

    sendResponse({ ok: true, data: job });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to save inserted job.' });
  }
}

async function handleDeleteManualJob(payload, sendResponse) {
  try {
    await PositionManager.deleteManualJob(payload?.manualJobId);
    sendResponse({ ok: true });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to delete inserted job.' });
  }
}

async function handleToggleSavePosition(payload, sendResponse) {
  try {
    if (!payload?.jobId) {
      sendResponse({ ok: false, error: 'Missing position id.' });
      return;
    }

    const result = await PositionManager.toggleSavedPosition(payload);
    sendResponse({ ok: true, data: result });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to update saved positions.' });
  }
}

async function handleDeleteSavedPosition(payload, sendResponse) {
  try {
    const jobId = payload?.jobId;
    const sourceType = payload?.sourceType === 'inserted' ? 'inserted' : 'linkedin';
    if (!jobId) {
      sendResponse({ ok: false, error: 'Missing position id.' });
      return;
    }

    const deleted = await PositionManager.deleteSavedPosition(jobId, sourceType);
    sendResponse({ ok: true, data: { deleted } });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to delete the saved position.' });
  }
}

async function handleDeleteHistoryEntry(payload, sendResponse) {
  try {
    const jobId = payload?.jobId;
    if (!jobId) {
      sendResponse({ ok: false, error: 'Missing history entry id.' });
      return;
    }

    const resume = await ensureResumeLoaded();
    if (!resume?.hash) {
      sendResponse({ ok: false, error: 'No active resume is loaded.' });
      return;
    }

    const config = await loadConfig();
    const cacheContext = await buildCacheContext(config, resume.hash, MATCH_PROMPT_VERSION);
    const deleted = await CacheManager.deleteEntry(jobId, cacheContext);
    sendResponse({ ok: true, data: { deleted } });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to delete the history entry.' });
  }
}

async function handleDetectInsertedJob(payload, sendResponse) {
  try {
    const rawText = payload?.rawText?.trim() || '';
    if (!rawText || rawText.length < 40) {
      sendResponse({ ok: false, error: 'Paste more job content so the plugin can detect the fields.' });
      return;
    }

    const config = await loadConfig();
    if (!config?.apiKey?.trim()) {
      sendResponse({ ok: false, error: 'Configure an API key to use AI-assisted detection.' });
      return;
    }

    const aiDetection = await detectInsertedJobWithAI(rawText, config);
    sendResponse({ ok: true, data: aiDetection });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to detect inserted job fields.' });
  }
}

async function handleGetPositionLibrary(sendResponse) {
  try {
    const resume = await ensureResumeLoaded();
    const manualJobs = await PositionManager.listManualJobs();
    const savedPositions = await PositionManager.listSavedPositions();
    let historyEntries = [];

    if (resume?.hash) {
      const config = await loadConfig();
      const cacheContext = await buildCacheContext(config, resume.hash, MATCH_PROMPT_VERSION);
      historyEntries = (await CacheManager.listEntries(cacheContext))
        .filter(entry => !shouldIgnoreCachedEntry(entry))
        .map(entry => buildCachedResponse(entry, false));
    }

    const partitionBySource = items => ({
      linkedin: items.filter(item => (item.sourceType || 'linkedin') === 'linkedin'),
      inserted: items.filter(item => (item.sourceType || 'linkedin') === 'inserted'),
    });

    sendResponse({
      ok: true,
      data: {
        resumeAvailable: !!resume?.hash,
        manualJobs,
        history: partitionBySource(historyEntries),
        saved: partitionBySource(savedPositions.map(buildSavedPositionResponse)),
      },
    });
  } catch (err) {
    sendResponse({ ok: false, error: err.message || 'Failed to load history and saved positions.' });
  }
}

async function runConnectionTest(config) {
  const response = await callLLM(
    {
      ...config,
      maxTokens: Math.min(config.maxTokens || 128, 128),
      temperature: 0,
      timeoutMs: Math.min(config.timeoutMs || 30000, 30000),
      maxRetries: 0,
    },
    {
      systemPrompt: 'You are a connection test. Respond with plain text: OK.',
      userPrompt: 'Reply with OK.',
    },
  );

  return {
    model: response.resolvedModel || config.modelId,
    preview: (response.content || '').slice(0, 80),
  };
}

async function detectInsertedJobWithAI(rawText, config) {
  const response = await callLLM(
    {
      ...config,
      maxTokens: Math.min(config.maxTokens || 512, 700),
      temperature: 0,
      maxRetries: Math.min(config.maxRetries ?? 1, 1),
    },
    {
      systemPrompt: [
        'You extract structured job posting fields from pasted text.',
        'Return valid JSON only.',
        'Use this schema:',
        '{',
        '  "title": "string",',
        '  "company": "string",',
        '  "location": "string",',
        '  "sourceUrl": "string",',
        '  "description": "string",',
        '  "confidence": "high|medium|low"',
        '}',
        'Rules:',
        '- Prefer empty strings over invented values.',
        '- description should contain the main job description/body, not only the title line.',
        '- sourceUrl should be a direct URL if one is present in the text; otherwise use an empty string.',
        '- For location, if the text only gives a city but the country can be inferred with high confidence from the text, expand it to a fuller location such as "Rotterdam, Netherlands" or "Berlin, Germany".',
        '- If the role is clearly in the Netherlands, prefer explicitly including "Netherlands" in the location field.',
        '- If you cannot infer the country confidently, keep only the city or original location text instead of inventing details.',
        '- Do not include markdown fences or extra commentary.',
      ].join('\n'),
      userPrompt: `Extract the job fields from this pasted content:\n\n${rawText}`,
    },
  );

  const parsed = safeParseJSON(response.content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('The model did not return a usable structured detection result.');
  }

  return {
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    company: typeof parsed.company === 'string' ? parsed.company.trim() : '',
    location: enrichDetectedLocation(typeof parsed.location === 'string' ? parsed.location.trim() : '', rawText),
    sourceUrl: typeof parsed.sourceUrl === 'string' ? parsed.sourceUrl.trim() : '',
    description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
  };
}

function enrichDetectedLocation(location, rawText) {
  const normalizedLocation = (location || '').trim();
  const combined = `${normalizedLocation}\n${rawText || ''}`.toLowerCase();

  if (!normalizedLocation) {
    return normalizedLocation;
  }

  if (/\bnetherlands\b|\bnederland\b|\bholland\b/i.test(normalizedLocation)) {
    return normalizedLocation;
  }

  const dutchCityMap = {
    amsterdam: 'Amsterdam, Netherlands',
    rotterdam: 'Rotterdam, Netherlands',
    utrecht: 'Utrecht, Netherlands',
    eindhoven: 'Eindhoven, Netherlands',
    groningen: 'Groningen, Netherlands',
    delft: 'Delft, Netherlands',
    leiden: 'Leiden, Netherlands',
    maastricht: 'Maastricht, Netherlands',
    arnhem: 'Arnhem, Netherlands',
    nijmegen: 'Nijmegen, Netherlands',
    haarlem: 'Haarlem, Netherlands',
    almere: 'Almere, Netherlands',
    amersfoort: 'Amersfoort, Netherlands',
    tilburg: 'Tilburg, Netherlands',
    breda: 'Breda, Netherlands',
    enschede: 'Enschede, Netherlands',
    dordrecht: 'Dordrecht, Netherlands',
    zoetermeer: 'Zoetermeer, Netherlands',
    'the hague': 'The Hague, Netherlands',
    'den haag': 'The Hague, Netherlands',
    'den bosch': 'Den Bosch, Netherlands',
  };

  for (const [city, fullLocation] of Object.entries(dutchCityMap)) {
    if (combined.includes(city)) {
      return fullLocation;
    }
  }

  if (/\bgermany\b|\bdeutschland\b/i.test(combined) && !/\bgermany\b/i.test(normalizedLocation)) {
    return `${normalizedLocation}, Germany`;
  }

  if (/\bnetherlands\b|\bnederland\b|\bholland\b/i.test(combined)) {
    return `${normalizedLocation}, Netherlands`;
  }

  return normalizedLocation;
}

function broadcast(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Side panel might be closed. This is expected.
  });
}

function normalizeUserFacingError(error) {
  const rawMessage = error?.message || 'Unknown analysis error.';
  const lower = rawMessage.toLowerCase();

  if (lower.includes('api key')) {
    return {
      errorType: ErrorTypes.CONFIG_MISSING,
      error: 'API configuration is incomplete. Add a valid API key and try again.',
      details: rawMessage,
    };
  }

  if (lower.includes('404') || lower.includes('model') && lower.includes('not found')) {
    return {
      errorType: ErrorTypes.MODEL_NOT_FOUND,
      error: 'The selected model is unavailable. Check the model name or test the connection first.',
      details: rawMessage,
    };
  }

  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized')) {
    return {
      errorType: ErrorTypes.AUTH_FAILED,
      error: 'Authentication failed. Please verify the API key and provider settings.',
      details: rawMessage,
    };
  }

  if (lower.includes('429') || lower.includes('rate limit')) {
    return {
      errorType: ErrorTypes.RATE_LIMITED,
      error: 'The provider is rate limiting requests right now. Please wait a moment and retry.',
      details: rawMessage,
    };
  }

  if (lower.includes('unable to read job data') || lower.includes('job description extraction failed') || lower.includes('details never loaded')) {
    return {
      errorType: ErrorTypes.JD_EXTRACTION_FAILED,
      error: 'LinkedIn job details could not be read. Refresh the job page and try again.',
      details: rawMessage,
    };
  }

  if (lower.includes('resume')) {
    return {
      errorType: ErrorTypes.RESUME_PARSE_FAILED,
      error: 'The resume could not be parsed correctly. Try another PDF, DOCX, or TXT file.',
      details: rawMessage,
    };
  }

  if (lower.includes('network') || lower.includes('fetch')) {
    return {
      errorType: ErrorTypes.NETWORK_FAILED,
      error: 'A network error interrupted the analysis. Please retry in a moment.',
      details: rawMessage,
    };
  }

  if (lower.includes('json') || lower.includes('format') || lower.includes('parsed')) {
    return {
      errorType: ErrorTypes.MODEL_OUTPUT_INVALID,
      error: 'The model responded, but the result format was incomplete. Re-analyze or switch to a more stable model.',
      details: rawMessage,
    };
  }

  return {
    errorType: ErrorTypes.UNKNOWN_ERROR,
    error: rawMessage,
    details: rawMessage,
  };
}
