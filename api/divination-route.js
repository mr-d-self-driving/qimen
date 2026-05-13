const { setCorsHeaders } = require('./cors');
const { classifyDivinationQuestion } = require('../lib/divinationRouter');

module.exports = async function handler(req, res) {
  if (setCorsHeaders(req, res, 'Content-Type, Authorization, X-Guest-Id')) return res.status(200).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const question = String(req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: '问题不能为空' });

    const route = await classifyDivinationQuestion({
      question,
      llmFallback: true
    });

    return res.status(200).json(route);
  } catch (error) {
    console.error('[DivinationRoute]', error);
    return res.status(500).json({ error: '分类路由失败', details: error.message });
  }
};
