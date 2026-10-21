/**
 * Wire contract for the `raghelpdesk` backend (Spring Boot, port 8080).
 *
 * This file is documentation-as-types. Field names here are copied verbatim
 * from the backend DTOs and MUST match byte for byte -- several of them are
 * counter-intuitive and exist only to trip you up:
 *
 *   - Ticket DTOs use `ticketStatus` / `ticketPriority`, not `status` / `priority`
 *   - `User` sorts on `createAt` (no "d"); every other entity uses `createdAt`
 *   - `TicketResponse` carries only `userId` / `agentId`, never nested users
 *   - `MessageResponse` carries no `conversationId`
 *   - `POST /ticket/create` returns a plain string, not the created ticket
 *
 * The project is plain JavaScript, so these JSDoc typedefs give editors and
 * `tsc --checkJs` the same safety a .ts migration would.
 */

/**
 * @typedef {Object} Page
 * @property {T[]} content
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {number} size
 * @property {number} number 0-based page index (Spring Data default; NOT 1-based)
 * @property {boolean} first
 * @property {boolean} last
 * @property {boolean} empty
 * @property {number} numberOfElements
 * @template T
 */

/**
 * Error body from `GlobalExceptionHandler`.
 *
 * NOTE: this shape only applies to `AppException` (400) and the catch-all
 * (500). Spring Security rejections -- which is what you get for a missing or
 * expired token -- return 403 with a COMPLETELY EMPTY body.
 *
 * @typedef {Object} ErrorResponse
 * @property {number} status
 * @property {string} message
 * @property {string} timestamp ISO-8601 local date-time, no timezone offset
 */

/**
 * @typedef {Object} LoginResponse
 * @property {string} token  Bearer JWT: claims are sub(email), userId, companyId, role, iat, exp
 * @property {import("@/lib/constants").Role} role
 * @property {number} userId
 * @property {number} companyId
 * @property {string} name
 * @property {string} email
 */

/**
 * @typedef {Object} TicketResponse
 * @property {number} id
 * @property {number} userId
 * @property {number | null} agentId
 * @property {number} companyId
 * @property {import("@/lib/constants").TicketStatus} ticketStatus
 * @property {import("@/lib/constants").TicketPriority} ticketPriority
 * @property {string | null} category free text, NOT an enum
 * @property {string} subject
 * @property {string} aiSummary
 * @property {string} createdAt
 */

/**
 * @typedef {Object} UserResponse
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {import("@/lib/constants").Role} role
 * @property {import("@/lib/constants").UserStatus} status
 */

/**
 * @typedef {Object} ConversationResponse
 * @property {number} id
 * @property {string | null} title auto-generated server-side; no rename endpoint works
 * @property {string} createdAt
 */

/**
 * @typedef {Object} MessageResponse
 * @property {number} id
 * @property {import("@/lib/constants").MessageRole} role
 * @property {string} content
 * @property {string} createdAt
 */

/**
 * @typedef {Object} DocumentResponse
 * @property {number} id
 * @property {string} title
 * @property {string} fileName
 * @property {number} companyId
 * @property {string} contentType
 * @property {number} fileSize
 * @property {import("@/lib/constants").DocumentCategory} category
 * @property {import("@/lib/constants").DocumentStatus} status always UPLOADED at return time
 * @property {string | null} rejectionReason only populated once async verification finishes
 */

/**
 * Shape the backend's `Conversation` entity serialises to on `POST /conversation`.
 *
 * WARNING: this endpoint returns the raw JPA entity, so it embeds `user` and
 * `company` objects and will most likely throw `LazyInitializationException`
 * (HTTP 500) because `open-in-view` is disabled. Treat conversation creation
 * as failure-tolerant: if it 500s, the chat UI must offer a retry rather than
 * dead-ending.
 *
 * @typedef {Object} ConversationEntity
 * @property {number} id
 * @property {string | null} title
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * The session shape the BFF derives locally from JWT claims.
 *
 * This is a frontend concept. The backend's own `GET /auth/me` is broken (it
 * casts the filter's `CurrentUser` principal to `UserDetails` and 500s), so we
 * never call it -- `/api/auth/session` builds this from the token instead.
 *
 * @typedef {Object} Session
 * @property {number} userId
 * @property {number} companyId
 * @property {string} email claims.sub
 * @property {import("@/lib/constants").Role} role
 * @property {string} name display name, not present in JWT claims -- sourced from LoginResponse
 * @property {number} exp expiry, seconds since epoch
 */

/**
 * One message in a ticket's owner<->agent conversation.
 *
 * This is `ticketChatService.ChatResponseDto` -- a **separate backend service**
 * from `raghelpdesk`. Note it denormalises the sender's display name instead of
 * nesting a user, and `senderId` is the only way to tell who wrote it.
 *
 * @typedef {Object} TicketChatMessage
 * @property {number} id
 * @property {number} ticketId
 * @property {number} senderId
 * @property {string} senderName
 * @property {string} content
 * @property {string} createdAt ISO-8601
 */

export {}