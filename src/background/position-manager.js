const MANUAL_JOBS_KEY = 'ljm_manual_jobs_v1';
const SAVED_POSITIONS_KEY = 'ljm_saved_positions_v1';
const INSERTED_SOURCE = 'inserted';
const LINKEDIN_SOURCE = 'linkedin';

function normalizeManualJob(rawJob = {}) {
  return {
    manualJobId: rawJob.manualJobId || '',
    jobId: rawJob.jobId || rawJob.manualJobId || '',
    sourceType: INSERTED_SOURCE,
    title: rawJob.title || '',
    company: rawJob.company || '',
    location: rawJob.location || '',
    description: rawJob.description || '',
    sourceUrl: rawJob.sourceUrl || '',
    rawInput: rawJob.rawInput || '',
    createdAt: rawJob.createdAt || new Date().toISOString(),
    updatedAt: rawJob.updatedAt || new Date().toISOString(),
    lastAnalyzedAt: rawJob.lastAnalyzedAt || null,
  };
}

function normalizeSavedPosition(rawPosition = {}) {
  const sourceType = rawPosition.sourceType === INSERTED_SOURCE ? INSERTED_SOURCE : LINKEDIN_SOURCE;
  return {
    positionKey: rawPosition.positionKey || buildPositionKey(rawPosition.jobId, sourceType),
    jobId: rawPosition.jobId || '',
    sourceType,
    title: rawPosition.title || '',
    company: rawPosition.company || '',
    location: rawPosition.location || '',
    url: rawPosition.url || rawPosition.sourceUrl || '',
    sourceUrl: rawPosition.sourceUrl || rawPosition.url || '',
    savedAt: rawPosition.savedAt || new Date().toISOString(),
    updatedAt: rawPosition.updatedAt || rawPosition.savedAt || new Date().toISOString(),
    lastResult: rawPosition.lastResult || null,
    summary: rawPosition.summary || null,
  };
}

function buildPositionKey(jobId, sourceType = LINKEDIN_SOURCE) {
  return `${sourceType}:${jobId}`;
}

function createManualJobId() {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readManualJobs() {
  const result = await chrome.storage.local.get(MANUAL_JOBS_KEY);
  const jobs = Array.isArray(result[MANUAL_JOBS_KEY]) ? result[MANUAL_JOBS_KEY] : [];
  return jobs.map(normalizeManualJob);
}

async function writeManualJobs(jobs) {
  await chrome.storage.local.set({ [MANUAL_JOBS_KEY]: jobs });
}

async function readSavedPositions() {
  const result = await chrome.storage.local.get(SAVED_POSITIONS_KEY);
  const positions = Array.isArray(result[SAVED_POSITIONS_KEY]) ? result[SAVED_POSITIONS_KEY] : [];
  return positions.map(normalizeSavedPosition);
}

async function writeSavedPositions(positions) {
  await chrome.storage.local.set({ [SAVED_POSITIONS_KEY]: positions });
}

export const PositionManager = {
  buildPositionKey,

  async listManualJobs() {
    const jobs = await readManualJobs();
    return jobs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  async getManualJob(manualJobId) {
    const jobs = await readManualJobs();
    return jobs.find(job => job.manualJobId === manualJobId) || null;
  },

  async upsertManualJob(payload) {
    const jobs = await readManualJobs();
    const existingIndex = jobs.findIndex(job => job.manualJobId === payload?.manualJobId);
    const now = new Date().toISOString();

    const manualJobId = payload?.manualJobId || createManualJobId();
    const nextJob = normalizeManualJob({
      ...payload,
      manualJobId,
      jobId: manualJobId,
      createdAt: existingIndex >= 0 ? jobs[existingIndex].createdAt : now,
      updatedAt: now,
      lastAnalyzedAt: existingIndex >= 0 ? jobs[existingIndex].lastAnalyzedAt : null,
    });

    if (existingIndex >= 0) {
      jobs.splice(existingIndex, 1, nextJob);
    } else {
      jobs.unshift(nextJob);
    }

    await writeManualJobs(jobs);
    return nextJob;
  },

  async deleteManualJob(manualJobId) {
    if (!manualJobId) {
      return;
    }

    const jobs = await readManualJobs();
    const nextJobs = jobs.filter(job => job.manualJobId !== manualJobId);
    await writeManualJobs(nextJobs);
  },

  async markManualJobAnalyzed(manualJobId, analyzedAt = new Date().toISOString()) {
    if (!manualJobId) {
      return null;
    }

    const jobs = await readManualJobs();
    const jobIndex = jobs.findIndex(job => job.manualJobId === manualJobId);
    if (jobIndex < 0) {
      return null;
    }

    const updatedJob = normalizeManualJob({
      ...jobs[jobIndex],
      updatedAt: analyzedAt,
      lastAnalyzedAt: analyzedAt,
    });

    jobs.splice(jobIndex, 1, updatedJob);
    await writeManualJobs(jobs);
    return updatedJob;
  },

  async listSavedPositions() {
    const positions = await readSavedPositions();
    return positions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  async isSaved(jobId, sourceType = LINKEDIN_SOURCE) {
    const positions = await readSavedPositions();
    const positionKey = buildPositionKey(jobId, sourceType);
    return positions.some(position => position.positionKey === positionKey);
  },

  async toggleSavedPosition(payload) {
    const positions = await readSavedPositions();
    const sourceType = payload?.sourceType === INSERTED_SOURCE ? INSERTED_SOURCE : LINKEDIN_SOURCE;
    const positionKey = buildPositionKey(payload?.jobId, sourceType);
    const existingIndex = positions.findIndex(position => position.positionKey === positionKey);

    if (existingIndex >= 0) {
      positions.splice(existingIndex, 1);
      await writeSavedPositions(positions);
      return { saved: false, positionKey };
    }

    const now = new Date().toISOString();
    const nextPosition = normalizeSavedPosition({
      ...payload,
      positionKey,
      sourceType,
      savedAt: now,
      updatedAt: now,
    });

    positions.unshift(nextPosition);
    await writeSavedPositions(positions);
    return { saved: true, position: nextPosition };
  },

  async deleteSavedPosition(jobId, sourceType = LINKEDIN_SOURCE) {
    if (!jobId) {
      return false;
    }

    const positions = await readSavedPositions();
    const positionKey = buildPositionKey(jobId, sourceType);
    const nextPositions = positions.filter(position => position.positionKey !== positionKey);
    if (nextPositions.length === positions.length) {
      return false;
    }

    await writeSavedPositions(nextPositions);
    return true;
  },

  async updateSavedPositionResult(jobId, sourceType, resultPayload, summary = null) {
    if (!jobId) {
      return;
    }

    const positions = await readSavedPositions();
    const positionKey = buildPositionKey(jobId, sourceType);
    const existingIndex = positions.findIndex(position => position.positionKey === positionKey);
    if (existingIndex < 0) {
      return;
    }

    const updatedPosition = normalizeSavedPosition({
      ...positions[existingIndex],
      updatedAt: new Date().toISOString(),
      lastResult: resultPayload,
      summary: summary || positions[existingIndex].summary,
    });
    positions.splice(existingIndex, 1, updatedPosition);
    await writeSavedPositions(positions);
  },
};
