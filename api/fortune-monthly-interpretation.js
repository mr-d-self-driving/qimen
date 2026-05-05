const { createClient } = require('@supabase/supabase-js');
const {
  buildMonthlyFortunePayload,
  getBeijingMonthInfo,
} = require('../lib/fortuneMonthlyCore');
const {
  buildMonthlyInterpretationPeriodKey,
  buildMonthlyInterpretationPrompt,
  hasReadyMonthlyInterpretation,
  mergeMonthlyInterpretation,
  normalizeDimension,
  parseModelJson,
  pickMonthlyInterpretationFields,
} = require('../lib/fortuneMonthlyInterpretationCore');
const {
  buildContextVersionSeed,
  createEmptyMonthlyContext,
  createEmptyProfileContext,
  normalizeMonthlyContextPayload,
  normalizeProfileContextPayload,
} = require('../lib/fortuneContextNotes');
const { setCorsHeaders } = require('./cors');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getAuthedUser(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: '未登录，请先登录' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: '登录状态已过期，请重新登录' });
    return null;
  }

  return user;
}

function getRequestedProfileId(req) {
  return req.body?.profile_id || req.query?.profile_id || '';
}

function getTargetMonth(req) {
  return req.body?.target_month || req.query?.target_month || req.body?.target_date || req.query?.target_date;
}

function getRequestedDimension(req) {
  return normalizeDimension(req.body?.dimension || req.query?.dimension || 'overall');
}

async function getProfileForFortune(userId, profileId) {
  let query = supabase
    .from('bazi_profiles')
    .select('id, name, gender, bazi_summary, bazi_str, birth_date, bazi_detail, favorable_elements, unfavorable_elements, day_zhi, year_zhi, month_zhi, ri_zhu')
    .eq('user_id', userId);

  if (profileId) {
    query = query.eq('id', profileId);
  } else {
    query = query.order('is_default', { ascending: false }).order('created_at', { ascending: false }).limit(1);
  }

  const { data: profile, error } = await query.single();

  if (error || !profile) {
    const notFound = new Error('未找到八字档案，请先创建命主档案');
    notFound.statusCode = 404;
    throw notFound;
  }

  return profile;
}

async function getCachedInterpretation(userId, periodKey) {
  const { data } = await supabase
    .from('fortune_cache')
    .select('data_json')
    .eq('user_id', userId)
    .eq('dimension', 'month_interpretation')
    .eq('period_key', periodKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  return data?.data_json || null;
}

async function getProfileContext(profileId) {
  const { data, error } = await supabase
    .from('profile_contexts')
    .select('career_profile, wealth_profile, love_profile, health_profile, updated_at')
    .eq('profile_id', profileId)
    .single();

  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    throw error;
  }

  return normalizeProfileContextPayload(data || createEmptyProfileContext());
}

async function getRecentMonthlyContexts(profileId, targetMonthKey) {
  const { data, error } = await supabase
    .from('monthly_context_logs')
    .select('month_key, carry_from_previous, overall_note, career_monthly, wealth_monthly, love_monthly, health_monthly, updated_at')
    .eq('profile_id', profileId)
    .lte('month_key', targetMonthKey)
    .order('month_key', { ascending: false })
    .limit(3);

  if (error && error.code !== '42P01') throw error;

  return Array.isArray(data)
    ? data.map(item => normalizeMonthlyContextPayload(item || {}, item?.month_key || ''))
    : [];
}

async function upsertInterpretationCache(userId, periodKey, dataJson, expiresAt) {
  const { error } = await supabase
    .from('fortune_cache')
    .upsert({
      user_id: userId,
      dimension: 'month_interpretation',
      period_key: periodKey,
      data_json: dataJson,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'user_id, dimension, period_key',
    });

  if (error) {
    console.warn('⚠️ 月运断语缓存写入失败:', error.message);
  }
}

function describeSecret(value) {
  if (!value) return { configured: false };

  return {
    configured: true,
    length: value.length,
    prefix: value.slice(0, 4),
    suffix: value.slice(-4),
  };
}

async function requestInterpretation(prompt) {
  const endpoint = 'https://yinli.one/v1/chat/completions';
  const model = 'gemini-3.1-pro-preview';

  console.log('🔎 月运 LLM 请求前诊断:', {
    endpoint,
    model,
    prompt_length: prompt.length,
    gemini_api_key: describeSecret(process.env.GEMINI_API_KEY),
  });

  const llmResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
  });

  console.log('🔎 月运 LLM 响应状态:', {
    status: llmResponse.status,
    ok: llmResponse.ok,
    content_type: llmResponse.headers.get('content-type'),
  });

  if (!llmResponse.ok) {
    const errText = await llmResponse.text();
    console.error('⚠️ 月运大模型 API 异常:', llmResponse.status, errText.substring(0, 200));
    const upstreamError = new Error('上游大模型接口故障');
    upstreamError.statusCode = 502;
    upstreamError.details = `HTTP ${llmResponse.status}`;
    throw upstreamError;
  }

  const llmData = await llmResponse.json();
  if (llmData.error) {
    const modelError = new Error('模型接口返回错误');
    modelError.details = llmData.error;
    throw modelError;
  }

  return parseModelJson(llmData.choices[0].message.content);
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return res.status(200).end();

  try {
    const user = await getAuthedUser(req, res);
    if (!user) return;

    const dimension = getRequestedDimension(req);
    const { year, month, monthKey, expiresAt } = getBeijingMonthInfo(getTargetMonth(req));
    const requestedProfileId = getRequestedProfileId(req);
    const profile = await getProfileForFortune(user.id, requestedProfileId);
    const profileContext = await getProfileContext(profile.id);
    const recentMonthlyContexts = await getRecentMonthlyContexts(profile.id, monthKey);
    const currentMonthlyContext = recentMonthlyContexts.find(item => item.month_key === monthKey) || createEmptyMonthlyContext(monthKey);
    const contextSeed = buildContextVersionSeed(profileContext, recentMonthlyContexts);
    const periodKey = buildMonthlyInterpretationPeriodKey(monthKey, requestedProfileId || profile.id, dimension, contextSeed);

    const cached = await getCachedInterpretation(user.id, periodKey);
    if (hasReadyMonthlyInterpretation(cached)) {
      console.log(`⚡️ 命中月运断语缓存 [${user.id}] ${periodKey}`);
      return res.status(200).json(pickMonthlyInterpretationFields(cached));
    }

    const baseJson = buildMonthlyFortunePayload(profile, year, month);
    const prompt = buildMonthlyInterpretationPrompt(profile, baseJson, dimension, {
      profile_context: profileContext,
      current_monthly_context: currentMonthlyContext,
      recent_monthly_contexts: recentMonthlyContexts,
    });
    const llmJson = await requestInterpretation(prompt);
    const mergedJson = mergeMonthlyInterpretation(baseJson, llmJson, dimension);

    await upsertInterpretationCache(user.id, periodKey, mergedJson, expiresAt);
    return res.status(200).json(pickMonthlyInterpretationFields(mergedJson));
  } catch (error) {
    console.error('月运断语生成异常:', error);
    return res.status(error.statusCode || 500).json({
      error: '云端月运断语生成失败',
      details: error.details || error.message,
    });
  }
}
