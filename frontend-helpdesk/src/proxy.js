import { NextResponse } from "next/server"

/**
 * Route guard.
 *
 * NOTE: `middleware.js` is DEPRECATED in Next.js 16 -- this file must be named
 * `proxy.js` and must export a function called `proxy`. It lives at `src/`
 * level, beside `app/`.
 *
 * Per the Next.js docs, proxy is invoked separately from render code and may
 * be deployed to a CDN, so it must NOT rely on shared modules or globals.
 * Everything it needs is therefore inlined below rather than imported.
 *
 * This guard only checks for the *presence* of the session cookie. It cannot
 * validate the signature, and it does not need to: real verification happens
 * server-side in the BFF route handlers, which reject a forged or expired
 * token with a 403. This layer exists purely to avoid flashing protected UI at
 * an unauthenticated visitor and to send them to `/login` with a return path.
 */

/** Duplicated from the BFF on purpose -- see the note above. */
const COOKIE = "hd_token"

/** Routes reachable without a session. */
const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/register-company", "/accept-invite"])

/**
 * Paths restricted to specific roles, enforced again by the backend. Keeping
 * them here too just keeps the nav honest -- it is not a security boundary.
 *   /admin      -> ADMIN
 *   /agent      -> AGENT
 *   /tickets    -> all roles
 */
const ROLE_RULES = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/agent", roles: ["AGENT"] },
]

function readRole(token) {
  try {
    const segment = token.split(".")[1]
    if (!segment) return null
    const json = Buffer.from(
      segment.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8")
    return JSON.parse(json)?.role ?? null
  } catch {
    return null
  }
}

export function proxy(request) {
  const { pathname, search } = request.nextUrl

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "https://tweakcn.com",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Private-Network": "true",
        "Access-Control-Max-Age": "600",
      },
    })
  }

  if (pathname.startsWith("/api/")) return NextResponse.next()
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  const token = request.cookies.get(COOKIE)?.value

  if (!token) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(login)
  }

  // Expired tokens are signed out locally; there is no refresh endpoint.
  if (readExpiry(token) * 1000 < Date.now()) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", `${pathname}${search}`)
    const res = NextResponse.redirect(login)
    res.cookies.delete(COOKIE)
    return res
  }

  const rule = ROLE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
  if (rule && !rule.roles.includes(readRole(token))) {
    return NextResponse.redirect(new URL("/tickets", request.url))
  }

  return NextResponse.next()
}

function readExpiry(token) {
  try {
    const json = Buffer.from(
      (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8")
    return Number(JSON.parse(json)?.exp ?? 0)
  } catch {
    return 0
  }
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   api        - the BFF handles its own auth
     *   _next      - build assets
     *   public files / image optimisation / favicon
     *   any path containing a dot (static assets)
     * Excluding these is mandatory; running cookie logic on them breaks CSS
     * and chunk loading.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}