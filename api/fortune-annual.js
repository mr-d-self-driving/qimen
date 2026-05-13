const { createClient } = require('@supabase/supabase-js');
const {
  buildAnnualFortunePeriodKey,
  buildAnnualRangePayload,
} = require('../lib/fortuneAnnualCore');
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

function getRequestedProfileId(req) {
  return req.body?.profile_id || req.query?.profile_id || '';
}

function getTargetYear(req) {
  return parseInt(req.body?.target_year || req.query?.target_year || new Date().getFullYear(), 10);
}

async function getProfileForFortune(userId, profileId) {
  let query = supabase
    .from('bazi_profiles')
    .select('id, name, gender, birth_date, bazi_str, bazi_detail, favorable_elements, unfavorable_elements, day_zhi, year_zhi, month_zhi, ri_zhu')
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

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return res.status(200).end();

  try {
    const user = await getAuthedUser(req, res);
    if (!user) return;

    const targetYear = getTargetYear(req);
    const requestedProfileId = getRequestedProfileId(req);
    
    // 我们暂时不在这里做数据库的 fortune_cache（缓存 21 年份有点大），前端会做 memory/localStorage 缓存
    const profile = await getProfileForFortune(user.id, requestedProfileId);
    const annualRangeJson = buildAnnualRangePayload(profile, targetYear, 10); // t-10 到 t+10
    
    // 设置强缓存，因为过去和未来不会变
    res.setHeader('Cache-Control', `s-maxage=86400, stale-while-revalidate`);
    return res.status(200).json(annualRangeJson);
  } catch (error) {
    console.error('年运推演异常:', error);
    return res.status(error.statusCode || 500).json({
      error: '云端年运推演失败',
      details: error.message,
    });
  }
}
