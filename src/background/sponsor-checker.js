const NETHERLANDS_INDICATORS = [
  'netherlands', 'nederland', 'the netherlands', 'holland',
  'amsterdam', 'rotterdam', 'den haag', 'the hague', 'utrecht',
  'eindhoven', 'delft', 'leiden', 'groningen', 'tilburg',
  'breda', 'maastricht', 'arnhem', 'nijmegen', 'haarlem',
  'almere', 'enschede', 'apeldoorn', 'amersfoort', 'hilversum',
  's-hertogenbosch', 'den bosch', 'dordrecht', 'zoetermeer',
];

const SPONSORSHIP_KEYWORDS = [
  'visa sponsorship',
  'sponsor visa',
  'highly skilled migrant',
  'kennismigrant',
  'work permit',
  'relocation support',
  'relocation package',
  'relocation assistance',
  '30% ruling',
  '30 ruling',
  'expat',
  'immigration support',
  'we sponsor',
  'sponsorship available',
];

const NO_SPONSORSHIP_KEYWORDS = [
  'no visa sponsorship',
  'no sponsorship',
  'cannot sponsor',
  'can not sponsor',
  'unable to sponsor',
  'do not sponsor',
  'does not sponsor',
  'will not sponsor',
  'without sponsorship',
  'must have valid work authorization',
  'must be authorized to work',
  'no relocation support',
];

const COMPANY_STOPWORDS = new Set([
  'the',
  'and',
  'of',
  'for',
  'global',
  'international',
  'nederland',
  'netherlands',
  'group',
  'holding',
  'holdings',
  'services',
  'solutions',
  'systems',
  'technologies',
  'technology',
  'company',
  'co',
  'bv',
  'nv',
  'bvba',
  'b.v',
  'n.v',
]);

let cachedINDData = null;
let cacheTimestamp = 0;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export function isNetherlands(location, description = '') {
  const combined = `${location || ''} ${description || ''}`.toLowerCase();
  return NETHERLANDS_INDICATORS.some(indicator => combined.includes(indicator));
}

export function extractSponsorshipKeywords(description) {
  if (!description) {
    return [];
  }

  const lower = description.toLowerCase();
  return SPONSORSHIP_KEYWORDS.filter(keyword => lower.includes(keyword));
}

export function extractNoSponsorshipKeywords(description) {
  if (!description) {
    return [];
  }

  const lower = description.toLowerCase();
  return NO_SPONSORSHIP_KEYWORDS.filter(keyword => lower.includes(keyword));
}

export function normalizeCompanyName(name) {
  if (!name) {
    return '';
  }

  return name
    .toLowerCase()
    .replace(/\b(b\.?v\.?|n\.?v\.?|holding|holdings|group|international|services|solutions|systems|technologies|technology|nederland|netherlands)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeCompanyName(name) {
  return normalizeCompanyName(name)
    .split(' ')
    .filter(Boolean)
    .filter(token => token.length > 1 && !COMPANY_STOPWORDS.has(token));
}

function computeTokenSimilarity(queryName, candidateName) {
  const queryTokens = tokenizeCompanyName(queryName);
  const candidateTokens = tokenizeCompanyName(candidateName);

  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  const querySet = new Set(queryTokens);
  const candidateSet = new Set(candidateTokens);
  let overlap = 0;

  for (const token of querySet) {
    if (candidateSet.has(token)) {
      overlap += 1;
    }
  }

  const subsetBonus = queryTokens.every(token => candidateSet.has(token))
    || candidateTokens.every(token => querySet.has(token))
    ? 0.2
    : 0;

  const overlapScore = overlap / Math.max(querySet.size, candidateSet.size);
  const prefixBonus = normalizeCompanyName(candidateName).startsWith(normalizeCompanyName(queryName))
    || normalizeCompanyName(queryName).startsWith(normalizeCompanyName(candidateName))
    ? 0.15
    : 0;

  return Math.min(1, overlapScore + subsetBonus + prefixBonus);
}

export async function checkINDRegistry(companyName) {
  const normalizedQuery = normalizeCompanyName(companyName);
  if (!normalizedQuery || normalizedQuery.length < 2) {
    return {
      found: false,
      matchedName: null,
      confidence: 'low',
      source: 'IND public register (local cache)',
      score: 0,
      error: 'Company name is too short or invalid.',
    };
  }

  try {
    const sponsorData = await loadINDData();
    if (!sponsorData.length) {
      return {
        found: false,
        matchedName: null,
        confidence: 'low',
        source: 'IND public register',
        score: 0,
        error: 'IND registry data is unavailable.',
      };
    }

    const exactMatch = sponsorData.find(entry => normalizeCompanyName(entry) === normalizedQuery);
    if (exactMatch) {
      return {
        found: true,
        matchedName: exactMatch,
        confidence: 'high',
        source: 'IND public register (exact match)',
        score: 1,
      };
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const entry of sponsorData) {
      const score = computeTokenSimilarity(companyName, entry);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch && bestScore >= 0.66) {
      return {
        found: true,
        matchedName: bestMatch,
        confidence: bestScore >= 0.85 ? 'high' : 'medium',
        source: 'IND public register (fuzzy match)',
        score: Number(bestScore.toFixed(2)),
      };
    }

    return {
      found: false,
      matchedName: bestMatch,
      confidence: bestScore >= 0.5 ? 'medium' : 'high',
      source: 'IND public register',
      score: Number(bestScore.toFixed(2)),
    };
  } catch (error) {
    return {
      found: false,
      matchedName: null,
      confidence: 'low',
      source: 'IND public register',
      score: 0,
      error: `Registry lookup failed: ${error.message}`,
    };
  }
}

async function loadINDData() {
  if (cachedINDData && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedINDData;
  }

  try {
    const result = await chrome.storage.local.get('ind_sponsors_cache');
    if (result.ind_sponsors_cache) {
      const { data, timestamp } = result.ind_sponsors_cache;
      if (data && Date.now() - timestamp < CACHE_TTL) {
        cachedINDData = data;
        cacheTimestamp = timestamp;
        return data;
      }
    }
  } catch {
    // Fall through to bundled data.
  }

  try {
    const url = chrome.runtime.getURL('data/ind_sponsors.json');
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      cachedINDData = data;
      cacheTimestamp = Date.now();

      try {
        await chrome.storage.local.set({
          ind_sponsors_cache: { data, timestamp: cacheTimestamp },
        });
      } catch {
        // Storage caching is optional.
      }

      return data;
    }
  } catch {
    // Bundled file load failed.
  }

  return [];
}

export async function buildSponsorshipContext(companyName, location, description) {
  const registry = await checkINDRegistry(companyName);
  const keywords = extractSponsorshipKeywords(description);
  const noSponsorshipKeywords = extractNoSponsorshipKeywords(description);

  const lines = [];
  if (registry.found) {
    lines.push(
      `IND registry match: "${companyName}" matched "${registry.matchedName}" (${registry.confidence} confidence, score ${registry.score}, ${registry.source}).`
    );
  } else if (registry.error) {
    lines.push(`IND registry lookup could not confirm the company: ${registry.error}`);
  } else if (registry.matchedName) {
    lines.push(
      `IND registry did not confidently match "${companyName}". Closest candidate: "${registry.matchedName}" (${registry.confidence} confidence, score ${registry.score}).`
    );
  } else {
    lines.push(`IND registry did not find a suitable match for "${companyName}".`);
  }

  if (keywords.length) {
    lines.push(`JD sponsorship keywords: ${keywords.join(', ')}`);
  } else {
    lines.push('JD sponsorship keywords: none found.');
  }
  if (noSponsorshipKeywords.length) {
    lines.push(`JD no-sponsorship keywords: ${noSponsorshipKeywords.join(', ')}`);
  } else {
    lines.push('JD no-sponsorship keywords: none found.');
  }

  return {
    registry,
    keywords,
    noSponsorshipKeywords,
    contextText: lines.join('\n'),
    kmEligible: registry.found,
    displayLabel: registry.found ? 'KM' : null,
  };
}
