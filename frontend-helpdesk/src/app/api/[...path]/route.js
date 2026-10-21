import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { routeMock } from "@/lib/api/mock"
import { sessionFromToken } from "@/lib/auth/jwt"

/**
 * Backend-for-Frontend. The single door between the browser and `raghelpdesk`.
 *
 * Why one catch-all instead of 20 hand-written route handlers:
 *   - The browser can only ever reach same-origin `/api/*`, so there is no CORS
 *     preflight, no cross-origin cookie handling, and the backend host/port is
 *     never exposed to the client bundle.
 *   - The JWT lives in an httpOnly cookie, so script -- and therefore XSS --
 *     cannot read it. `src/proxy.js` reads it for routing only.
 *   - Every upstream wart (empty 403s, 500s on bad enum values, plain-string
 *     responses, leaked password hashes) is normalised in exactly one file.
 *
 * `/api/auth/session` and `/api/auth/logout` are BFF-only: the backend has no
 * equivalents (`GET /auth/me` 500s, and there is no logout endpoint), so they
 * are resolved locally from the token's claims. They live here rather than in a
 * sibling route file so that no other `/api/*` path can shadow the catch-all.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const COOKIE = "hd_token"
const API_MODE = process.env.HELPDESK_API_MODE ?? "mock"
const BASE_URL = (process.env.HELPDESK_API_URL ?? "http://localhost:8080").replace(/\/+$/, "")

/**
 * The per-ticket chat lives in a **separate** Spring service
 * (`ticketChatService`) with its own port and its own `/api/tickets/...`
 * surface. It is reached through the same-origin BFF under the `ticket-chat/`
 * prefix so the browser still never learns a backend host.
 */
const TICKET_CHAT_URL = (
  process.env.HELPDESK_TICKET_CHAT_URL ?? "http://localhost:8085"
).replace(/\/+$/, "")

const isMock = API_MODE !== "live"

function noStore(res) {
  res.headers.set("Cache-Control", "no-store")
  return res
}

/**
 * `NextResponse.json` rather than the global `Response.json`: only a
 * NextResponse carries a mutable `cookies` jar, and login needs to set the
 * session cookie on the very response it returns.
 */
function json(status, data) {
  return noStore(NextResponse.json(data, { status }))
}

/**
 * Spring Security rejects with 403 and a genuinely empty body, which the
 * browser reports as an opaque network failure. Every 403 gets a real message.
 */
function normalizeError(status) {
  const messages = {
    401: "Your session has ended. Please sign in again.",
    403: "You do not have access to this resource.",
    404: "That resource does not exist.",
  }
  return json(status, {
    status,
    message: messages[status] ?? "Something went wrong",
    timestamp: new Date().toISOString().slice(0, 23),
  })
}

/**
 * `POST /invitation/send` echoes the invite token and the inviter's nested
 * User, BCrypt hash included. Strip them so a bug on our side cannot turn into
 * a credential leak.
 */
function sanitizeInvitation(data) {
  if (!data || typeof data !== "object") return data
  const { token: _token, password: _password, user: _user, ...safe } = data
  return safe
}

/** Adapt the mock's async generator to a byte stream the client can read. */
function streamFromGenerator(generator) {
  const iterator = generator[Symbol.asyncIterator]()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next()
        if (done) {
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(value))
      } catch {
        controller.close()
      }
    },
    async cancel() {
      await iterator.return?.()
    },
  })
}

/**
 * `Secure` is correct in production but silently breaks local work: a Secure
 * cookie is dropped over plain `http`, which is how `next start` and the LAN
 * address are reached during development. `NODE_ENV === "production"` is true
 * for `next start` too, so it cannot be used as the signal on its own.
 * `.env.local` sets HELPDESK_COOKIE_SECURE=false for exactly this reason.
 */
function secureCookies() {
  const override = process.env.HELPDESK_COOKIE_SECURE
  if (override) return override === "true"
  return process.env.NODE_ENV === "production"
}

function cookieOptions(maxAge) {
  return { sameSite: "lax", secure: secureCookies(), path: "/", maxAge }
}

function setSessionCookie(res, token) {
  const maxAge = Number(process.env.HELPDESK_SESSION_MAX_AGE ?? 86_400)
  res.cookies.set(COOKIE, token, { ...cookieOptions(maxAge), httpOnly: true })
  return res
}

/**
 * The display name is not part of the JWT payload, so it is cached in a
 * readable cookie at login. It is presentational only -- every authorisation
 * decision comes from the signed token, never from here.
 */
function setNameCookie(res, name) {
  const maxAge = Number(process.env.HELPDESK_SESSION_MAX_AGE ?? 86_400)
  res.cookies.set("hd_name", encodeURIComponent(name), {
    ...cookieOptions(maxAge),
    httpOnly: false,
  })
  return res
}

async function handle(request, { params }) {
  const { path: segments } = await params
  const path = (segments ?? []).join("/")
  const requestUrl = new URL(request.url)
  const method = request.method.toUpperCase()

  const token = (await cookies()).get(COOKIE)?.value

  // --------------------------------------------- BFF-only local endpoints ---

  // SECURITY MODEL -- read before trusting anything here.
  //
  // This layer NEVER verifies the JWT signature; it has no access to the
  // signing secret and is not the place that enforces authorisation.
  //   * live mode: the real backend verifies HS256 and returns 403, which the
  //     branch below forwards verbatim. That rejection is the boundary.
  //   * mock mode: there is no secret, so a hand-crafted token with valid
  //     claims is accepted. That is acceptable only because mock mode serves
  //     fabricated data and is never deployed. Do not treat mock-mode success
  //     as evidence that authorisation is enforced.
  //
  // `src/proxy.js` is likewise a redirect convenience, not a control.

  if (path === "auth/session" && method === "GET") {
    // The display name is not a JWT claim, so it is stashed alongside the
    // token at login in a second, non-httpOnly cookie. Server-rendered and
    // client sessions therefore agree without another round trip.
    const name = (await cookies()).get("hd_name")?.value
    const session = sessionFromToken(token, { name: decodeURIComponent(name ?? "") })
    if (!session) return json(401, { message: "No active session" })
    return json(200, session)
  }

  if (path === "auth/logout" && method === "POST") {
    const res = json(200, { ok: true })
    res.cookies.delete(COOKIE)
    res.cookies.delete("hd_name")
    return res
  }

  if (path === "auth/active-users" && method === "GET") {
    // Demo helper: lists the seeded logins so the sign-in screen can offer
    // one-click role switching while the backend is unavailable.
    const { demoAccounts, DEMO_PASSWORD } = await import("@/lib/api/demo-accounts")
    return json(200, { accounts: demoAccounts, password: DEMO_PASSWORD })
  }

  if (path === "config" && method === "GET") {
    // Frontend-visible runtime config. `mode` lets the ticket chat choose its
    // transport (real WebSocket vs. the BFF-backed mock) without a second
    // build-time flag leaking to the client bundle.
    return json(200, {
      mode: isMock ? "mock" : "live",
      ticketChat: {
        // The socket is opened directly by the browser, so it needs an address.
        // Exposing a localhost/LAN host here is acceptable: it is not a secret
        // and the socket still authenticates on CONNECT.
        wsUrl: `${TICKET_CHAT_URL.replace(/^http/, "ws")}/ws`,
      },
    })
  }

  if (path === "ticket-chat/token" && method === "GET") {
    // SECURITY NOTE -- this is the one deliberate exception to "no component
    // ever sees a token". A browser WebSocket cannot carry the httpOnly cookie
    // on its handshake, and `ticketChatService` authenticates inside the STOMP
    // CONNECT frame, so page script must hold the bearer token to open a
    // socket. Same-origin only, and it reuses the existing session cookie --
    // there is no separate credential here.
    //
    // If the token sharing is not wanted, replace this with a cookie-authenticated
    // socket on the service side and delete the call in `src/lib/stomp.js`.
    if (!token) return json(401, { message: "No active session" })
    return json(200, { token })
  }

  // ------------------------------------------------------------ mock mode ---

  if (isMock) {
    const contentType = request.headers.get("content-type") ?? ""
    const isForm = contentType.includes("multipart/form-data")

    const result = await routeMock({
      method,
      path,
      query: requestUrl.searchParams,
      body:
        method === "GET" || method === "HEAD" || isForm
          ? undefined
          : await request.json().catch(() => ({})),
      formData: isForm ? await request.formData() : null,
      token,
    })

    if (result.stream) {
      return noStore(
        new Response(streamFromGenerator(result.stream), {
          status: result.status,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        }),
      )
    }

    if (result.empty) {
      if (result.status === 403) return normalizeError(403)
      return noStore(new Response(null, { status: result.status }))
    }

    if (result.text !== undefined) {
      return noStore(
        new Response(result.text, {
          status: result.status,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
      )
    }

    const raw = path === "invitation/send" ? sanitizeInvitation(result.json) : result.json
    const loggedIn = path === "auth/login" && result.status === 200 && raw?.token

    // The token goes into an httpOnly cookie and is stripped from the body, so
    // it is never readable by page script. The display name is kept in a
    // readable cookie because it is not a JWT claim and the UI needs it.
    const payload = loggedIn
      ? {
          role: raw.role,
          userId: raw.userId,
          companyId: raw.companyId,
          name: raw.name,
          email: raw.email,
        }
      : raw

    const res = json(result.status, payload)

    if (loggedIn) {
      setSessionCookie(res, raw.token)
      setNameCookie(res, raw.name ?? "")
    }

    return res
  }

  // ------------------------------------------------------------ live mode ---

  // Per-ticket chat is a different service; everything else is `raghelpdesk`.
  // The `ticket-chat/` prefix is stripped and replaced with the service's own
  // `/api` root, so `/api/ticket-chat/tickets/7/messages` becomes
  // `{TICKET_CHAT_URL}/api/tickets/7/messages`.
  const isTicketChat = path === "ticket-chat" || path.startsWith("ticket-chat/")
  const upstreamRoot = isTicketChat ? TICKET_CHAT_URL : BASE_URL
  const target = new URL(
    isTicketChat
      ? `${TICKET_CHAT_URL}/api${path.slice("ticket-chat".length)}`
      : `${BASE_URL}/${path}`,
  )
  target.search = requestUrl.search

  const headers = new Headers()
  const passthrough = ["accept", "accept-language", "content-language"]
  for (const name of passthrough) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (token) headers.set("Authorization", `Bearer ${token}`)

  let body
  const contentType = request.headers.get("content-type") ?? ""
  if (method !== "GET" && method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      // Let fetch generate the multipart boundary for us.
      body = await request.formData()
    } else if (contentType.includes("application/json")) {
      headers.set("content-type", "application/json")
      body = JSON.stringify(await request.json().catch(() => ({})))
    } else {
      body = await request.text()
    }
  }

  let upstream
  try {
    upstream = await fetch(target, { method, headers, body, redirect: "manual", cache: "no-store" })
  } catch (error) {
    return json(502, {
      status: 502,
      message:
        process.env.NODE_ENV === "development"
          ? `Cannot reach the helpdesk service at ${upstreamRoot}: ${error.message}`
          : "The helpdesk service is unavailable. Please try again.",
      timestamp: new Date().toISOString().slice(0, 23),
    })
  }

  if (upstream.status === 403) {
    // Do NOT await this. Cancelling a body of a Next-patched `fetch` response
    // can deadlock in dev, and the normalised 403 would then never be sent --
    // the request hangs until the client times out. Fire and forget instead;
    // the upstream connection is still released.
    upstream.body?.cancel().catch(() => {})
    return normalizeError(403)
  }

  const isLogin = path === "auth/login" && upstream.status === 200
  const isInvitation = path === "invitation/send" && upstream.ok

  if (isLogin || isInvitation) {
    const data = await upstream.json().catch(() => null)
    const payload = isInvitation ? sanitizeInvitation(data) : data

    // Same token-stripping contract as mock mode.
    const body =
      isLogin && data?.token
        ? {
            role: data.role,
            userId: data.userId,
            companyId: data.companyId,
            name: data.name,
            email: data.email,
          }
        : payload

    const res = json(upstream.status, body)

    if (isLogin && data?.token) {
      setSessionCookie(res, data.token)
      setNameCookie(res, data.name ?? "")
    }

    return res
  }

  // Stream everything else through untouched; this covers the Flux<String>
  // SSE/text stream from GET /ai/chat.
  return noStore(
    new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    }),
  )
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE }