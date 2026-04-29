const { createClient } = require('@supabase/supabase-js');
const {
  buildFortunePeriodKey,
  buildMonthlyFortunePayload,
  getBeijingMonthInfo,
} = require('../lib/fortuneMonthlyCore');
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

async function getCachedFortune(userId, periodKey) {
  const { data } = await supabase
    .from('fortune_cache')
    .select('data_json')
    .eq('user_id', userId)
    .eq('dimension', 'month')
    .eq('period_key', periodKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  return data?.data_json || null;
}

async function upsertFortuneCache(userId, periodKey, dataJson, expiresAt) {
  const { error } = await supabase
    .from('fortune_cache')
    .upsert({
      user_id: userId,
      dimension: 'month',
      period_key: periodKey,
      data_json: dataJson,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'user_id, dimension, period_key',
    });

  if (error) {
    console.warn('⚠️ 月运基础缓存写入失败:', error.message);
  }
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return res.status(200).end();

  try {
    const user = await getAuthedUser(req, res);
    if (!user) return;

    const { year, month, monthKey, secondsUntilMonthEnd, expiresAt } = getBeijingMonthInfo(getTargetMonth(req));
    const requestedProfileId = getRequestedProfileId(req);
    const periodKey = buildFortunePeriodKey(monthKey, requestedProfileId);
    const cached = await getCachedFortune(user.id, periodKey);
    if (cached?.monthly_score) {
      console.log(`⚡️ 命中月运基础缓存 [${user.id}] ${periodKey}`);
      res.setHeader('Cache-Control', `s-maxage=${secondsUntilMonthEnd}, stale-while-revalidate`);
      return res.status(200).json(cached);
    }

    const profile = await getProfileForFortune(user.id, requestedProfileId);
    const monthlyJson = buildMonthlyFortunePayload(profile, year, month);
    await upsertFortuneCache(user.id, periodKey, monthlyJson, expiresAt);

    res.setHeader('Cache-Control', `s-maxage=${secondsUntilMonthEnd}, stale-while-revalidate`);
    return res.status(200).json(monthlyJson);
  } catch (error) {
    console.error('月运基础推演异常:', error);
    return res.status(error.statusCode || 500).json({
      error: '云端月运推演失败',
      details: error.message,
    });
  }
}
