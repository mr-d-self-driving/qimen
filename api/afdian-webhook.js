const { setCorsHeaders } = require('./cors');

function normalizeAfdianWebhookPayload(payload = {}) {
  const data = payload.data || {};
  const order = data.order || {};

  return {
    type: data.type || '',
    out_trade_no: order.out_trade_no || '',
    user_id: order.user_id || '',
    plan_id: order.plan_id || '',
    month: order.month ?? null,
    total_amount: order.total_amount || '',
    show_amount: order.show_amount || '',
    status: order.status ?? null,
  };
}

async function handler(req, res) {
  if (setCorsHeaders(req, res)) return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ec: 405, em: 'Method Not Allowed' });
  }

  const event = normalizeAfdianWebhookPayload(req.body || {});
  console.log('爱发电 Webhook:', event);

  return res.status(200).json({ ec: 200, em: '' });
}

module.exports = handler;
module.exports.handler = handler;
module.exports.normalizeAfdianWebhookPayload = normalizeAfdianWebhookPayload;
