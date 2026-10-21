/**
 * The only module in the app that performs network I/O.
 *
 * Every call is same-origin against the BFF (`/api/...`). No component ever
 * sees a token, a backend host, or a port -- that is the entire point of the
 * BFF layer.
 */

import { ROLE, TICKET_LIST_ENDPOINT } from "@/lib/constants"

/**
 * A normalised error. Every failure the UI can encounter -- BFF rejection,
 * upstream 500, offline browser -- arrives as one of these, so screens need a
 * single `catch` shape instead of guessing at shapes.
 */
export class ApiError extends Error {
  /**
   * @param {string} message human-readable, safe to render
   * @param {{ status?: number, path?: string, body?: unknown }} [options]
   */
  constructor(message, { status = 0, path = "", body = null } = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.path = path
    this.body = body
  }

  /** True when the user simply needs to sign in again. */
  get isAuthError() {
    return this.status === 401 || this.status === 403
  }

  /** True when the backend is unreachable or erroring, not the user's fault. */
  get isServerError() {
    return this.status >= 500 || this.status === 0
  }
}

/**
 * @param {string} path backend path without the `/api` prefix, e.g. `ticket/my-tickets`
 * @param {RequestInit & { query?: Record<string, string | number | undefined | null> }} [options]
 * @returns {Promise<any>}
 */
async function request(path, options = {}) {
  const { query, headers, ...rest } = options

  const url = new URL(`/api/${path}`, typeof window === "undefined" ? "http://localhost" : window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }

  let response
  try {
    response = await fetch(url, {
      credentials: "same-origin",
      ...rest,
      headers: {
        Accept: "application/json",
        // Only tag JSON when the body is a serialised string. Multipart
        // uploads must NOT set Content-Type here -- the browser has to append
        // its own boundary or the server cannot parse the part.
        ...(typeof rest.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
    })
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and try again.", {
      path,
    })
  }

  if (response.status === 204) return null

  const contentType = response.headers.get("content-type") ?? ""
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "")

  if (!response.ok) {
    throw new ApiError(payload?.message || `Request failed (${response.status})`, {
      status: response.status,
      path,
      body: payload,
    })
  }

  return payload
}

/** BFF-local session derived from the httpOnly cookie's JWT claims. */
export async function getSession() {
  return request("auth/session")
}

export async function logout() {
  return request("auth/logout", { method: "POST" })
}

export async function login(credentials) {
  return request("auth/login", { method: "POST", body: JSON.stringify(credentials) })
}

export async function registerCompany(payload) {
  return request("auth/register-company", { method: "POST", body: JSON.stringify(payload) })
}

export async function register(payload) {
  return request("auth/register", { method: "POST", body: JSON.stringify(payload) })
}

/** Mock-only; used for the one-click role switcher on the sign-in screen. */
export async function getDemoAccounts() {
  return request("auth/active-users")
}

// ------------------------------------------------------------------ tickets --

/**
 * The backend has three separate list endpoints with different visibility.
 * The right one is derived from the signed-in role, so callers never guess.
 *
 * Takes the role rather than the whole session so callers can use it as a
 * dependency without re-fetching whenever a new session object is allocated.
 *
 * @param {string} role one of ADMIN | AGENT | EMPLOYEE
 * @param {{ page?: number, size?: number }} [params]
 */
export function listTickets(role, params = {}) {
  const endpoint = TICKET_LIST_ENDPOINT[role]
  if (!endpoint) {
    throw new ApiError(`No ticket list exists for role ${role}`, { path: "ticket" })
  }
  return request(`ticket/${endpoint}`, {
    query: { page: params.page ?? 0, size: params.size ?? 20, sort: "createdAt,desc" },
  })
}

/**
 * Look up a single ticket by id.
 *
 * Prefers the dedicated `GET /ticket/{id}` endpoint. It is restricted to the
 * ticket's owner, its assignee, or an admin, so when that lookup is refused
 * (a 400/403/404) this falls back to resolving the id against the role's own
 * paginated list. Consequences of the fallback:
 *
 *   - Visibility is still enforced: an employee asking for someone else's
 *     ticket simply will not find it, because it is absent from their list.
 *   - The fallback search is bounded to a few pages. A ticket far down a large
 *     company's list will report "not found" even though it exists.
 *
 * Returns `null` when it cannot be found within that bound.
 *
 * @param {string} role
 * @param {number} ticketId
 */
export async function findTicket(role, ticketId) {
  try {
    return await request(`ticket/${ticketId}`)
  } catch (error) {
    // A detail-level rejection falls through to the list scan; a server or
    // network fault is propagated rather than hidden.
    if (!(error instanceof ApiError) || error.status >= 500) throw error
  }

  const MAX_PAGES = 5
  const PAGE_SIZE = 100

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await listTickets(role, { page, size: PAGE_SIZE })
    const match = result?.content?.find((ticket) => ticket.id === ticketId)
    if (match) return match
    if (result?.last) break
  }
  return null
}

export function createTicket(session, payload) {
  const body = {
    subject: payload.subject,
    description: payload.description ?? "",
    aiSummary: payload.aiSummary ?? payload.description ?? "",
    category: payload.category ?? null,
    ticketPriority: payload.ticketPriority,
  }
  if (session?.role === ROLE.AGENT) {
    body.agentId = payload.agentId
  }
  // Upstream returns the literal string "Ticket created successfully"; there
  // is no created ticket in the response, so the caller re-fetches the list.
  return request("ticket/create", { method: "POST", body: JSON.stringify(body) })
}

/**
 * Partial update. Note the backend accepts this from the ticket's owner or its
 * assignee and rejects everyone else with a 400, not a 403.
 */
export function updateTicket(id, patch) {
  return request(`ticket/${id}`, { method: "PUT", body: JSON.stringify(patch) })
}

// ------------------------------------------------------------- ticket chat --

/**
 * A ticket's owner<->agent chat history. This lives in a separate service
 * (`ticketChatService`) reached through the BFF's `ticket-chat/` prefix.
 *
 * @param {number} ticketId
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export function listTicketMessages(ticketId) {
  return request(`ticket-chat/tickets/${ticketId}/messages`)
}

/**
 * Send a message over REST. This exists for mock mode only: the live service
 * exposes no REST send endpoint, so live messages go over the STOMP socket
 * (`src/lib/stomp.js`). Keeping both paths means the page works identically in
 * either mode.
 *
 * @param {number} ticketId
 * @param {string} content
 */
export function postTicketMessage(ticketId, content) {
  return request(`ticket-chat/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })
}

/** Runtime config: mock vs live, and the ticket-chat socket URL. */
export function getRuntimeConfig() {
  return request("config")
}

/** Bearer token for the ticket-chat STOMP handshake (live mode only). */
export function getTicketChatToken() {
  return request("ticket-chat/token")
}

// ------------------------------------------------------------ conversations --

export function listConversations(params = {}) {
  return request("conversation", {
    query: { page: params.page ?? 0, size: params.size ?? 50, sort: "updatedAt,desc" },
  })
}

/**
 * `POST /conversation` returns a `ConversationResponse` (`{ id, title,
 * createdAt }`), not the raw JPA entity, so a success is safe to read directly.
 */
export function createConversation() {
  return request("conversation", { method: "POST" })
}

export function listMessages(conversationId) {
  return request(`conversation/${conversationId}/messages`, {
    query: { page: 0, size: 200, sort: "createdAt,asc" },
  })
}

/**
 * Rename a conversation. `PATCH /conversation/{id}/title?title=...` takes the
 * new title as a query parameter and returns an empty 200. Titles are also
 * auto-generated server-side from the first message when none is set.
 */
export function renameConversation(conversationId, title) {
  return request(
    `conversation/${conversationId}/title?title=${encodeURIComponent(title)}`,
    { method: "PATCH" },
  )
}

// ---------------------------------------------------------------------- ai --

/**
 * Stream an answer. The upstream contract is `GET /ai/chat?query=&chatId=`
 * returning `Flux<String>` as a plain text stream -- note it is a **GET**, so
 * the question travels in the query string and ends up in server access logs.
 *
 * @param {{ query: string, chatId: number, model?: string }} input
 * @param {(chunk: string, accumulated: string) => void} onChunk
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>} the full answer
 */
export async function streamChat({ query, chatId, model }, onChunk, signal) {
  const params = new URLSearchParams({ query, chatId: String(chatId) })
  if (model) params.set("model", model)

  let response
  try {
    response = await fetch(`/api/ai/chat?${params}`, {
      credentials: "same-origin",
      signal,
      headers: { Accept: "text/plain" },
    })
  } catch (error) {
    if (error?.name === "AbortError") throw error
    throw new ApiError("Cannot reach the assistant. Check your connection.", { path: "ai/chat" })
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(body?.message || `The assistant failed (${response.status})`, {
      status: response.status,
      path: "ai/chat",
    })
  }

  if (!response.body) {
    throw new ApiError("The assistant returned an empty response.", { path: "ai/chat" })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let full = ""

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    // Streamed chunks split mid-token, so buffer across reads.
    const chunk = decoder.decode(value, { stream: true })
    if (!chunk) continue
    full += chunk
    onChunk(chunk, full)
  }

  full += decoder.decode()
  return full
}

/**
 * Provider quota / billing rejections, as far as the UI can see them. The
 * backend is expected to map them to HTTP 429 with a clear message; the text
 * patterns are a fallback for a raw provider message that slipped through.
 */
const AI_QUOTA_PATTERN =
  /quota|resource[\s_-]?exhausted|rate[\s_-]?limit|too many requests|\b429\b/i

/**
 * Does this failure mean the company's AI key is out of quota?
 *
 * Quota exhaustion is a distinct state from "the assistant broke": the key is
 * valid, but the provider will not serve it until billing is topped up. The
 * chat shows a dedicated, actionable message for it instead of a generic error.
 *
 * @param {unknown} error
 */
export function isAiQuotaError(error) {
  if (!error) return false
  if (error.status === 429) return true
  return AI_QUOTA_PATTERN.test(String(error.message ?? ""))
}

// ------------------------------------------------------------------- admin --

export function listUsers(params = {}) {
  // `createAt` -- the backend column really is missing the "d". Anything else
  // throws upstream and surfaces as a 500.
  return request("admin/users", {
    query: { page: params.page ?? 0, size: params.size ?? 25, sort: "createAt,desc" },
  })
}

export function updateUserStatus(userId, status) {
  return request(`admin/user/${userId}/status?status=${encodeURIComponent(status)}`, {
    method: "PATCH",
  })
}

export function updateUserRole(userId, role) {
  return request(`admin/user/${userId}/role?role=${encodeURIComponent(role)}`, {
    method: "PATCH",
  })
}

export function sendInvitation(payload) {
  return request("invitation/send", { method: "POST", body: JSON.stringify(payload) })
}

/**
 * Is the company allowed to use the assistant at all?
 *
 * Readable by EVERY signed-in role, not just admins: an employee needs to know
 * whether to expect an answer or an empty state, and hiding the endpoint from
 * them would make that state unexplainable.
 *
 * The response never contains the raw key -- only `configured` and a masked
 * form. Upstream the masked value is field `apiKey`; this normalises it to
 * `maskedKey` so a future backend change that starts returning the real key
 * cannot leak it into the DOM.
 */
export async function getAiConfig() {
  try {
    const data = await request("admin/ai-config")
    return {
      configured: Boolean(data?.configured),
      maskedKey: data?.apiKey ?? data?.maskedKey ?? null,
      updatedAt: data?.updatedAt ?? null,
    }
  } catch (error) {
    // Upstream guards `/admin/ai-config` behind ADMIN, so an AGENT or EMPLOYEE
    // gets a 403 here even though the assistant itself is available to them.
    // Treat that as "assume configured" and let a send surface a real error if
    // the workspace key is genuinely missing.
    if (error instanceof ApiError && error.status === 403) {
      return { configured: true, maskedKey: null, updatedAt: null, restricted: true }
    }
    throw error
  }
}

/** Persist the company's Gemini key. ADMIN only. */
export async function saveAiConfig(apiKey) {
  return request("admin/ai-config", { method: "PUT", body: JSON.stringify({ apiKey }) })
}

/** Remove the company's key, which re-blocks the assistant. ADMIN only. */
export function clearAiConfig() {
  return request("admin/ai-config", { method: "DELETE" })
}

/**
 * Upload goes through as multipart. `title` and `category` are **query
 * parameters** upstream, not form fields -- putting them in the form body makes
 * the controller return 500 "Something went wrong".
 */
export function uploadDocument({ file, title, category }) {
  const form = new FormData()
  form.append("file", file)

  return request(
    `admin/document?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`,
    { method: "POST", body: form },
  )
}

// --------------------------------------------------------- documents -------

/**
 * List the workspace's documents. `GET /admin/document` returns a plain JSON
 * array (not a Spring `Page`), so it is wrapped in the `{ content }` envelope
 * every list view already expects.
 */
export function listDocuments() {
  return request("admin/document").then((rows) => ({
    content: Array.isArray(rows) ? rows : [],
  }))
}

/**
 * Delete a document from the workspace. The backend also purges its vectors
 * from Qdrant, so an answer will stop citing it. Returns `null` (204).
 */
export function deleteDocument(documentId) {
  return request(`admin/document/${documentId}`, { method: "DELETE" })
}

export const api = {
  getSession,
  logout,
  login,
  registerCompany,
  register,
  getDemoAccounts,
  listTickets,
  findTicket,
  createTicket,
  updateTicket,
  listTicketMessages,
  postTicketMessage,
  getRuntimeConfig,
  getTicketChatToken,
  listConversations,
  createConversation,
  listMessages,
  renameConversation,
  streamChat,
  listUsers,
  updateUserStatus,
  updateUserRole,
  sendInvitation,
  getAiConfig,
  saveAiConfig,
  clearAiConfig,
  uploadDocument,
  listDocuments,
  deleteDocument,
}