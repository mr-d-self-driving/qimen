/**
 * Cookie-session durability layer (client side).
 *
 * The Supabase session lives in localStorage as usual, but iOS/Safari (ITP) evicts
 * localStorage after a short window, logging users out. To survive that, we mirror
 * the refresh token into a server-set HttpOnly cookie via the /auth/* Pages
 * Functions, and restore the session from it on boot when localStorage is empty.
 *
 * Everything here is fail-soft: if the /auth/* endpoints are unreachable, the app
 * behaves exactly as before (localStorage-only). It never throws into the caller.
 *
 * Note: /auth/* is always SAME-ORIGIN (served by Cloudflare Pages Functions), so
 * we must NOT prefix it with VITE_API_BASE (which points at the separate worker).
 */
import { supabase } from '../lib/supabase.mjs'

const ME_URL = '/auth/me'
const SET_URL = '/auth/set'
const SIGNOUT_URL = '/auth/signout'

/** Mirror the current session's refresh token into the durable HttpOnly cookie. */
export async function pushSession(session) {
  try {
    const refresh_token = session?.refresh_token
    if (!refresh_token) return
    await fetch(SET_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    })
  } catch {
    /* fail-soft: cookie mirroring is best-effort */
  }
}

/** Clear the durable cookie (on sign-out). */
export async function clearServerSession() {
  try {
    await fetch(SIGNOUT_URL, { method: 'POST', credentials: 'include' })
  } catch {
    /* fail-soft */
  }
}

/**
 * Restore an in-memory session from the durable cookie. Call on boot when
 * localStorage has no session. Returns the user on success, else null.
 */
export async function restoreSession() {
  try {
    const res = await fetch(ME_URL, { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!data || !data.user || !data.access_token || !data.refresh_token) return null
    const { error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    if (error) return null
    return data.user
  } catch {
    return null
  }
}

/**
 * Register the auth-state listener that keeps the durable cookie in sync with the
 * Supabase session. Re-setting the cookie on every visit (INITIAL_SESSION) resets
 * the cookie's lifetime, so it never lapses for active users.
 */
export function installSessionSync() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && (
      event === 'INITIAL_SESSION' ||
      event === 'SIGNED_IN' ||
      event === 'TOKEN_REFRESHED' ||
      event === 'USER_UPDATED'
    )) {
      pushSession(session)
    } else if (event === 'SIGNED_OUT') {
      clearServerSession()
    }
  })
}
