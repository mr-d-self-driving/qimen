/**
 * POST /auth/signout
 *
 * Clears the durable refresh-token cookie. Called by the SPA on sign-out.
 */
import { buildClearCookie, json } from './_shared.js'

export async function onRequestPost() {
  return json({ ok: true }, { cookie: buildClearCookie() })
}
