import divinationRouter from '../../lib/divinationRouter.js';

const { buildGeminiRoutePrompt, classifyDivinationQuestion } = divinationRouter;

const LLM_API_URL = 'https://yinli.one/v1/chat/completions';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://qimendao.com',
  'https://www.qimendao.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function getAllowedOrigins(env) {
  const configuredOrigins = String(env.FRONTEND_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set([...configuredOrigins, ...DEFAULT_ALLOWED_ORIGINS])];
}

function getCorsHeaders(request, env, allowedHeaders = 'Content-Type, Authorization, X-Guest-Id') {
  const requestOrigin = normalizeOrigin(request.headers.get('Origin'));
  const configuredOrigin = normalizeOrigin(env.FRONTEND_URL || '');
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin = configuredOrigin === '*'
    ? '*'
    : requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': allowedHeaders,
    'Vary': 'Origin',
  };
}

function json(payload, init = {}, request, env) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json; charset=utf-8');

  if (request && env) {
    for (const [key, value] of Object.entries(getCorsHeaders(request, env))) {
      headers.set(key, value);
    }
  }

  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}

async function readJson(request) {
  if (!request.body) return {};
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) return {};
  return request.json();
}

async function classifyByGeminiFlashWithEnv(question, ruleResult, env) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const response = await fetch(LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gemini-3-flash-preview',
      messages: [{ role: 'user', content: buildGeminiRoutePrompt(question, ruleResult) }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Divination router LLM request failed: HTTP ${response.status}`);
  }

  const apiData = await response.json();
  const content = apiData.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
}

async function handleDivinationRoute(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  }

  const body = await readJson(request);
  const question = String(body.question || '').trim();
  if (!question) {
    return json({ error: '问题不能为空' }, { status: 400 }, request, env);
  }

  const route = await classifyDivinationQuestion({
    question,
    llmFallback: true,
    llmClassifier: (text, ruleResult) => classifyByGeminiFlashWithEnv(text, ruleResult, env),
  });

  return json(route, { status: 200 }, request, env);
}

async function routeRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request, env),
    });
  }

  if (url.pathname === '/api/health') {
    return json({ ok: true, service: 'qimen-api' }, { status: 200 }, request, env);
  }

  if (url.pathname === '/api/divination-route') {
    return handleDivinationRoute(request, env);
  }

  return json({
    error: 'Not Found',
    path: url.pathname,
    migrated: ['/api/health', '/api/divination-route'],
  }, { status: 404 }, request, env);
}

export default {
  async fetch(request, env) {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      console.error('[qimen-api]', error);
      return json({
        error: 'Worker request failed',
        details: error.message,
      }, { status: 500 }, request, env);
    }
  },
};
