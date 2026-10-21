/**
 * JWT helpers.
 *
 * The backend signs with HS256 and the payload carries `sub`, `userId`,
 * `companyId` and `role`. We decode only -- verification always happens
 * server-side in the BFF. Nothing here is a security boundary.
 */

/**
 * Decode the payload of a JWT without verifying its signature.
 *
 * @param {string | null | undefined} token
 * @returns {Record<string, unknown> | null} the claims, or null if undecodable
 */
export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null

  const parts = token.split(".")
  if (parts.length !== 3) return null

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8")

    const claims = JSON.parse(json)
    return typeof claims === "object" && claims !== null ? claims : null
  } catch {
    // A malformed or truncated token must never throw into a render path.
    return null
  }
}

/**
 * Build the session the app runs on, from a stored token plus the display
 * name captured at login (the JWT itself carries no name claim).
 *
 * @param {string | null | undefined} token
 * @param {{ name?: string }} [meta] display name captured from LoginResponse
 * @returns {import("@/lib/api/contract").Session | null}
 */
export function sessionFromToken(token, meta = {}) {
  const claims = decodeJwt(token)
  if (!claims) return null

  const { userId, companyId, role, exp } = claims
  if (typeof userId !== "number" || typeof companyId !== "number" || !role) {
    return null
  }

  return {
    userId,
    companyId,
    role,
    email: typeof claims.sub === "string" ? claims.sub : "",
    exp: typeof exp === "number" ? exp : 0,
    name: meta.name ?? "",
  }
}

/**
 * The backend issues 24h tokens with no refresh and no revocation endpoint.
 * Treat an expired token as logged-out rather than waiting for a 403.
 *
 * @param {import("@/lib/api/contract").Session | null} session
 * @param {number} [skewSeconds] clock-skick allowance
 * @returns {boolean}
 */
export function isSessionExpired(session, skewSeconds = 30) {
  if (!session) return true
  if (!session.exp) return false
  return Date.now() / 1000 > session.exp - skewSeconds
}