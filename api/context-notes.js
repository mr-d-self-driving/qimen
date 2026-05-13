const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders } = require('../lib/cors');
const {
  createEmptyMonthlyContext,
  createEmptyProfileContext,
  normalizeMonthlyContextPayload,
  normalizeProfileContextPayload,
} = require('../lib/fortuneContextNotes');

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

function getScope(req) {
  return String(req.body?.scope || req.query?.scope || 'profile').trim().toLowerCase();
}

function getProfileId(req) {
  return String(req.body?.profile_id || req.query?.profile_id || '').trim();
}

function getMonthKey(req) {
  return String(req.body?.month_key || req.query?.month_key || '').trim();
}

async function assertProfileOwnership(userId, profileId) {
  const { data, error } = await supabase
    .from('bazi_profiles')
    .select('id')
    .eq('id', profileId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    const notFound = new Error('未找到命主档案');
    notFound.statusCode = 404;
    throw notFound;
  }
}

async function getProfileContext(profileId) {
  const { data, error } = await supabase
    .from('profile_contexts')
    .select('profile_id, career_profile, wealth_profile, love_profile, health_profile, updated_at')
    .eq('profile_id', profileId)
    .single();

  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    throw error;
  }

  return normalizeProfileContextPayload(data || createEmptyProfileContext());
}

async function upsertProfileContext(profileId, payload) {
  const normalized = normalizeProfileContextPayload(payload);
  const { error } = await supabase
    .from('profile_contexts')
    .upsert({
      profile_id: profileId,
      career_profile: normalized.career_profile,
      wealth_profile: normalized.wealth_profile,
      love_profile: normalized.love_profile,
      health_profile: normalized.health_profile,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'profile_id',
    });

  if (error && error.code === '42P01') {
    const missing = new Error('断事笔记数据表尚未初始化');
    missing.statusCode = 503;
    throw missing;
  }
  if (error) throw error;
  return getProfileContext(profileId);
}

async function getMonthlyContext(profileId, monthKey) {
  const { data, error } = await supabase
    .from('monthly_context_logs')
    .select('profile_id, month_key, carry_from_previous, overall_note, career_monthly, wealth_monthly, love_monthly, health_monthly, updated_at')
    .eq('profile_id', profileId)
    .eq('month_key', monthKey)
    .single();

  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    throw error;
  }

  const record = normalizeMonthlyContextPayload(data || createEmptyMonthlyContext(monthKey), monthKey);
  const { data: recentData, error: recentError } = await supabase
    .from('monthly_context_logs')
    .select('month_key, carry_from_previous, overall_note, career_monthly, wealth_monthly, love_monthly, health_monthly, updated_at')
    .eq('profile_id', profileId)
    .order('month_key', { ascending: false })
    .limit(3);

  if (recentError && recentError.code === '42P01') {
    return { record, recent_records: [] };
  }
  if (recentError) throw recentError;

  return {
    record,
    recent_records: Array.isArray(recentData)
      ? recentData.map(item => normalizeMonthlyContextPayload(item || {}, item?.month_key || ''))
      : [],
  };
}

async function upsertMonthlyContext(profileId, monthKey, payload) {
  const normalized = normalizeMonthlyContextPayload(payload, monthKey);
  const { error } = await supabase
    .from('monthly_context_logs')
    .upsert({
      profile_id: profileId,
      month_key: normalized.month_key,
      carry_from_previous: normalized.carry_from_previous,
      overall_note: normalized.overall_note,
      career_monthly: normalized.career_monthly,
      wealth_monthly: normalized.wealth_monthly,
      love_monthly: normalized.love_monthly,
      health_monthly: normalized.health_monthly,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'profile_id,month_key',
    });

  if (error && error.code === '42P01') {
    const missing = new Error('断事笔记数据表尚未初始化');
    missing.statusCode = 503;
    throw missing;
  }
  if (error) throw error;
  return getMonthlyContext(profileId, monthKey);
}

export default async function handler(req, res) {
  if (setCorsHeaders(req, res)) return res.status(200).end();

  try {
    const user = await getAuthedUser(req, res);
    if (!user) return;

    const profileId = getProfileId(req);
    if (!profileId) {
      return res.status(400).json({ error: '缺少 profile_id' });
    }

    await assertProfileOwnership(user.id, profileId);

    const scope = getScope(req);
    if (scope !== 'profile' && scope !== 'monthly') {
      return res.status(400).json({ error: '不支持的断事笔记范围' });
    }

    if (req.method === 'GET') {
      if (scope === 'profile') {
        return res.status(200).json({ scope, data: await getProfileContext(profileId) });
      }
      const monthKey = getMonthKey(req);
      if (!monthKey) return res.status(400).json({ error: '缺少 month_key' });
      return res.status(200).json({ scope, ...(await getMonthlyContext(profileId, monthKey)) });
    }

    if (req.method === 'POST') {
      if (scope === 'profile') {
        return res.status(200).json({ scope, data: await upsertProfileContext(profileId, req.body?.data || {}) });
      }
      const monthKey = getMonthKey(req);
      if (!monthKey) return res.status(400).json({ error: '缺少 month_key' });
      return res.status(200).json({ scope, ...(await upsertMonthlyContext(profileId, monthKey, req.body?.data || {})) });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('断事笔记接口异常:', error);
    return res.status(error.statusCode || 500).json({
      error: '断事笔记处理失败',
      details: error.message,
    });
  }
}
