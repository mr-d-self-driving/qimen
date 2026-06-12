/**
 * GET /auth/me
 *
 * Reads the HttpOnly refresh-token cookie, exchanges it for a fresh session, and
 * returns the user plus fresh tokens so the SPA can restore an in-memory session
 * after localStorage was evicted (iOS/Safari ITP) or in a fresh PWA storage jar.
 *
 * Always 200. `{ user: null }` means "not logged in" — not an error — so the SPA
 * can quietly fall back to its normal guest/landing state.
 */
import { readCookie, refreshSession, buildSetCookie, buildClearCookie, json, COOKIE_NAME } from './_shared.js'

export async function onRequestGet({ request, env }) {
  const refreshToken = readCookie(request, COOKIE_NAME)
  if (!refreshToken) return json({ user: null })

  const session = await refreshSession(env, refreshToken)
  if (!session) {
    // Token expired/rotated/revoked — clear the stale cookie.
    return json({ user: null }, { cookie: buildClearCookie() })
  }

  // Rotate: persist the new refresh token and reset the cookie's lifetime.
  return json(
    {
      user: session.user || null,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    },
    { cookie: buildSetCookie(session.refresh_token) },
  )
}
