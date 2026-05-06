const test = require('node:test');
const assert = require('node:assert/strict');
const { handler, normalizeAfdianWebhookPayload } = require('./afdian-webhook');

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test('normalizeAfdianWebhookPayload extracts the supported order fields', () => {
  const result = normalizeAfdianWebhookPayload({
    ec: 200,
    em: 'ok',
    data: {
      type: 'order',
      order: {
        out_trade_no: '202106232138371083454010626',
        user_id: 'adf397fe8374811eaacee52540025c377',
        plan_id: 'a45353328af911eb973052540025c377',
        month: 1,
        total_amount: '5.00',
        show_amount: '5.00',
        status: 2,
      },
    },
  });

  assert.deepEqual(result, {
    type: 'order',
    out_trade_no: '202106232138371083454010626',
    user_id: 'adf397fe8374811eaacee52540025c377',
    plan_id: 'a45353328af911eb973052540025c377',
    month: 1,
    total_amount: '5.00',
    show_amount: '5.00',
    status: 2,
  });
});

test('handler acknowledges afdian webhook posts with the required json shape', async () => {
  const req = {
    method: 'POST',
    headers: {},
    body: {
      data: {
        type: 'order',
        order: {
          out_trade_no: '202106232138371083454010626',
          total_amount: '5.00',
          status: 2,
        },
      },
    },
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ec: 200, em: '' });
});

test('handler still returns json for unsupported methods', async () => {
  const req = { method: 'GET', headers: {}, body: null };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { ec: 405, em: 'Method Not Allowed' });
});
