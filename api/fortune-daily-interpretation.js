const { createClient } = require('@supabase/supabase-js');
const {
  getBeijingDayInfo,
  buildFortuneContext,
  buildBaseFortunePayload,
  buildInterpretationPrompt,
  parseModelJson,
  pickInterpretationFields,
  mergeInterpretation,
  hasReadyInterpretation,
} = require('../lib/fortuneDailyCore');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function setCorsHeaders(req, res) {
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return true;
  return false;
}

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

async function enforceQuota(user) {
  const whitelist = (process.env.WHITELIST_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase());
  const currentUserEmail = user.email ? user.email.toLowerCase() : '';

  if (whitelist.includes(currentUserEmail)) return;

  const { count, error } = await supabase
    .from('fortune_cache')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (!error && count >= 3) {
    throw new Error('您的 3 次免费天机推演额度已用尽');
  }
}

async function getCachedFortune(userId, periodKey) {
  const { data } = await supabase
    .from('fortune_cache')
    .select('data_json')
    .eq('user_id', userId)
    .eq('dimension', 'day')
    .eq('period_key', periodKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  return data?.data_json || null;
}

async function getDefaultProfile(userId) {
  const { data: profile, error } = await supabase
    .from('bazi_profiles')
    .select('name, gender, bazi_summary, bazi_str, birth_date, bazi_detail, favorable_elements, unfavorable_elements, day_zhi, year_zhi, month_zhi, ri_zhu')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !profile) {
    const notFound = new Error('未找到八字档案，请先创建命主档案');
    notFound.statusCode = 404;
    throw notFound;
  }
  if (!profile.bazi_summary) {
    const missingSummary = new Error('八字断语尚未生成，请先完成八字排盘');
    missingSummary.statusCode = 400;
    throw missingSummary;
  }

  return profile;
}

async function upsertFortuneCache(userId, periodKey, dataJson, expiresAt) {
  const { error } = await supabase
    .from('fortune_cache')
    .upsert({
      user_id: userId,
      dimension: 'day',
      period_key: periodKey,
      data_json: dataJson,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'user_id, dimension, period_key',
    });

  if (error) {
    console.warn('⚠️ 日运断语缓存写入失败:', error.message);
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
  const keyInfo = describeSecret(process.env.LLM_API_KEY);

  console.log('🔎 LLM 请求前诊断:', {
    endpoint,
    model,
    prompt_length: prompt.length,
    llm_api_key: keyInfo,
  });

  const llmResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
  });

  console.log('🔎 LLM 响应状态:', {
    status: llmResponse.status,
    ok: llmResponse.ok,
    content_type: llmResponse.headers.get('content-type'),
  });

  if (!llmResponse.ok) {
    const errText = await llmResponse.text();
    console.error('⚠️ 大模型 API 异常:', llmResponse.status, errText.substring(0, 200));
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

function getTargetDate(req) {
  return req.body?.target_date || req.query?.target_date;
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return res.status(200).end();

  try {
    const user = await getAuthedUser(req, res);
    if (!user) return;

    const { bjTime, todayKey, expiresAt } = getBeijingDayInfo(getTargetDate(req));
    const cached = await getCachedFortune(user.id, todayKey);
    if (hasReadyInterpretation(cached)) {
      console.log(`⚡️ 命中日运断语缓存 [${user.id}] ${todayKey}`);
      return res.status(200).json(pickInterpretationFields(cached));
    }

    if (!cached) await enforceQuota(user);

    const profile = await getDefaultProfile(user.id);
    const context = buildFortuneContext(profile, bjTime, todayKey);
    const latestBaseJson = buildBaseFortunePayload(context);
    const baseJson = cached ? { ...cached, ...latestBaseJson } : latestBaseJson;
    const prompt = buildInterpretationPrompt(context);
    const llmJson = await requestInterpretation(prompt);
    const mergedJson = mergeInterpretation(baseJson, llmJson);

    await upsertFortuneCache(user.id, todayKey, mergedJson, expiresAt);
    return res.status(200).json(pickInterpretationFields(mergedJson));
  } catch (error) {
    console.error('日运断语生成异常:', error);
    return res.status(error.statusCode || (error.message.includes('额度') ? 403 : 500)).json({
      error: error.message.includes('额度') ? error.message : '云端日运断语生成失败',
      details: error.details || error.message,
    });
  }
}
