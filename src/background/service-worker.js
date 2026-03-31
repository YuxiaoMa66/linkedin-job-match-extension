import { Actions, DegradationTrigger, ErrorTypes } from '../shared/constants.js';
import { loadConfig, saveConfig } from './config-manager.js';
import { CacheManager } from './cache-manager.js';
import { runAnalysis } from './match-engine.js';
import { callLLM } from './llm-adapter.js';
import { MATCH_PROMPT_VERSION } from '../prompts/prompt-templates.js';
import { buildCacheContext } from '../shared/scoring-profile.js';
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
    jobTitle: jdData?.title || '',
    company: jdData?.company || '',
    location: jdData?.location || '',
    jobUrl: jdData?.url || '',
    ...extra,
  };
}

function buildCachedResponse(entry, includeResult = false) {
  const metadata = entry.data?.metadata || {};
  const response = {
    jobId: entry.jobId,
    score: entry.summary?.score ?? null,
    analyzedAt: entry.summary?.analyzedAt || null,
    title: entry.summary?.title || '',
    company: entry.summary?.company || '',
    location: entry.summary?.location || '',
    url: entry.summary?.url || '',
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
    const cacheContext = await buildCacheContext(config, resume.hash, MATCH_PROMPT_VERSION);

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

    if (!forceRefresh && jdData.jobId && resume.hash) {
      const cachedEntry = await CacheManager.getEntry(jdData.jobId, cacheContext);
      if (cachedEntry && !shouldIgnoreCachedEntry(cachedEntry)) {
        const activeTab = await getActiveTab();
        await tryInjectScore(activeTab?.id, jdData.jobId, cachedEntry.summary?.score);
        const cachedPayload = buildAnalysisPayload(cachedEntry.data, jdData, {
          fromCache: true,
          cachedAt: cachedEntry.summary?.analyzedAt || null,
        });
        broadcast({ type: Actions.ANALYSIS_RESULT, payload: cachedPayload });
        sendResponse({ ok: true, cached: true, data: cachedPayload });
        return;
      }
    }

    broadcast({
      type: Actions.ANALYSIS_PROGRESS,
      payload: { stage: 'start', message: 'Starting analysis...' },
    });

    const result = await runAnalysis(
      jdData,
      resume.text,
      config,
      (stage, message) => {
        broadcast({ type: Actions.ANALYSIS_PROGRESS, payload: { stage, message } });
      }
    );

    if (jdData.jobId && resume.hash && !shouldIgnoreCachedEntry({ data: result })) {
      await CacheManager.saveResult(jdData.jobId, cacheContext, jdData, result);
    }

    const activeTab = await getActiveTab();
    await tryInjectScore(activeTab?.id, jdData.jobId, result.overallMatchPercent);

    const resultPayload = buildAnalysisPayload(result, jdData, { fromCache: false });
    broadcast({ type: Actions.ANALYSIS_RESULT, payload: resultPayload });
    sendResponse({ ok: true, data: resultPayload });
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

        broadcast({
          type: Actions.ANALYSIS_RESULT,
          payload: buildAnalysisPayload(result, jdData, {
            fromCache: false,
            batchIndex: index,
            totalBatch: jobs.length,
          }),
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
