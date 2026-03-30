const POE_MODEL_ALIASES = new Map([
  ['gemini-2.5-flash-lite', 'Gemini-2.5-Flash-Lite'],
  ['gemini-2.5-flash', 'Gemini-2.5-Flash'],
  ['gemini-2.5-pro', 'Gemini-2.5-Pro'],
  ['gemini-2.0-flash-lite', 'Gemini-2.0-Flash-Lite'],
  ['gpt-4.1', 'GPT-4.1'],
  ['gpt-4.1-mini', 'GPT-4.1-Mini'],
  ['gpt-5', 'GPT-5'],
  ['claude-3.7-sonnet', 'Claude-3.7-Sonnet'],
]);

export async function callLLM(config, { systemPrompt, userPrompt }) {
  const {
    provider,
    baseUrl,
    apiKey,
    modelId,
    maxTokens,
    temperature,
    timeoutMs,
    maxRetries,
  } = config;

  let lastError = null;
  const modelCandidates = provider === 'poe'
    ? buildPoeModelCandidates(modelId)
    : [modelId];

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    for (const candidateModel of modelCandidates) {
      try {
        if (attempt > 0) {
          await sleep(attempt === 1 ? 1000 : 3000);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        let response;
        if (provider === 'anthropic') {
          response = await callAnthropic(
            baseUrl,
            apiKey,
            candidateModel,
            systemPrompt,
            userPrompt,
            maxTokens,
            temperature,
            controller.signal,
          );
        } else {
          response = await callOpenAICompatible(
            provider,
            baseUrl,
            apiKey,
            candidateModel,
            systemPrompt,
            userPrompt,
            maxTokens,
            temperature,
            controller.signal,
          );
        }

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error;

        if (error.name === 'AbortError') {
          lastError = new Error(`LLM request timed out (${timeoutMs}ms).`);
        }

        if (error.status === 401 || error.status === 403) {
          throw new Error(`API authentication failed (${error.status}). Please verify the API key.`);
        }

        const isRetryablePoe404 = provider === 'poe'
          && error.status === 404
          && candidateModel !== modelCandidates[modelCandidates.length - 1];

        if (isRetryablePoe404) {
          continue;
        }
      }
    }
  }

  if (provider === 'poe' && lastError?.status === 404) {
    throw new Error(
      `Poe returned 404. The base URL looks fine, so the model name is likely invalid. Try an official Poe model ID such as "${modelCandidates[modelCandidates.length - 1]}".`
    );
  }

  throw lastError || new Error('LLM request failed after exhausting retries.');
}

async function callOpenAICompatible(provider, baseUrl, apiKey, modelId, systemPrompt, userPrompt, maxTokens, temperature, signal) {
  const endpoint = resolveEndpoint(provider, baseUrl);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'chrome-extension://linkedin-job-match';
    headers['X-Title'] = 'LinkedIn Job Match';
  }

  const body = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
  };

  if (provider !== 'poe' && provider !== 'gemini') {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error = new Error(`LLM API error ${response.status}: ${errorText.slice(0, 200)}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content || '',
    finishReason: choice?.finish_reason || 'unknown',
    usage: data.usage || null,
    resolvedModel: modelId,
  };
}

async function callAnthropic(baseUrl, apiKey, modelId, systemPrompt, userPrompt, maxTokens, temperature, signal) {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/messages`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: modelId,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: maxTokens,
      temperature,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error = new Error(`Anthropic API error ${response.status}: ${errorText.slice(0, 200)}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || '',
    finishReason: data.stop_reason || 'unknown',
    usage: data.usage || null,
    resolvedModel: modelId,
  };
}

function resolveEndpoint(provider, baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  const paths = {
    openai: '/v1/chat/completions',
    openrouter: '/api/v1/chat/completions',
    gemini: '/chat/completions',
    poe: '/v1/chat/completions',
    custom: '',
  };
  const path = paths[provider] || '/v1/chat/completions';

  if (!path) {
    return base;
  }

  if (base.endsWith(path)) {
    return base;
  }

  if (base.endsWith('/v1') && path.startsWith('/v1/')) {
    return `${base}${path.slice(3)}`;
  }

  if (base.endsWith('/openai') && path.startsWith('/chat/')) {
    return `${base}${path}`;
  }

  return base + path;
}

function buildPoeModelCandidates(modelId) {
  const trimmed = (modelId || '').trim();
  if (!trimmed) {
    return ['GPT-4.1'];
  }

  const candidates = new Set([trimmed]);
  const alias = POE_MODEL_ALIASES.get(trimmed.toLowerCase());
  if (alias) {
    candidates.add(alias);
  }

  const titleCaseGuess = trimmed
    .split('-')
    .map(part => {
      if (/^\d+(\.\d+)?$/.test(part)) {
        return part;
      }
      if (part.length <= 3 && /\d/.test(part)) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('-')
    .replace(/\bGpt\b/g, 'GPT')
    .replace(/\bClaude\b/g, 'Claude')
    .replace(/\bGemini\b/g, 'Gemini');

  candidates.add(titleCaseGuess);
  return [...candidates];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
