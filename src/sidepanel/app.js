import {
  Actions,
  DEFAULT_ANALYSIS_PRESET,
  ItemNames,
  PROVIDERS,
} from '../shared/constants.js';
import {
  getEffectiveWeights,
  getPresetLabel,
  hasCustomWeights,
  sanitizeCustomWeights,
} from '../shared/scoring-profile.js';
import { getPromptTuningInstructions } from '../prompts/prompt-templates.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const els = {
  navButtons: $$('.nav-btn'),
  tabs: $$('.tab-content'),
  jdStatusBadge: $('#jd-status-badge'),
  jdInfo: $('#jd-info'),
  cachedResultHint: $('#cached-result-hint'),
  reanalyzeBtn: $('#reanalyze-btn'),

  resumeInput: $('#resume-input'),
  dropzone: $('#dropzone'),
  fileInfo: $('#file-info'),
  fileName: $('#file-name'),
  fileRemove: $('#file-remove'),
  resumeStatusBadge: $('#resume-status-badge'),

  manualJobsCard: $('#manual-jobs-card'),
  manualJobsToggle: $('#manual-jobs-toggle'),
  manualJobsBody: $('#manual-jobs-body'),
  manualDetectModeButtons: $$('[data-manual-detect-mode]'),
  manualRawInput: $('#manual-raw-input'),
  manualDetectBtn: $('#manual-detect-btn'),
  manualClearBtn: $('#manual-clear-btn'),
  manualTitle: $('#manual-title'),
  manualCompany: $('#manual-company'),
  manualLocation: $('#manual-location'),
  manualSourceUrl: $('#manual-source-url'),
  manualDescription: $('#manual-description'),
  manualAnalyzeBtn: $('#manual-analyze-btn'),
  manualSaveHint: $('#manual-save-hint'),
  manualJobList: $('#manual-job-list'),

  jobListCard: $('#job-list-card'),
  jobListSummary: $('#job-list-summary'),
  jobList: $('#job-list'),
  jobListLoadMore: $('#job-list-load-more'),
  batchReanalyzeBtn: $('#batch-reanalyze-btn'),
  jobDetailPanel: $('#job-detail-panel'),
  jobDetailBack: $('#job-detail-back'),
  jobDetailContent: $('#job-detail-content'),
  libraryDetailPanel: $('#library-detail-panel'),
  libraryDetailBack: $('#library-detail-back'),
  libraryDetailContent: $('#library-detail-content'),
  manualDetailPanel: $('#manual-detail-panel'),
  manualDetailBack: $('#manual-detail-back'),
  manualDetailContent: $('#manual-detail-content'),

  analyzeBtn: $('#analyze-btn'),
  batchAnalyzeBtn: $('#batch-analyze-btn'),
  singleJobAction: $('#single-job-action'),
  batchJobAction: $('#batch-job-action'),
  batchCount: $('#batch-count'),

  progressContainer: $('#progress-container'),
  progressFill: $('#progress-fill'),
  progressText: $('#progress-text'),
  resultsContainer: $('#results-container'),
  resultContext: $('#result-context'),
  savePositionBtn: $('#save-position-btn'),

  scoreValue: $('#score-value'),
  scoreRingFill: $('#score-ring-fill'),
  scoreStatusBadge: $('#score-status-badge'),
  scoreMeta: $('#score-meta'),
  breakdownList: $('#breakdown-list'),
  strengthsList: $('#strengths-list'),
  gapsList: $('#gaps-list'),
  sponsorshipCard: $('#sponsorship-card'),
  sponsorshipContent: $('#sponsorship-content'),
  metadataToggle: $('#metadata-toggle'),
  metadataContent: $('#metadata-content'),

  libraryCard: $('#library-card'),
  libraryToggle: $('#library-toggle'),
  libraryBody: $('#library-body'),
  libraryModeButtons: $$('[data-library-mode]'),
  librarySourceButtons: $$('[data-library-source]'),
  librarySummary: $('#library-summary'),
  libraryList: $('#library-list'),

  settingProvider: $('#setting-provider'),
  settingBaseUrl: $('#setting-baseurl'),
  settingApiKey: $('#setting-apikey'),
  settingModel: $('#setting-model'),
  settingModelList: $('#setting-model-list'),
  settingMaxTokens: $('#setting-maxtokens'),
  settingTemperature: $('#setting-temperature'),
  settingTimeout: $('#setting-timeout'),
  settingRetries: $('#setting-retries'),
  settingAutoAnalyze: $('#setting-autoanalyze'),
  settingAnalysisPreset: $('#setting-analysis-preset'),
  settingIncludeSponsorship: $('#setting-include-sponsorship'),
  settingModePromptPreview: $('#setting-mode-prompt-preview'),
  settingAdditionalInstructions: $('#setting-additional-instructions'),
  settingUseCustomWeights: $('#setting-use-custom-weights'),
  settingCustomPrompt: $('#setting-custom-prompt'),
  settingEnableDiagnostics: $('#setting-enable-diagnostics'),
  settingWeightTotal: $('#setting-weight-total'),
  resetWeightsBtn: $('#reset-weights-btn'),
  weightSkills: $('#weight-skills'),
  weightResponsibility: $('#weight-responsibility'),
  weightYears: $('#weight-years'),
  weightEducation: $('#weight-education'),
  weightLangLocation: $('#weight-lang-location'),
  weightSponsorship: $('#weight-sponsorship'),
  addModelBtn: $('#add-model-btn'),
  testConnectionBtn: $('#test-connection-btn'),
  testConnectionHint: $('#test-connection-hint'),
  togglePassword: $('#toggle-password'),
  saveConfigBtn: $('#save-config-btn'),
  saveHint: $('#save-hint'),
};

let currentJDData = null;
let resumeText = null;
let currentConfig = null;
let currentListJobs = [];
let currentListSignature = '';
let manualJobs = [];
let visibleJobCount = 10;
let isAnalyzing = false;
let scoreMap = new Map();
let lastAutoAnalyzeSignature = '';
let currentResultJobId = null;
let currentManualEditingId = null;
let currentResultPayload = null;
let savedPositionsMap = new Map();
let historyEntries = { linkedin: [], inserted: [] };
let libraryMode = 'history';
let librarySource = 'linkedin';
let manualDetectMode = 'rule';
let detailViewHost = 'none';

const WEIGHT_FIELD_MAP = Object.freeze({
  [ItemNames.SKILLS]: 'weightSkills',
  [ItemNames.RESPONSIBILITY]: 'weightResponsibility',
  [ItemNames.YEARS]: 'weightYears',
  [ItemNames.EDUCATION]: 'weightEducation',
  [ItemNames.LANG_LOCATION]: 'weightLangLocation',
  [ItemNames.SPONSORSHIP]: 'weightSponsorship',
});

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupTabNavigation();
  setupResumeUpload();
  setupAnalyzeButtons();
  setupManualJobs();
  setupLibrary();
  setupSettings();
  setupMetadataToggle();
  setupJobListControls();
  setupMessageListener();
  setupTabWatchers();

  await loadAndDisplayConfig();
  await loadPersistentResume();
  await refreshPageContext();
  await refreshPositionLibrary();
}

function setupTabNavigation() {
  els.navButtons.forEach(button => {
    button.addEventListener('click', () => {
      els.navButtons.forEach(item => item.classList.remove('active'));
      els.tabs.forEach(tab => tab.classList.remove('active'));
      button.classList.add('active');
      $(`#tab-${button.dataset.tab}`).classList.add('active');
    });
  });
}

function setupResumeUpload() {
  els.dropzone.addEventListener('click', () => els.resumeInput.click());

  els.dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    els.dropzone.classList.add('dragover');
  });

  els.dropzone.addEventListener('dragleave', () => {
    els.dropzone.classList.remove('dragover');
  });

  els.dropzone.addEventListener('drop', event => {
    event.preventDefault();
    els.dropzone.classList.remove('dragover');
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  });

  els.resumeInput.addEventListener('change', () => {
    const file = els.resumeInput.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  });

  els.fileRemove.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: Actions.CLEAR_RESUME });
      resumeText = null;
      els.resumeInput.value = '';
      resetResumeUi();
      scoreMap = new Map();
      currentResultJobId = null;
      els.cachedResultHint.classList.add('hidden');
      updateAnalyzeButtons();
      renderJobList();
      await refreshPageScores();
      showSaveHint('Resume removed.', 'success');
    } catch (err) {
      showError(`Failed to remove the resume: ${err.message}`);
    }
  });
}

async function loadPersistentResume() {
  const result = await chrome.storage.local.get('persistentResume');
  const storedResume = result.persistentResume;

  if (!storedResume?.text) {
    resetResumeUi();
    return;
  }

  resumeText = storedResume.text;
  els.fileName.textContent = storedResume.fileName || 'resume.txt';
  els.fileInfo.classList.remove('hidden');
  els.dropzone.classList.add('hidden');
  els.resumeStatusBadge.textContent = 'Saved';
  els.resumeStatusBadge.className = 'status-badge uploaded';
  updateAnalyzeButtons();
}

function resetResumeUi() {
  els.fileInfo.classList.add('hidden');
  els.dropzone.classList.remove('hidden');
  els.resumeStatusBadge.textContent = 'Missing';
  els.resumeStatusBadge.className = 'status-badge';
}

async function handleFileSelected(file) {
  try {
    const text = await extractResumeText(file);
    if (!text || text.trim().length < 30) {
      showError('The resume text is too short. Please upload a text-based PDF, DOCX or TXT file.');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: Actions.RESUME_UPLOADED,
      payload: { text: text.trim(), fileName: file.name },
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to save the resume.');
    }

    resumeText = text.trim();
    els.fileName.textContent = file.name;
    els.fileInfo.classList.remove('hidden');
    els.dropzone.classList.add('hidden');
    els.resumeStatusBadge.textContent = 'Saved';
    els.resumeStatusBadge.className = 'status-badge uploaded';

    scoreMap = new Map();
    currentResultJobId = null;
    currentResultPayload = null;
    lastAutoAnalyzeSignature = '';
    updateAnalyzeButtons();
    await refreshPageScores();
    await hydrateJobScores([...currentListJobs, ...manualJobs], { includeCurrentJobResult: true });
    await refreshPositionLibrary();
    maybeAutoAnalyzeList();
  } catch (err) {
    showError(`Resume parsing failed: ${err.message}`);
  }
}

async function extractResumeText(file) {
  const extension = file.name.split('.').pop().toLowerCase();

  if (extension === 'txt') {
    return file.text();
  }

  if (extension === 'pdf') {
    return extractPDFText(file);
  }

  if (extension === 'docx' || extension === 'doc') {
    return extractDOCXText(file);
  }

  throw new Error('Unsupported file type.');
}

async function extractPDFText(file) {
  const pdfjsLib = await importPackagedModule([
    'lib/pdf.min.mjs',
    'lib/pdf.mjs',
  ], 'PDF parser');
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
    await resolvePackagedAsset([
      'lib/pdf.worker.min.mjs',
      'lib/pdf.worker.mjs',
    ], 'PDF worker'),
  );

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += `${pageText}\n`;
  }

  return fullText;
}

async function extractDOCXText(file) {
  const mammoth = await importPackagedModule([
    'lib/mammoth.browser.min.js',
  ], 'DOCX parser');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function importPackagedModule(candidates, label) {
  let lastError = null;

  for (const relativePath of candidates) {
    try {
      const moduleUrl = chrome.runtime.getURL(relativePath);
      return await import(moduleUrl);
    } catch (error) {
      lastError = error;
    }
  }

  throw buildPackagedModuleError(label, lastError);
}

async function resolvePackagedAsset(candidates, label) {
  let lastError = null;

  for (const relativePath of candidates) {
    try {
      const assetUrl = chrome.runtime.getURL(relativePath);
      const response = await fetch(assetUrl, { method: 'GET' });
      if (response.ok) {
        return relativePath;
      }
      lastError = new Error(`${label} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw buildPackagedModuleError(label, lastError);
}

function buildPackagedModuleError(label, originalError) {
  const message = (originalError && originalError.message) || '';
  const looksLikeMissingPackagedAsset =
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Failed to fetch/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /ERR_FILE_NOT_FOUND/i.test(message) ||
    /404/i.test(message);

  if (looksLikeMissingPackagedAsset) {
    return new Error(
      `${label} files are missing from this extension package. Please load the built dist folder or use the GitHub release zip, not the source root folder.`,
    );
  }

  return new Error(`${label} could not be loaded: ${message || 'Unknown error.'}`);
}

function setupAnalyzeButtons() {
  els.analyzeBtn.addEventListener('click', () => startAnalysis('single'));
  els.batchAnalyzeBtn.addEventListener('click', () => startAnalysis('batch'));
  els.reanalyzeBtn.addEventListener('click', () => startAnalysis('single', { forceRefresh: true }));
  els.savePositionBtn.addEventListener('click', () => {
    toggleSavedPositionFromDataset(els.savePositionBtn.dataset).catch(err => showError(err.message));
  });
  els.batchReanalyzeBtn.addEventListener('click', () => {
    startAnalysis('batch', {
      jobIds: currentListJobs.slice(0, visibleJobCount).map(job => job.jobId),
      forceRefresh: true,
      maxParallel: 3,
    });
  });
}

function setupManualJobs() {
  els.manualDetectModeButtons.forEach(button => {
    button.addEventListener('click', () => {
      manualDetectMode = button.dataset.manualDetectMode || 'rule';
      els.manualDetectModeButtons.forEach(item => item.classList.toggle('active', item === button));
      const hint = manualDetectMode === 'ai'
        ? 'Model detection uses your configured provider to structure the pasted job.'
        : 'Rule detection uses fast local extraction and does not call the model.';
      showManualSaveHint(hint, 'success');
    });
  });

  els.manualJobsToggle.addEventListener('click', () => {
    const willShow = els.manualJobsBody.classList.contains('hidden');
    els.manualJobsBody.classList.toggle('hidden', !willShow);
    els.manualJobsToggle.textContent = willShow ? 'Collapse' : 'Expand';
  });

  els.manualDetectBtn.addEventListener('click', async () => {
    const rawText = els.manualRawInput.value;
    if (manualDetectMode === 'rule') {
      const parsed = parseInsertedJobText(rawText);
      if (!parsed.title && !parsed.description) {
        showError('Paste more job content so the plugin can detect the fields.');
        return;
      }

      applyDetectedManualFields(parsed);
      els.manualClearBtn.classList.remove('hidden');
      showManualSaveHint('Rule detection filled the fields. Review them before analysis.', 'success');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: Actions.DETECT_INSERTED_JOB,
        payload: { rawText },
      });

      if (!response?.ok || !response.data) {
        throw new Error(response?.error || 'Model detection did not return usable fields.');
      }

      applyDetectedManualFields(response.data);
      els.manualClearBtn.classList.remove('hidden');
      const confidence = response.data.confidence ? ` (${response.data.confidence} confidence)` : '';
      showManualSaveHint(`Model detection filled the fields${confidence}. Review them before analysis.`, 'success');
    } catch (err) {
      showError(err.message || 'Model detection failed.');
    }
  });

  els.manualClearBtn.addEventListener('click', () => {
    resetManualJobForm();
  });

  els.manualAnalyzeBtn.addEventListener('click', () => {
    saveAndAnalyzeManualJob().catch(err => {
      showManualSaveHint(err.message || 'Failed to save and analyze the inserted job.', 'error');
    });
  });

  els.manualJobList.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-job-id]');
    if (saveButton) {
      event.stopPropagation();
      toggleSavedPositionFromDataset(saveButton.dataset).catch(err => showError(err.message));
      return;
    }

    const openButton = event.target.closest('[data-open-job-id]');
    if (openButton) {
      event.stopPropagation();
      openCachedResult(openButton.dataset.openJobId, openButton.dataset.sourceType || 'inserted', 'manual-detail').catch(err => {
        showError(err.message || 'Unable to open this inserted job.');
      });
      return;
    }

    const actionButton = event.target.closest('[data-manual-action]');
    if (actionButton) {
      event.stopPropagation();
      handleManualJobAction(actionButton.dataset).catch(err => showError(err.message));
      return;
    }

    const item = event.target.closest('.job-list-item');
    if (!item) {
      return;
    }

    openCachedResult(item.dataset.jobId, item.dataset.sourceType || 'inserted', 'manual-detail').catch(err => {
      showError(err.message || 'Unable to open this inserted job.');
    });
  });

  els.manualJobList.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const item = event.target.closest('.job-list-item');
    if (!item) {
      return;
    }

    event.preventDefault();
    openCachedResult(item.dataset.jobId, item.dataset.sourceType || 'inserted', 'manual-detail').catch(err => {
      showError(err.message || 'Unable to open this inserted job.');
    });
  });

  els.manualDetailBack.addEventListener('click', () => {
    hideManualDetailPanel();
  });
}

function setupLibrary() {
  els.libraryToggle.addEventListener('click', () => {
    const willShow = els.libraryBody.classList.contains('hidden');
    els.libraryBody.classList.toggle('hidden', !willShow);
    els.libraryToggle.textContent = willShow ? 'Collapse' : 'Expand';
  });

  els.libraryModeButtons.forEach(button => {
    button.addEventListener('click', () => {
      libraryMode = button.dataset.libraryMode || 'history';
      els.libraryModeButtons.forEach(item => item.classList.toggle('active', item === button));
      renderLibrary();
    });
  });

  els.librarySourceButtons.forEach(button => {
    button.addEventListener('click', () => {
      librarySource = button.dataset.librarySource || 'linkedin';
      els.librarySourceButtons.forEach(item => item.classList.toggle('active', item === button));
      renderLibrary();
    });
  });

  els.libraryList.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-job-id]');
    if (saveButton) {
      event.stopPropagation();
      toggleSavedPositionFromDataset(saveButton.dataset).catch(err => showError(err.message));
      return;
    }

    const deleteButton = event.target.closest('[data-library-delete-job-id]');
    if (deleteButton) {
      event.stopPropagation();
      handleLibraryDelete(deleteButton.dataset).catch(err => {
        showError(err.message || 'Unable to delete this item.');
      });
      return;
    }

    const openButton = event.target.closest('[data-open-job-id]');
    if (openButton) {
      event.stopPropagation();
      openLibraryItem({
        jobId: openButton.dataset.openJobId,
        sourceType: openButton.dataset.sourceType || librarySource,
      }).catch(err => {
        showError(err.message || 'Unable to open this saved item.');
      });
      return;
    }

    const item = event.target.closest('.job-list-item');
    if (!item) {
      return;
    }

    openLibraryItem(item.dataset).catch(err => {
      showError(err.message || 'Unable to open this saved item.');
    });
  });

  els.libraryList.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const item = event.target.closest('.job-list-item');
    if (!item) {
      return;
    }

    event.preventDefault();
    openLibraryItem(item.dataset).catch(err => {
      showError(err.message || 'Unable to open this saved item.');
    });
  });

  els.libraryDetailBack.addEventListener('click', () => {
    hideLibraryDetailPanel();
  });
}

async function refreshPositionLibrary() {
  try {
    const response = await chrome.runtime.sendMessage({ type: Actions.GET_POSITION_LIBRARY });
    if (!response?.ok) {
      return;
    }

    manualJobs = Array.isArray(response.data?.manualJobs) ? response.data.manualJobs : [];
    historyEntries = response.data?.history || { linkedin: [], inserted: [] };
    const savedItems = [
      ...((response.data?.saved?.linkedin) || []),
      ...((response.data?.saved?.inserted) || []),
    ];
    savedPositionsMap = new Map(savedItems.map(item => [buildPositionKey(item.jobId, item.sourceType), item]));

    renderManualJobs();
    renderLibrary();
    updateSavePositionButton();
    await hydrateJobScores([...currentListJobs, ...manualJobs], { includeCurrentJobResult: false });
  } catch (err) {
    console.warn('Failed to refresh library:', err);
  }
}

function renderManualJobs() {
  if (!manualJobs.length) {
    els.manualJobList.innerHTML = '<p class="hint-text">No inserted jobs yet. Paste a job posting above to add one.</p>';
    return;
  }

  els.manualJobList.innerHTML = manualJobs.map((job, index) => {
    const cached = scoreMap.get(job.manualJobId);
    const score = cached?.score;
    const isSaved = savedPositionsMap.has(buildPositionKey(job.manualJobId, 'inserted'));
    const titleBadges = buildJdTitleBadges({
      jdLanguage: cached?.jdLanguage || null,
      requiredExperience: cached?.requiredExperience || null,
      requiredLanguages: cached?.requiredLanguages || [],
      kmEligible: cached?.kmEligible === true,
    });

    return `
      <div class="job-list-item${isSaved ? ' saved-item' : ''}" data-job-id="${escapeHtml(job.manualJobId)}" data-source-type="inserted" role="button" tabindex="0">
        <div class="job-row-top">
          <div>
            <div class="job-index">#${index + 1} <span class="job-source-pill">Inserted</span></div>
            <div class="job-title">${escapeHtml(job.title || 'Untitled inserted job')}${titleBadges}</div>
          </div>
          <div class="job-item-actions">
            ${typeof score === 'number'
              ? buildSaveStarButton(job.manualJobId, 'inserted', isSaved)
              : ''}
            ${typeof score === 'number'
              ? `<span class="job-score ${getScoreClass(score)}">${Math.round(score)}%</span>`
              : '<span class="status-badge">New</span>'}
          </div>
        </div>
        <div class="job-company">${escapeHtml(job.company || 'Manual entry')}</div>
        <div class="job-state">${escapeHtml(job.lastAnalyzedAt ? `Analyzed ${formatTimestamp(job.lastAnalyzedAt)}` : 'Not analyzed yet')}</div>
        <div class="inline-actions">
          <button class="btn-secondary" data-open-job-id="${escapeHtml(job.manualJobId)}" data-source-type="inserted" type="button">View details</button>
          <button class="btn-secondary" data-manual-action="edit" data-manual-job-id="${escapeHtml(job.manualJobId)}" type="button">Edit</button>
          <button class="btn-secondary" data-manual-action="analyze" data-manual-job-id="${escapeHtml(job.manualJobId)}" type="button">${typeof score === 'number' ? 'Re-analyze' : 'Analyze'}</button>
          <button class="btn-secondary" data-manual-action="delete" data-manual-job-id="${escapeHtml(job.manualJobId)}" type="button">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderLibrary() {
  const sourceItems = (historyEntries?.[librarySource] && libraryMode === 'history')
    ? historyEntries[librarySource]
    : (libraryMode === 'saved'
      ? [...savedPositionsMap.values()].filter(item => (item.sourceType || 'linkedin') === librarySource)
      : []);

  if (!sourceItems.length) {
    els.librarySummary.textContent = libraryMode === 'saved'
      ? `No saved ${librarySource} positions yet.`
      : `No ${librarySource} history yet for the current resume.`;
    els.libraryList.innerHTML = '<p class="hint-text">Nothing to show here yet.</p>';
    return;
  }

  els.librarySummary.textContent = libraryMode === 'saved'
    ? `${sourceItems.length} saved ${librarySource} positions.`
    : `${sourceItems.length} analyzed ${librarySource} jobs for the current resume.`;

  els.libraryList.innerHTML = sourceItems.map((item, index) => {
    const score = item.score;
    const isSaved = savedPositionsMap.has(buildPositionKey(item.jobId, item.sourceType || librarySource));
    const titleBadges = buildJdTitleBadges({
      jdLanguage: item.jdLanguage || item.result?.metadata?.jdLanguage || null,
      requiredExperience: item.requiredExperience || item.result?.metadata?.requiredExperience || null,
      requiredLanguages: item.requiredLanguages || item.result?.metadata?.requiredLanguages || [],
      kmEligible: item.kmEligible === true || item.result?.sponsorshipAssessment?.kmEligible === true,
    });

    return `
      <div class="job-list-item${isSaved ? ' saved-item' : ''}" data-job-id="${escapeHtml(item.jobId)}" data-source-type="${escapeHtml(item.sourceType || librarySource)}" role="button" tabindex="0">
        <div class="job-row-top">
          <div>
            <div class="job-index">#${index + 1} <span class="job-source-pill">${escapeHtml((item.sourceType || librarySource) === 'inserted' ? 'Inserted' : 'LinkedIn')}</span></div>
            <div class="job-title">${escapeHtml(item.title || 'Untitled job')}${titleBadges}</div>
          </div>
          <div class="job-item-actions">
            ${(typeof score === 'number' || libraryMode === 'saved')
              ? buildSaveStarButton(item.jobId, item.sourceType || librarySource, isSaved)
              : ''}
            ${typeof score === 'number'
              ? `<span class="job-score ${getScoreClass(score)}">${Math.round(score)}%</span>`
              : '<span class="status-badge">Info</span>'}
          </div>
        </div>
        <div class="job-company">${escapeHtml(item.company || 'Unknown company')}</div>
        <div class="job-state">${escapeHtml(buildLibraryStateText(item))}</div>
        <div class="inline-actions">
          <button class="btn-secondary" data-open-job-id="${escapeHtml(item.jobId)}" data-source-type="${escapeHtml(item.sourceType || librarySource)}" type="button">View details</button>
          <button class="btn-secondary" data-library-delete-job-id="${escapeHtml(item.jobId)}" data-source-type="${escapeHtml(item.sourceType || librarySource)}" data-library-delete-mode="${escapeHtml(libraryMode)}" type="button">${libraryMode === 'saved' ? 'Remove' : 'Delete'}</button>
        </div>
      </div>
    `;
  }).join('');
}

function buildLibraryStateText(item) {
  if (libraryMode === 'saved') {
    return item.savedAt ? `Saved on ${formatTimestamp(item.savedAt)}` : 'Saved position';
  }
  return item.analyzedAt ? `Analyzed on ${formatTimestamp(item.analyzedAt)}` : 'History item';
}

async function handleLibraryDelete(dataset) {
  const jobId = dataset.libraryDeleteJobId;
  const sourceType = dataset.sourceType || librarySource;
  const mode = dataset.libraryDeleteMode || libraryMode;
  if (!jobId) {
    return;
  }

  const actionType = mode === 'saved' ? Actions.DELETE_SAVED_POSITION : Actions.DELETE_HISTORY_ENTRY;
  const response = await chrome.runtime.sendMessage({
    type: actionType,
    payload: { jobId, sourceType },
  });

  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to delete this item.');
  }

  if (detailViewHost === 'library' && currentResultJobId === jobId) {
    hideLibraryDetailPanel();
  }

  if (mode === 'history') {
    scoreMap.delete(jobId);
    if (currentResultPayload?.jobId === jobId && currentResultPayload?.sourceType === sourceType) {
      currentResultPayload = null;
      currentResultJobId = null;
      els.resultsContainer.classList.add('hidden');
    }
    renderJobList();
    renderManualJobs();
  }

  await refreshPositionLibrary();
}

function parseInsertedJobText(rawText = '') {
  const text = (rawText || '').trim();
  if (!text) {
    return { title: '', company: '', location: '', description: '', sourceUrl: '' };
  }

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const firstLongBlock = lines.find(line => line.length > 30) || '';
  const sourceUrl = (text.match(/https?:\/\/[^\s)]+/i) || [])[0] || '';
  const titleLine = extractLabelValue(lines, ['job title', 'title', 'position']) || lines[0] || '';
  const companyLine = extractLabelValue(lines, ['company', 'employer']) || inferCompanyLine(lines);
  const locationLine = extractLabelValue(lines, ['location', 'based in']) || inferLocationLine(lines);
  const description = extractDescriptionBlock(text, lines, titleLine, companyLine, locationLine) || firstLongBlock || text;

  return {
    title: titleLine,
    company: companyLine,
    location: locationLine,
    description,
    sourceUrl,
  };
}

function extractLabelValue(lines, labels) {
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const label of labels) {
      if (lower.startsWith(`${label}:`)) {
        return line.slice(label.length + 1).trim();
      }
    }
  }
  return '';
}

function inferCompanyLine(lines) {
  return lines.slice(1, 5).find(line => line.length < 80 && !/[.:]/.test(line) && !looksLikeLocation(line)) || '';
}

function inferLocationLine(lines) {
  return lines.find(line => looksLikeLocation(line)) || '';
}

function looksLikeLocation(line = '') {
  return /,\s*[A-Za-z]/.test(line) || /\b(remote|hybrid|onsite|on-site)\b/i.test(line);
}

function extractDescriptionBlock(rawText, lines, title, company, location) {
  const markers = ['about the job', 'job description', 'about this role', 'role overview', 'description'];
  const lower = rawText.toLowerCase();
  for (const marker of markers) {
    const index = lower.indexOf(marker);
    if (index >= 0) {
      return rawText.slice(index).trim();
    }
  }

  return lines
    .filter(line => ![title, company, location].includes(line))
    .join('\n')
    .trim();
}

async function saveAndAnalyzeManualJob() {
  const payload = {
    manualJobId: currentManualEditingId,
    title: els.manualTitle.value.trim(),
    company: els.manualCompany.value.trim(),
    location: els.manualLocation.value.trim(),
    description: els.manualDescription.value.trim(),
    sourceUrl: els.manualSourceUrl.value.trim(),
    rawInput: els.manualRawInput.value.trim(),
  };

  if (!payload.title || !payload.description) {
    throw new Error('Inserted jobs need at least a title and a description.');
  }

  const saveResponse = await chrome.runtime.sendMessage({
    type: Actions.UPSERT_MANUAL_JOB,
    payload,
  });

  if (!saveResponse?.ok) {
    throw new Error(saveResponse?.error || 'Failed to save inserted job.');
  }

  currentManualEditingId = saveResponse.data.manualJobId;
  showManualSaveHint('Inserted job saved. Starting analysis...', 'success');
  await refreshPositionLibrary();

  await startManualAnalysis(saveResponse.data.manualJobId);
}

async function startManualAnalysis(manualJobId, forceRefresh = false) {
  if (isAnalyzing || !resumeText) {
    return;
  }

  isAnalyzing = true;
  updateAnalyzeButtons();
  els.progressContainer.classList.remove('hidden');
  els.resultsContainer.classList.add('hidden');
  const originalText = els.manualAnalyzeBtn.textContent;
  els.manualAnalyzeBtn.textContent = 'Analyzing inserted job...';
  els.manualAnalyzeBtn.classList.add('analyzing');

  try {
    const response = await chrome.runtime.sendMessage({
      type: Actions.START_MANUAL_ANALYSIS,
      payload: { manualJobId, forceRefresh },
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to analyze the inserted job.');
    }
  } catch (err) {
    showError(err.message);
    resetAnalyzeButtons(els.manualAnalyzeBtn, originalText);
  }
}

function showManualSaveHint(text, type) {
  els.manualSaveHint.textContent = text;
  els.manualSaveHint.className = `save-hint ${type}`;
}

function resetManualJobForm() {
  currentManualEditingId = null;
  els.manualRawInput.value = '';
  els.manualTitle.value = '';
  els.manualCompany.value = '';
  els.manualLocation.value = '';
  els.manualSourceUrl.value = '';
  els.manualDescription.value = '';
  els.manualClearBtn.classList.add('hidden');
  showManualSaveHint('', '');
}

function applyDetectedManualFields(parsed = {}) {
  els.manualTitle.value = parsed.title || els.manualTitle.value;
  els.manualCompany.value = parsed.company || els.manualCompany.value;
  els.manualLocation.value = parsed.location || els.manualLocation.value;
  els.manualSourceUrl.value = parsed.sourceUrl || els.manualSourceUrl.value;
  els.manualDescription.value = parsed.description || els.manualDescription.value;
}

async function handleManualJobAction(dataset) {
  const manualJobId = dataset.manualJobId;
  if (!manualJobId) {
    return;
  }

  if (dataset.manualAction === 'edit') {
    const job = manualJobs.find(item => item.manualJobId === manualJobId);
    if (!job) {
      return;
    }
    currentManualEditingId = manualJobId;
    els.manualJobsBody.classList.remove('hidden');
    els.manualJobsToggle.textContent = 'Collapse';
    els.manualRawInput.value = job.rawInput || '';
    els.manualTitle.value = job.title || '';
    els.manualCompany.value = job.company || '';
    els.manualLocation.value = job.location || '';
    els.manualSourceUrl.value = job.sourceUrl || '';
    els.manualDescription.value = job.description || '';
    els.manualClearBtn.classList.remove('hidden');
    showManualSaveHint('Editing inserted job. Update the fields and analyze again when ready.', 'success');
    return;
  }

  if (dataset.manualAction === 'delete') {
    await chrome.runtime.sendMessage({
      type: Actions.DELETE_MANUAL_JOB,
      payload: { manualJobId },
    });
    if (currentManualEditingId === manualJobId) {
      resetManualJobForm();
    }
    await refreshPositionLibrary();
    return;
  }

  if (dataset.manualAction === 'analyze') {
    await startManualAnalysis(manualJobId, true);
  }
}

async function toggleSavedPositionFromDataset(dataset) {
  const jobId = dataset.saveJobId || dataset.jobId;
  const sourceType = dataset.sourceType || 'linkedin';
  const payload = buildSavePayload(jobId, sourceType);
  const response = await chrome.runtime.sendMessage({
    type: Actions.TOGGLE_SAVE_POSITION,
    payload,
  });

  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to update saved positions.');
  }

  await refreshPositionLibrary();
}

function buildSavePayload(jobId, sourceType = 'linkedin') {
  const cached = scoreMap.get(jobId);
  const isInserted = sourceType === 'inserted';
  const manualJob = isInserted ? manualJobs.find(job => job.manualJobId === jobId) : null;
  const result = currentResultPayload?.jobId === jobId ? currentResultPayload : (cached?.result || null);

  return {
    jobId,
    sourceType,
    title: cached?.title || manualJob?.title || currentJDData?.title || result?.jobTitle || '',
    company: cached?.company || manualJob?.company || currentJDData?.company || result?.company || '',
    location: cached?.location || manualJob?.location || currentJDData?.location || result?.location || '',
    url: cached?.url || manualJob?.sourceUrl || currentJDData?.url || result?.jobUrl || '',
    sourceUrl: cached?.sourceUrl || manualJob?.sourceUrl || result?.sourceUrl || '',
    lastResult: result,
    summary: cached || null,
  };
}

function buildPositionKey(jobId, sourceType = 'linkedin') {
  return `${sourceType}:${jobId}`;
}

function setupJobListControls() {
  els.jobListLoadMore.addEventListener('click', () => {
    visibleJobCount = currentListJobs.length;
    renderJobList();
    updateAnalyzeButtons();
  });

  els.jobDetailBack.addEventListener('click', () => {
    hideJobDetailPanel();
  });

  els.jobList.addEventListener('click', event => {
    const saveButton = event.target.closest('[data-save-job-id]');
    if (saveButton) {
      event.stopPropagation();
      toggleSavedPositionFromDataset(saveButton.dataset).catch(err => showError(err.message));
      return;
    }

    const item = event.target.closest('.job-list-item');
    if (!item) {
      return;
    }

    openJobFromList(item.dataset.jobId).catch(err => {
      showError(err.message || 'Unable to open this job.');
    });
  });

  els.jobList.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const item = event.target.closest('.job-list-item');
    if (!item) {
      return;
    }

    event.preventDefault();
    openJobFromList(item.dataset.jobId).catch(err => {
      showError(err.message || 'Unable to open this job.');
    });
  });
}

function setupSettings() {
  els.settingProvider.addEventListener('change', handleProviderChange);
  els.settingAnalysisPreset.addEventListener('change', handleAnalysisPresetChange);
  els.settingIncludeSponsorship.addEventListener('change', handleIncludeSponsorshipToggle);
  els.settingUseCustomWeights.addEventListener('change', handleUseCustomWeightsToggle);
  els.resetWeightsBtn.addEventListener('click', resetWeightsToPreset);
  getWeightInputs().forEach(input => {
    input.addEventListener('input', () => {
      updateWeightTotalHint();
    });
  });

  els.addModelBtn.addEventListener('click', () => {
    const activeModel = els.settingModel.value.trim();
    if (!activeModel) {
      showSaveHint('Enter a model name first.', 'error');
      return;
    }

    const models = parseModelList(els.settingModelList.value);
    if (!models.includes(activeModel)) {
      models.push(activeModel);
    }
    els.settingModelList.value = models.join('\n');
  });

  els.togglePassword.addEventListener('click', () => {
    const showing = els.settingApiKey.type === 'text';
    els.settingApiKey.type = showing ? 'password' : 'text';
    els.togglePassword.textContent = showing ? 'Show' : 'Hide';
  });

  els.saveConfigBtn.addEventListener('click', saveConfig);
  els.testConnectionBtn.addEventListener('click', testConnection);
}

function setupMetadataToggle() {
  els.metadataToggle.addEventListener('click', () => {
    els.metadataToggle.classList.toggle('open');
    els.metadataContent.classList.toggle('hidden');
  });
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener(msg => {
    if (!msg?.type) {
      return;
    }

    switch (msg.type) {
      case Actions.JD_DATA:
        handleJDData(msg.payload);
        scheduleRefreshPageContext();
        break;
      case Actions.ANALYSIS_PROGRESS:
        handleProgress(msg.payload);
        break;
      case Actions.ANALYSIS_RESULT:
        handleResult(msg.payload);
        break;
      case Actions.ANALYSIS_ERROR:
        handleAnalysisError(msg.payload);
        break;
      default:
        break;
    }
  });
}

async function loadAndDisplayConfig() {
  const response = await chrome.runtime.sendMessage({ type: Actions.GET_CONFIG });
  if (!response?.ok || !response.data) {
    return;
  }

  currentConfig = hydrateProviderProfiles(response.data);
  els.settingProvider.value = currentConfig.provider || 'openai';
  applyProviderProfileToForm(els.settingProvider.value);
  els.settingAutoAnalyze.value = currentConfig.autoAnalyzeCount ?? 0;
  applyAnalysisSettingsToForm();
}

async function saveConfig() {
  syncCurrentProviderDraft();
  const analysisSettings = readAnalysisSettingsForm();
  const activeProvider = els.settingProvider.value;
  const activeProfile = currentConfig.providerProfiles?.[activeProvider] || readProviderForm();
  const modelIds = normalizeModelList(activeProfile.modelIds, activeProfile.modelId);
  const payload = {
    ...currentConfig,
    provider: activeProvider,
    baseUrl: activeProfile.baseUrl,
    apiKey: activeProfile.apiKey,
    modelId: activeProfile.modelId || modelIds[0] || '',
    modelIds,
    maxTokens: activeProfile.maxTokens,
    temperature: activeProfile.temperature,
    timeoutMs: activeProfile.timeoutMs,
    maxRetries: activeProfile.maxRetries,
    autoAnalyzeCount: Math.max(0, Number.parseInt(els.settingAutoAnalyze.value, 10) || 0),
    analysisPreset: analysisSettings.analysisPreset,
    promptTuningMode: analysisSettings.promptTuningMode,
    includeSponsorshipInScore: analysisSettings.includeSponsorshipInScore,
    useCustomWeights: analysisSettings.useCustomWeights,
    customWeights: analysisSettings.customWeights,
    additionalPromptInstructions: analysisSettings.additionalPromptInstructions,
    customPromptTemplate: analysisSettings.customPromptTemplate,
    enableDiagnostics: analysisSettings.enableDiagnostics,
    providerProfiles: currentConfig.providerProfiles,
  };

  try {
    const response = await chrome.runtime.sendMessage({
      type: Actions.UPDATE_CONFIG,
      payload,
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to save settings.');
    }

    currentConfig = hydrateProviderProfiles(payload);
    applyAnalysisSettingsToForm();
    showSaveHint('Settings saved.', 'success');
    maybeAutoAnalyzeList(true);
  } catch (err) {
    showSaveHint(err.message, 'error');
  }
}

async function testConnection() {
  const modelIds = normalizeModelList(parseModelList(els.settingModelList.value), els.settingModel.value.trim());
  const payload = {
    provider: els.settingProvider.value,
    baseUrl: els.settingBaseUrl.value.trim(),
    apiKey: els.settingApiKey.value.trim(),
    modelId: els.settingModel.value.trim() || modelIds[0] || '',
    modelIds,
    maxTokens: Number.parseInt(els.settingMaxTokens.value, 10) || 128,
    temperature: 0,
    timeoutMs: Math.min((Number.parseInt(els.settingTimeout.value, 10) || 30) * 1000, 30000),
    maxRetries: 0,
  };

  try {
    els.testConnectionHint.textContent = 'Testing...';
    els.testConnectionHint.className = 'save-hint';

    const response = await chrome.runtime.sendMessage({
      type: Actions.TEST_CONNECTION,
      payload,
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Connection test failed.');
    }

    const preview = response.data?.preview ? ` Response: ${response.data.preview}` : '';
    els.testConnectionHint.textContent = `Connected with ${response.data?.model || payload.modelId}.${preview}`;
    els.testConnectionHint.className = 'save-hint success';
  } catch (err) {
    els.testConnectionHint.textContent = err.message;
    els.testConnectionHint.className = 'save-hint error';
  }
}

async function refreshPageContext() {
  const activeTab = await getActiveTab();
  if (!activeTab?.id) {
    renderNoPageState();
    return;
  }

  let listResponse = null;
  let directJDData = null;
  try {
    listResponse = await sendTabMessageWithInjection(activeTab.id, { type: Actions.GET_JOB_LIST });
  } catch {
    listResponse = null;
  }

  try {
    const directResponse = await sendTabMessageWithInjection(activeTab.id, { type: Actions.GET_JD_DATA });
    directJDData = directResponse?.payload || null;
  } catch {
    directJDData = null;
  }

  const jobs = Array.isArray(listResponse?.jobs) ? listResponse.jobs : [];
  syncListMode(jobs);

  if (directJDData) {
    handleJDData(directJDData);
  } else {
    try {
      const jdResponse = await chrome.runtime.sendMessage({ type: Actions.GET_JD_DATA });
      if (jdResponse?.ok && jdResponse.data) {
        handleJDData(jdResponse.data);
      } else if (!jobs.length) {
        renderNoPageState();
      }
    } catch {
      if (!jobs.length) {
        renderNoPageState();
      }
    }
  }

  if (!directJDData && !jobs.length) {
    renderNoPageState();
  }

  await hydrateJobScores(jobs, { includeCurrentJobResult: true });
  updateAnalyzeButtons();
  maybeAutoAnalyzeList();
}

function renderNoPageState() {
  currentJDData = null;
  currentListJobs = [];
  currentListSignature = '';
  hideLibraryDetailPanel();
  hideManualDetailPanel();
  els.jdStatusBadge.textContent = 'Waiting';
  els.jdStatusBadge.className = 'status-badge';
  els.jdInfo.innerHTML = '<p class="hint-text">Open a LinkedIn job page to load job data.</p>';
  els.cachedResultHint.classList.add('hidden');
  hideListMode();
  updateAnalyzeButtons();
}

function syncListMode(jobs) {
  const normalizedJobs = Array.isArray(jobs) ? jobs : [];
  const nextSignature = normalizedJobs.map(job => job.jobId).join(',');

  if (nextSignature !== currentListSignature) {
    currentListSignature = nextSignature;
    visibleJobCount = Math.min(10, normalizedJobs.length || 10);
  }

  currentListJobs = normalizedJobs;

  if (normalizedJobs.length > 1) {
    els.jobListCard.classList.remove('hidden');
    els.batchJobAction.classList.remove('hidden');
    els.singleJobAction.classList.add('hidden');
    renderJobList();
    return;
  }

  hideListMode();
}

function hideListMode() {
  currentListJobs = [];
  currentListSignature = '';
  els.jobListCard.classList.add('hidden');
  hideJobDetailPanel();
  els.batchJobAction.classList.add('hidden');
  els.singleJobAction.classList.remove('hidden');
  els.jobList.innerHTML = '';
  els.jobListSummary.textContent = '';
  els.jobListLoadMore.classList.add('hidden');
  els.batchReanalyzeBtn.classList.add('hidden');
}

function handleJDData(data) {
  currentJDData = data;
  const cachedCurrent = data?.jobId ? scoreMap.get(data.jobId) : null;
  const titleBadges = buildJdTitleBadges({
    jdLanguage: cachedCurrent?.jdLanguage || detectJdLanguageLabel(data?.description, data?.title),
    requiredExperience: cachedCurrent?.requiredExperience || detectRequiredExperience(data?.description, data?.title),
    requiredLanguages: cachedCurrent?.requiredLanguages || detectRequiredLanguages(data?.description, data?.title),
    kmEligible: cachedCurrent?.kmEligible === true,
  });

  if (data?.description && data.extractionConfidence !== 'failed') {
    els.jdStatusBadge.textContent = currentListJobs.length > 1 ? 'Ready + list' : 'Ready';
    els.jdStatusBadge.className = 'status-badge detected';
    els.jdInfo.innerHTML = `
      <div class="jd-detail"><span class="jd-detail-label">Title</span><span class="jd-detail-value">${escapeHtml(data.title || 'Unknown')}${titleBadges}</span></div>
      <div class="jd-detail"><span class="jd-detail-label">Company</span><span class="jd-detail-value">${escapeHtml(data.company || 'Unknown')}</span></div>
      <div class="jd-detail"><span class="jd-detail-label">Location</span><span class="jd-detail-value">${escapeHtml(data.location || 'Unknown')}</span></div>
    `;
  } else if (currentListJobs.length > 1) {
    els.jdStatusBadge.textContent = 'List only';
    els.jdStatusBadge.className = 'status-badge detected';
    els.jdInfo.innerHTML = '<p class="hint-text">The page list is available. Open a specific job card to load detailed JD text.</p>';
  } else {
    els.jdStatusBadge.textContent = 'Unavailable';
    els.jdStatusBadge.className = 'status-badge failed';
    els.jdInfo.innerHTML = '<p class="hint-text">Unable to read the current LinkedIn job details.</p>';
  }

  updateAnalyzeButtons();
}

async function hydrateJobScores(jobs, options = {}) {
  const jobIds = [...new Set([
    ...(Array.isArray(jobs) ? jobs.map(job => job.jobId) : []),
    currentJDData?.jobId,
  ].filter(Boolean))];

  if (!jobIds.length) {
    scoreMap = new Map();
    renderJobList();
    renderManualJobs();
    renderLibrary();
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: Actions.GET_CACHED_SCORES,
      payload: { jobIds, includeResult: !!options.includeCurrentJobResult },
    });

    if (!response?.ok) {
      return;
    }

    if (!response.resumeAvailable) {
      scoreMap = new Map();
      els.cachedResultHint.classList.add('hidden');
      renderJobList();
      renderManualJobs();
      renderLibrary();
      return;
    }

    scoreMap = new Map((response.entries || []).map(entry => [entry.jobId, entry]));
    renderJobList();
    renderManualJobs();
    renderLibrary();

    if (options.includeCurrentJobResult && currentJDData?.jobId) {
      const cachedCurrent = scoreMap.get(currentJDData.jobId);
      if (cachedCurrent?.result && !isAnalyzing) {
        handleResult({
          ...cachedCurrent.result,
          jobId: cachedCurrent.jobId,
          jobTitle: cachedCurrent.title,
          company: cachedCurrent.company,
          location: cachedCurrent.location,
          jobUrl: cachedCurrent.url,
          fromCache: true,
          cachedAt: cachedCurrent.analyzedAt,
          metadata: {
            ...(cachedCurrent.result.metadata || {}),
            jdLanguage: cachedCurrent.jdLanguage || cachedCurrent.result.metadata?.jdLanguage || 'Unknown',
            requiredExperience: cachedCurrent.requiredExperience || cachedCurrent.result.metadata?.requiredExperience || null,
            requiredLanguages: cachedCurrent.requiredLanguages || cachedCurrent.result.metadata?.requiredLanguages || [],
          },
        });
      }
    }
  } catch {
    // Ignore cache hydration failures during reloads.
  }
}

function renderJobList() {
  if (!currentListJobs.length) {
    els.jobList.innerHTML = '';
    els.jobListLoadMore.classList.add('hidden');
    return;
  }

  const shownJobs = currentListJobs.slice(0, visibleJobCount);
  const analyzedCount = currentListJobs.filter(job => scoreMap.has(job.jobId)).length;
  els.jobListSummary.textContent = `${currentListJobs.length} jobs detected on this page. ${analyzedCount} already have cached results for the current resume.`;
  els.batchReanalyzeBtn.classList.toggle('hidden', shownJobsWithCache().length === 0);

  els.jobList.innerHTML = shownJobs.map((job, index) => {
    const cached = scoreMap.get(job.jobId);
    const score = cached?.score;
    const scoreClass = typeof score === 'number' ? getScoreClass(score) : 'pending';
    const isSaved = savedPositionsMap.has(buildPositionKey(job.jobId, 'linkedin'));
    const stateText = cached
      ? `Cached on ${formatTimestamp(cached.analyzedAt)}`
      : 'Not analyzed for this resume yet';
    const isCurrent = currentJDData?.jobId === job.jobId;
    const isSelected = currentResultJobId === job.jobId;
    const titleBadges = buildJdTitleBadges({
      jdLanguage: cached?.jdLanguage || null,
      requiredExperience: cached?.requiredExperience || null,
      requiredLanguages: cached?.requiredLanguages || [],
      kmEligible: cached?.kmEligible === true,
    });

    return `
      <div class="job-list-item${isSelected ? ' active-view' : ''}${isSaved ? ' saved-item' : ''}" data-job-id="${escapeHtml(job.jobId)}" data-source-type="linkedin" role="button" tabindex="0" aria-label="Open analysis for ${escapeHtml(job.title || 'Unknown title')}">
        <div class="job-row-top">
          <div>
            <div class="job-index">#${index + 1}${isCurrent ? ' - current' : ''} <span class="job-source-pill">LinkedIn</span></div>
            <div class="job-title">${escapeHtml(job.title || 'Unknown title')}${titleBadges}</div>
          </div>
          <div class="job-item-actions">
            ${typeof score === 'number'
              ? buildSaveStarButton(job.jobId, 'linkedin', isSaved)
              : ''}
            ${typeof score === 'number'
              ? `<span class="job-score ${scoreClass}">${Math.round(score)}%</span>`
              : '<span class="status-badge">New</span>'}
          </div>
        </div>
        <div class="job-company">${escapeHtml(job.company || 'Unknown company')}</div>
        <div class="job-state">${escapeHtml(stateText)}</div>
      </div>
    `;
  }).join('');

  const remaining = currentListJobs.length - shownJobs.length;
  if (remaining > 0) {
    els.jobListLoadMore.classList.remove('hidden');
    els.jobListLoadMore.textContent = `Load more (${remaining} remaining)`;
  } else {
    els.jobListLoadMore.classList.add('hidden');
  }
}

function maybeAutoAnalyzeList(force = false) {
  const autoAnalyzeCount = Math.max(0, Number.parseInt(currentConfig?.autoAnalyzeCount ?? 0, 10) || 0);
  if (!resumeText || !currentListJobs.length || !autoAnalyzeCount || isAnalyzing) {
    return;
  }

  const targetJobs = currentListJobs.slice(0, autoAnalyzeCount);
  const missingJobs = targetJobs.filter(job => !scoreMap.has(job.jobId));
  if (!missingJobs.length) {
    return;
  }

  const signature = `${autoAnalyzeCount}:${targetJobs.map(job => job.jobId).join(',')}`;
  if (!force && signature === lastAutoAnalyzeSignature) {
    return;
  }

  lastAutoAnalyzeSignature = signature;
  startAnalysis('batch', { jobIds: missingJobs.map(job => job.jobId), maxParallel: 3 }, true).catch(err => {
    console.warn('Auto analysis failed:', err);
  });
}

function updateAnalyzeButtons() {
  const hasSingleJD = !!currentJDData?.description;
  els.analyzeBtn.disabled = !resumeText || isAnalyzing || !hasSingleJD;
  els.batchAnalyzeBtn.disabled = !resumeText || isAnalyzing || !currentListJobs.length;
  els.manualAnalyzeBtn.disabled = !resumeText || isAnalyzing;
  els.reanalyzeBtn.classList.toggle('hidden', !currentJDData?.jobId || !scoreMap.has(currentJDData.jobId));
  els.reanalyzeBtn.disabled = isAnalyzing || !currentJDData?.jobId;
  els.batchReanalyzeBtn.disabled = isAnalyzing || shownJobsWithCache().length === 0;
}

async function startAnalysis(mode, overridePayload = null, silent = false) {
  if (isAnalyzing || !resumeText) {
    return;
  }

  isAnalyzing = true;
  updateAnalyzeButtons();
  els.progressContainer.classList.remove('hidden');
  els.resultsContainer.classList.add('hidden');

  const targetButton = mode === 'batch' ? els.batchAnalyzeBtn : els.analyzeBtn;
  const originalText = targetButton.textContent;
  targetButton.textContent = mode === 'batch' ? 'Analyzing list...' : 'Analyzing...';
  targetButton.classList.add('analyzing');

  try {
    const response = await chrome.runtime.sendMessage({
      type: mode === 'batch' ? Actions.START_BATCH_ANALYSIS : Actions.START_ANALYSIS,
      payload: overridePayload || (mode === 'batch' ? { batchSize: els.batchCount.value, maxParallel: 3 } : null),
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to start analysis.');
    }
  } catch (err) {
    if (!silent) {
      showError(err.message);
    }
    resetAnalyzeButtons(targetButton, originalText);
  }
}

function resetAnalyzeButtons(targetButton = null, originalText = '') {
  isAnalyzing = false;
  if (targetButton) {
    targetButton.textContent = originalText;
    targetButton.classList.remove('analyzing');
  } else {
    els.analyzeBtn.textContent = 'Analyze current job';
    els.batchAnalyzeBtn.textContent = 'Analyze job list';
    els.analyzeBtn.classList.remove('analyzing');
    els.batchAnalyzeBtn.classList.remove('analyzing');
    els.manualAnalyzeBtn.textContent = 'Save and analyze inserted job';
    els.manualAnalyzeBtn.classList.remove('analyzing');
  }
  updateAnalyzeButtons();
}

function handleProgress({ stage, message }) {
  const stages = ['start', 'validation', 'detection', 'sponsorship', 'analysis', 'parsing', 'retry', 'scoring', 'queue', 'complete'];
  const stageIndex = Math.max(0, stages.indexOf(stage));
  const progress = stage === 'complete'
    ? 100
    : Math.min(95, Math.round(((stageIndex + 1) / stages.length) * 100));

  els.progressFill.style.width = `${progress}%`;
  els.progressText.textContent = message || stage;
}

function handleResult(result) {
  currentResultJobId = result?.jobId || currentResultJobId;
  currentResultPayload = result || null;

  if (typeof result?.overallMatchPercent === 'number' && result.jobId) {
    scoreMap.set(result.jobId, {
      jobId: result.jobId,
      sourceType: result.sourceType || 'linkedin',
      score: result.overallMatchPercent,
      analyzedAt: result.cachedAt || result.metadata?.analysisTimestamp || new Date().toISOString(),
      title: result.jobTitle || result.title || '',
      company: result.company || '',
      location: result.location || '',
      url: result.jobUrl || '',
      jdLanguage: result.metadata?.jdLanguage || detectJdLanguageLabel(currentJDData?.description, result.jobTitle),
      requiredExperience: result.metadata?.requiredExperience || detectRequiredExperience(currentJDData?.description, result.jobTitle),
      requiredLanguages: result.metadata?.requiredLanguages || detectRequiredLanguages(currentJDData?.description, result.jobTitle),
      kmEligible: result.sponsorshipAssessment?.kmEligible === true,
      sponsorshipLabel: result.sponsorshipAssessment?.kmEligible ? 'KM' : null,
      sponsorshipCompany: result.sponsorshipAssessment?.registryMatchedName || null,
      sponsorshipConfidence: result.sponsorshipAssessment?.registryConfidence || null,
      result,
    });
    renderJobList();
    renderManualJobs();
    renderLibrary();
  }

  els.progressFill.style.width = '100%';
  els.progressText.textContent = result.fromCache ? 'Loaded cached result.' : 'Analysis complete.';

  window.setTimeout(() => {
    els.progressContainer.classList.add('hidden');
    resetAnalyzeButtons();
    if (detailViewHost === 'list' && result?.sourceType !== 'inserted' && currentResultJobId === result?.jobId) {
      renderListDetailPanel(result);
    } else if (detailViewHost === 'manual' && result?.sourceType === 'inserted' && currentResultJobId === result?.jobId) {
      renderManualDetailPanel(result);
    } else if (detailViewHost === 'library' && currentResultJobId === result?.jobId) {
      renderLibraryDetailPanel(result);
    } else {
      els.resultsContainer.classList.remove('hidden');
      renderResult(result);
    }
    refreshPositionLibrary().catch(err => console.warn('Failed to refresh library after result:', err));
  }, 250);
}

function renderResult(result) {
  hideJobDetailPanel();
  hideLibraryDetailPanel();
  hideManualDetailPanel();
  detailViewHost = 'none';
  renderScoreRing(result.overallMatchPercent);
  renderScoreStatus(result);
  renderScoreMeta(result);
  renderBreakdown(result.matchBreakdown || []);
  renderInsights(result.strengths || [], result.gaps || []);
  renderSponsorship(result.sponsorshipAssessment, result.metadata || {});
  renderMetadata(result.metadata || {});

  const parts = [];
  if (result.jobTitle) {
    const suffix = buildResultTitleSuffix(result);
    parts.push(`${result.jobTitle}${suffix.length ? ` [${suffix.join(' | ')}]` : ''}`);
  }
  if (result.company) {
    parts.push(result.company);
  }

  const prefix = result.fromCache
    ? `Loaded from cache${result.cachedAt ? ` - ${formatTimestamp(result.cachedAt)}` : ''}`
    : 'Latest analysis';
  els.resultContext.textContent = parts.length ? `${prefix} - ${parts.join(' @ ')}` : prefix;

  if (result.fromCache) {
    els.cachedResultHint.textContent = `Showing cached result for this job${result.cachedAt ? ` from ${formatTimestamp(result.cachedAt)}` : ''}.`;
    els.cachedResultHint.classList.remove('hidden');
  } else {
    els.cachedResultHint.classList.add('hidden');
  }

  updateSavePositionButton();
  updateAnalyzeButtons();
}

function renderScoreStatus(result) {
  const blocked = isSponsorshipHardBlockResult(result);
  els.scoreStatusBadge.classList.toggle('hidden', !blocked);
  if (blocked) {
    els.scoreStatusBadge.textContent = 'Blocked';
    els.scoreStatusBadge.title = 'This result was forced to 0 by a sponsorship hard blocker.';
  } else {
    els.scoreStatusBadge.textContent = 'Blocked';
    els.scoreStatusBadge.removeAttribute('title');
  }
}

function handleAnalysisError({ error, details }) {
  els.progressContainer.classList.add('hidden');
  resetAnalyzeButtons();
  showError(details && details !== error ? `${error || 'Analysis failed.'} ${details}` : (error || 'Analysis failed.'));
}

function renderScoreRing(score) {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  const svg = els.scoreRingFill.closest('svg');

  if (!svg.querySelector('#scoreGradient')) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${getGradientColor(score, 'start')}" />
        <stop offset="100%" stop-color="${getGradientColor(score, 'end')}" />
      </linearGradient>
    `;
    svg.insertBefore(defs, svg.firstChild);
  } else {
    const stops = svg.querySelectorAll('#scoreGradient stop');
    stops[0].setAttribute('stop-color', getGradientColor(score, 'start'));
    stops[1].setAttribute('stop-color', getGradientColor(score, 'end'));
  }

  requestAnimationFrame(() => {
    els.scoreRingFill.style.strokeDashoffset = offset;
  });

  animateNumber(els.scoreValue, 0, score, 900);
}

function renderScoreMeta(result) {
  const lines = [];
  if (result.metadata?.rawScoreBeforePenalty !== undefined) {
    lines.push(`Raw score: ${result.metadata.rawScoreBeforePenalty}`);
  }
  if (result.metadata?.penaltyCoefficient !== undefined) {
    lines.push(`Penalty coefficient: ${result.metadata.penaltyCoefficient}`);
  }
  if (result.metadata?.capLimit !== undefined) {
    lines.push(`Cap limit: ${result.metadata.capLimit}`);
  }
  els.scoreMeta.innerHTML = lines.map(line => `<div>${escapeHtml(line)}</div>`).join('');
}

function renderBreakdown(breakdown) {
  if (!breakdown.length) {
    els.breakdownList.innerHTML = '<p class="hint-text">No breakdown data was returned.</p>';
    return;
  }

  els.breakdownList.innerHTML = breakdown.map((item, index) => {
    const scoreClass = getScoreClass(item.score);
    return `
      <div class="breakdown-item" data-index="${index}">
        <div class="breakdown-item-header">
          <span class="breakdown-item-name">${escapeHtml(item.itemName)}</span>
          <span class="breakdown-item-score score-${scoreClass}">${Math.round(item.score)}</span>
        </div>
        <div class="breakdown-bar">
          <div class="breakdown-bar-fill bar-${scoreClass}" style="width: ${item.score}%"></div>
        </div>
        <div class="breakdown-detail">
          <div class="detail-section">
            <div class="detail-title">Weight</div>
            <div>${Math.round((item.weight || 0) * 100)}%</div>
          </div>
          ${renderDetailList('Evidence', item.evidence)}
          ${renderDetailList('Strengths', item.prosCons?.strengths)}
          ${renderDetailList('Gaps', item.prosCons?.gaps)}
        </div>
      </div>
    `;
  }).join('');
  bindBreakdownExpand(els.breakdownList);
}

function renderDetailList(title, items = []) {
  if (!items?.length) {
    return '';
  }

  return `
    <div class="detail-section">
      <div class="detail-title">${escapeHtml(title)}</div>
      <ul class="detail-list">
        ${items.map(entry => `<li>${escapeHtml(entry)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function bindBreakdownExpand(container) {
  if (!container) {
    return;
  }

  container.querySelectorAll('.breakdown-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });
  });
}

function renderInsights(strengths, gaps) {
  els.strengthsList.innerHTML = strengths.length
    ? strengths.map(item => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>No strengths returned.</li>';

  els.gapsList.innerHTML = gaps.length
    ? gaps.map(item => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>No gaps returned.</li>';
}

function renderSponsorship(assessment, meta = {}) {
  if (!assessment) {
    els.sponsorshipCard.classList.add('hidden');
    return;
  }

  els.sponsorshipCard.classList.remove('hidden');
  const status = buildSponsorshipStatus(assessment, meta);
  const sections = [
    `<div class="sponsor-status-row"><span class="sponsor-status ${status.className}">${escapeHtml(status.label)}</span></div>`,
    `<div class="sponsor-conclusion ${status.className}">${escapeHtml(assessment.conclusion || 'Unknown')}</div>`,
    `<div><strong>Scoring mode:</strong> ${meta.includeSponsorshipInScore === false ? 'Sponsorship not needed for this run' : 'Sponsorship required for this run'}</div>`,
  ];
  if (assessment.evidence?.length) {
    sections.push(`<div>${assessment.evidence.map(item => escapeHtml(item)).join('<br/>')}</div>`);
  }
  if (assessment.registryMatchedName) {
    sections.push(`<div><strong>Registry match:</strong> ${escapeHtml(assessment.registryMatchedName)}</div>`);
  }
  if (assessment.kmEligible) {
    sections.push('<div><strong>KM:</strong> Eligible based on the IND registry match.</div>');
  }
  if (assessment.confidence) {
    sections.push(`<div><strong>Confidence:</strong> ${escapeHtml(assessment.confidence)}</div>`);
  }
  if (assessment.uncertaintyNote) {
    sections.push(`<div><strong>Note:</strong> ${escapeHtml(assessment.uncertaintyNote)}</div>`);
  }

  els.sponsorshipContent.innerHTML = sections.join('');
}

function shownJobsWithCache() {
  return currentListJobs
    .slice(0, visibleJobCount)
    .filter(job => scoreMap.has(job.jobId));
}

async function openJobFromList(jobId) {
  if (!jobId) {
    return;
  }

  currentResultJobId = jobId;
  renderJobList();

  const activeTab = await getActiveTab();
  if (activeTab?.id) {
    try {
      await sendTabMessageWithInjection(activeTab.id, {
        type: Actions.FOCUS_JOB,
        payload: { jobId },
      });
    } catch {
      // Focusing the LinkedIn card is best effort.
    }
  }

  let entry = scoreMap.get(jobId) || null;
  if (!entry?.result && resumeText) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: Actions.GET_CACHED_SCORES,
        payload: { jobIds: [jobId], includeResult: true },
      });

      const hydrated = response?.entries?.[0];
      if (hydrated) {
        entry = {
          ...entry,
          ...hydrated,
          result: hydrated.result || entry?.result,
        };
        scoreMap.set(jobId, entry);
        renderJobList();
      }
    } catch {
      // Ignore hydration failures and fall back to the current state.
    }
  }

  if (entry?.result) {
    const listDetailResult = {
      ...entry.result,
      jobId: entry.jobId,
      jobTitle: entry.title,
      company: entry.company,
      location: entry.location,
      jobUrl: entry.url,
      fromCache: true,
      cachedAt: entry.analyzedAt,
      metadata: {
        ...(entry.result.metadata || {}),
        jdLanguage: entry.jdLanguage || entry.result.metadata?.jdLanguage || 'Unknown',
        requiredExperience: entry.requiredExperience || entry.result.metadata?.requiredExperience || null,
        requiredLanguages: entry.requiredLanguages || entry.result.metadata?.requiredLanguages || [],
      },
    };
    renderListDetailPanel(listDetailResult);
    return;
  }

  showSaveHint('This job has not been analyzed yet. It was focused on the LinkedIn page.', 'success');
  scheduleRefreshPageContext();
}

async function openCachedResult(jobId, sourceType = 'linkedin', displayMode = 'results') {
  if (!jobId) {
    return;
  }

  currentResultJobId = jobId;
  renderJobList();
  renderManualJobs();
  renderLibrary();

  let entry = scoreMap.get(jobId) || null;
  if (!entry?.result && resumeText) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: Actions.GET_CACHED_SCORES,
        payload: { jobIds: [jobId], includeResult: true },
      });
      const hydrated = response?.entries?.[0];
      if (hydrated) {
        entry = {
          ...entry,
          ...hydrated,
          result: hydrated.result || entry?.result,
        };
        scoreMap.set(jobId, entry);
      }
    } catch {
      // Ignore hydration failures.
    }
  }

  if (entry?.result) {
    const hydratedResult = {
      ...entry.result,
      jobId: entry.jobId,
      sourceType: sourceType || entry.sourceType || 'linkedin',
      jobTitle: entry.title,
      company: entry.company,
      location: entry.location,
      jobUrl: entry.url,
      sourceUrl: entry.sourceUrl || entry.url,
      fromCache: true,
      cachedAt: entry.analyzedAt,
      metadata: {
        ...(entry.result.metadata || {}),
        jdLanguage: entry.jdLanguage || entry.result.metadata?.jdLanguage || 'Unknown',
        requiredExperience: entry.requiredExperience || entry.result.metadata?.requiredExperience || null,
        requiredLanguages: entry.requiredLanguages || entry.result.metadata?.requiredLanguages || [],
      },
    };

    if (displayMode === 'list-detail') {
      renderListDetailPanel(hydratedResult);
    } else if (displayMode === 'manual-detail') {
      renderManualDetailPanel(hydratedResult);
    } else if (displayMode === 'library-detail') {
      renderLibraryDetailPanel(hydratedResult);
    } else {
      hideJobDetailPanel();
      hideLibraryDetailPanel();
      hideManualDetailPanel();
      els.resultsContainer.classList.remove('hidden');
      renderResult(hydratedResult);
    }
    return;
  }

  if (sourceType === 'inserted') {
    const manualJob = manualJobs.find(job => job.manualJobId === jobId);
    if (manualJob) {
      currentManualEditingId = manualJob.manualJobId;
      els.manualJobsBody.classList.remove('hidden');
      els.manualJobsToggle.textContent = 'Collapse';
      els.manualRawInput.value = manualJob.rawInput || '';
      els.manualTitle.value = manualJob.title || '';
      els.manualCompany.value = manualJob.company || '';
      els.manualLocation.value = manualJob.location || '';
      els.manualSourceUrl.value = manualJob.sourceUrl || '';
      els.manualDescription.value = manualJob.description || '';
      showManualSaveHint('This inserted job has not been analyzed yet. Review the fields and run analysis.', 'success');
    }
    return;
  }

  throw new Error('No cached result is available for this job yet.');
}

async function openLibraryItem(dataset) {
  const sourceType = dataset.sourceType || librarySource;
  const jobId = dataset.jobId;
  if (!jobId) {
    return;
  }

  if (libraryMode === 'saved') {
    const saved = savedPositionsMap.get(buildPositionKey(jobId, sourceType));
    if (saved?.result) {
      renderLibraryDetailPanel({
        ...saved.result,
        jobId,
        sourceType,
        jobTitle: saved.title,
        company: saved.company,
        location: saved.location,
        jobUrl: saved.url,
        sourceUrl: saved.sourceUrl || saved.url,
        fromCache: true,
        cachedAt: saved.updatedAt || saved.savedAt,
      });
      return;
    }
  }

  await openCachedResult(jobId, sourceType, 'library-detail');
}

function updateSavePositionButton() {
  if (!currentResultPayload?.jobId) {
    els.savePositionBtn.classList.add('hidden');
    return;
  }

  const sourceType = currentResultPayload.sourceType || 'linkedin';
  const isSaved = savedPositionsMap.has(buildPositionKey(currentResultPayload.jobId, sourceType));
  els.savePositionBtn.classList.remove('hidden');
  els.savePositionBtn.classList.toggle('active', isSaved);
  els.savePositionBtn.textContent = isSaved ? '★' : '☆';
  els.savePositionBtn.title = isSaved ? 'Remove from saved positions' : 'Save position';
  els.savePositionBtn.setAttribute('aria-label', els.savePositionBtn.title);
  els.savePositionBtn.dataset.jobId = currentResultPayload.jobId;
  els.savePositionBtn.dataset.sourceType = sourceType;
}

function renderMetadata(meta) {
  const rows = [
    ['Analysis time', meta.analysisTimestamp || 'N/A'],
    ['Model', meta.modelUsed || 'N/A'],
    ['Analysis mode', getPresetLabel(meta.analysisPreset || DEFAULT_ANALYSIS_PRESET)],
    ['Profile type', meta.isCustomProfile ? 'Custom' : 'Preset'],
    ['Needs sponsorship', meta.includeSponsorshipInScore === false ? 'No' : 'Yes'],
    ['Penalty coefficient', meta.penaltyCoefficient ?? 'N/A'],
    ['Cap limit', meta.capLimit ?? 'N/A'],
    ['Raw score', meta.rawScoreBeforePenalty ?? 'N/A'],
    ['Total time', formatTiming(meta.timing?.totalMs)],
    ['LLM time', formatTiming(meta.timing?.llmMs)],
    ['Extract time', formatTiming(meta.timing?.extractMs)],
    ['Retry used', meta.timing?.usedRetry ? 'Yes' : 'No'],
    ['Triggers', meta.degradationTriggers?.join(', ') || 'None'],
  ];

  els.metadataContent.innerHTML = rows.map(([label, value]) => `
    <div class="meta-row">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="meta-value">${escapeHtml(String(value))}</span>
    </div>
  `).join('');
}

function renderListDetailPanel(result) {
  currentResultJobId = result?.jobId || currentResultJobId;
  currentResultPayload = result || null;
  detailViewHost = 'list';
  renderJobList();
  renderManualJobs();
  renderLibrary();
  hideLibraryDetailPanel();
  hideManualDetailPanel();
  els.resultsContainer.classList.add('hidden');
  els.jobListCard.classList.add('detail-open');
  els.jobDetailPanel.classList.remove('hidden');
  els.jobDetailContent.innerHTML = buildListDetailHtml(result);
  bindBreakdownExpand(els.jobDetailContent);
  updateSavePositionButton();
}

function hideJobDetailPanel() {
  els.jobListCard.classList.remove('detail-open');
  els.jobDetailPanel.classList.add('hidden');
  els.jobDetailContent.innerHTML = '';
  if (detailViewHost === 'list') {
    detailViewHost = 'none';
  }
}

function renderLibraryDetailPanel(result) {
  currentResultJobId = result?.jobId || currentResultJobId;
  currentResultPayload = result || null;
  detailViewHost = 'library';
  renderJobList();
  renderManualJobs();
  renderLibrary();
  hideJobDetailPanel();
  hideManualDetailPanel();
  els.resultsContainer.classList.add('hidden');
  els.libraryCard.classList.add('detail-open');
  els.libraryDetailPanel.classList.remove('hidden');
  els.libraryDetailContent.innerHTML = buildListDetailHtml(result);
  bindBreakdownExpand(els.libraryDetailContent);
  updateSavePositionButton();
}

function hideLibraryDetailPanel() {
  els.libraryCard.classList.remove('detail-open');
  els.libraryDetailPanel.classList.add('hidden');
  els.libraryDetailContent.innerHTML = '';
  if (detailViewHost === 'library') {
    detailViewHost = 'none';
  }
}

function renderManualDetailPanel(result) {
  currentResultJobId = result?.jobId || currentResultJobId;
  currentResultPayload = result || null;
  detailViewHost = 'manual';
  renderJobList();
  renderManualJobs();
  renderLibrary();
  hideJobDetailPanel();
  hideLibraryDetailPanel();
  els.resultsContainer.classList.add('hidden');
  els.manualJobsCard.classList.add('detail-open');
  els.manualDetailPanel.classList.remove('hidden');
  els.manualDetailContent.innerHTML = buildListDetailHtml(result);
  bindBreakdownExpand(els.manualDetailContent);
  updateSavePositionButton();
}

function hideManualDetailPanel() {
  els.manualJobsCard.classList.remove('detail-open');
  els.manualDetailPanel.classList.add('hidden');
  els.manualDetailContent.innerHTML = '';
  if (detailViewHost === 'manual') {
    detailViewHost = 'none';
  }
}

function buildListDetailHtml(result) {
  const contextLine = buildResultContextLine(result);
  const metadata = result.metadata || {};
  const breakdownHtml = (result.matchBreakdown || []).length
    ? result.matchBreakdown.map(item => `
      <div class="breakdown-item">
        <div class="breakdown-item-header">
          <span class="breakdown-item-name">${escapeHtml(item.itemName)}</span>
          <span class="breakdown-item-score score-${getScoreClass(item.score)}">${Math.round(item.score)}</span>
        </div>
        <div class="breakdown-bar">
          <div class="breakdown-bar-fill bar-${getScoreClass(item.score)}" style="width: ${item.score}%"></div>
        </div>
        <div class="breakdown-detail">
          <div class="detail-section">
            <div class="detail-title">Weight</div>
            <div>${Math.round((item.weight || 0) * 100)}%</div>
          </div>
          ${renderDetailList('Evidence', item.evidence)}
          ${renderDetailList('Strengths', item.prosCons?.strengths)}
          ${renderDetailList('Gaps', item.prosCons?.gaps)}
        </div>
      </div>
    `).join('')
    : '<p class="hint-text">No breakdown data was returned.</p>';

  const strengthsHtml = buildInsightListHtml(result.strengths, 'No strengths returned.');
  const gapsHtml = buildInsightListHtml(result.gaps, 'No gaps returned.');
  const sponsorshipHtml = buildListDetailSponsorshipHtml(result.sponsorshipAssessment, metadata);
  const metadataHtml = buildListDetailMetadataHtml(metadata);

  return `
    <div class="job-detail-section">
      <div class="job-detail-headline">${escapeHtml(contextLine)}</div>
      <div class="job-detail-subtitle">${escapeHtml(result.company || '')}</div>
    </div>
    <div class="job-detail-section">
      <div class="job-detail-score">${Math.round(result.overallMatchPercent || 0)}%</div>
      <div class="job-detail-caption">Overall match</div>
      <div class="score-meta">${buildScoreMetaLines(result).map(line => `<div>${escapeHtml(line)}</div>`).join('')}</div>
    </div>
    <div class="job-detail-section">
      <p class="eyebrow">Details</p>
      <h3>Breakdown</h3>
      <div class="breakdown-list">${breakdownHtml}</div>
    </div>
    <div class="job-detail-section">
      <p class="eyebrow">Highlights</p>
      <h3>Strengths and gaps</h3>
      <div class="insights-content">
        <div class="insight-group">
          <h4 class="insight-title strengths-title">Strengths</h4>
          ${strengthsHtml}
        </div>
        <div class="insight-group">
          <h4 class="insight-title gaps-title">Gaps</h4>
          ${gapsHtml}
        </div>
      </div>
    </div>
    ${sponsorshipHtml}
    <div class="job-detail-section">
      <p class="eyebrow">Debug</p>
      <h3>Analysis metadata</h3>
      ${metadataHtml}
    </div>
  `;
}

function buildResultContextLine(result) {
  const suffix = buildResultTitleSuffix(result);
  const title = result.jobTitle ? `${result.jobTitle}${suffix.length ? ` [${suffix.join(' | ')}]` : ''}` : 'Cached analysis';
  const prefix = result.fromCache
    ? `Loaded from cache${result.cachedAt ? ` - ${formatTimestamp(result.cachedAt)}` : ''}`
    : 'Latest analysis';
  return `${prefix} - ${title}`;
}

function buildScoreMetaLines(result) {
  const lines = [];
  if (result.metadata?.rawScoreBeforePenalty !== undefined) {
    lines.push(`Raw score: ${result.metadata.rawScoreBeforePenalty}`);
  }
  if (result.metadata?.penaltyCoefficient !== undefined) {
    lines.push(`Penalty coefficient: ${result.metadata.penaltyCoefficient}`);
  }
  if (result.metadata?.capLimit !== undefined) {
    lines.push(`Cap limit: ${result.metadata.capLimit}`);
  }
  if (isSponsorshipHardBlockResult(result)) {
    lines.push('Final score was forced to 0 by a sponsorship hard blocker.');
  }
  return lines;
}

function buildInsightListHtml(items = [], fallbackText = '') {
  if (!items?.length) {
    return `<p class="hint-text">${escapeHtml(fallbackText)}</p>`;
  }

  return `<ul class="insight-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function buildListDetailSponsorshipHtml(assessment, meta = {}) {
  if (!assessment) {
    return '';
  }

  const status = buildSponsorshipStatus(assessment, meta);
  const sections = [
    `<div class="sponsor-status-row"><span class="sponsor-status ${status.className}">${escapeHtml(status.label)}</span></div>`,
  ];
  if (assessment.conclusion) {
    sections.push(`<div class="sponsor-conclusion ${status.className}">${escapeHtml(assessment.conclusion)}</div>`);
  }
  sections.push(`<div><strong>Scoring mode:</strong> ${meta.includeSponsorshipInScore === false ? 'Sponsorship not needed for this run' : 'Sponsorship required for this run'}</div>`);
  if (assessment.evidence?.length) {
    sections.push(`<div>${assessment.evidence.map(item => escapeHtml(item)).join('<br/>')}</div>`);
  }
  if (assessment.registryMatchedName) {
    sections.push(`<div><strong>Registry match:</strong> ${escapeHtml(assessment.registryMatchedName)}</div>`);
  }
  if (assessment.kmEligible) {
    sections.push('<div><strong>KM:</strong> Eligible based on the IND registry match.</div>');
  }
  if (assessment.confidence) {
    sections.push(`<div><strong>Confidence:</strong> ${escapeHtml(assessment.confidence)}</div>`);
  }
  if (assessment.uncertaintyNote) {
    sections.push(`<div><strong>Note:</strong> ${escapeHtml(assessment.uncertaintyNote)}</div>`);
  }

  return `
    <div class="job-detail-section">
      <p class="eyebrow">Netherlands</p>
      <h3>Sponsorship check</h3>
      <div class="sponsorship-content">${sections.join('')}</div>
    </div>
  `;
}

function buildSponsorshipStatus(assessment, meta = {}) {
  const conclusion = String(assessment?.conclusion || '').toLowerCase();
  const note = String(assessment?.uncertaintyNote || '').toLowerCase();
  const sponsorshipRequired = meta.includeSponsorshipInScore !== false;
  const explicitlyNotOffered = conclusion.includes('not offered');
  const conflictingSignals = note.includes('conflicting sponsorship signals')
    || conclusion.includes('jd suggests sponsorship support');
  const unsupported = isUnsupportedSponsorship(assessment);

  if (!sponsorshipRequired) {
    return { label: 'Not needed', className: 'neutral' };
  }

  if ((assessment?.indRegistered === false && assessment?.sponsorshipImpactOnOverall === 'decrease') || explicitlyNotOffered) {
    return { label: 'Hard blocker', className: 'negative' };
  }

  if (assessment?.indRegistered === true && !explicitlyNotOffered) {
    return { label: 'Supported', className: 'positive' };
  }

  if (conflictingSignals) {
    return { label: 'Conflicting signals', className: 'warning' };
  }

  if (unsupported) {
    return { label: 'Not supported', className: 'unsupported' };
  }

  return { label: 'Unknown', className: 'unknown' };
}

function buildListDetailMetadataHtml(meta) {
  const rows = [
    ['Analysis time', meta.analysisTimestamp || 'N/A'],
    ['Model', meta.modelUsed || 'N/A'],
    ['Analysis mode', getPresetLabel(meta.analysisPreset || DEFAULT_ANALYSIS_PRESET)],
    ['Profile type', meta.isCustomProfile ? 'Custom' : 'Preset'],
    ['Needs sponsorship', meta.includeSponsorshipInScore === false ? 'No' : 'Yes'],
    ['Penalty coefficient', meta.penaltyCoefficient ?? 'N/A'],
    ['Cap limit', meta.capLimit ?? 'N/A'],
    ['Raw score', meta.rawScoreBeforePenalty ?? 'N/A'],
    ['Total time', formatTiming(meta.timing?.totalMs)],
    ['LLM time', formatTiming(meta.timing?.llmMs)],
    ['Extract time', formatTiming(meta.timing?.extractMs)],
    ['Retry used', meta.timing?.usedRetry ? 'Yes' : 'No'],
    ['Triggers', meta.degradationTriggers?.join(', ') || 'None'],
  ];

  return rows.map(([label, value]) => `
    <div class="meta-row">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="meta-value">${escapeHtml(String(value))}</span>
    </div>
  `).join('');
}

function isUnsupportedSponsorship(assessment) {
  if (!assessment) {
    return false;
  }

  const conclusion = assessment.conclusion || '';
  if (conclusion.includes('鏆備笉鏀寔') || conclusion.toLowerCase().includes('unsupported')) {
    return true;
  }

  return assessment.indRegistered == null
    && (assessment.sponsorshipImpactOnOverall === 'noChange' || !assessment.evidence?.length);
}

function isSponsorshipHardBlockResult(result) {
  const assessment = result?.sponsorshipAssessment;
  const metadata = result?.metadata || {};
  return result?.overallMatchPercent === 0
    && Number(metadata.rawScoreBeforePenalty) > 0
    && metadata.includeSponsorshipInScore === true
    && assessment?.sponsorshipImpactOnOverall === 'decrease'
    && assessment?.indRegistered === false;
}

function getGradientColor(score, position) {
  if (score >= 75) {
    return position === 'start' ? '#147d4f' : '#2ab070';
  }
  if (score >= 50) {
    return position === 'start' ? '#d97706' : '#f2a541';
  }
  return position === 'start' ? '#b42318' : '#de6258';
}

function getScoreClass(score) {
  if (score >= 75) {
    return 'high';
  }
  if (score >= 50) {
    return 'medium';
  }
  return 'low';
}

function animateNumber(element, from, to, duration) {
  const start = performance.now();

  const step = now => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(from + (to - from) * eased).toString();

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

async function refreshPageScores() {
  const activeTab = await getActiveTab();
  if (!activeTab?.id) {
    return;
  }

  try {
    await sendTabMessageWithInjection(activeTab.id, { type: Actions.REFRESH_SCORES });
  } catch {
    // Ignore missing content scripts.
  }
}

async function getActiveTab() {
  const currentWindowTabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (currentWindowTabs[0]) {
    return currentWindowTabs[0];
  }

  const lastFocusedTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return lastFocusedTabs[0] || null;
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

    await new Promise(resolve => window.setTimeout(resolve, 150));
    return chrome.tabs.sendMessage(tabId, message);
  }
}

function setupTabWatchers() {
  const safeRefresh = () => {
    scheduleRefreshPageContext();
  };

  chrome.tabs.onActivated.addListener(() => {
    safeRefresh();
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') {
      return;
    }

    if (!tab?.active) {
      return;
    }

    safeRefresh();
  });

  chrome.windows.onFocusChanged.addListener(() => {
    safeRefresh();
  });
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return 'recently';
  }

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

function detectJdLanguageLabel(description = '', title = '') {
  const text = `${title || ''}\n${description || ''}`.trim();
  if (!text) {
    return 'Unknown';
  }

  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'Chinese';
  }

  const normalized = ` ${text.toLowerCase()} `;
  const scores = [
    { label: 'English', score: countLanguageHits(normalized, [' the ', ' and ', ' with ', ' for ', ' experience ', ' role ', ' responsibilities ']) },
    { label: 'Dutch', score: countLanguageHits(normalized, [' de ', ' het ', ' een ', ' en ', ' van ', ' voor ', ' met ', ' ervaring ']) },
    { label: 'German', score: countLanguageHits(normalized, [' der ', ' die ', ' das ', ' und ', ' mit ', ' f眉r ', ' erfahrung ', ' aufgaben ']) },
    { label: 'French', score: countLanguageHits(normalized, [' le ', ' la ', ' les ', ' des ', ' pour ', ' avec ', ' exp茅rience ']) },
    { label: 'Spanish', score: countLanguageHits(normalized, [' el ', ' la ', ' los ', ' para ', ' con ', ' experiencia ', ' responsabilidades ']) },
  ];

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].label : 'English';
}

function countLanguageHits(text, patterns) {
  return patterns.reduce((sum, pattern) => sum + (text.includes(pattern) ? 1 : 0), 0);
}

function detectRequiredExperience(description = '', title = '') {
  const text = `${title || ''}\n${description || ''}`;
  if (!text.trim()) {
    return null;
  }

  const patterns = [
    /(\d+)\s*\+?\s*(?:to|-)\s*(\d+)\s+years?/i,
    /minimum of\s+(\d+)\s+years?/i,
    /at least\s+(\d+)\s+years?/i,
    /(\d+)\+?\s+years?\s+of\s+experience/i,
    /(\d+)\+?\s+years?\s+experience/i,
    /(\d+)\s+yrs?\s+experience/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    if (match[2]) {
      return `${match[1]}-${match[2]}y`;
    }

    return `${match[1]}y+`;
  }

  if (/\bintern(ship)?\b/i.test(text) || /\bgraduate\b/i.test(text) || /\bentry level\b/i.test(text)) {
    return '0-1y';
  }

  return null;
}

function detectRequiredLanguages(description = '', title = '') {
  const text = `${title || ''}\n${description || ''}`.toLowerCase();
  if (!text.trim()) {
    return [];
  }

  const candidates = [
    { label: 'English', patterns: [/\benglish\b/, /\bfluent in english\b/, /\bprofessional english\b/] },
    { label: 'Dutch', patterns: [/\bdutch\b/, /\bnederlands\b/] },
    { label: 'German', patterns: [/\bgerman\b/, /\bdeutsch\b/] },
    { label: 'French', patterns: [/\bfrench\b/, /\bfrancais\b/, /\bfran莽ais\b/] },
    { label: 'Spanish', patterns: [/\bspanish\b/, /\bespanol\b/, /\bespa帽ol\b/] },
    { label: 'Italian', patterns: [/\bitalian\b/, /\bitaliano\b/] },
    { label: 'Portuguese', patterns: [/\bportuguese\b/, /\bportugues\b/, /\bportugu锚s\b/] },
    { label: 'Chinese', patterns: [/\bchinese\b/, /\bmandarin\b/, /\bcantonese\b/] },
    { label: 'Japanese', patterns: [/\bjapanese\b/] },
  ];

  const matches = [];
  for (const candidate of candidates) {
    if (candidate.patterns.some(pattern => pattern.test(text))) {
      matches.push(candidate.label);
    }
  }

  return matches.slice(0, 3);
}

function buildJdTitleBadges({ jdLanguage, requiredExperience, requiredLanguages, kmEligible }) {
  const badges = [];

  if (jdLanguage && jdLanguage !== 'Unknown') {
    badges.push(`<span class="job-lang-pill">${escapeHtml(jdLanguage)}</span>`);
  }

  if (requiredExperience) {
    badges.push(`<span class="job-requirement-pill">${escapeHtml(requiredExperience)}</span>`);
  }

  const languageList = Array.isArray(requiredLanguages) ? requiredLanguages.filter(Boolean).slice(0, 2) : [];
  for (const language of languageList) {
    badges.push(`<span class="job-requirement-pill">${escapeHtml(language)}</span>`);
  }

  if (kmEligible) {
    badges.push('<span class="job-km-pill">KM</span>');
  }

  return badges.length ? ` ${badges.join('')}` : '';
}

function buildSaveStarButton(jobId, sourceType, isSaved) {
  const label = isSaved ? 'Remove from saved positions' : 'Save position';
  return `<button class="star-btn${isSaved ? ' active' : ''}" data-save-job-id="${escapeHtml(jobId)}" data-source-type="${escapeHtml(sourceType || 'linkedin')}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${isSaved ? '★' : '☆'}</button>`;
}

function buildResultTitleSuffix(result) {
  const suffix = [];
  const jdLanguage = result.metadata?.jdLanguage;
  const requiredExperience = result.metadata?.requiredExperience;
  const requiredLanguages = Array.isArray(result.metadata?.requiredLanguages) ? result.metadata.requiredLanguages : [];

  if (jdLanguage && jdLanguage !== 'Unknown') {
    suffix.push(jdLanguage);
  }
  if (requiredExperience) {
    suffix.push(requiredExperience);
  }
  if (requiredLanguages.length) {
    suffix.push(requiredLanguages.slice(0, 2).join('/'));
  }
  if (result.sponsorshipAssessment?.kmEligible) {
    suffix.push('KM');
  }

  return suffix;
}

function parseModelList(value) {
  return (value || '')
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeModelList(modelIds, activeModel) {
  const models = Array.isArray(modelIds) ? modelIds.filter(Boolean) : [];
  if (activeModel && !models.includes(activeModel)) {
    models.unshift(activeModel);
  }
  return [...new Set(models)];
}

function handleProviderChange() {
  if (!currentConfig) {
    return;
  }

  const nextProvider = els.settingProvider.value;
  const previousProvider = currentConfig.provider || nextProvider;

  syncCurrentProviderDraft(previousProvider);
  currentConfig.provider = nextProvider;
  applyProviderProfileToForm(nextProvider);
}

function hydrateProviderProfiles(config) {
  const providerProfiles = {};

  for (const provider of PROVIDERS) {
    const existing = config?.providerProfiles?.[provider.id] || {};
    providerProfiles[provider.id] = {
      baseUrl: existing.baseUrl || provider.baseUrl || '',
      apiKey: existing.apiKey || '',
      modelId: existing.modelId || config?.modelId || DEFAULT_PROVIDER_MODEL(),
      modelIds: normalizeModelList(existing.modelIds || config?.modelIds || [DEFAULT_PROVIDER_MODEL()], existing.modelId || config?.modelId || DEFAULT_PROVIDER_MODEL()),
      maxTokens: existing.maxTokens || config?.maxTokens || 4096,
      temperature: existing.temperature ?? config?.temperature ?? 0.1,
      timeoutMs: existing.timeoutMs || config?.timeoutMs || 60000,
      maxRetries: existing.maxRetries ?? config?.maxRetries ?? 2,
    };
  }

  const activeProvider = config?.provider || 'openai';
  const activeProfile = providerProfiles[activeProvider] || providerProfiles.openai;

  return {
    ...config,
    provider: activeProvider,
    baseUrl: activeProfile.baseUrl,
    apiKey: activeProfile.apiKey,
    modelId: activeProfile.modelId,
    modelIds: activeProfile.modelIds,
    maxTokens: activeProfile.maxTokens,
    temperature: activeProfile.temperature,
    timeoutMs: activeProfile.timeoutMs,
    maxRetries: activeProfile.maxRetries,
    analysisPreset: config?.analysisPreset || DEFAULT_ANALYSIS_PRESET,
    promptTuningMode: config?.promptTuningMode || config?.analysisPreset || DEFAULT_ANALYSIS_PRESET,
    includeSponsorshipInScore: config?.includeSponsorshipInScore !== false,
    useCustomWeights: config?.useCustomWeights === true,
    customWeights: sanitizeCustomWeights(config?.customWeights),
    additionalPromptInstructions: typeof config?.additionalPromptInstructions === 'string'
      ? config.additionalPromptInstructions
      : '',
    customPromptTemplate: typeof config?.customPromptTemplate === 'string'
      ? config.customPromptTemplate
      : '',
    enableDiagnostics: config?.enableDiagnostics !== false,
    providerProfiles,
  };
}

function applyProviderProfileToForm(providerId) {
  const profile = currentConfig?.providerProfiles?.[providerId] || createDefaultProviderProfile(providerId);
  const savedModels = normalizeModelList(profile.modelIds, profile.modelId);

  els.settingProvider.value = providerId;
  els.settingBaseUrl.value = profile.baseUrl || '';
  els.settingApiKey.value = profile.apiKey || '';
  els.settingModel.value = profile.modelId || '';
  els.settingModelList.value = savedModels.join('\n');
  els.settingMaxTokens.value = profile.maxTokens || 4096;
  els.settingTemperature.value = profile.temperature ?? 0.1;
  els.settingTimeout.value = ((profile.timeoutMs || 60000) / 1000).toString();
  els.settingRetries.value = profile.maxRetries ?? 2;
}

function syncCurrentProviderDraft(providerOverride = null) {
  if (!currentConfig) {
    return;
  }

  const providerId = providerOverride || currentConfig.provider || els.settingProvider.value || 'openai';
  currentConfig.providerProfiles = currentConfig.providerProfiles || {};
  currentConfig.providerProfiles[providerId] = readProviderForm();
  currentConfig.provider = providerId;
}

function readProviderForm() {
  const activeModel = els.settingModel.value.trim();
  const modelIds = normalizeModelList(parseModelList(els.settingModelList.value), activeModel);

  return {
    baseUrl: els.settingBaseUrl.value.trim(),
    apiKey: els.settingApiKey.value.trim(),
    modelId: activeModel || modelIds[0] || '',
    modelIds,
    maxTokens: Number.parseInt(els.settingMaxTokens.value, 10) || 4096,
    temperature: Number.parseFloat(els.settingTemperature.value) || 0.1,
    timeoutMs: (Number.parseInt(els.settingTimeout.value, 10) || 60) * 1000,
    maxRetries: Number.parseInt(els.settingRetries.value, 10) || 2,
  };
}

function createDefaultProviderProfile(providerId) {
  const provider = PROVIDERS.find(item => item.id === providerId);
  return {
    baseUrl: provider?.baseUrl || '',
    apiKey: '',
    modelId: DEFAULT_PROVIDER_MODEL(),
    modelIds: [DEFAULT_PROVIDER_MODEL()],
    maxTokens: 4096,
    temperature: 0.1,
    timeoutMs: 60000,
    maxRetries: 2,
  };
}

function DEFAULT_PROVIDER_MODEL() {
  return 'gpt-4o';
}

function applyAnalysisSettingsToForm() {
  if (!currentConfig) {
    return;
  }

  const preset = currentConfig.analysisPreset || DEFAULT_ANALYSIS_PRESET;
  const useCustomWeights = currentConfig.useCustomWeights === true;
  const includeSponsorshipInScore = currentConfig.includeSponsorshipInScore !== false;
  const previewWeights = useCustomWeights
    ? getEffectiveWeights(currentConfig, includeSponsorshipInScore)
    : getEffectiveWeights({ analysisPreset: preset }, includeSponsorshipInScore);

  els.settingAnalysisPreset.value = preset;
  els.settingIncludeSponsorship.checked = includeSponsorshipInScore;
  els.settingModePromptPreview.value = getPromptTuningInstructions(preset);
  els.settingAdditionalInstructions.value = currentConfig.additionalPromptInstructions || '';
  els.settingUseCustomWeights.checked = useCustomWeights;
  els.settingCustomPrompt.value = currentConfig.customPromptTemplate || '';
  els.settingEnableDiagnostics.checked = currentConfig.enableDiagnostics !== false;

  setWeightInputsFromWeights(previewWeights);
  updateWeightInputState();
  updateWeightTotalHint();
}

function readAnalysisSettingsForm() {
  const analysisPreset = els.settingAnalysisPreset.value || DEFAULT_ANALYSIS_PRESET;
  const includeSponsorshipInScore = els.settingIncludeSponsorship.checked;
  const weightValues = readWeightInputs();
  const customWeights = sanitizeCustomWeights(weightValues);
  const useCustomWeights = els.settingUseCustomWeights.checked && Object.keys(customWeights).length > 0;

  return {
    analysisPreset,
    promptTuningMode: analysisPreset,
    includeSponsorshipInScore,
    useCustomWeights,
    customWeights: useCustomWeights ? customWeights : {},
    additionalPromptInstructions: els.settingAdditionalInstructions.value.trim(),
    customPromptTemplate: useCustomWeights ? els.settingCustomPrompt.value.trim() : '',
    enableDiagnostics: els.settingEnableDiagnostics.checked,
  };
}

function getWeightInputs() {
  return [
    els.weightSkills,
    els.weightResponsibility,
    els.weightYears,
    els.weightEducation,
    els.weightLangLocation,
    els.weightSponsorship,
  ];
}

function setWeightInputsFromWeights(weights) {
  for (const [itemName, fieldName] of Object.entries(WEIGHT_FIELD_MAP)) {
    const value = Number(weights?.[itemName] || 0);
    els[fieldName].value = Math.round(value * 100);
  }
}

function readWeightInputs() {
  return Object.entries(WEIGHT_FIELD_MAP).reduce((acc, [itemName, fieldName]) => {
    const percentage = Number.parseFloat(els[fieldName].value);
    if (Number.isFinite(percentage) && percentage > 0) {
      acc[itemName] = percentage / 100;
    }
    return acc;
  }, {});
}

function updateWeightInputState() {
  const disabled = !els.settingUseCustomWeights.checked;
  getWeightInputs().forEach(input => {
    input.disabled = disabled;
  });
  els.weightSponsorship.disabled = disabled || !els.settingIncludeSponsorship.checked;
  els.settingCustomPrompt.disabled = !els.settingUseCustomWeights.checked;
}

function updateWeightTotalHint() {
  const weights = readWeightInputs();
  const total = Object.entries(weights).reduce((sum, [itemName, value]) => {
    if (!els.settingIncludeSponsorship.checked && itemName === ItemNames.SPONSORSHIP) {
      return sum;
    }
    return sum + value;
  }, 0);
  const percentage = Math.round(total * 100);
  const sponsorshipNote = els.settingIncludeSponsorship.checked
    ? 'Sponsorship is treated as required for this scoring run.'
    : 'The plugin assumes you do not need sponsorship, and the remaining weights will be renormalized to 100%.';
  const suffix = els.settingUseCustomWeights.checked
    ? `Custom weights will be normalized on save. ${sponsorshipNote}`
    : `Preset preview. ${sponsorshipNote}`;
  els.settingWeightTotal.textContent = `Current total: ${percentage}% - ${suffix}`;
}

function handleAnalysisPresetChange() {
  if (!currentConfig) {
    return;
  }

  const preset = els.settingAnalysisPreset.value || DEFAULT_ANALYSIS_PRESET;
  currentConfig.analysisPreset = preset;
  currentConfig.promptTuningMode = preset;
  els.settingModePromptPreview.value = getPromptTuningInstructions(preset);

  if (!els.settingUseCustomWeights.checked) {
    setWeightInputsFromWeights(getEffectiveWeights(
      { analysisPreset: preset },
      els.settingIncludeSponsorship.checked,
    ));
  }
  updateWeightInputState();
  updateWeightTotalHint();
}

function handleUseCustomWeightsToggle() {
  updateWeightInputState();
  if (!els.settingUseCustomWeights.checked) {
    setWeightInputsFromWeights(getEffectiveWeights(
      { analysisPreset: els.settingAnalysisPreset.value || DEFAULT_ANALYSIS_PRESET },
      els.settingIncludeSponsorship.checked,
    ));
  } else if (!Object.keys(readWeightInputs()).length) {
    setWeightInputsFromWeights(getEffectiveWeights(
      { analysisPreset: els.settingAnalysisPreset.value || DEFAULT_ANALYSIS_PRESET },
      els.settingIncludeSponsorship.checked,
    ));
  }
  updateWeightTotalHint();
}

function handleIncludeSponsorshipToggle() {
  if (!currentConfig) {
    return;
  }

  currentConfig.includeSponsorshipInScore = els.settingIncludeSponsorship.checked;

  if (!els.settingUseCustomWeights.checked) {
    setWeightInputsFromWeights(getEffectiveWeights(
      { analysisPreset: els.settingAnalysisPreset.value || DEFAULT_ANALYSIS_PRESET },
      els.settingIncludeSponsorship.checked,
    ));
  }

  updateWeightInputState();
  updateWeightTotalHint();
}

function resetWeightsToPreset() {
  const preset = els.settingAnalysisPreset.value || DEFAULT_ANALYSIS_PRESET;
  setWeightInputsFromWeights(getEffectiveWeights(
    { analysisPreset: preset },
    els.settingIncludeSponsorship.checked,
  ));
  updateWeightTotalHint();
}

function formatTiming(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 'N/A';
  }
  return `${Math.round(value)} ms`;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function showSaveHint(text, type) {
  els.saveHint.textContent = text;
  els.saveHint.className = `save-hint ${type}`;
  window.setTimeout(() => {
    if (els.saveHint.textContent === text) {
      els.saveHint.textContent = '';
      els.saveHint.className = 'save-hint';
    }
  }, 3000);
}

function showError(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 18px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(180, 35, 24, 0.94);
    color: white;
    font-weight: 700;
    z-index: 9999;
    box-shadow: 0 12px 30px rgba(180, 35, 24, 0.22);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3500);
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

const scheduleRefreshPageContext = debounce(() => {
  refreshPageContext().catch(err => console.warn('Failed to refresh page context:', err));
}, 500);

