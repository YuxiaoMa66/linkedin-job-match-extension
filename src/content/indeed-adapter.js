const INDEED_HOST = 'nl.indeed.com';

export const INDEED_LIST_TITLE_SELECTOR = [
  'a.jcs-JobTitle[data-jk]',
  'a[id^="sj_"][data-jk]',
  'a.jcs-JobTitle[id^="sj_"]',
].join(', ');

const INDEED_CARD_TITLE_SELECTOR = [
  'h2.jobTitle',
  'h3.jobTitle',
  '[data-testid="jobTitle"]',
  'a.jcs-JobTitle',
  'a[id^="sj_"]',
].join(', ');

const INDEED_DETAIL_TITLE_SELECTOR = [
  'h2.jobsearch-JobInfoHeader-title',
  'h1.jobsearch-JobInfoHeader-title',
  '[data-testid="jobsearch-JobInfoHeader-title"]',
].join(', ');

function resolveDocument(documentRef) {
  return documentRef || (typeof document !== 'undefined' ? document : null);
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getUrl(href = '') {
  try {
    return new URL(href || 'https://nl.indeed.com/', 'https://nl.indeed.com/');
  } catch {
    return new URL('https://nl.indeed.com/');
  }
}

function getJobIdFromHref(href = '') {
  const url = getUrl(href);
  return url.searchParams.get('jk')
    || url.searchParams.get('vjk')
    || url.searchParams.get('currentJobId');
}

function getIndeedTitleLinks(documentNode) {
  return Array.from(documentNode?.querySelectorAll(INDEED_LIST_TITLE_SELECTOR) || []);
}

function getCardRoot(link) {
  return link?.closest('div.job_seen_beacon')
    || link?.closest('li[data-jk]')
    || link?.closest('article')
    || link?.closest('tr')
    || link?.closest('[data-testid="fade-in-wrapper"]')
    || link?.parentElement
    || link
    || null;
}

function normalizeDetailTitle(value) {
  return cleanText(value)
    .replace(/\s*-\s*job post\s*$/i, '')
    .trim();
}

function readFirstText(context, selectors) {
  for (const selector of selectors) {
    const element = context?.querySelector(selector);
    const text = cleanText(element?.innerText || element?.textContent);
    if (text) {
      return text;
    }
  }
  return '';
}

function getDetailRoot(documentNode) {
  return documentNode?.querySelector(
    '#job-full-details, [data-testid="jobsearch-ViewjobPaneWrapper"], .jobsearch-ViewJobContainerWrapper',
  ) || documentNode;
}

export function isIndeedPage(documentRef, href = '') {
  const documentNode = resolveDocument(documentRef);
  const url = getUrl(href || documentNode?.location?.href || '');
  return url.hostname === INDEED_HOST;
}

export function getIndeedListCards(documentRef) {
  const documentNode = resolveDocument(documentRef);
  const seen = new Set();
  const cards = [];

  for (const link of getIndeedTitleLinks(documentNode)) {
    const card = getCardRoot(link);
    const jobId = getIndeedJobIdFromCard(card || link);
    if (!card || !jobId || seen.has(jobId)) {
      continue;
    }
    seen.add(jobId);
    cards.push(card);
  }

  return cards;
}

export function getIndeedJobIdFromCard(card) {
  const link = card?.matches?.(INDEED_LIST_TITLE_SELECTOR)
    ? card
    : card?.querySelector?.(INDEED_LIST_TITLE_SELECTOR);
  const dataJobId = link?.getAttribute('data-jk')
    || card?.getAttribute?.('data-jk')
    || card?.dataset?.jk;
  if (dataJobId) {
    return dataJobId;
  }

  const idMatch = String(link?.id || card?.id || '').match(/^sj_(.+)$/);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  return getJobIdFromHref(link?.getAttribute('href') || '');
}

export function getIndeedCardTitle(card) {
  return normalizeDetailTitle(readFirstText(card, [INDEED_CARD_TITLE_SELECTOR]));
}

export function getIndeedCardCompany(card) {
  return readFirstText(card, [
    '[data-testid="company-name"]',
    '.companyName',
    '[class*="companyName"]',
  ]) || 'Unknown Company';
}

export function getIndeedCardLocation(card) {
  return readFirstText(card, [
    '[data-testid="text-location"]',
    '[data-testid="location"]',
    '.companyLocation',
    '[class*="companyLocation"]',
  ]);
}

export function getIndeedCardTitleTarget(card) {
  return card?.querySelector?.('h2.jobTitle, h3.jobTitle, [data-testid="jobTitle"]')
    || card?.querySelector?.('a.jcs-JobTitle, a[id^="sj_"]')
    || card
    || null;
}

export function getIndeedDetailTitleTarget(documentRef) {
  const documentNode = resolveDocument(documentRef);
  const root = getDetailRoot(documentNode);
  return root?.querySelector?.(INDEED_DETAIL_TITLE_SELECTOR)
    || documentNode?.querySelector?.(INDEED_DETAIL_TITLE_SELECTOR)
    || null;
}

export function getIndeedDetailBadgeTarget(documentRef) {
  return getIndeedDetailTitleTarget(documentRef)?.parentElement
    || getIndeedDetailTitleTarget(documentRef)
    || null;
}

export function getIndeedJobIdFromDetail(documentRef, href = '') {
  const documentNode = resolveDocument(documentRef);
  const url = getUrl(href || documentNode?.location?.href || '');
  const urlJobId = getJobIdFromHref(url.href);
  if (urlJobId) {
    return urlJobId;
  }

  const selectedLink = getIndeedTitleLinks(documentNode).find(link => (
    link.getAttribute('aria-pressed') === 'true'
      || link.getAttribute('aria-current') === 'true'
  ));
  return getIndeedJobIdFromCard(selectedLink);
}

export function extractIndeedJDText(documentRef) {
  const documentNode = resolveDocument(documentRef);
  const root = getDetailRoot(documentNode);
  const selectors = [
    '#jobDescriptionText',
    '[data-testid="jobDescriptionText"]',
    '.jobsearch-JobComponent-description',
    '[id*="jobDescription"]',
  ];

  for (const selector of selectors) {
    const element = root?.querySelector?.(selector) || documentNode?.querySelector?.(selector);
    const text = cleanText(element?.innerText || element?.textContent);
    if (text.length > 80) {
      return { text, confidence: 'high', selector };
    }
  }

  const paragraphs = Array.from(root?.querySelectorAll?.('p') || [])
    .map(element => cleanText(element.innerText || element.textContent))
    .filter(text => text.length > 200)
    .sort((left, right) => right.length - left.length);
  if (paragraphs[0]) {
    return {
      text: paragraphs[0],
      confidence: 'low',
      selector: 'indeed_long_paragraph_fallback',
    };
  }

  return { text: '', confidence: 'failed', selector: null };
}

export function extractIndeedJobData(documentRef, href = '') {
  const documentNode = resolveDocument(documentRef);
  const url = getUrl(href || documentNode?.location?.href || '');
  const detailRoot = getDetailRoot(documentNode);
  const detailTitle = getIndeedDetailTitleTarget(documentNode);
  const selectedCard = getIndeedListCards(documentNode).find(card => {
    const link = card.querySelector(INDEED_LIST_TITLE_SELECTOR);
    return link?.getAttribute('aria-pressed') === 'true'
      || link?.getAttribute('aria-current') === 'true';
  });
  const jd = extractIndeedJDText(documentNode);

  return {
    jobId: getIndeedJobIdFromDetail(documentNode, url.href)
      || getIndeedJobIdFromCard(selectedCard),
    sourceType: 'indeed',
    title: normalizeDetailTitle(detailTitle?.innerText)
      || getIndeedCardTitle(selectedCard),
    company: readFirstText(detailRoot, [
      '[data-testid="inlineHeader-companyName"]',
      '[data-testid="company-name"]',
      'a[href*="/cmp/"]',
    ]) || getIndeedCardCompany(selectedCard),
    location: readFirstText(detailRoot, [
      '#jobLocationText',
      '[data-testid="text-location"]',
      '[data-testid="location"]',
    ]) || getIndeedCardLocation(selectedCard),
    description: jd.text,
    extractionConfidence: jd.confidence,
    extractionSelector: jd.selector,
    url: url.href,
    sourceUrl: url.href,
    timestamp: new Date().toISOString(),
  };
}
