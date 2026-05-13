const test = require('node:test');
const assert = require('node:assert/strict');
const { setCorsHeaders } = require('./cors');

function createMockResponse() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
  };
}

test('setCorsHeaders allows the apex production domain', () => {
  const req = {
    method: 'OPTIONS',
    headers: {
      origin: 'https://qimendao.com',
    },
  };
  const res = createMockResponse();

  assert.equal(setCorsHeaders(req, res), true);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://qimendao.com');
  assert.equal(res.headers.Vary, 'Origin');
});

test('setCorsHeaders allows the www production domain', () => {
  const req = {
    method: 'OPTIONS',
    headers: {
      origin: 'https://www.qimendao.com',
    },
  };
  const res = createMockResponse();

  assert.equal(setCorsHeaders(req, res), true);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://www.qimendao.com');
});

test('setCorsHeaders normalizes configured domains with trailing slash', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = 'https://qimen-oceanjustinlin.vercel.app/';

  const req = {
    method: 'POST',
    headers: {
      origin: 'https://qimen-oceanjustinlin.vercel.app',
    },
  };
  const res = createMockResponse();

  try {
    assert.equal(setCorsHeaders(req, res), false);
    assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://qimen-oceanjustinlin.vercel.app');
  } finally {
    if (originalFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = originalFrontendUrl;
    }
  }
});
