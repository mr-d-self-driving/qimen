const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

module.exports = async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*'
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    const { profileId, prompt } = req.body
    if (!profileId || !prompt) {
      return res.status(400).json({ error: '缺少 profileId 或 prompt' })
    }

    const { data: profile } = await supabase
      .from('bazi_profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .single()

    if (!profile || profile.user_id !== user.id) {
      return res.status(403).json({ error: '无权操作该档案' })
    }

    const llmRes = await fetch('https://yinli.one/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemini-3.1-pro-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!llmRes.ok) {
      const errText = await llmRes.text()
      console.error('LLM 校准接口异常:', llmRes.status, errText)
      return res.status(502).json({ error: '上游大模型接口故障' })
    }

    const apiData = await llmRes.json()
    if (apiData.error) throw new Error(apiData.error.message || JSON.stringify(apiData.error))

    const rawText = apiData.choices[0].message.content
      .replace(/```json/g, '').replace(/```/g, '').trim()

    const result = JSON.parse(rawText)

    if (!result.yuanju_core || !result.current_dayun || !result.current_liunian) {
      return res.status(500).json({ error: 'LLM 返回格式不符预期' })
    }

    const { error: dbError } = await supabase
      .from('bazi_profiles')
      .update({
        calibrated_yuanju_core: result.yuanju_core,
        calibrated_current_dayun: result.current_dayun,
        calibrated_current_liunian: result.current_liunian,
        calibrated_at: new Date().toISOString(),
      })
      .eq('id', profileId)

    if (dbError) throw dbError

    return res.status(200).json({
      yuanju_core: result.yuanju_core,
      current_dayun: result.current_dayun,
      current_liunian: result.current_liunian,
    })
  } catch (error) {
    console.error('深度校准异常:', error)
    return res.status(500).json({ error: error.message || '深度校准失败' })
  }
}
