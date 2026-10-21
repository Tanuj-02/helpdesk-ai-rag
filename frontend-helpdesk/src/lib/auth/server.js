import { cookies } from "next/headers"

import { sessionFromToken } from "@/lib/auth/jwt"

/**
 * Server-side session access for layouts and pages.
 *
 * Reads the same httpOnly cookie the BFF uses and rebuilds the session
 * directly, rather than making an HTTP call back into our own `/api/auth/session`
 * from a server component. One less round trip, and no dependence on the server
 * being able to reach its own hostname (which it cannot always, e.g. in a
 * container).
 *
 * Must be called from a server component, server action or route handler --
 * `cookies()` is async in Next.js 16.
 */

export const SESSION_COOKIE = "hd_token"
const NAME_COOKIE = "hd_name"

/**
 * @returns {Promise<import("@/lib/api/contract").Session | null>}
 */
export async function getServerSession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null

  const name = jar.get(NAME_COOKIE)?.value
  return sessionFromToken(token, { name: decodeURIComponent(name ?? "") })
}