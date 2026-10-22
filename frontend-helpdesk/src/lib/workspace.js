/**
 * Tenant identity, derived from data the session already carries.
 *
 * The session exposes `companyId`, `email` and `role`. It does NOT carry the
 * company's display name -- `Company.name` exists in the backend but is not
 * on the JWT, and `GET /auth/me` upstream is broken, so the BFF never sees
 * it.
 *
 * Until the backend adds `companyName` to the session, use the email domain
 * for company-owned domains and the tenant id for public email providers.
 * A Gmail address identifies a person, not their company.
 */

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
])

/**
 * The tenant slug, e.g. `acme.com`.
 *
 * Falls back to the numeric company id when the email has no domain (which
 * happens only for malformed accounts).
 *
 * @param {{ email?: string, companyId?: number } | null | undefined} session
 * @returns {string}
 */
export function workspaceSlug(session) {
  const domain = String(session?.email ?? "")
    .split("@")
    .pop()
    ?.trim()
    .toLowerCase()

  if (domain && domain.includes(".") && !PERSONAL_EMAIL_DOMAINS.has(domain)) return domain
  return `workspace-${session?.companyId ?? "unknown"}`
}

/**
 * A human-readable workspace name, e.g. `Acme`.
 *
 * The first label of the domain, capitalised. Short enough to sit in a
 * sidebar without truncating, and unambiguous next to the id in a tooltip.
 *
 * @param {{ email?: string, companyId?: number } | null | undefined} session
 * @returns {string}
 */
export function workspaceName(session) {
  const slug = workspaceSlug(session)
  if (slug.startsWith("workspace-")) return `Workspace ${slug.slice("workspace-".length)}`
  const label = slug.split(".")[0]
  if (!label) return slug
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * One or two characters for the workspace avatar.
 *
 * @param {{ email?: string, companyId?: number } | null | undefined} session
 * @returns {string}
 */
export function workspaceInitials(session) {
  const name = workspaceName(session)
  if (!name || name.startsWith("Workspace ")) return "W"
  return name.slice(0, 2).toUpperCase()
}

/**
 * Initials for a person.
 *
 * @param {string | null | undefined} name
 * @param {string | null | undefined} email
 * @returns {string}
 */
export function personInitials(name, email) {
  const source = String(name ?? "").trim() || String(email ?? "").split("@")[0] || "?"
  return (
    source
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}
