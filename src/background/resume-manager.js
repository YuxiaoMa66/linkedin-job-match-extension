const STORAGE_KEY = 'persistentResume';

function normalizeResumeText(text) {
  return typeof text === 'string' ? text.trim() : '';
}

async function hashText(text) {
  const buffer = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function savePersistentResume(payload) {
  const text = normalizeResumeText(payload?.text);
  const fileName = payload?.fileName?.trim?.() || 'resume.txt';

  if (!text) {
    throw new Error('Resume text is empty.');
  }

  const storedResume = {
    text,
    fileName,
    hash: await hashText(text),
    updatedAt: new Date().toISOString(),
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: storedResume });
  return storedResume;
}

export async function loadPersistentResume() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const storedResume = result[STORAGE_KEY];

  if (!storedResume?.text) {
    return null;
  }

  if (!storedResume.hash) {
    return savePersistentResume(storedResume);
  }

  return storedResume;
}

export async function clearPersistentResume() {
  await chrome.storage.local.remove(STORAGE_KEY);
}
