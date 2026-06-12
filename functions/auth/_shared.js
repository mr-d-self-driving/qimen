/**
 * Shared helpers for the cookie-session auth endpoints (Cloudflare Pages Functions).
 *
 * Why this exists: the SPA stores its Supabase session in localStorage, which iOS
 * Safari (ITP) evicts after a short window — so users get logged out frequently.
 * These endpoints mirror the refresh token into a *server-set HttpOnly cookie*,
 * which is NOT subject to the 7-day script-storage cap. On the next visit the SPA
 * restores the session from this cookie even after localStorage was wiped.
 *
 * Files starting with "_" are not routed by Pages; they can only be imported.
 */

// Public values — identical to src/lib/supabase.mjs. The anon/publishable key is
// safe to ship to the client, so hardcoding it here matches the existing setup.
// Allow env overrides so preview/staging projects can point elsewhere.
export const getConfig = (env = {}) => ({
  url: env.SUPABASE_URL || 'https://xkbqiiwwgfzkyfhxuoev.supabase.co',
  anonKey: env.SUPABASE_ANON_KEY || 'sb_publishable_qr9YBIA6n32r-mcqKbkpgA_0XVTUSI7',
})

export const COOKIE_NAME = 'qd_rt'
// 400 days — the longest a browser will honor (Chrome caps here; Safari honors
// long max-age for server-set cookies). Re-set on every visit, so it never lapses
// for active users.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400

/** Read a single cookie value from the request's Cookie header. */
export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || ''
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return ''
}

/** Build a Set-Cookie string that persists the refresh token (HttpOnly, Secure). */
export function buildSetCookie(value) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
  ].join('; ')
}

/** Build a Set-Cookie string that clears the refresh-token cookie. */
export function buildClearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

/** JSON response helper, optionally attaching a Set-Cookie header. */
export function json(body, { status = 200, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  if (cookie) headers['Set-Cookie'] = cookie
  return new Response(JSON.stringify(body), { status, headers })
}

/**
 * Exchange a refresh token for a fresh session via the GoTrue token endpoint.
 * Returns the parsed session on success, or null on any failure (expired/rotated/
 * revoked token). No SDK dependency — a single fetch keeps the function tiny.
 */
export async function refreshSession(env, refreshToken) {
  const { url, anonKey } = getConfig(env)
  let res
  try {
    res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  if (!data || !data.access_token || !data.refresh_token) return null
  return data
}
