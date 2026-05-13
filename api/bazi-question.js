const { createClient } = require('@supabase/supabase-js');
const { setCorsHeaders } = require('./cors');
const { normalizeDivinationRoute } = require('../lib/divinationCategories');
const {
  buildBaziQuestionPrompt,
  normalizeBaziQuestionOutput
} = require('../lib/baziQuestionCore');

const API_URL = 'https://yinli.one/v1/chat/completions';
const LLM_TIMEOUT_MS = 90 * 1000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseJsonContent(content = '') {
  const cleaned = String(content || '').replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = async function handler(req, res) {
  if (setCorsHeaders(req, res, 'Content-Type, Authorization')) return res.status(200).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const question = String(req.body?.question || '').trim();
    const profileId = String(req.body?.profileId || '').trim();
    const route = normalizeDivinationRoute(req.body?.route || { branch: 'bazi', category: 'general' });

    if (!question) return res.status(400).json({ error: '问题不能为空' });
    if (!profileId) return res.status(400).json({ error: '缺少八字档案 ID' });

    const { data: profile, error: profileError } = await supabase
      .from('bazi_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) return res.status(404).json({ error: '档案不存在' });
    if (profile.user_id !== user.id) return res.status(403).json({ error: '无权操作该档案' });
    if (!profile.bazi_detail || !profile.bazi_str) {
      return res.status(400).json({
        error: '该档案缺少完整八字排盘数据，请先在八字页完成命盘推演',
        code: 'BAZI_PROFILE_INCOMPLETE'
      });
    }

    const prompt = buildBaziQuestionPrompt({ profile, question, route });
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gemini-3.1-pro-preview',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.65
      })
    }, LLM_TIMEOUT_MS);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM接口返回错误 (${response.status}): ${errText.substring(0, 120)}`);
    }

    const apiData = await response.json();
    const rawOutput = parseJsonContent(apiData.choices?.[0]?.message?.content || '{}');
    const output = normalizeBaziQuestionOutput(rawOutput, { question, route });

    return res.status(200).json(output);
  } catch (error) {
    console.error('[BaziQuestion]', error);
    return res.status(error.name === 'AbortError' ? 504 : 500).json({
      error: '八字问答生成失败',
      details: error.message
    });
  }
};

module.exports.parseJsonContent = parseJsonContent;
