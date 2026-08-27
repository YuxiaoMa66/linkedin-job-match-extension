import {
  detectLinkedInPageMode,
  extractAiJDText,
  extractAiJobData,
  getAiCardCompany,
  getAiCardLocation,
  getAiCardTitle,
  getAiCardTitleTarget,
  getAiDetailBadgeTarget,
  getAiDetailTitleTarget,
  getAiJobIdFromCard,
  getAiJobIdFromDetail,
  getAiListCards,
} from './linkedin-ai-adapter.js';

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

const TITLE_SIGNAL_KEYS = Object.freeze({
  KM: 'km',
  JD_LANGUAGE: 'jdLanguage',
  REQUIRED_LANGUAGE: 'requiredLanguage',
  EXPERIENCE: 'experience',
  KEYWORD: 'keyword',
});

const TITLE_SIGNAL_ORDER = Object.freeze([
  TITLE_SIGNAL_KEYS.KM,
  TITLE_SIGNAL_KEYS.JD_LANGUAGE,
  TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE,
  TITLE_SIGNAL_KEYS.EXPERIENCE,
]);

const TITLE_COLOR_SCHEMES = Object.freeze({
  default: Object.freeze({
    [TITLE_SIGNAL_KEYS.KM]: '#2563eb',
    [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: '#7c3aed',
    [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: '#0f766e',
    [TITLE_SIGNAL_KEYS.EXPERIENCE]: '#b45309',
    [TITLE_SIGNAL_KEYS.KEYWORD]: '#be123c',
  }),
  colorblind: Object.freeze({
    [TITLE_SIGNAL_KEYS.KM]: '#0072b2',
    [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: '#d55e00',
    [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: '#009e73',
    [TITLE_SIGNAL_KEYS.EXPERIENCE]: '#e69f00',
    [TITLE_SIGNAL_KEYS.KEYWORD]: '#cc79a7',
  }),
});

const DEFAULT_TITLE_DISPLAY_SETTINGS = Object.freeze({
  colorScheme: 'default',
  visibleSignals: Object.freeze({
    [TITLE_SIGNAL_KEYS.KM]: true,
    [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: true,
    [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: true,
    [TITLE_SIGNAL_KEYS.EXPERIENCE]: true,
    [TITLE_SIGNAL_KEYS.KEYWORD]: false,
  }),
  customColors: Object.freeze({ ...TITLE_COLOR_SCHEMES.default }),
  keywordList: Object.freeze([]),
  keywordStyle: 'tag',
});

const CONTENT_SCRIPT_READY_KEY = '__ljmContentScriptReadyV040__';

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

function normalizeHexColor(value, fallback = null) {
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

function normalizeKeywordList(value) {
  const candidates = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,]/)
      : [];
  const seen = new Set();
  const keywords = [];

  for (const candidate of candidates) {
    const keyword = String(candidate || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const key = keyword.toLocaleLowerCase();
    if (!keyword || seen.has(key)) {
      continue;
    }
    seen.add(key);
    keywords.push(keyword);
    if (keywords.length >= 5) {
      break;
    }
  }
  return keywords;
}

function normalizeTitleDisplaySettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const colorScheme = source.colorScheme === 'colorblind' || source.colorScheme === 'custom'
    ? source.colorScheme
    : DEFAULT_TITLE_DISPLAY_SETTINGS.colorScheme;
  const customColors = Object.fromEntries(
    Object.keys(DEFAULT_TITLE_DISPLAY_SETTINGS.customColors).map(key => [
      key,
      normalizeHexColor(source.customColors?.[key], DEFAULT_TITLE_DISPLAY_SETTINGS.customColors[key]),
    ]),
  );

  return {
    colorScheme,
    visibleSignals: Object.fromEntries(
      Object.keys(DEFAULT_TITLE_DISPLAY_SETTINGS.visibleSignals).map(key => {
        const configuredValue = source.visibleSignals?.[key];
        const defaultValue = DEFAULT_TITLE_DISPLAY_SETTINGS.visibleSignals[key];
        return [
          key,
          configuredValue === undefined ? defaultValue : configuredValue !== false,
        ];
      }),
    ),
    customColors,
    keywordList: normalizeKeywordList(source.keywordList),
    keywordStyle: ['tag', 'bracket', 'spark'].includes(source.keywordStyle)
      ? source.keywordStyle
      : DEFAULT_TITLE_DISPLAY_SETTINGS.keywordStyle,
  };
}

function getTitleDisplayColors(settings) {
  const normalized = normalizeTitleDisplaySettings(settings);
  return normalized.colorScheme === 'custom'
    ? { ...normalized.customColors }
    : { ...TITLE_COLOR_SCHEMES[normalized.colorScheme] };
}

function getContrastTextColor(value) {
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

function findKeywordMatches(text, keywordList) {
  const normalizedText = String(text || '').replace(/\s+/g, ' ').toLocaleLowerCase();
  if (!normalizedText) {
    return [];
  }
  return normalizeKeywordList(keywordList).filter(keyword => (
    normalizedText.includes(keyword.replace(/\s+/g, ' ').toLocaleLowerCase())
  ));
}

function formatKeywordMarker(keyword, style) {
  if (style === 'bracket') {
    return `[${keyword}]`;
  }
  if (style === 'spark') {
    return `✦ ${keyword}`;
  }
  return `KEY: ${keyword}`;
}

function buildTitleBadgeModels(entry, settings) {
  const normalizedSettings = normalizeTitleDisplaySettings(settings);
  const languageList = Array.isArray(entry?.requiredLanguages)
    ? entry.requiredLanguages.filter(Boolean).slice(0, 3)
    : [];
  const models = [];
  const values = {
    [TITLE_SIGNAL_KEYS.KM]: entry?.kmEligible ? 'KM' : '',
    [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: entry?.jdLanguage && entry.jdLanguage !== 'Unknown'
      ? `JD: ${entry.jdLanguage}`
      : '',
    [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: languageList.length
      ? `Lang: ${languageList.join(' / ')}`
      : '',
    [TITLE_SIGNAL_KEYS.EXPERIENCE]: entry?.requiredExperience ? `Exp: ${entry.requiredExperience}` : '',
  };
  const titles = {
    [TITLE_SIGNAL_KEYS.KM]: 'KnowledgeMigrant sponsorship signal',
    [TITLE_SIGNAL_KEYS.JD_LANGUAGE]: `Language detected in the JD: ${entry?.jdLanguage || 'Unknown'}`,
    [TITLE_SIGNAL_KEYS.REQUIRED_LANGUAGE]: `Required language: ${languageList.join(' / ')}`,
    [TITLE_SIGNAL_KEYS.EXPERIENCE]: `Experience requirement: ${entry?.requiredExperience || 'Not detected'}`,
  };
  const colors = getTitleDisplayColors(normalizedSettings);

  for (const signalKey of TITLE_SIGNAL_ORDER) {
    if (normalizedSettings.visibleSignals[signalKey] === false || !values[signalKey]) {
      continue;
    }
    models.push({
      signalKey,
      label: values[signalKey],
      title: titles[signalKey],
      backgroundColor: colors[signalKey],
    });
  }

  if (normalizedSettings.visibleSignals[TITLE_SIGNAL_KEYS.KEYWORD] !== false) {
    for (const keyword of normalizeKeywordList(entry?.keywordMatches)) {
      models.push({
        signalKey: TITLE_SIGNAL_KEYS.KEYWORD,
        label: formatKeywordMarker(keyword, normalizedSettings.keywordStyle),
        title: `JD keyword matched: ${keyword}`,
        backgroundColor: colors[TITLE_SIGNAL_KEYS.KEYWORD],
      });
    }
  }

  return models;
}

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

function getPageMode() {
  return detectLinkedInPageMode(document, window.location.href);
}

function getListCards(mode = getPageMode()) {
  if (mode === 'ai') {
    return getAiListCards(document);
  }

  return [...document.querySelectorAll(LIST_ITEM_SELECTOR)];
}

function extractJDText() {
  if (getPageMode() === 'ai') {
    return extractAiJDText(document);
  }

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

  if (getPageMode() === 'ai') {
    const detailJobId = getAiJobIdFromDetail(document);
    if (detailJobId) {
      return detailJobId;
    }

    const selectedAiCard = getAiListCards(document).find(card => (
      card.getAttribute('aria-current') === 'true'
      || card.getAttribute('aria-pressed') === 'true'
    ));
    const selectedAiJobId = getAiJobIdFromCard(selectedAiCard);
    if (selectedAiJobId) {
      return selectedAiJobId;
    }
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
  if (getPageMode() === 'ai') {
    return {
      ...extractAiJobData(document, window.location.href),
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };
  }

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
  const aiId = getAiJobIdFromCard(card);
  if (aiId) {
    return aiId;
  }

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

function getCardTitle(card, mode = getPageMode()) {
  if (mode === 'ai') {
    return getAiCardTitle(card) || 'Unknown Title';
  }

  const titleElement = card.querySelector('.job-card-list__title, .job-card-container__title, strong, h3, a.job-card-list__title');
  return titleElement?.innerText?.trim()?.split('\n')[0] || 'Unknown Title';
}

function getCardCompany(card, mode = getPageMode()) {
  if (mode === 'ai') {
    return getAiCardCompany(card);
  }

  const companyElement = card.querySelector('.job-card-container__company-name, .artdeco-entity-lockup__subtitle, .job-card-container__primary-description');
  return companyElement?.innerText?.trim()?.split('\n')[0] || 'Unknown Company';
}

function getCardLocation(card, mode = getPageMode()) {
  if (mode === 'ai') {
    return getAiCardLocation(card);
  }

  return '';
}

function getJobsList() {
  const mode = getPageMode();
  const uniqueJobs = new Map();

  getListCards(mode).forEach(card => {
    const jobId = getJobIdFromCard(card);
    if (!jobId || uniqueJobs.has(jobId)) {
      return;
    }

    uniqueJobs.set(jobId, {
      jobId,
      title: getCardTitle(card, mode),
      company: getCardCompany(card, mode),
      location: getCardLocation(card, mode),
    });
  });

  return [...uniqueJobs.values()];
}

function focusJob(jobId) {
  const mode = getPageMode();
  const cards = getListCards(mode);

  for (const card of cards) {
    if (getJobIdFromCard(card) !== jobId) {
      continue;
    }

    const clickable = mode === 'ai'
      ? card
      : card.querySelector(`a[href*="/jobs/view/${jobId}"], a[href*="currentJobId=${jobId}"]`)
        || card.querySelector('a')
        || card;

    clickable.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => {
      if (mode !== 'ai') {
        activateClickable(clickable);
        return;
      }

      clickable.focus?.();
      if (typeof clickable.dispatchEvent === 'function') {
        clickable.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: 'Enter',
          key: 'Enter',
          keyCode: 13,
          which: 13,
        }));
      }

      window.setTimeout(() => {
        if (getCurrentJobId() !== jobId) {
          activateClickable(clickable);
        }
      }, 180);
    }, 60);
    return true;
  }

  return false;
}

function activateClickable(element) {
  if (!element) {
    return false;
  }

  if (typeof element.click === 'function') {
    element.click();
    return true;
  }

  if (typeof element.dispatchEvent === 'function') {
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    }));
    return true;
  }

  return false;
}

function injectScoreBadge(jobId, score) {
  const mode = getPageMode();
  const cards = getListCards(mode);

  for (const card of cards) {
    if (getJobIdFromCard(card) !== jobId) {
      continue;
    }

    const anchor = mode === 'ai'
      ? getAiCardTitleTarget(card)
      : card.querySelector('.job-card-container__primary-description, .job-card-container__metadata-wrapper, .artdeco-entity-lockup__subtitle')
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

function getCardTitleAnchor(card, mode = getPageMode()) {
  if (mode === 'ai') {
    return getAiCardTitleTarget(card);
  }

  return card.querySelector('.job-card-list__title, .job-card-container__title, strong, h3, a.job-card-list__title')
    || card;
}

function injectMetaBadges(jobId, badgeModels) {
  if (!jobId) {
    return false;
  }

  const mode = getPageMode();
  const cards = getListCards(mode);
  for (const card of cards) {
    if (getJobIdFromCard(card) !== jobId) {
      continue;
    }

    const titleAnchor = getCardTitleAnchor(card, mode);
    titleAnchor.querySelectorAll('.ai-meta-badge, .ai-sponsor-badge').forEach(node => node.remove());

    for (const model of badgeModels || []) {
      if (!model?.label) {
        continue;
      }
      const badge = document.createElement('span');
      const color = normalizeHexColor(model.backgroundColor, '#6f5b49');
      badge.className = `ai-meta-badge ai-meta-badge--${model.signalKey}`;
      badge.dataset.jobId = jobId;
      badge.dataset.signalKey = model.signalKey;
      badge.style.backgroundColor = color;
      badge.style.color = getContrastTextColor(color);
      badge.textContent = model.label;
      badge.title = model.title || model.label;
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

  const target = getPageMode() === 'ai'
    ? getAiDetailBadgeTarget(document)
    : document.querySelector(DETAIL_BADGE_SELECTOR);
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

function injectDetailMetaBadges(jobId, badgeModels) {
  if (!jobId || getCurrentJobId() !== jobId) {
    return;
  }

  const titleTarget = getPageMode() === 'ai'
    ? getAiDetailTitleTarget(document)
    : document.querySelector(TITLE_SELECTORS.join(', '));
  if (!titleTarget) {
    return;
  }

  document.querySelectorAll('.ai-detail-meta-badge, .ai-detail-sponsor-badge').forEach(node => node.remove());

  for (const model of badgeModels || []) {
    if (!model?.label) {
      continue;
    }
    const color = normalizeHexColor(model.backgroundColor, '#6f5b49');
    const badge = document.createElement('span');
    badge.className = `ai-detail-meta-badge ai-detail-meta-badge--${model.signalKey}`;
    badge.dataset.jobId = jobId;
    badge.dataset.signalKey = model.signalKey;
    badge.style.backgroundColor = color;
    badge.style.color = getContrastTextColor(color);
    badge.textContent = model.label;
    badge.title = model.title || model.label;
    titleTarget.appendChild(badge);
  }
}

function clearInjectedScores() {
  document.querySelectorAll('.ai-match-badge, .ai-match-detail-badge, .ai-sponsor-badge, .ai-detail-sponsor-badge, .ai-meta-badge, .ai-detail-meta-badge').forEach(node => node.remove());
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
  document.getElementById('ai-match-badge-styles')?.remove();
  document.getElementById('ai-match-badge-styles-v030')?.remove();
  if (document.getElementById('ai-match-badge-styles-v040')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'ai-match-badge-styles-v040';
  style.textContent = `
    .ai-match-badge,
    .ai-match-detail-badge,
    .ai-sponsor-badge,
    .ai-detail-sponsor-badge,
    .ai-meta-badge,
    .ai-detail-meta-badge {
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
      white-space: nowrap;
      vertical-align: middle;
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

    .ai-meta-badge,
    .ai-detail-meta-badge {
      font-size: 10px;
      padding: 1px 7px;
      box-shadow: none;
    }

    .ai-meta-badge--keyword,
    .ai-detail-meta-badge--keyword {
      letter-spacing: 0.01em;
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

    const displaySettings = normalizeTitleDisplaySettings(response.displaySettings);
    const scoreMap = new Map((response.entries || []).map(entry => [entry.jobId, entry]));
    document.querySelectorAll('.ai-match-badge, .ai-sponsor-badge, .ai-meta-badge').forEach(badge => {
      if (!scoreMap.has(badge.dataset.jobId)) {
        badge.remove();
      }
    });

    jobs.forEach(job => {
      const entry = scoreMap.get(job.jobId);
      if (entry && typeof entry.score === 'number') {
        injectScoreBadge(job.jobId, entry.score);
      }
      injectMetaBadges(
        job.jobId,
        buildTitleBadgeModels(entry, displaySettings),
      );
    });

    const currentEntry = currentJobId ? scoreMap.get(currentJobId) : null;
    if (currentEntry && typeof currentEntry.score === 'number') {
      injectDetailBadge(currentJobId, currentEntry.score);
      const detailEntry = { ...currentEntry };
      if (!detailEntry.keywordMatches?.length && displaySettings.keywordList.length) {
        detailEntry.keywordMatches = findKeywordMatches(extractJDText().text, displaySettings.keywordList);
      }
      injectDetailMetaBadges(
        currentJobId,
        buildTitleBadgeModels(detailEntry, displaySettings),
      );
    } else {
      document.querySelectorAll('.ai-match-detail-badge, .ai-detail-sponsor-badge, .ai-detail-meta-badge').forEach(node => node.remove());
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
        scheduleVisibleScoresRefresh();
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
