/**
 * POST /auth/set   body: { refresh_token: string }
 *
 * Called by the SPA right after any successful sign-in / token refresh to mirror
 * the current refresh token into the durable HttpOnly cookie.
 */
import { buildSetCookie, json } from './_shared.js'

export async function onRequestPost({ request }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const refreshToken = body && typeof body.refresh_token === 'string' ? body.refresh_token : ''
  if (!refreshToken) return json({ ok: false, error: 'missing_refresh_token' }, { status: 400 })

  return json({ ok: true }, { cookie: buildSetCookie(refreshToken) })
}
