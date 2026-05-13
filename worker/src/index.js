import divinationRouter from '../../lib/divinationRouter.js';
import { createClient } from '@supabase/supabase-js';
import fortuneAnnualCore from '../../lib/fortuneAnnualCore.js';
import fortuneWeeklyCore from '../../lib/fortuneWeeklyCore.js';
import fortuneMonthlyCore from '../../lib/fortuneMonthlyCore.js';
import fortuneDailyCore from '../../lib/fortuneDailyCore.js';

const { buildGeminiRoutePrompt, classifyDivinationQuestion } = divinationRouter;
const { buildAnnualRangePayload } = fortuneAnnualCore;
const { buildFortunePeriodKey: buildWeeklyPeriodKey, buildWeeklyFortunePayload, getSecondsUntilWeeklyExpiry, getWeekRange, getWeeklyExpiry } = fortuneWeeklyCore;
const { buildFortunePeriodKey: buildMonthlyPeriodKey, buildMonthlyFortunePayload, getFlowMonthInfo } = fortuneMonthlyCore;
const { getBeijingDayInfo, buildFortunePeriodKey: buildDailyPeriodKey, buildFortuneContext, buildBaseFortunePayload } = fortuneDailyCore;

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

function createSupabaseClient(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase credentials are not configured');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

async function getAuthedUser(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    const err = new Error('未登录，请先登录');
    err.status = 401;
    throw err;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createSupabaseClient(env);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    const err = new Error('登录状态已过期，请重新登录');
    err.status = 401;
    throw err;
  }

  return user;
}

function getRequestedProfileId(url, body) {
  return body?.profile_id || url.searchParams.get('profile_id') || '';
}

function getTargetYear(url, body) {
  return parseInt(body?.target_year || url.searchParams.get('target_year') || new Date().getFullYear(), 10);
}

function getTargetDate(url, body) {
  return body?.target_date || url.searchParams.get('target_date');
}

function getTargetMonth(url, body) {
  return body?.target_month || url.searchParams.get('target_month') || body?.target_date || url.searchParams.get('target_date');
}

async function getProfileForFortune(userId, profileId, env, requireSummary = false) {
  const supabase = createSupabaseClient(env);
  let query = supabase
    .from('bazi_profiles')
    .select('id, name, gender, birth_date, bazi_summary, bazi_str, bazi_detail, favorable_elements, unfavorable_elements, day_zhi, year_zhi, month_zhi, ri_zhu')
    .eq('user_id', userId);

  if (profileId) {
    query = query.eq('id', profileId);
  } else {
    query = query.order('is_default', { ascending: false }).order('created_at', { ascending: false }).limit(1);
  }

  const { data: profile, error } = await query.single();

  if (error || !profile) {
    const err = new Error('未找到八字档案，请先创建命主档案');
    err.status = 404;
    throw err;
  }
  
  if (requireSummary && !profile.bazi_summary) {
    const err = new Error('八字断语尚未生成，请先完成八字排盘');
    err.status = 400;
    throw err;
  }

  return profile;
}

async function getCachedFortune(userId, dimension, periodKey, env) {
  const supabase = createSupabaseClient(env);
  const { data } = await supabase
    .from('fortune_cache')
    .select('data_json')
    .eq('user_id', userId)
    .eq('dimension', dimension)
    .eq('period_key', periodKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  return data?.data_json || null;
}

async function upsertFortuneCache(userId, dimension, periodKey, dataJson, expiresAt, env) {
  const supabase = createSupabaseClient(env);
  const { error } = await supabase
    .from('fortune_cache')
    .upsert({
      user_id: userId,
      dimension,
      period_key: periodKey,
      data_json: dataJson,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'user_id, dimension, period_key',
    });

  if (error) {
    console.warn(`[qimen-api] ⚠️ ${dimension} cache write failed:`, error.message);
  }
}

async function enforceQuota(user, env) {
  const whitelist = (env.WHITELIST_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase());
  const currentUserEmail = user.email ? user.email.toLowerCase() : '';

  if (whitelist.includes(currentUserEmail)) {
    return;
  }

  const supabase = createSupabaseClient(env);
  const { count, error } = await supabase
    .from('fortune_cache')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (!error && count >= 3) {
    const err = new Error('您的 3 次免费天机推演额度已用尽');
    err.status = 403;
    throw err;
  }
}

async function handleFortuneAnnual(request, env) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  }

  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') {
    body = await readJson(request);
  }

  try {
    const user = await getAuthedUser(request, env);
    const targetYear = getTargetYear(url, body);
    const requestedProfileId = getRequestedProfileId(url, body);

    const profile = await getProfileForFortune(user.id, requestedProfileId, env);
    const annualRangeJson = buildAnnualRangePayload(profile, targetYear, 10);

    const response = json(annualRangeJson, { status: 200 }, request, env);
    response.headers.set('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return response;
  } catch (error) {
    console.error('[qimen-api] fortune-annual error:', error);
    const status = error.status || 500;
    return json({
      error: '云端年运推演失败',
      details: error.message,
    }, { status }, request, env);
  }
}

async function handleFortuneWeekly(request, env) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  }

  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') body = await readJson(request);

  try {
    const user = await getAuthedUser(request, env);
    const targetDate = getTargetDate(url, body);
    const { week_start, week_end } = getWeekRange(targetDate);
    const requestedProfileId = getRequestedProfileId(url, body);
    const periodKey = buildWeeklyPeriodKey(week_start, requestedProfileId);
    const secondsUntilEnd = getSecondsUntilWeeklyExpiry(week_end);
    
    const cached = await getCachedFortune(user.id, 'week', periodKey, env);
    if (cached?.weekly_score && cached?.week_start === week_start) {
      const response = json(cached, { status: 200 }, request, env);
      response.headers.set('Cache-Control', `s-maxage=${secondsUntilEnd}, stale-while-revalidate`);
      return response;
    }

    const profile = await getProfileForFortune(user.id, requestedProfileId, env);
    const weeklyJson = buildWeeklyFortunePayload(profile, week_start);
    await upsertFortuneCache(user.id, 'week', periodKey, weeklyJson, getWeeklyExpiry(week_end), env);

    const response = json(weeklyJson, { status: 200 }, request, env);
    response.headers.set('Cache-Control', `s-maxage=${secondsUntilEnd}, stale-while-revalidate`);
    return response;
  } catch (error) {
    console.error('[qimen-api] fortune-weekly error:', error);
    return json({ error: '云端周运推演失败', details: error.message }, { status: error.status || 500 }, request, env);
  }
}

async function handleFortuneMonthly(request, env) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  }

  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') body = await readJson(request);

  try {
    const user = await getAuthedUser(request, env);
    const targetMonth = getTargetMonth(url, body);
    const flowMonth = getFlowMonthInfo(targetMonth);
    const requestedProfileId = getRequestedProfileId(url, body);
    const periodKey = buildMonthlyPeriodKey(flowMonth.period_key, requestedProfileId);
    
    const cached = await getCachedFortune(user.id, 'month', periodKey, env);
    if (cached?.monthly_score) {
      const response = json(cached, { status: 200 }, request, env);
      response.headers.set('Cache-Control', `s-maxage=${flowMonth.secondsUntilEnd}, stale-while-revalidate`);
      return response;
    }

    const profile = await getProfileForFortune(user.id, requestedProfileId, env);
    const monthlyJson = buildMonthlyFortunePayload(profile, flowMonth);
    await upsertFortuneCache(user.id, 'month', periodKey, monthlyJson, flowMonth.expiresAt, env);

    const response = json(monthlyJson, { status: 200 }, request, env);
    response.headers.set('Cache-Control', `s-maxage=${flowMonth.secondsUntilEnd}, stale-while-revalidate`);
    return response;
  } catch (error) {
    console.error('[qimen-api] fortune-monthly error:', error);
    return json({ error: '云端月运推演失败', details: error.message }, { status: error.status || 500 }, request, env);
  }
}

async function handleFortuneDaily(request, env) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  }

  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') body = await readJson(request);

  try {
    const user = await getAuthedUser(request, env);
    const targetDate = getTargetDate(url, body);
    const { bjTime, todayKey, secondsUntilMidnight, expiresAt } = getBeijingDayInfo(targetDate);
    const requestedProfileId = getRequestedProfileId(url, body);
    const periodKey = buildDailyPeriodKey(todayKey, requestedProfileId);
    
    const cached = await getCachedFortune(user.id, 'day', periodKey, env);
    if (cached?.core_shen_today && Array.isArray(cached.lucky_hour_zhis) && cached.wealth_officer_state) {
      const response = json(cached, { status: 200 }, request, env);
      response.headers.set('Cache-Control', `s-maxage=${secondsUntilMidnight}, stale-while-revalidate`);
      return response;
    }

    if (!cached) await enforceQuota(user, env);

    const profile = await getProfileForFortune(user.id, requestedProfileId, env, true);
    const context = buildFortuneContext(profile, bjTime, todayKey);
    const baseJson = buildBaseFortunePayload(context);
    
    await upsertFortuneCache(user.id, 'day', periodKey, baseJson, expiresAt, env);

    const response = json(baseJson, { status: 200 }, request, env);
    response.headers.set('Cache-Control', `s-maxage=${secondsUntilMidnight}, stale-while-revalidate`);
    return response;
  } catch (error) {
    console.error('[qimen-api] fortune-daily error:', error);
    const isQuota = error.message.includes('额度');
    return json({ error: isQuota ? error.message : '云端日运推演失败', details: error.message }, { status: error.status || (isQuota ? 403 : 500) }, request, env);
  }
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

  if (url.pathname === '/api/fortune-annual') {
    return handleFortuneAnnual(request, env);
  }

  if (url.pathname === '/api/fortune-weekly') return handleFortuneWeekly(request, env);
  if (url.pathname === '/api/fortune-monthly') return handleFortuneMonthly(request, env);
  if (url.pathname === '/api/fortune-daily') return handleFortuneDaily(request, env);

  return json({
    error: 'Not Found',
    path: url.pathname,
    migrated: [
      '/api/health', '/api/divination-route', '/api/fortune-annual',
      '/api/fortune-weekly', '/api/fortune-monthly', '/api/fortune-daily'
    ],
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
