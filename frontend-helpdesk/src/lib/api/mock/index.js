/**
 * Mock implementation of the `raghelpdesk` HTTP surface.
 *
 * Faithfully reproduces the backend's behaviour *including its mistakes*,
 * because those mistakes are what the frontend has to survive:
 *
 *   - Unauthenticated requests return **403 with an empty body**, not 401
 *   - Service-level role failures return **400** with an `ErrorResponse`
 *   - Unknown enum values and bad sort keys throw and become **500
 *     "Something went wrong"**
 *   - `POST /ticket/create` returns the literal string
 *     "Ticket created successfully" and no ticket id
 *   - `PATCH /conversation/{id}/title` always 500s (upstream bug)
 *
 * Server-side only. Imported by the BFF route handlers.
 */

import {
  ACCEPTED_UPLOAD_MIME_TYPES,
  AI_KEY_REQUIRED_MESSAGE,
  AI_MODELS,
  DEFAULT_AI_MODEL,
  DOCUMENT_STATUS,
  GEMINI_API_KEY_PATTERN,
  MAX_UPLOAD_BYTES,
  ROLE,
  SORT_KEYS,
  TICKET_STATUS,
  USER_STATUS,
  maskApiKey,
} from "@/lib/constants"
import { store, toUserResponse } from "./db"

/** Canned AI replies, keyed by a crude intent match. */
const REPLIES = [
  {
    match: /invoice|bill|charge|refund|payment/i,
    text: "Based on our billing policy, a duplicate charge for the same subscription period is refunded in full within five to seven business days once finance confirms the duplicate. I have raised an urgent ticket for the finance team and you do not need to do anything further.",
  },
  {
    match: /mfa|two.?factor|2fa|locked out|authenticator/i,
    text: "Multi-factor authentication cannot be self-service reset. An administrator must clear the second factor from the account security settings. I have raised a ticket at high priority and assigned it to the support team.",
  },
  {
    match: /upload|document|pdf|file/i,
    text: "Uploads are validated against an allowlist of PDF, Word, plain text and CSV, with a 100 MB ceiling. Files must finish uploading before verification begins, and verification happens asynchronously after that. If the file is under the limit and a supported type, the next step is to check the verification status shown in the documents list.",
  },
  {
    match: /expense|policy|leave|holiday|onboard/i,
    text: "Our employee handbook is the authoritative source for internal policy questions. It covers leave entitlement, expense thresholds and onboarding steps. I have retrieved the relevant section and summarised it above. If the specific figure you need is not covered, raise a ticket and the People Operations team will follow up.",
  },
  {
    match: /password|reset|sign in|login/i,
    text: "Password resets are handled by an administrator. There is no self-service reset link, so you will need to contact your workspace admin to clear your credentials and MFA settings. I can raise a ticket for that if you would like.",
  },
]

const DEFAULT_REPLY =
  "I could not find that in the indexed company documentation. I have raised a ticket for the support team so a specialist can follow up with a precise answer. In the meantime, the most relevant policy sections I did retrieve are summarised above."

/**
 * Build the Spring Data `Page` envelope.
 *
 * @template T
 * @param {T[]} all
 * @param {{ page?: number, size?: number, sort?: string }} query
 * @returns {import("@/lib/api/contract").Page<T>}
 */
function paginate(all, query) {
  // NOTE: read params with `.get()`. `URLSearchParams` exposes no properties,
  // so `query.page` is `undefined` and `query.sort` is the *method* -- which
  // would stringify to "function sort() { [native code] }" and fail validation.
  const page = Number(query.get("page") ?? 0)
  const size = Number(query.get("size") ?? 20)
  const safeSize = Number.isFinite(size) && size > 0 ? size : 20
  const safePage = Number.isFinite(page) && page >= 0 ? page : 0
  const sort = query.get("sort")

  const start = safePage * safeSize
  const content = all.slice(start, start + safeSize)

  return {
    content,
    totalElements: all.length,
    totalPages: Math.ceil(all.length / safeSize) || 1,
    size: safeSize,
    number: safePage,
    first: safePage === 0,
    last: start + safeSize >= all.length,
    empty: content.length === 0,
    numberOfElements: content.length,
    pageable: {
      pageNumber: safePage,
      pageSize: safeSize,
      offset: start,
      sort: sort ? { query: sort, descending: sort.endsWith(",desc") } : [],
    },
  }
}

/**
 * @param {string} message
 * @param {number} status
 * @returns {{ status: number, json: import("@/lib/api/contract").ErrorResponse }}
 */
function appError(message, status = 400) {
  return {
    status,
    json: { status, message, timestamp: new Date().toISOString().slice(0, 23) },
  }
}

const notFound = () => appError("Something went wrong", 500)

/** Spring Security rejects with 403 and a genuinely empty body. */
const forbidden = () => ({ status: 403, empty: true })

/**
 * Decode the unsigned mock token and resolve the acting user.
 *
 * @param {string | null} token
 */
function resolveActor(token) {
  if (!token) return null
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64").toString("utf8"),
    )
    const user = store.users.find(
      (u) => u.id === payload.userId && u.email === payload.sub,
    )
    return user ?? null
  } catch {
    return null
  }
}

/**
 * Mint an unsigned stand-in for the backend's HS256 token. `decodeJwt` reads
 * the payload verbatim, so the claims shape matches the real thing.
 *
 * @param {{ id: number, email: string, role: string, companyId: number }} user
 */
function mintToken(user) {
  const b64 = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  return [
    b64({ alg: "HS256", typ: "JWT" }),
    b64({
      sub: user.email,
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      iat: now,
      exp: now + 86_400,
    }),
    "mock-signature",
  ].join(".")
}

/** Reject a sort key the entity does not actually have, as the backend does. */
function validateSort(query, allowed) {
  // `.get()` only -- `query.sort` is URLSearchParams' own sort() method.
  const sort = query.get("sort")
  if (!sort) return true
  const key = String(sort).split(",")[0]
  return allowed.includes(key)
}

/**
 * Route a request against the mock backend.
 *
 * @param {Object} input
 * @param {string} input.method
 * @param {string} input.path slash-joined path after `/api`, e.g. `auth/login`
 * @param {URLSearchParams} input.query
 * @param {any} [input.body] parsed JSON body, if any
 * @param {FormData | null} [input.formData]
 * @param {string | null} [input.token] bearer token, if present
 * @returns {Promise<{ status: number, json?: any, text?: string, stream?: any, empty?: boolean }>}
 */
export async function routeMock({ method, path, query, body, formData, token }) {
  // `path` arrives from the BFF as a slash-joined string ("auth/login"); split
  // here rather than expecting segments.
  const [root, ...rest] = String(path).split("/").filter(Boolean)
  const actor = resolveActor(token)
  const requireActor = () => (actor ? null : forbidden())

  // ---------------------------------------------------------------- auth ---

  if (root === "auth" && rest[0] === "login" && method === "POST") {
    const user = store.users.find(
      (u) => u.email?.toLowerCase() === String(body?.email ?? "").toLowerCase(),
    )
    if (!user) return appError("User Not found")
    if (user.password !== body?.password) {
      return { status: 401, empty: true }
    }
    if (user.status !== USER_STATUS.ACTIVE) {
      return appError(`Your account is ${user.status}, Please contact your admin `)
    }
    return {
      status: 200,
      json: {
        token: mintToken(user),
        role: user.role,
        userId: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
      },
    }
  }

  if (root === "auth" && rest[0] === "register-company" && method === "POST") {
    const email = String(body?.companyEmail ?? "").toLowerCase()
    if (store.users.some((u) => u.email?.toLowerCase() === email)) {
      return appError("Admin user already exists")
    }
    store.users.push({
      id: store.nextUserId(),
      name: body?.adminName ?? "Admin",
      email,
      password: body?.password ?? "",
      role: ROLE.ADMIN,
      status: USER_STATUS.ACTIVE,
      companyId: store.companyId,
      createAt: new Date().toISOString(),
    })
    return { status: 200, empty: true }
  }

  if (root === "auth" && rest[0] === "register" && method === "POST") {
    if (!body?.token) return appError("Invalid or expired invitation")
    return appError("Invalid or expired invitation")
  }

  if (root === "auth" && rest[0] === "me" && method === "GET") {
    const guard = requireActor()
    if (guard) return guard
    return {
      status: 200,
      json: {
        id: actor.id,
        name: actor.name,
        companyId: actor.companyId,
        email: actor.email,
        companyName: store.companyName,
        role: actor.role,
      },
    }
  }

  // ------------------------------------------------------------- tickets ---

  if (root === "ticket" && rest[0] === "create" && method === "POST") {
    const guard = requireActor()
    if (guard) return guard

    const valid = ["LOW", "MEDIUM", "HIGH", "URGENT"]
    if (!valid.includes(body?.ticketPriority)) return notFound()

    // The real backend 500s when a company has no AGENT to assign to.
    const agents = store.users.filter((u) => u.role === ROLE.AGENT)
    if (agents.length === 0) return notFound()

    const open = store.tickets.filter(
      (t) => t.agentId && [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS].includes(t.ticketStatus),
    )
    const load = new Map()
    for (const t of open) load.set(t.agentId, (load.get(t.agentId) ?? 0) + 1)
    const assigned = [...agents].sort(
      (a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0),
    )[0]

    store.tickets.push({
      id: store.nextTicketId(),
      userId: actor.id,
      agentId: assigned.id,
      companyId: actor.companyId,
      ticketStatus: TICKET_STATUS.OPEN,
      ticketPriority: body.ticketPriority,
      category: body.category ?? null,
      subject: body.subject ?? "",
      aiSummary: body.aiSummary ?? "",
      createdAt: new Date().toISOString(),
    })

    // Verbatim upstream behaviour: a plain string, and no ticket id.
    return { status: 201, text: "Ticket created successfully" }
  }

  if (root === "ticket" && ["my-tickets", "company-tickets", "agent-tickets"].includes(rest[0])) {
    const guard = requireActor()
    if (guard) return guard

    if (!validateSort(query, [SORT_KEYS.tickets])) return notFound()

    if (rest[0] === "company-tickets" && actor.role !== ROLE.ADMIN) {
      return appError("Only admins can view all company tickets")
    }
    if (rest[0] === "agent-tickets" && actor.role !== ROLE.AGENT) {
      return appError("Only agents can view assigned tickets")
    }

    let rows = store.tickets.filter((t) => t.companyId === actor.companyId)
    if (rest[0] === "my-tickets") rows = rows.filter((t) => t.userId === actor.id)
    if (rest[0] === "agent-tickets") rows = rows.filter((t) => t.agentId === actor.id)

    rows = [...rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    return { status: 200, json: paginate(rows, query) }
  }

  if (root === "ticket" && /^\d+$/.test(rest[0] ?? "") && method === "GET") {
    const guard = requireActor()
    if (guard) return guard

    const id = Number(rest[0])
    const ticket = store.tickets.find(
      (t) => t.id === id && t.companyId === actor.companyId,
    )
    // A missing row is a 404 so `findTicket` falls back to the list scan; a 500
    // (the mock's default for an unimplemented path) would abort that fallback.
    if (!ticket) return appError("Ticket not found", 404)

    // Readable by its owner, its assignee, or an admin.
    const canRead =
      actor.role === ROLE.ADMIN ||
      ticket.userId === actor.id ||
      ticket.agentId === actor.id
    if (!canRead) return forbidden()

    return { status: 200, json: ticket }
  }

  if (root === "ticket" && rest[0] && method === "PUT") {
    const guard = requireActor()
    if (guard) return guard

    const id = Number(rest[0])
    const ticket = store.tickets.find((t) => t.id === id && t.companyId === actor.companyId)
    if (!ticket) return appError("Ticket not found")

    const isOwner = ticket.userId === actor.id
    const isAssignee = ticket.agentId === actor.id
    if (actor.role === ROLE.EMPLOYEE && !isOwner) {
      return appError("You can only update your own tickets")
    }
    if (actor.role === ROLE.AGENT && !isAssignee) {
      return appError("You can only update tickets assigned to you")
    }

    const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
    const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]
    if (body?.ticketStatus && !statuses.includes(body.ticketStatus)) return notFound()
    if (body?.ticketPriority && !priorities.includes(body.ticketPriority)) return notFound()

    // Partial update: null fields are left untouched.
    for (const key of ["ticketStatus", "ticketPriority", "subject", "aiSummary"]) {
      if (body?.[key] !== undefined && body[key] !== null) ticket[key] = body[key]
    }
    return { status: 200, json: ticket }
  }

  // -------------------------------------------------------- conversations ---

  if (root === "conversation" && rest.length === 0 && method === "POST") {
    const guard = requireActor()
    if (guard) return guard

    const conversation = {
      id: store.nextConversationId(),
      title: null,
      userId: actor.id,
      companyId: actor.companyId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    store.conversations.push(conversation)
    return { status: 200, json: conversation }
  }

  if (root === "conversation" && rest.length === 0 && method === "GET") {
    const guard = requireActor()
    if (guard) return guard

    if (!validateSort(query, [SORT_KEYS.conversations])) return notFound()

    const rows = store.conversations
      .filter((c) => c.userId === actor.id && c.companyId === actor.companyId)
      // Most-recently-active first: a conversation rises when any message is
      // sent, matching the real backend once it bumps `updatedAt` on save.
      .sort((a, b) =>
        String(b.updatedAt ?? b.createdAt).localeCompare(
          String(a.updatedAt ?? a.createdAt),
        ),
      )
      .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))

    return { status: 200, json: paginate(rows, query) }
  }

  if (root === "conversation" && rest[1] === "messages" && method === "GET") {
    const guard = requireActor()
    if (guard) return guard

    if (!validateSort(query, [SORT_KEYS.messages])) return notFound()

    const id = Number(rest[0])
    const conversation = store.conversations.find(
      (c) => c.id === id && c.userId === actor.id,
    )
    if (!conversation) return appError("Conversation not found")

    const rows = store.messages
      .filter((m) => m.conversationId === id)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map(({ id, role, content, createdAt }) => ({ id, role, content, createdAt }))

    return { status: 200, json: paginate(rows, query) }
  }

  if (root === "conversation" && rest[1] === "title" && method === "PATCH") {
    const guard = requireActor()
    if (guard) return guard
    // Upstream: `@PathVariable title` on a template with no {title} placeholder.
    return notFound()
  }

  // ------------------------------------------------------ admin ai config ---

  // Mirrors the endpoints the backend still needs to add. `Company.apiKey`
  // already exists as a column but nothing exposes it today.
  if (root === "admin" && rest[0] === "ai-config") {
    const guard = requireActor()
    if (guard) return guard

    // Readable by every role: a blocked employee needs to know why the
    // assistant is unavailable, so this is deliberately NOT admin-only.
    if (method === "GET") {
      return {
        status: 200,
        json: {
          configured: Boolean(store.company.apiKey),
          // Never the raw key, only a masked form.
          maskedKey: maskApiKey(store.company.apiKey),
          updatedAt: store.company.apiKeyUpdatedAt,
        },
      }
    }

    // Writes are ADMIN-only, matching the rest of /admin/**.
    if (actor.role !== ROLE.ADMIN) return forbidden()

    if (method === "PUT") {
      const key = String(body?.apiKey ?? "").trim()
      if (!key) return appError("API key is required")
      // Shape check only -- the mock cannot validate a real key with Google.
      if (!GEMINI_API_KEY_PATTERN.test(key)) {
        return appError("That does not look like a Gemini API key")
      }
      store.company.apiKey = key
      store.company.apiKeyUpdatedAt = new Date().toISOString()
      return { status: 200, json: { configured: true, maskedKey: maskApiKey(key), updatedAt: store.company.apiKeyUpdatedAt } }
    }

    if (method === "DELETE") {
      store.company.apiKey = null
      store.company.apiKeyUpdatedAt = null
      return { status: 200, json: { configured: false, maskedKey: null, updatedAt: null } }
    }
  }

  // ----------------------------------------------------------------- ai ----

  if (root === "ai" && rest[0] === "chat" && method === "GET") {
    const guard = requireActor()
    if (guard) return guard

    // Agreed behaviour: with no company key the assistant is blocked outright
    // rather than silently spending the server's own quota.
    if (!store.company.apiKey) {
      return {
        status: 409,
        json: {
          status: 409,
          message: AI_KEY_REQUIRED_MESSAGE,
          code: "AI_KEY_MISSING",
        },
      }
    }

    const queryText = query.get("query")
    const chatId = Number(query.get("chatId"))
    if (!queryText || !chatId) return appError("Conversation not found")

    // `model` is new. An unknown id is rejected the way the backend's missing
    // Bean Validation rejects a bad enum: 400 with a readable message.
    const requestedModel = query.get("model") || DEFAULT_AI_MODEL
    if (!AI_MODELS.some((m) => m.id === requestedModel)) {
      return appError(`Unknown model: ${requestedModel}`)
    }

    const conversation = store.conversations.find(
      (c) => c.id === chatId && c.userId === actor.id,
    )
    if (!conversation) return appError("Conversation not found")

    // Server-side side effects, matching ChatService.
    store.messages.push({
      id: Date.now() + 1,
      conversationId: chatId,
      role: "USER",
      content: queryText,
      createdAt: new Date().toISOString(),
    })

    if (!conversation.title) {
      conversation.title =
        queryText.length > 48 ? `${queryText.slice(0, 45).trimEnd()}...` : queryText
    }

    const answer = REPLIES.find((r) => r.match.test(queryText))?.text ?? DEFAULT_REPLY
    // Naming the model makes the selector visibly do something, which is the
    // only way to tell in the mock that `model` reached the backend at all.
    const reply = `[${requestedModel}]\n\n${answer}`

    return {
      status: 200,
      // Invoke the generator function immediately -- the BFF consumes an
      // async *iterator*, so handing it the function itself throws.
      stream: (async function* () {
        // Emit word by word so the client's streaming path is genuinely
        // exercised rather than receiving one big chunk.
        const tokens = reply.match(/\S+\s*/g) ?? [reply]
        for (const token of tokens) {
          await new Promise((r) => setTimeout(r, 18))
          yield token
        }

        store.messages.push({
          id: Date.now() + 2,
          conversationId: chatId,
          role: "ASSISTANT",
          content: reply,
          createdAt: new Date().toISOString(),
        })
        conversation.updatedAt = new Date().toISOString()
      })(),
    }
  }

  // --------------------------------------------------------------- admin ---

  if (root === "admin" && rest[0] === "users" && rest.length === 1 && method === "GET") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    if (!validateSort(query, [SORT_KEYS.users])) return notFound()

    const rows = store.users
      .filter((u) => u.companyId === actor.companyId)
      .sort((a, b) => String(b.createAt).localeCompare(String(a.createAt)))
      .map(toUserResponse)

    return { status: 200, json: paginate(rows, query) }
  }

  if (root === "admin" && rest[0] === "user" && rest.length === 2 && method === "GET") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    const user = store.users.find(
      (u) => u.id === Number(rest[1]) && u.companyId === actor.companyId,
    )
    if (!user) return appError(`User with id ${rest[1]} and company id ${actor.companyId} not found `)
    return { status: 200, json: toUserResponse(user) }
  }

  if (root === "admin" && rest[0] === "user" && rest[2] === "status" && method === "PATCH") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    const user = store.users.find(
      (u) => u.id === Number(rest[1]) && u.companyId === actor.companyId,
    )
    if (!user) return appError(`User with id ${rest[1]} and company id ${actor.companyId} not found `)

    const next = query.get("status")
    if (!Object.values(USER_STATUS).includes(next)) return notFound()
    if (![ROLE.EMPLOYEE, ROLE.AGENT].includes(user.role)) {
      return appError("Only Admin can see all users")
    }

    user.status = next
    return { status: 200, json: toUserResponse(user) }
  }

  if (root === "admin" && rest[0] === "user" && rest[2] === "role" && method === "PATCH") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    const user = store.users.find(
      (u) => u.id === Number(rest[1]) && u.companyId === actor.companyId,
    )
    if (!user) return appError(`User with id ${rest[1]} and company id ${actor.companyId} not found `)

    const next = query.get("role")
    if (!Object.values(ROLE).includes(next)) return appError("Invalid role")

    user.role = next
    return { status: 200, json: toUserResponse(user) }
  }

  if (root === "admin" && rest[0] === "document" && method === "POST") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    const file = formData?.get("file")
    const title = query.get("title")
    const category = query.get("category")

    if (!(file instanceof File) || file.size === 0) return notFound()
    if (file.size > MAX_UPLOAD_BYTES) return notFound()
    if (!ACCEPTED_UPLOAD_MIME_TYPES.includes(file.type)) return notFound()
    if (!title || !category) return notFound()

    const row = {
      id: store.nextDocumentId(),
      title,
      fileName: file.name,
      companyId: actor.companyId,
      contentType: file.type,
      fileSize: file.size,
      category,
      // Always UPLOADED on return: the real verdict arrives later over RabbitMQ.
      status: DOCUMENT_STATUS.UPLOADED,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
    }
    store.documents.push(row)
    return { status: 201, json: row }
  }

  if (root === "admin" && rest[0] === "document" && rest.length === 2 && method === "DELETE") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    const index = store.documents.findIndex(
      (d) => d.id === Number(rest[1]) && d.companyId === actor.companyId,
    )
    if (index === -1) return appError("Company Document Not Found")
    store.documents.splice(index, 1)
    // The real endpoint returns 204 No Content after purging the vectors.
    return { status: 204, empty: true }
  }

  // --------------------------------------------------------- invitations ---

  if (root === "invitation" && rest[0] === "send" && method === "POST") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    const email = String(body?.email ?? "")
    if (store.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
      return appError("User Already Exists")
    }
    if (!Object.values(ROLE).includes(body?.role)) return notFound()

    return {
      status: 200,
      json: {
        id: Date.now(),
        email,
        role: body.role,
        used: false,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        // The real endpoint also returns the invite `token` and the inviter's
        // nested User including their BCrypt `password` hash. The mock omits
        // both so the UI never learns to render them.
      },
    }
  }

  // `GET /admin/document` returns a plain JSON array of the company's
  // documents (not a Spring `Page`), which the client wraps into the
  // `{ content }` shape every list view expects.
  if (root === "admin" && rest[0] === "document" && rest.length === 1 && method === "GET") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    const rows = store.documents
      .filter((d) => d.companyId === actor.companyId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    return { status: 200, json: rows }
  }

  // Mock-only: flip a document's status, standing in for the RabbitMQ
  // consumer that would otherwise update it asynchronously.
  if (root === "documents" && rest[0] && rest[1] === "status" && method === "PATCH") {
    const guard = requireActor()
    if (guard) return guard
    if (actor.role !== ROLE.ADMIN) return forbidden()

    const doc = store.documents.find((d) => d.id === Number(rest[0]))
    if (!doc) return appError("Company Document Not Found")

    doc.status = query.get("status") ?? DOCUMENT_STATUS.PROCESSING
    if (doc.status === DOCUMENT_STATUS.REJECTED) {
      doc.rejectionReason = "Not relevant to internal helpdesk knowledge."
    }
    return { status: 200, json: doc }
  }

  // ----------------------------------------------------------- ticket chat ---
  // Maps onto the separate `ticketChatService` (`/api/tickets/{id}/messages`).
  // The BFF exposes it under the `ticket-chat/` prefix so live mode can route
  // it to that service's own port instead of `raghelpdesk`.

  if (root === "ticket-chat" && rest[0] === "tickets" && rest[2] === "messages") {
    const guard = requireActor()
    if (guard) return guard

    const ticketId = Number(rest[1])
    if (!Number.isFinite(ticketId)) return notFound()

    if (method === "GET") {
      // Upstream's history endpoint performs no participation check; reproduce
      // that rather than inventing stricter behaviour the server lacks.
      const rows = store.ticketMessages
        .filter((m) => m.ticketId === ticketId)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      return { status: 200, json: rows }
    }

    if (method === "POST") {
      const content = String(body?.content ?? "").trim()
      if (!content) return appError("Message cannot be empty")

      // Upstream enforces participation in `ChatService.saveMessage`.
      const ticket = store.tickets.find(
        (t) => t.id === ticketId && t.companyId === actor.companyId,
      )
      if (ticket && ticket.userId !== actor.id && ticket.agentId !== actor.id) {
        return forbidden()
      }

      const message = {
        id: store.nextTicketMessageId(),
        ticketId,
        senderId: actor.id,
        senderName: actor.name,
        content,
        createdAt: new Date().toISOString(),
      }
      store.ticketMessages.push(message)
      return { status: 200, json: message }
    }
  }

  return notFound()
}

/** Simulated latency so loading states are actually exercised. */
export const MOCK_LATENCY_MS = Number(process.env.MOCK_LATENCY_MS ?? 350)