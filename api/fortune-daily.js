const { createClient } = require('@supabase/supabase-js');
const {
  getBeijingDayInfo,
  buildFortunePeriodKey,
  buildFortuneContext,
  buildBaseFortunePayload,
} = require('../lib/fortuneDailyCore');
const { setCorsHeaders } = require('../lib/cors');

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

async function enforceQuota(user) {
  const whitelist = (process.env.WHITELIST_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase());
  const currentUserEmail = user.email ? user.email.toLowerCase() : '';

  if (whitelist.includes(currentUserEmail)) {
    console.log(`👑 白名单特权账户 [${currentUserEmail}] 发起推演，免除额度限制`);
    return;
  }

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

function getRequestedProfileId(req) {
  return req.body?.profile_id || req.query?.profile_id || '';
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
    console.warn('⚠️ 日运基础缓存写入失败:', error.message);
  }
}

function getTargetDate(req) {
  return req.body?.target_date || req.query?.target_date;
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return res.status(200).end();

  try {
    const user = await getAuthedUser(req, res);
    if (!user) return;

    const { bjTime, todayKey, secondsUntilMidnight, expiresAt } = getBeijingDayInfo(getTargetDate(req));
    const requestedProfileId = getRequestedProfileId(req);
    const periodKey = buildFortunePeriodKey(todayKey, requestedProfileId);
    const cached = await getCachedFortune(user.id, periodKey);
    if (cached?.core_shen_today && Array.isArray(cached.lucky_hour_zhis) && cached.wealth_officer_state) {
      console.log(`⚡️ 命中日运基础缓存 [${user.id}] ${periodKey}`);
      res.setHeader('Cache-Control', `s-maxage=${secondsUntilMidnight}, stale-while-revalidate`);
      return res.status(200).json(cached);
    }

    if (!cached) await enforceQuota(user);
    console.log(`☁️ ${cached ? '旧版缓存待补齐' : '缓存未命中'}，启动日运基础推演 [${user.id}] ${periodKey}`);

    const profile = await getProfileForFortune(user.id, requestedProfileId);
    const context = buildFortuneContext(profile, bjTime, todayKey);
    if (!context.scoreResult) {
      console.warn(`⚠️ 命理字段不完整，日运算分使用保底分 [${user.id}]`);
    } else {
      console.log(`🧮 纯 JS 算分完成 [${user.id}] 得分=${context.scoreResult.final_score}`);
    }

    const baseJson = buildBaseFortunePayload(context);
    await upsertFortuneCache(user.id, periodKey, baseJson, expiresAt);

    res.setHeader('Cache-Control', `s-maxage=${secondsUntilMidnight}, stale-while-revalidate`);
    return res.status(200).json(baseJson);
  } catch (error) {
    console.error('日运基础推演异常:', error);
    return res.status(error.statusCode || (error.message.includes('额度') ? 403 : 500)).json({
      error: error.message.includes('额度') ? error.message : '云端日运推演失败',
      details: error.message,
    });
  }
}
