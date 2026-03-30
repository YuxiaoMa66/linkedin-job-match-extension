const Actions = Object.freeze({
  JD_EXTRACTED: 'JD_EXTRACTED',
  JD_EXTRACT_FAILED: 'JD_EXTRACT_FAILED',
  GET_JOB_LIST: 'GET_JOB_LIST',
  FOCUS_JOB: 'FOCUS_JOB',
  INJECT_SCORE: 'INJECT_SCORE',
  REFRESH_SCORES: 'REFRESH_SCORES',
  GET_JD_DATA: 'GET_JD_DATA',
  GET_CACHED_SCORES: 'GET_CACHED_SCORES',
  JD_DATA: 'JD_DATA',
});

const CONTENT_SCRIPT_READY_KEY = '__ljmContentScriptReady__';

const LIST_ITEM_SELECTORS = [
  '.job-card-container',
  '.jobs-search-results__list-item',
  'li[data-occludable-job-id]',
  '.scaffold-layout__list-item',
];
const LIST_ITEM_SELECTOR = LIST_ITEM_SELECTORS.join(', ');
const JD_SELECTORS = [
  '.jobs-description__content .jobs-box__html-content',
  '#job-details',
  '.jobs-description-content__text',
  '.jobs-description-content__text--stretch',
  '.show-more-less-html__markup',
  '.jobs-description__container',
  '.jobs-description-details__text',
  '.jobs-box__html-content',
  '.jobs-description__content',
  '.jobs-unified-description__content',
  'article.jobs-description',
];

const TITLE_SELECTORS = [
  '.jobs-unified-top-card__job-title',
  '.job-details-jobs-unified-top-card__job-title h1',
  '.job-details-jobs-unified-top-card__job-title',
  '.top-card-layout__title',
  'h1.t-24',
  'h1',
];

const COMPANY_SELECTORS = [
  '.jobs-unified-top-card__company-name a',
  '.jobs-unified-top-card__company-name',
  '.job-details-jobs-unified-top-card__company-name a',
  '.job-details-jobs-unified-top-card__company-name',
  '.job-details-jobs-unified-top-card__primary-description a',
  '.topcard__org-name-link',
];

const LOCATION_SELECTORS = [
  '.jobs-unified-top-card__bullet',
  '.job-details-jobs-unified-top-card__bullet',
  '.jobs-unified-top-card__subtitle-primary-grouping .t-black--light',
  '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
  '.jobs-unified-top-card__primary-description-without-tagline',
  '.topcard__flavor--bullet',
];

const PRIMARY_DESCRIPTION_SELECTORS = [
  '.job-details-jobs-unified-top-card__primary-description-container',
  '.job-details-jobs-unified-top-card__primary-description',
  '.jobs-unified-top-card__primary-description-container',
  '.jobs-unified-top-card__primary-description-without-tagline',
  '.topcard__flavor-row',
];

const DETAIL_BADGE_SELECTOR = '.jobs-unified-top-card__primary-description-container, .jobs-unified-top-card__content--two-pane, .job-details-jobs-unified-top-card__container, .jobs-unified-top-card, .top-card-layout';
const SELECTED_CARD_SELECTORS = [
  ...LIST_ITEM_SELECTORS.map(selector => `${selector}[aria-current="true"]`),
  '.jobs-search-results__list-item--active',
  '.job-card-container--clickable[aria-pressed="true"]',
];

let lastExtractJobId = null;
let lastKnownUrl = window.location.href;

function bootstrap() {
  injectBadgeStyles();
  setupMessageListener();
  setupObservers();
  scheduleVisibleScoresRefresh();
  scheduleCurrentJobSync();
}

function extractFirst(selectors, context = document) {
  for (const selector of selectors) {
    try {
      const element = context.querySelector(selector);
      const text = element?.innerText?.trim();
      if (text) {
        return text;
      }
    } catch {
      // Ignore invalid selectors on LinkedIn experiments.
    }
  }

  return '';
}

function extractJDText() {
  for (const selector of JD_SELECTORS) {
    const element = document.querySelector(selector);
    const text = element?.innerText?.trim();
    if (text && text.length > 100) {
      return { text, confidence: 'high', selector };
    }
  }

  const fallback = document.querySelector('.job-view-layout, .jobs-search__job-details, main');
  const fallbackText = fallback?.innerText?.trim();
  if (fallbackText && fallbackText.length > 200) {
    return { text: fallbackText, confidence: 'low', selector: 'generic_layout' };
  }

  return { text: '', confidence: 'failed', selector: null };
}

function getCurrentJobId() {
  const url = new URL(window.location.href);
  const queryJobId = url.searchParams.get('currentJobId');
  if (queryJobId) {
    return queryJobId;
  }

  const pathMatch = url.pathname.match(/\/jobs\/view\/(\d+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  for (const selector of SELECTED_CARD_SELECTORS) {
    const selectedCard = document.querySelector(selector);
    if (selectedCard) {
      return getJobIdFromCard(selectedCard);
    }
  }

  return null;
}

function extractJobData() {
  const jd = extractJDText();
  const detailsContainer = document.querySelector(DETAIL_BADGE_SELECTOR);
  const company = extractCompany(detailsContainer || document);
  const location = extractLocation(detailsContainer || document, company);

  return {
    jobId: getCurrentJobId(),
    title: extractFirst(TITLE_SELECTORS, detailsContainer || document),
    company,
    location,
    description: jd.text,
    extractionConfidence: jd.confidence,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };
}

function extractCompany(context) {
  const directCompany = extractFirst(COMPANY_SELECTORS, context);
  if (directCompany) {
    return directCompany;
  }

  const segments = getPrimaryDescriptionSegments(context);
  return segments[0] || '';
}

function extractLocation(context, company = '') {
  const directLocation = extractFirst(LOCATION_SELECTORS, context);
  if (looksLikeLocation(directLocation)) {
    return cleanLocationText(directLocation);
  }

  const segments = getPrimaryDescriptionSegments(context);
  const normalizedCompany = normalizeInlineText(company);
  for (const segment of segments) {
    const cleaned = cleanLocationText(segment);
    if (!cleaned) {
      continue;
    }
    if (normalizedCompany && normalizeInlineText(cleaned) === normalizedCompany) {
      continue;
    }
    if (looksLikeLocation(cleaned)) {
      return cleaned;
    }
  }

  return '';
}

function getPrimaryDescriptionSegments(context) {
  const combined = extractFirst(PRIMARY_DESCRIPTION_SELECTORS, context);
  if (!combined) {
    return [];
  }

  return combined
    .split(/\n|·|\||•/)
    .map(part => cleanLocationText(part))
    .filter(Boolean);
}

function cleanLocationText(value) {
  return (value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeInlineText(value) {
  return cleanLocationText(value).toLowerCase();
}

function looksLikeLocation(value) {
  const text = normalizeInlineText(value);
  if (!text) {
    return false;
  }

  if (
    /\b(applicants?|clicked apply|week|weeks|day|days|month|months|hour|hours|ago|responses managed|promoted|reposted)\b/.test(text)
  ) {
    return false;
  }

  if (/\b(remote|hybrid|on-site|onsite)\b/.test(text)) {
    return true;
  }

  if (text.includes(',')) {
    return true;
  }

  return /\b(netherlands|nederland|holland|germany|france|belgium|luxembourg|spain|italy|portugal|poland|ireland|uk|united kingdom)\b/.test(text);
}

function getJobIdFromCard(card) {
  const directId = card.getAttribute('data-occludable-job-id')
    || card.getAttribute('data-job-id')
    || card.dataset.jobId;

  if (directId) {
    return directId;
  }

  const link = card.querySelector('a[href*="/jobs/view/"], a[href*="currentJobId="]');
  if (!link) {
    return null;
  }

  const href = link.getAttribute('href') || '';
  const viewMatch = href.match(/\/jobs\/view\/(\d+)/);
  if (viewMatch) {
    return viewMatch[1];
  }

  const hrefUrl = new URL(href, window.location.origin);
  return hrefUrl.searchParams.get('currentJobId');
}

function getCardTitle(card) {
  const titleElement = card.querySelector('.job-card-list__title, .job-card-container__title, strong, h3, a.job-card-list__title');
  return titleElement?.innerText?.trim()?.split('\n')[0] || 'Unknown Title';
}

function getCardCompany(card) {
  const companyElement = card.querySelector('.job-card-container__company-name, .artdeco-entity-lockup__subtitle, .job-card-container__primary-description');
  return companyElement?.innerText?.trim()?.split('\n')[0] || 'Unknown Company';
}

function getJobsList() {
  const uniqueJobs = new Map();

  document.querySelectorAll(LIST_ITEM_SELECTOR).forEach(card => {
    const jobId = getJobIdFromCard(card);
    if (!jobId || uniqueJobs.has(jobId)) {
      return;
    }

    uniqueJobs.set(jobId, {
      jobId,
      title: getCardTitle(card),
      company: getCardCompany(card),
    });
  });

  return [...uniqueJobs.values()];
}

function focusJob(jobId) {
  const cards = [...document.querySelectorAll(LIST_ITEM_SELECTOR)];

  for (const card of cards) {
    if (getJobIdFromCard(card) !== jobId) {
      continue;
    }

    const clickable = card.querySelector(`a[href*="/jobs/view/${jobId}"], a[href*="currentJobId=${jobId}"]`)
      || card.querySelector('a')
      || card;

    clickable.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => clickable.click(), 60);
    return true;
  }

  return false;
}

function injectScoreBadge(jobId, score) {
  const cards = [...document.querySelectorAll(LIST_ITEM_SELECTOR)];

  for (const card of cards) {
    if (getJobIdFromCard(card) !== jobId) {
      continue;
    }

    const anchor = card.querySelector('.job-card-container__primary-description, .job-card-container__metadata-wrapper, .artdeco-entity-lockup__subtitle')
      || card.querySelector('.job-card-list__title')?.parentElement
      || card;

    let badge = card.querySelector('.ai-match-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'ai-match-badge';
      anchor.appendChild(badge);
    }

    badge.dataset.jobId = jobId;
    badge.style.background = getBadgeColor(score);
    badge.textContent = `${Math.round(score)}% match`;
    badge.title = `Cached match score: ${Math.round(score)}%`;
    return true;
  }

  return false;
}

function injectSponsorBadge(jobId, sponsorshipLabel) {
  if (!jobId || !sponsorshipLabel) {
    return false;
  }

  const cards = [...document.querySelectorAll(LIST_ITEM_SELECTOR)];
  for (const card of cards) {
    if (getJobIdFromCard(card) !== jobId) {
      continue;
    }

    const titleAnchor = card.querySelector('.job-card-list__title, .job-card-container__title, strong, h3, a.job-card-list__title')
      || card;
    let badge = card.querySelector('.ai-sponsor-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'ai-sponsor-badge';
      titleAnchor.appendChild(badge);
    }

    badge.dataset.jobId = jobId;
    badge.textContent = sponsorshipLabel;
    return true;
  }

  return false;
}

function injectMetaBadges(jobId, labels) {
  if (!jobId) {
    return false;
  }

  const cards = [...document.querySelectorAll(LIST_ITEM_SELECTOR)];
  for (const card of cards) {
    if (getJobIdFromCard(card) !== jobId) {
      continue;
    }

    const titleAnchor = card.querySelector('.job-card-list__title, .job-card-container__title, strong, h3, a.job-card-list__title')
      || card;
    titleAnchor.querySelectorAll('.ai-meta-badge').forEach(node => node.remove());

    for (const label of labels) {
      if (!label) {
        continue;
      }
      const badge = document.createElement('span');
      badge.className = 'ai-meta-badge';
      badge.dataset.jobId = jobId;
      badge.textContent = label;
      titleAnchor.appendChild(badge);
    }
    return true;
  }

  return false;
}

function injectDetailBadge(jobId, score) {
  if (!jobId || getCurrentJobId() !== jobId) {
    return;
  }

  const target = document.querySelector(DETAIL_BADGE_SELECTOR);
  if (!target) {
    return;
  }

  let badge = target.querySelector('.ai-match-detail-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'ai-match-detail-badge';
    target.appendChild(badge);
  }

  badge.dataset.jobId = jobId;
  badge.style.background = getBadgeColor(score);
  badge.textContent = `${Math.round(score)}% match`;
}

function injectDetailSponsorBadge(jobId, sponsorshipLabel) {
  if (!jobId || getCurrentJobId() !== jobId || !sponsorshipLabel) {
    return;
  }

  const titleTarget = document.querySelector(TITLE_SELECTORS.join(', '));
  if (!titleTarget) {
    return;
  }

  let badge = document.querySelector('.ai-detail-sponsor-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'ai-detail-sponsor-badge';
    titleTarget.appendChild(badge);
  }

  badge.dataset.jobId = jobId;
  badge.textContent = sponsorshipLabel;
}

function clearInjectedScores() {
  document.querySelectorAll('.ai-match-badge, .ai-match-detail-badge, .ai-sponsor-badge, .ai-detail-sponsor-badge, .ai-meta-badge').forEach(node => node.remove());
}

function getBadgeColor(score) {
  if (score >= 75) {
    return '#16a34a';
  }
  if (score >= 50) {
    return '#f59e0b';
  }
  return '#dc2626';
}

function injectBadgeStyles() {
  if (document.getElementById('ai-match-badge-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'ai-match-badge-styles';
  style.textContent = `
    .ai-match-badge,
    .ai-match-detail-badge,
    .ai-sponsor-badge,
    .ai-detail-sponsor-badge,
    .ai-meta-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 999px;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.4;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
      margin-left: 8px;
    }

    .ai-match-detail-badge {
      margin-top: 8px;
      width: fit-content;
    }

    .ai-sponsor-badge,
    .ai-detail-sponsor-badge {
      background: #2563eb;
      font-size: 10px;
      padding: 1px 7px;
    }

    .ai-meta-badge {
      background: rgba(111, 91, 73, 0.14);
      color: #6f5b49;
      font-size: 10px;
      padding: 1px 7px;
      box-shadow: none;
    }

    .ai-detail-sponsor-badge {
      vertical-align: middle;
    }
  `;
  document.head.appendChild(style);
}

async function refreshVisibleScores() {
  const jobs = getJobsList();
  const currentJobId = getCurrentJobId();
  const jobIds = [...new Set([
    ...jobs.map(job => job.jobId),
    currentJobId,
  ].filter(Boolean))];

  if (!jobIds.length) {
    clearInjectedScores();
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: Actions.GET_CACHED_SCORES,
      payload: { jobIds },
    });

    if (!response?.ok) {
      return;
    }

    if (!response.resumeAvailable) {
      clearInjectedScores();
      return;
    }

    const scoreMap = new Map((response.entries || []).map(entry => [entry.jobId, entry]));
    document.querySelectorAll('.ai-match-badge, .ai-sponsor-badge').forEach(badge => {
      if (!scoreMap.has(badge.dataset.jobId)) {
        badge.remove();
      }
    });

    jobs.forEach(job => {
      const entry = scoreMap.get(job.jobId);
      if (entry && typeof entry.score === 'number') {
        injectScoreBadge(job.jobId, entry.score);
      }
      const metaLabels = [
        entry?.jdLanguage && entry.jdLanguage !== 'Unknown' ? entry.jdLanguage : null,
        entry?.requiredExperience || null,
        ...(Array.isArray(entry?.requiredLanguages) ? entry.requiredLanguages.slice(0, 2) : []),
      ].filter(Boolean);
      if (metaLabels.length) {
        injectMetaBadges(job.jobId, metaLabels);
      } else {
        document.querySelectorAll(`.ai-meta-badge[data-job-id="${job.jobId}"]`).forEach(node => node.remove());
      }
      if (entry?.kmEligible && entry?.sponsorshipLabel) {
        injectSponsorBadge(job.jobId, entry.sponsorshipLabel);
      } else {
        document.querySelectorAll(`.ai-sponsor-badge[data-job-id="${job.jobId}"]`).forEach(node => node.remove());
      }
    });

    const currentEntry = currentJobId ? scoreMap.get(currentJobId) : null;
    if (currentEntry && typeof currentEntry.score === 'number') {
      injectDetailBadge(currentJobId, currentEntry.score);
      if (currentEntry.kmEligible && currentEntry.sponsorshipLabel) {
        injectDetailSponsorBadge(currentJobId, currentEntry.sponsorshipLabel);
      }
    } else {
      document.querySelectorAll('.ai-match-detail-badge, .ai-detail-sponsor-badge').forEach(node => node.remove());
    }
  } catch {
    // Ignore background disconnects during extension reloads.
  }
}

function scheduleCurrentJobSync() {
  debouncedSyncCurrentJob();
}

function scheduleVisibleScoresRefresh() {
  debouncedRefreshScores();
}

function syncCurrentJob(jobId, retries = 10) {
  if (!jobId) {
    return;
  }

  const jd = extractJDText();
  if (jd.confidence !== 'failed') {
    lastExtractJobId = jobId;
    chrome.runtime.sendMessage({
      type: Actions.JD_EXTRACTED,
      payload: extractJobData(),
    }).catch(() => {});
    return;
  }

  if (retries > 0) {
    window.setTimeout(() => syncCurrentJob(jobId, retries - 1), 700);
    return;
  }

  chrome.runtime.sendMessage({
    type: Actions.JD_EXTRACT_FAILED,
    payload: {
      jobId,
      error: 'Timed out while waiting for the LinkedIn job details pane.',
      partialData: extractJobData(),
    },
  }).catch(() => {});
}

function setupObservers() {
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastKnownUrl) {
      lastKnownUrl = window.location.href;
      lastExtractJobId = null;
    }

    const currentJobId = getCurrentJobId();
    if (currentJobId && currentJobId !== lastExtractJobId) {
      scheduleCurrentJobSync();
    }

    scheduleVisibleScoresRefresh();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', () => {
    lastKnownUrl = window.location.href;
    lastExtractJobId = null;
    scheduleCurrentJobSync();
    scheduleVisibleScoresRefresh();
  });

  window.setInterval(() => {
    if (window.location.href !== lastKnownUrl) {
      lastKnownUrl = window.location.href;
      lastExtractJobId = null;
      scheduleCurrentJobSync();
      scheduleVisibleScoresRefresh();
    }
  }, 800);
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg?.type) {
      return;
    }

    switch (msg.type) {
      case Actions.GET_JD_DATA:
        sendResponse({ type: Actions.JD_DATA, payload: extractJobData() });
        return true;

      case Actions.GET_JOB_LIST:
        sendResponse({ jobs: getJobsList(), activeJobId: getCurrentJobId() });
        return true;

      case Actions.FOCUS_JOB:
        sendResponse({ success: focusJob(msg.payload?.jobId) });
        return true;

      case Actions.INJECT_SCORE:
        injectScoreBadge(msg.payload?.jobId, msg.payload?.score);
        injectDetailBadge(msg.payload?.jobId, msg.payload?.score);
        sendResponse({ success: true });
        return true;

      case Actions.REFRESH_SCORES:
        scheduleVisibleScoresRefresh();
        sendResponse({ success: true });
        return true;

      default:
        return undefined;
    }
  });
}

function debounce(fn, delay) {
  let timer = null;

  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

const debouncedRefreshScores = debounce(() => {
  refreshVisibleScores().catch(() => {});
}, 500);

const debouncedSyncCurrentJob = debounce(() => {
  const currentJobId = getCurrentJobId();
  if (!currentJobId || currentJobId === lastExtractJobId) {
    return;
  }

  syncCurrentJob(currentJobId);
}, 350);

if (!window[CONTENT_SCRIPT_READY_KEY]) {
  window[CONTENT_SCRIPT_READY_KEY] = true;
  bootstrap();
}
