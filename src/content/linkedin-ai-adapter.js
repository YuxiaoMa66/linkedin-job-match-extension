const AI_SEARCH_ORIGIN = 'SEMANTIC_SEARCH_LANDING_PAGE';

export const AI_LIST_ITEM_SELECTOR = '[role="button"][componentkey^="job-card-component-ref-"]';
export const AI_DETAIL_TITLE_SELECTOR = 'main a[href*="/jobs/view/"]';

function resolveDocument(documentRef) {
  return documentRef || (typeof document !== 'undefined' ? document : null);
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getUrl(href = '') {
  try {
    return new URL(href || 'https://www.linkedin.com/jobs/');
  } catch {
    return new URL('https://www.linkedin.com/jobs/');
  }
}

function getJobIdFromHref(href = '') {
  const viewMatch = href.match(/\/jobs\/view\/(\d+)/);
  if (viewMatch) {
    return viewMatch[1];
  }

  return getUrl(href).searchParams.get('currentJobId');
}

function getMeaningfulParagraphs(container) {
  return Array.from(container?.querySelectorAll('p') || [])
    .filter(element => cleanText(element.innerText));
}

function normalizeCardTitle(value) {
  return cleanText(value).replace(/\s*\(Verified job\)\s*$/i, '').trim();
}

function getAiJobIdFromComponentKey(value = '') {
  const match = String(value).match(/job-card-component-ref-(\d+)$/);
  return match?.[1] || null;
}

export function detectLinkedInPageMode(documentRef, href = '') {
  const documentNode = resolveDocument(documentRef);
  const url = getUrl(href || documentNode?.location?.href || '');
  const hasSemanticOrigin = url.searchParams.get('origin') === AI_SEARCH_ORIGIN;
  const hasSemanticSearchInput = Boolean(
    documentNode?.querySelector('input[placeholder="Describe the job you want"]'),
  );
  const hasAiCards = Boolean(documentNode?.querySelector(AI_LIST_ITEM_SELECTOR));
  const hasClassicCards = Boolean(
    documentNode?.querySelector('.job-card-container, .jobs-search-results__list-item, li[data-occludable-job-id], .scaffold-layout__list-item'),
  );

  if (hasAiCards || (hasSemanticOrigin && !hasClassicCards) || (hasSemanticSearchInput && !hasClassicCards)) {
    return 'ai';
  }

  return 'classic';
}

export function getAiListCards(documentRef) {
  const documentNode = resolveDocument(documentRef);
  return Array.from(documentNode?.querySelectorAll(AI_LIST_ITEM_SELECTOR) || []);
}

export function getAiJobIdFromCard(card) {
  return getAiJobIdFromComponentKey(card?.getAttribute('componentkey') || '');
}

export function getAiCardTitle(card) {
  const paragraphs = getMeaningfulParagraphs(card);
  const titleParagraph = paragraphs[0];
  const visibleTitle = titleParagraph?.querySelector('span[aria-hidden="true"]');
  return normalizeCardTitle(visibleTitle?.innerText || titleParagraph?.innerText);
}

export function getAiCardCompany(card) {
  return cleanText(getMeaningfulParagraphs(card)[1]?.innerText) || 'Unknown Company';
}

export function getAiCardLocation(card) {
  const locationParagraph = getMeaningfulParagraphs(card)[2];
  const visibleSpan = Array.from(locationParagraph?.querySelectorAll('span') || [])
    .map(element => cleanText(element.innerText))
    .find(Boolean);
  const location = cleanText(visibleSpan || locationParagraph?.innerText);
  return location.split(/\s+·\s+/)[0].trim();
}

export function getAiCardTitleTarget(card) {
  return getMeaningfulParagraphs(card)[0] || card || null;
}

export function getAiDetailTitleLink(documentRef) {
  const documentNode = resolveDocument(documentRef);
  const links = Array.from(documentNode?.querySelectorAll(AI_DETAIL_TITLE_SELECTOR) || []);
  if (!links.length) {
    return null;
  }

  const currentJobId = getUrl(documentNode?.location?.href || '').searchParams.get('currentJobId');
  return links.find(link => getJobIdFromHref(link.getAttribute('href') || '') === currentJobId)
    || links[0];
}

export function getAiJobIdFromDetail(documentRef) {
  const titleLink = getAiDetailTitleLink(documentRef);
  return getJobIdFromHref(titleLink?.getAttribute('href') || '');
}

export function getAiDetailHeader(documentRef) {
  const titleLink = getAiDetailTitleLink(documentRef);
  let current = titleLink;

  for (let depth = 0; current && depth < 8; depth += 1) {
    const paragraphs = getMeaningfulParagraphs(current);
    if (paragraphs.length >= 3 && paragraphs.some(paragraph => paragraph.contains(titleLink))) {
      return current;
    }
    current = current.parentElement;
  }

  return titleLink?.parentElement || titleLink || null;
}

export function getAiDetailTitleTarget(documentRef) {
  const titleLink = getAiDetailTitleLink(documentRef);
  return titleLink?.parentElement || titleLink || null;
}

export function getAiDetailBadgeTarget(documentRef) {
  return getAiDetailHeader(documentRef) || getAiDetailTitleTarget(documentRef);
}

function findAboutJobHeading(documentNode) {
  return Array.from(documentNode?.querySelectorAll('h2, h3') || [])
    .find(element => cleanText(element.innerText).toLocaleLowerCase() === 'about the job');
}

export function extractAiJDText(documentRef) {
  const documentNode = resolveDocument(documentRef);
  const aboutHeading = findAboutJobHeading(documentNode);
  const section = aboutHeading?.parentElement?.parentElement;
  const directParagraph = Array.from(section?.children || [])
    .find(element => element.tagName === 'P' && cleanText(element.innerText).length > 100);
  const directText = cleanText(directParagraph?.innerText);

  if (directText) {
    return {
      text: directText,
      confidence: 'high',
      selector: 'ai_about_job_section',
    };
  }

  const longParagraphs = Array.from(documentNode?.querySelectorAll('main p') || [])
    .map(element => ({ element, text: cleanText(element.innerText) }))
    .filter(item => item.text.length > 200)
    .sort((left, right) => right.text.length - left.text.length);
  const fallback = longParagraphs[0];

  if (fallback?.text) {
    return {
      text: fallback.text,
      confidence: 'low',
      selector: 'ai_long_paragraph_fallback',
    };
  }

  return { text: '', confidence: 'failed', selector: null };
}

export function extractAiJobData(documentRef, href = '') {
  const documentNode = resolveDocument(documentRef);
  const url = getUrl(href || documentNode?.location?.href || '');
  const detailLink = getAiDetailTitleLink(documentNode);
  const header = getAiDetailHeader(documentNode);
  const paragraphs = getMeaningfulParagraphs(header);
  const jd = extractAiJDText(documentNode);

  return {
    jobId: url.searchParams.get('currentJobId') || getAiJobIdFromDetail(documentNode),
    title: cleanText(detailLink?.innerText || paragraphs[1]?.innerText),
    company: cleanText(paragraphs[0]?.innerText),
    location: cleanText(paragraphs[2]?.innerText).split(/\s+·\s+/)[0].trim(),
    description: jd.text,
    extractionConfidence: jd.confidence,
    extractionSelector: jd.selector,
  };
}
