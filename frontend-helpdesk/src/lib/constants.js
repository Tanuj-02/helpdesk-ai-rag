/**
 * Enum constants and lookup tables derived from the `raghelpdesk` backend.
 *
 * Every value here is a verbatim Java enum constant. The backend persists and
 * deserialises all of them as case-sensitive strings, and it performs ZERO
 * Bean Validation -- a wrong casing does not return 400, it throws and
 * surfaces as 500 "Something went wrong". Treat these as a wire contract:
 * never build these strings by concatenation or guess a casing.
 */

/** @typedef {"ADMIN" | "AGENT" | "EMPLOYEE"} Role */
export const ROLE = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
  EMPLOYEE: "EMPLOYEE",
}

export const ROLES = [ROLE.ADMIN, ROLE.AGENT, ROLE.EMPLOYEE]

/** @typedef {"OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"} TicketStatus */
export const TICKET_STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
}

export const TICKET_STATUSES = [
  TICKET_STATUS.OPEN,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.RESOLVED,
  TICKET_STATUS.CLOSED,
]

/** @typedef {"LOW" | "MEDIUM" | "HIGH" | "URGENT"} TicketPriority */
export const TICKET_PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
}

export const TICKET_PRIORITIES = [
  TICKET_PRIORITY.LOW,
  TICKET_PRIORITY.MEDIUM,
  TICKET_PRIORITY.HIGH,
  TICKET_PRIORITY.URGENT,
]

/**
 * User lifecycle status. Note the backend never actually assigns `INVITED`,
 * but it is a valid enum constant and `/admin/user/{id}/status` accepts it.
 * @typedef {"ACTIVE" | "INVITED" | "SUSPENDED" | "DEACTIVATED"} UserStatus
 */
export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  INVITED: "INVITED",
  SUSPENDED: "SUSPENDED",
  DEACTIVATED: "DEACTIVATED",
}

export const USER_STATUSES = [
  USER_STATUS.ACTIVE,
  USER_STATUS.INVITED,
  USER_STATUS.SUSPENDED,
  USER_STATUS.DEACTIVATED,
]

/** @typedef {"USER" | "ASSISTANT" | "SYSTEM"} MessageRole */
export const MESSAGE_ROLE = {
  USER: "USER",
  ASSISTANT: "ASSISTANT",
  SYSTEM: "SYSTEM",
}

/**
 * `PROCESSING` and `FAILED` exist in the enum but no code path in the
 * backend ever assigns them -- only UPLOADED, APPROVED and REJECTED are
 * written. They are accepted on read for forward compatibility.
 * @typedef {"UPLOADED" | "PROCESSING" | "APPROVED" | "REJECTED" | "FAILED"} DocumentStatus
 */
export const DOCUMENT_STATUS = {
  UPLOADED: "UPLOADED",
  PROCESSING: "PROCESSING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  FAILED: "FAILED",
}

/** @typedef {"POLICY" | "MANUAL" | "HANDBOOK" | "SOP" | "PROCEDURE" | "GUIDELINE" | "REPORT" | "FORM" | "OTHER"} DocumentCategory */
export const DOCUMENT_CATEGORY = {
  POLICY: "POLICY",
  MANUAL: "MANUAL",
  HANDBOOK: "HANDBOOK",
  SOP: "SOP",
  PROCEDURE: "PROCEDURE",
  GUIDELINE: "GUIDELINE",
  REPORT: "REPORT",
  FORM: "FORM",
  OTHER: "OTHER",
}

export const DOCUMENT_CATEGORIES = [
  DOCUMENT_CATEGORY.POLICY,
  DOCUMENT_CATEGORY.MANUAL,
  DOCUMENT_CATEGORY.HANDBOOK,
  DOCUMENT_CATEGORY.SOP,
  DOCUMENT_CATEGORY.PROCEDURE,
  DOCUMENT_CATEGORY.GUIDELINE,
  DOCUMENT_CATEGORY.REPORT,
  DOCUMENT_CATEGORY.FORM,
  DOCUMENT_CATEGORY.OTHER,
]

/**
 * MIME types accepted by the backend's `FileValidationService`. Rejections
 * surface as HTTP 500, not 400, so the upload form must filter client-side.
 */
export const ACCEPTED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
]

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

export const ACCEPTED_UPLOAD_EXTENSIONS = ".pdf,.doc,.docx,.txt,.csv"

/**
 * `Ticket.category` is NOT an enum on the backend -- it is a nullable free
 * text column with no validation. These are suggestions offered by the AI
 * tool description, not server-enforced values.
 */
export const TICKET_CATEGORY_SUGGESTIONS = [
  "Account",
  "Billing",
  "Technical",
  "Hardware",
  "Software",
  "Other",
]

/**
 * Sort keys are NOT uniform across the backend, and an unrecognised sort
 * property throws (surfacing as 500). `User` is the odd one out: the column
 * is `createAt`, missing the "d".
 *
 * @type {Record<string, string>}
 */
export const SORT_KEYS = {
  users: "createAt",
  conversations: "updatedAt",
  messages: "createdAt",
  tickets: "createdAt",
}

/**
 * Role -> the ticket list endpoint that role is allowed to read.
 * Kebab-case, matching the literal `@GetMapping` values on TicketController.
 */
export const TICKET_LIST_ENDPOINT = {
  [ROLE.EMPLOYEE]: "my-tickets",
  [ROLE.AGENT]: "agent-tickets",
  [ROLE.ADMIN]: "company-tickets",
}

/** Human-readable labels used in badges and headings. */
export const TICKET_STATUS_LABEL = {
  [TICKET_STATUS.OPEN]: "Open",
  [TICKET_STATUS.IN_PROGRESS]: "In progress",
  [TICKET_STATUS.RESOLVED]: "Resolved",
  [TICKET_STATUS.CLOSED]: "Closed",
}

export const TICKET_PRIORITY_LABEL = {
  [TICKET_PRIORITY.LOW]: "Low",
  [TICKET_PRIORITY.MEDIUM]: "Medium",
  [TICKET_PRIORITY.HIGH]: "High",
  [TICKET_PRIORITY.URGENT]: "Urgent",
}

export const ROLE_LABEL = {
  [ROLE.ADMIN]: "Admin",
  [ROLE.AGENT]: "Agent",
  [ROLE.EMPLOYEE]: "Employee",
}

export const USER_STATUS_LABEL = {
  [USER_STATUS.ACTIVE]: "Active",
  [USER_STATUS.INVITED]: "Invited",
  [USER_STATUS.SUSPENDED]: "Suspended",
  [USER_STATUS.DEACTIVATED]: "Deactivated",
}

export const DOCUMENT_CATEGORY_LABEL = {
  [DOCUMENT_CATEGORY.POLICY]: "Policy",
  [DOCUMENT_CATEGORY.MANUAL]: "Manual",
  [DOCUMENT_CATEGORY.HANDBOOK]: "Handbook",
  [DOCUMENT_CATEGORY.SOP]: "SOP",
  [DOCUMENT_CATEGORY.PROCEDURE]: "Procedure",
  [DOCUMENT_CATEGORY.GUIDELINE]: "Guideline",
  [DOCUMENT_CATEGORY.REPORT]: "Report",
  [DOCUMENT_CATEGORY.FORM]: "Form",
  [DOCUMENT_CATEGORY.OTHER]: "Other",
}

export const DOCUMENT_STATUS_LABEL = {
  [DOCUMENT_STATUS.UPLOADED]: "Uploading",
  [DOCUMENT_STATUS.PROCESSING]: "Processing",
  [DOCUMENT_STATUS.APPROVED]: "Approved",
  [DOCUMENT_STATUS.REJECTED]: "Rejected",
  [DOCUMENT_STATUS.FAILED]: "Failed",
}

// ------------------------------------------------------------------- ai ----
//
// The backend currently wires exactly ONE chat provider (Gemini, via
// `spring.ai.google.genai.*`) as a single injected `ChatClient` bean, and
// reads the key from the SPRING_AI_GOOGLE_GENAI_API_KEY environment variable.
// `Company.apiKey` already exists as a column but nothing reads or writes it.
//
// Two things therefore have to change server-side before any of this works:
//   1. `GET/PUT/DELETE /admin/ai-config` to read and write `Company.apiKey`.
//   2. `GET /ai/chat` must accept a `model` parameter and build the right
//      ChatModel per request instead of reusing one bean.
// Until then these run against the mock only.

/**
 * Gemini chat models a user can pick between. These are the ids the backend
 * must pass straight to `spring.ai.google.genai.chat.options.model`; they are
 * not a frontend abstraction.
 *
 * `defaultModel` is what a user gets before choosing, and what the backend
 * should use when `model` is absent.
 *
 * @type {ReadonlyArray<{ id: string, label: string, description: string }>}
 */
export const AI_MODELS = [
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    description: "Fastest and cheapest. Best default for everyday support questions.",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 flash lite",
    description: "Slower, more thorough reasoning. Worth it for long or ambiguous policy questions.",
  },
]

export const DEFAULT_AI_MODEL = AI_MODELS[0].id

/** @type {Record<string, string>} */
export const AI_MODEL_LABEL = Object.fromEntries(AI_MODELS.map((m) => [m.id, m.label]))

/**
 * Gemini keys are `AIza` + 35 chars. Validating the shape here stops an
 * obviously wrong value (a password pasted into the wrong box, whitespace from
 * a copy-paste) before it is ever stored.
 */
export const GEMINI_API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/

/**
 * Shown to non-admin roles when the company has no AI key yet. Chat is blocked
 * rather than silently falling back to the server's own key, so a company can
 * be confident whose quota is being spent.
 */
export const AI_KEY_REQUIRED_MESSAGE =
  "Your workspace has not added a Gemini API key yet, so the assistant is unavailable. Ask a workspace admin to add one in Settings."

/**
 * Shown in the chat when the workspace's Gemini key is out of quota. This is a
 * different state from a missing key: the key is valid, but the provider is
 * refusing to serve it until billing is topped up. Raised for every role --
 * an admin can act, everyone else needs to know who to ask. Detected through
 * `isAiQuotaError` in `lib/api/client.js`.
 */
export const AI_QUOTA_TITLE = "Assistant quota reached"

export const AI_QUOTA_MESSAGE =
  "Your workspace's Gemini API key has reached its quota, so the assistant cannot answer right now. To restore chat, the key needs more quota (billing) or must be replaced with one that has quota."

/**
 * Never render a full key. Show at most the first 4 and last 4 characters.
 *
 * Deliberately ASCII: this string reaches terminals and log files, where
 * non-ASCII masking characters turn into mojibake.
 *
 * @param {string | null | undefined} key
 */
export function maskApiKey(key) {
  if (!key || key.length < 12) return null
  return `${key.slice(0, 4)}****${key.slice(-4)}`
}