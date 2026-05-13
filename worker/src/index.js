import divinationRouter from '../../lib/divinationRouter.js';
import { createClient } from '@supabase/supabase-js';
import fortuneAnnualCore from '../../lib/fortuneAnnualCore.js';
import fortuneWeeklyCore from '../../lib/fortuneWeeklyCore.js';
import fortuneMonthlyCore from '../../lib/fortuneMonthlyCore.js';
import fortuneDailyCore from '../../lib/fortuneDailyCore.js';
import { normalizeDivinationRoute } from '../../lib/divinationCategories.js';
import baziQuestionCore from '../../lib/baziQuestionCore.js';
import contextNotesCore from '../../lib/fortuneContextNotes.js';
import monthlyInterpretationCore from '../../lib/fortuneMonthlyInterpretationCore.js';

const { buildGeminiRoutePrompt, classifyDivinationQuestion } = divinationRouter;
const { buildAnnualRangePayload } = fortuneAnnualCore;
const { buildFortunePeriodKey: buildWeeklyPeriodKey, buildWeeklyFortunePayload, getSecondsUntilWeeklyExpiry, getWeekRange, getWeeklyExpiry } = fortuneWeeklyCore;
const { buildFortunePeriodKey: buildMonthlyPeriodKey, buildMonthlyFortunePayload, getFlowMonthInfo } = fortuneMonthlyCore;
const { getBeijingDayInfo, buildFortunePeriodKey: buildDailyPeriodKey, buildFortuneContext, buildBaseFortunePayload, buildInterpretationPrompt, parseModelJson, pickInterpretationFields, mergeInterpretation, hasReadyInterpretation } = fortuneDailyCore;
const { buildBaziQuestionPrompt, normalizeBaziQuestionOutput } = baziQuestionCore;
const { createEmptyMonthlyContext, createEmptyProfileContext, normalizeMonthlyContextPayload, normalizeProfileContextPayload, buildContextVersionSeed } = contextNotesCore;
const { buildMonthlyInterpretationPeriodKey, buildMonthlyInterpretationPrompt, hasReadyMonthlyInterpretation, mergeMonthlyInterpretation, normalizeDimension, pickMonthlyInterpretationFields } = monthlyInterpretationCore;

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

async function requestLLM(prompt, env, model = 'gemini-3.1-pro-preview', temperature = 0.5) {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  
  const response = await fetch('https://yinli.one/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error('上游大模型接口故障');
    err.status = 502;
    err.details = `HTTP ${response.status}: ${errText.substring(0, 120)}`;
    throw err;
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  
  const rawContent = data.choices?.[0]?.message?.content || '{}';
  const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

async function assertProfileOwnership(userId, profileId, env) {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase.from('bazi_profiles').select('id').eq('id', profileId).eq('user_id', userId).single();
  if (error || !data) { const err = new Error('未找到命主档案'); err.status = 404; throw err; }
}

async function getProfileContext(profileId, env) {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase.from('profile_contexts').select('profile_id, career_profile, wealth_profile, love_profile, health_profile, updated_at').eq('profile_id', profileId).single();
  if (error && error.code !== 'PGRST116' && error.code !== '42P01') throw error;
  return normalizeProfileContextPayload(data || createEmptyProfileContext());
}

async function upsertProfileContext(profileId, payload, env) {
  const normalized = normalizeProfileContextPayload(payload);
  const supabase = createSupabaseClient(env);
  const { error } = await supabase.from('profile_contexts').upsert({
    profile_id: profileId, ...normalized, updated_at: new Date().toISOString()
  }, { onConflict: 'profile_id' });
  if (error && error.code === '42P01') { const err = new Error('断事笔记数据表尚未初始化'); err.status = 503; throw err; }
  if (error) throw error;
  return getProfileContext(profileId, env);
}

async function getMonthlyContext(profileId, monthKey, env) {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase.from('monthly_context_logs').select('profile_id, month_key, carry_from_previous, overall_note, career_monthly, wealth_monthly, love_monthly, health_monthly, updated_at').eq('profile_id', profileId).eq('month_key', monthKey).single();
  if (error && error.code !== 'PGRST116' && error.code !== '42P01') throw error;
  const record = normalizeMonthlyContextPayload(data || createEmptyMonthlyContext(monthKey), monthKey);
  
  const { data: recentData, error: recentError } = await supabase.from('monthly_context_logs').select('month_key, carry_from_previous, overall_note, career_monthly, wealth_monthly, love_monthly, health_monthly, updated_at').eq('profile_id', profileId).lte('month_key', monthKey).order('month_key', { ascending: false }).limit(3);
  if (recentError && recentError.code === '42P01') return { record, recent_records: [] };
  if (recentError) throw recentError;
  return { record, recent_records: Array.isArray(recentData) ? recentData.map(item => normalizeMonthlyContextPayload(item || {}, item?.month_key || '')) : [] };
}

async function upsertMonthlyContext(profileId, monthKey, payload, env) {
  const normalized = normalizeMonthlyContextPayload(payload, monthKey);
  const supabase = createSupabaseClient(env);
  const { error } = await supabase.from('monthly_context_logs').upsert({
    profile_id: profileId, ...normalized, updated_at: new Date().toISOString()
  }, { onConflict: 'profile_id,month_key' });
  if (error && error.code === '42P01') { const err = new Error('断事笔记数据表尚未初始化'); err.status = 503; throw err; }
  if (error) throw error;
  return getMonthlyContext(profileId, monthKey, env);
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

async function handleContextNotes(request, env) {
  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') body = await readJson(request);
  
  try {
    const user = await getAuthedUser(request, env);
    const profileId = body?.profile_id || url.searchParams.get('profile_id') || '';
    if (!profileId) return json({ error: '缺少 profile_id' }, { status: 400 }, request, env);
    await assertProfileOwnership(user.id, profileId, env);

    const scope = String(body?.scope || url.searchParams.get('scope') || 'profile').trim().toLowerCase();
    if (scope !== 'profile' && scope !== 'monthly') return json({ error: '不支持的断事笔记范围' }, { status: 400 }, request, env);

    if (request.method === 'GET') {
      if (scope === 'profile') return json({ scope, data: await getProfileContext(profileId, env) }, { status: 200 }, request, env);
      const monthKey = String(body?.month_key || url.searchParams.get('month_key') || '').trim();
      if (!monthKey) return json({ error: '缺少 month_key' }, { status: 400 }, request, env);
      return json({ scope, ...(await getMonthlyContext(profileId, monthKey, env)) }, { status: 200 }, request, env);
    }
    
    if (request.method === 'POST') {
      if (scope === 'profile') return json({ scope, data: await upsertProfileContext(profileId, body?.data || {}, env) }, { status: 200 }, request, env);
      const monthKey = String(body?.month_key || url.searchParams.get('month_key') || '').trim();
      if (!monthKey) return json({ error: '缺少 month_key' }, { status: 400 }, request, env);
      return json({ scope, ...(await upsertMonthlyContext(profileId, monthKey, body?.data || {}, env)) }, { status: 200 }, request, env);
    }
    
    return json({ error: 'Method Not Allowed' }, { status: 405 }, request, env);
  } catch (error) {
    console.error('[qimen-api] context-notes error:', error);
    return json({ error: '断事笔记处理失败', details: error.message }, { status: error.status || 500 }, request, env);
  }
}

async function handleBaziQuestion(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  try {
    const user = await getAuthedUser(request, env);
    const body = await readJson(request);
    const question = String(body.question || '').trim();
    const profileId = String(body.profileId || '').trim();
    const route = normalizeDivinationRoute(body.route || { branch: 'bazi', category: 'general' });
    
    if (!question) return json({ error: '问题不能为空' }, { status: 400 }, request, env);
    if (!profileId) return json({ error: '缺少八字档案 ID' }, { status: 400 }, request, env);

    const supabase = createSupabaseClient(env);
    const { data: profile, error } = await supabase.from('bazi_profiles').select('*').eq('id', profileId).single();
    if (error || !profile) return json({ error: '档案不存在' }, { status: 404 }, request, env);
    if (profile.user_id !== user.id) return json({ error: '无权操作该档案' }, { status: 403 }, request, env);
    if (!profile.bazi_detail || !profile.bazi_str) return json({ error: '该档案缺少完整八字排盘数据，请先在八字页完成命盘推演', code: 'BAZI_PROFILE_INCOMPLETE' }, { status: 400 }, request, env);

    const prompt = buildBaziQuestionPrompt({ profile, question, route });
    const llmJson = await requestLLM(prompt, env, 'gemini-3.1-pro-preview', 0.65);
    const output = normalizeBaziQuestionOutput(llmJson, { question, route });
    
    return json(output, { status: 200 }, request, env);
  } catch (error) {
    console.error('[qimen-api] bazi-question error:', error);
    return json({ error: '八字问答生成失败', details: error.message }, { status: error.status || 500 }, request, env);
  }
}

async function handleBaziCalibrate(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  try {
    const user = await getAuthedUser(request, env);
    const body = await readJson(request);
    const { profileId, prompt } = body;
    if (!profileId || !prompt) return json({ error: '缺少 profileId 或 prompt' }, { status: 400 }, request, env);

    const supabase = createSupabaseClient(env);
    const { data: profile } = await supabase.from('bazi_profiles').select('id, user_id').eq('id', profileId).single();
    if (!profile || profile.user_id !== user.id) return json({ error: '无权操作该档案' }, { status: 403 }, request, env);

    const llmJson = await requestLLM(prompt, env, 'gemini-3.1-pro-preview', 0.2);
    if (!llmJson.yuanju_core || !llmJson.current_dayun || !llmJson.current_liunian) {
      return json({ error: 'LLM 返回格式不符预期' }, { status: 500 }, request, env);
    }

    const { error: dbError } = await supabase.from('bazi_profiles').update({
      calibrated_yuanju_core: llmJson.yuanju_core,
      calibrated_current_dayun: llmJson.current_dayun,
      calibrated_current_liunian: llmJson.current_liunian,
      calibrated_at: new Date().toISOString(),
    }).eq('id', profileId);

    if (dbError) throw dbError;

    return json({
      yuanju_core: llmJson.yuanju_core,
      current_dayun: llmJson.current_dayun,
      current_liunian: llmJson.current_liunian,
    }, { status: 200 }, request, env);
  } catch (error) {
    console.error('[qimen-api] bazi-calibrate error:', error);
    return json({ error: error.message || '深度校准失败' }, { status: error.status || 500 }, request, env);
  }
}

async function handleFortuneDailyInterpretation(request, env) {
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') body = await readJson(request);

  try {
    const user = await getAuthedUser(request, env);
    const targetDate = getTargetDate(url, body);
    const { bjTime, todayKey, expiresAt } = getBeijingDayInfo(targetDate);
    const requestedProfileId = getRequestedProfileId(url, body);
    const periodKey = buildDailyPeriodKey(todayKey, requestedProfileId);

    const cached = await getCachedFortune(user.id, 'day', periodKey, env);
    if (hasReadyInterpretation(cached)) return json(pickInterpretationFields(cached), { status: 200 }, request, env);

    if (!cached) await enforceQuota(user, env);

    const profile = await getProfileForFortune(user.id, requestedProfileId, env, true);
    const context = buildFortuneContext(profile, bjTime, todayKey);
    const latestBaseJson = buildBaseFortunePayload(context);
    const baseJson = cached ? { ...cached, ...latestBaseJson } : latestBaseJson;
    
    const prompt = buildInterpretationPrompt(context);
    const llmJson = await requestLLM(prompt, env, 'gemini-3.1-pro-preview', 0.5);
    const mergedJson = mergeInterpretation(baseJson, llmJson);

    await upsertFortuneCache(user.id, 'day', periodKey, mergedJson, expiresAt, env);
    return json(pickInterpretationFields(mergedJson), { status: 200 }, request, env);
  } catch (error) {
    console.error('[qimen-api] fortune-daily-interpretation error:', error);
    const isQuota = error.message.includes('额度');
    return json({ error: isQuota ? error.message : '云端日运断语生成失败', details: error.message }, { status: error.status || (isQuota ? 403 : 500) }, request, env);
  }
}

async function handleFortuneMonthlyInterpretation(request, env) {
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
  const url = new URL(request.url);
  let body = {};
  if (request.method === 'POST') body = await readJson(request);

  try {
    const user = await getAuthedUser(request, env);
    const targetMonth = getTargetMonth(url, body);
    const dimension = normalizeDimension(body?.dimension || url.searchParams.get('dimension') || 'overall');
    const flowMonth = getFlowMonthInfo(targetMonth);
    const requestedProfileId = getRequestedProfileId(url, body);
    const profile = await getProfileForFortune(user.id, requestedProfileId, env);
    
    const profileContext = await getProfileContext(profile.id, env);
    const { record: currentMonthlyContext, recent_records: recentMonthlyContexts } = await getMonthlyContext(profile.id, flowMonth.context_month_key, env);
    const contextSeed = buildContextVersionSeed(profileContext, recentMonthlyContexts);
    const periodKey = buildMonthlyInterpretationPeriodKey(flowMonth.period_key, profile.id, dimension, contextSeed);

    const cached = await getCachedFortune(user.id, 'month_interpretation', periodKey, env);
    if (hasReadyMonthlyInterpretation(cached)) return json(pickMonthlyInterpretationFields(cached), { status: 200 }, request, env);

    const baseJson = buildMonthlyFortunePayload(profile, flowMonth);
    const prompt = buildMonthlyInterpretationPrompt(profile, baseJson, dimension, {
      profile_context: profileContext,
      current_monthly_context: currentMonthlyContext,
      recent_monthly_contexts: recentMonthlyContexts,
    });
    
    const llmJson = await requestLLM(prompt, env, 'gemini-3.1-pro-preview', 0.5);
    const mergedJson = mergeMonthlyInterpretation(baseJson, llmJson, dimension);

    await upsertFortuneCache(user.id, 'month_interpretation', periodKey, mergedJson, flowMonth.expiresAt, env);
    return json(pickMonthlyInterpretationFields(mergedJson), { status: 200 }, request, env);
  } catch (error) {
    console.error('[qimen-api] fortune-monthly-interpretation error:', error);
    return json({ error: '云端月运断语生成失败', details: error.message }, { status: error.status || 500 }, request, env);
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

  if (url.pathname === '/api/context-notes') return handleContextNotes(request, env);
  if (url.pathname === '/api/bazi-question') return handleBaziQuestion(request, env);
  if (url.pathname === '/api/bazi-calibrate') return handleBaziCalibrate(request, env);
  if (url.pathname === '/api/fortune-daily-interpretation') return handleFortuneDailyInterpretation(request, env);
  if (url.pathname === '/api/fortune-monthly-interpretation') return handleFortuneMonthlyInterpretation(request, env);

  return json({
    error: 'Not Found',
    path: url.pathname,
    migrated: [
      '/api/health', '/api/divination-route', '/api/fortune-annual',
      '/api/fortune-weekly', '/api/fortune-monthly', '/api/fortune-daily',
      '/api/context-notes', '/api/bazi-question', '/api/bazi-calibrate',
      '/api/fortune-daily-interpretation', '/api/fortune-monthly-interpretation'
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
