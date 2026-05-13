const PRODUCTION_ORIGINS = [
  'https://qimendao.com',
  'https://www.qimendao.com',
];

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function getAllowedOrigins() {
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const localOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  return [...new Set([...configuredOrigins, ...PRODUCTION_ORIGINS, ...localOrigins])];
}

function resolveAllowedOrigin(req) {
  const requestOrigin = normalizeOrigin(req.headers.origin);
  const allowedOrigins = getAllowedOrigins();

  if (process.env.FRONTEND_URL === '*') return '*';
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0] || '*';
}

function setCorsHeaders(req, res, allowedHeaders = 'Content-Type, Authorization') {
  res.setHeader('Access-Control-Allow-Origin', resolveAllowedOrigin(req));
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders);

  return req.method === 'OPTIONS';
}

module.exports = {
  setCorsHeaders,
};
