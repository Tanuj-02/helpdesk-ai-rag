/**
 * In-memory mock of the `raghelpdesk` data store.
 *
 * This module is SERVER-SIDE ONLY -- it is imported exclusively by the BFF
 * route handlers and must never reach the client bundle. It exists so the
 * whole UI can be built and demoed while the Spring Boot backend is still
 * being worked on.
 *
 * Fixtures deliberately reproduce the backend's awkward edges so the UI is
 * developed against realistic data:
 *   - `agentId: null` on unassigned tickets
 *   - a SUSPENDED user and a DEACTIVATED one
 *   - conversations with a null title (server auto-titles on first message)
 *   - tickets with a null category, since the column is unvalidated free text
 */

import {
  DOCUMENT_CATEGORY,
  DOCUMENT_STATUS,
  ROLE,
  TICKET_PRIORITY,
  TICKET_STATUS,
  USER_STATUS,
} from "@/lib/constants"

const COMPANY_ID = 1

/**
 * Mirrors the `Company` row, including the `apiKey` column that already exists
 * on the real entity but is currently unused by any backend code path.
 *
 * `apiKey` starts null so the mock reproduces a fresh install: the assistant is
 * blocked until an admin supplies a key, which is the agreed behaviour.
 */
const company = {
  id: COMPANY_ID,
  name: "Acme Corporation",
  email: "acme.com",
  /** @type {string | null} */
  apiKey: null,
  /** @type {string | null} */
  apiKeyUpdatedAt: null,
}

const now = Date.now()
const minutesAgo = (m) => new Date(now - m * 60_000).toISOString()
const daysAgo = (d) => new Date(now - d * 86_400_000).toISOString()

/**
 * @typedef {Object} MockUser
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {string} role
 * @property {string} status
 * @property {number} companyId
 * @property {string} createAt
 */

/** @type {MockUser[]} */
const users = [
  {
    id: 1,
    name: "Priya Raman",
    email: "admin@acme.com",
    password: "password",
    role: ROLE.ADMIN,
    status: USER_STATUS.ACTIVE,
    companyId: COMPANY_ID,
    createAt: daysAgo(210),
  },
  {
    id: 2,
    name: "Daniel Okafor",
    email: "agent@acme.com",
    password: "password",
    role: ROLE.AGENT,
    status: USER_STATUS.ACTIVE,
    companyId: COMPANY_ID,
    createAt: daysAgo(180),
  },
  {
    id: 3,
    name: "Mei Lin Chen",
    email: "mei@acme.com",
    password: "password",
    role: ROLE.AGENT,
    status: USER_STATUS.ACTIVE,
    companyId: COMPANY_ID,
    createAt: daysAgo(96),
  },
  {
    id: 4,
    name: "Sam Whitfield",
    email: "sam@acme.com",
    password: "password",
    role: ROLE.EMPLOYEE,
    status: USER_STATUS.ACTIVE,
    companyId: COMPANY_ID,
    createAt: daysAgo(64),
  },
  {
    id: 5,
    name: "Yusuf Demir",
    email: "yusuf@acme.com",
    password: "password",
    role: ROLE.EMPLOYEE,
    status: USER_STATUS.ACTIVE,
    companyId: COMPANY_ID,
    createAt: daysAgo(41),
  },
  {
    id: 6,
    name: "Elena Rossi",
    email: "elena@acme.com",
    password: "password",
    role: ROLE.EMPLOYEE,
    status: USER_STATUS.SUSPENDED,
    companyId: COMPANY_ID,
    createAt: daysAgo(30),
  },
  {
    id: 7,
    name: "Tobias Berg",
    email: "tobias@acme.com",
    password: "password",
    role: ROLE.EMPLOYEE,
    status: USER_STATUS.DEACTIVATED,
    companyId: COMPANY_ID,
    createAt: daysAgo(12),
  },
]

/** @type {Array<Record<string, unknown>>} */
const tickets = [
  {
    id: 1001,
    userId: 4,
    agentId: 2,
    companyId: COMPANY_ID,
    ticketStatus: TICKET_STATUS.IN_PROGRESS,
    ticketPriority: TICKET_PRIORITY.HIGH,
    category: "Account",
    subject: "Locked out after enabling MFA",
    aiSummary:
      "User enabled two-factor authentication and is now unable to sign in with their existing password. Recovery codes were never saved. Needs an MFA reset by an administrator.",
    createdAt: daysAgo(1),
  },
  {
    id: 1002,
    userId: 5,
    agentId: null,
    companyId: COMPANY_ID,
    ticketStatus: TICKET_STATUS.OPEN,
    ticketPriority: TICKET_PRIORITY.URGENT,
    category: "Billing",
    subject: "Invoice charged twice for August",
    aiSummary:
      "Customer was billed twice on the same invoice reference for the August cycle. Suspected duplicate subscription event. Requires finance review before any refund.",
    createdAt: minutesAgo(38),
  },
  {
    id: 1003,
    userId: 4,
    agentId: 3,
    companyId: COMPANY_ID,
    ticketStatus: TICKET_STATUS.OPEN,
    ticketPriority: TICKET_PRIORITY.MEDIUM,
    category: "Software",
    subject: "Export to CSV truncates at 10,000 rows",
    aiSummary:
      "The reporting export silently caps at ten thousand rows with no warning banner. Larger datasets appear complete but are missing data. Reproduced on the Q3 revenue report.",
    createdAt: daysAgo(3),
  },
  {
    id: 1004,
    userId: 5,
    agentId: 2,
    companyId: COMPANY_ID,
    ticketStatus: TICKET_STATUS.RESOLVED,
    ticketPriority: TICKET_PRIORITY.LOW,
    category: "Hardware",
    subject: "Docking station not recognised on Linux",
    aiSummary:
      "USB-C dock fails to enumerate on Ubuntu 24.04. Confirmed missing firmware package; installing the vendor kernel module resolved enumeration.",
    createdAt: daysAgo(8),
  },
  {
    id: 1005,
    userId: 6,
    agentId: null,
    companyId: COMPANY_ID,
    ticketStatus: TICKET_STATUS.OPEN,
    ticketPriority: TICKET_PRIORITY.MEDIUM,
    category: null,
    subject: "Cannot upload handbook PDF",
    aiSummary:
      "Upload of a handbook PDF fails silently in the browser. No validation error surfaces. File is under the size limit and is a supported type.",
    createdAt: daysAgo(5),
  },
  {
    id: 1006,
    userId: 4,
    agentId: 3,
    companyId: COMPANY_ID,
    ticketStatus: TICKET_STATUS.CLOSED,
    ticketPriority: TICKET_PRIORITY.HIGH,
    category: "Technical",
    subject: "SSO metadata rejected by identity provider",
    aiSummary:
      "Uploaded SAML metadata failed schema validation. Root cause was a missing AssertionConsumerService URL. Corrected metadata has been supplied.",
    createdAt: daysAgo(14),
  },
  {
    id: 1007,
    userId: 5,
    agentId: 2,
    companyId: COMPANY_ID,
    ticketStatus: TICKET_STATUS.IN_PROGRESS,
    ticketPriority: TICKET_PRIORITY.MEDIUM,
    category: "Software",
    subject: "Scheduled report emails stopped arriving",
    aiSummary:
      "Scheduled digest emails stopped arriving four days ago with no delivery failure recorded. Suspected a change to the mail scheduler concurrency setting.",
    createdAt: daysAgo(4),
  },
  {
    id: 1008,
    userId: 4,
    agentId: null,
    companyId: COMPANY_ID,
    ticketStatus: TICKET_STATUS.OPEN,
    ticketPriority: TICKET_PRIORITY.LOW,
    category: "Account",
    subject: "Request to rename team workspace",
    aiSummary:
      "User requests renaming the shared workspace. Affects every member's bookmarked links, so a redirect strategy is needed.",
    createdAt: minutesAgo(6),
  },
]

/** @type {Array<Record<string, unknown>>} */
const conversations = [
  { id: 500, title: "MFA recovery options", userId: 4, companyId: COMPANY_ID, createdAt: daysAgo(1) },
  { id: 501, title: "Duplicate August invoice", userId: 5, companyId: COMPANY_ID, createdAt: daysAgo(2) },
  { id: 502, title: null, userId: 4, companyId: COMPANY_ID, createdAt: minutesAgo(12) },
]

/** @type {Array<Record<string, unknown>>} */
const messages = [
  {
    id: 900,
    conversationId: 500,
    role: "USER",
    content: "I enabled two-factor authentication last week and now I cannot sign in at all.",
    createdAt: daysAgo(1),
  },
  {
    id: 901,
    conversationId: 500,
    role: "ASSISTANT",
    content:
      "Sorry to hear that. Two-factor authentication is enabled on your account, so your password alone is no longer sufficient. You will need a one-time code from your authenticator app.",
    createdAt: daysAgo(1),
  },
  {
    id: 902,
    conversationId: 500,
    role: "USER",
    content: "I do not have access to the phone number on the account.",
    createdAt: daysAgo(1),
  },
  {
    id: 903,
    conversationId: 500,
    role: "ASSISTANT",
    content:
      "Understood. Our security policy requires an administrator to reset multi-factor authentication when the second factor is unavailable. I have raised ticket 1001 and assigned it to the support team.",
    createdAt: daysAgo(1),
  },
  {
    id: 904,
    conversationId: 501,
    role: "USER",
    content: "Our August invoice was charged twice. Can you confirm which charge is valid?",
    createdAt: daysAgo(2),
  },
  {
    id: 905,
    conversationId: 501,
    role: "ASSISTANT",
    content:
      "Both charges reference the same subscription period. I have raised ticket 1002 at urgent priority and flagged it for finance review. No action is needed from you yet.",
    createdAt: daysAgo(2),
  },
  {
    id: 906,
    conversationId: 502,
    role: "USER",
    content: "What is the approved process for publishing a new internal handbook?",
    createdAt: minutesAgo(12),
  },
]

/**
 * Per-ticket chat between a ticket's owner and its assigned agent. Mirrors the
 * `ticketChatService` contract (`GET /api/tickets/{ticketId}/messages`), which
 * is a separate service on its own port.
 *
 * `senderName` is stored denormalised because that is how the real service
 * returns it -- it never nests a user.
 *
 * @type {Array<Record<string, unknown>>}
 */
const ticketMessages = [
  {
    id: 950,
    ticketId: 1001,
    senderId: 4,
    senderName: "Sam Whitfield",
    content:
      "I still cannot sign in after the MFA reset. Is there anything else I should try?",
    createdAt: minutesAgo(55),
  },
  {
    id: 951,
    ticketId: 1001,
    senderId: 2,
    senderName: "Daniel Okafor",
    content:
      "Thanks for confirming. I have cleared the second factor on your account. Try signing in again -- if the code prompt appears, skip it and use your password only.",
    createdAt: minutesAgo(40),
  },
  {
    id: 952,
    ticketId: 1003,
    senderId: 4,
    senderName: "Sam Whitfield",
    content:
      "The export dropped about 2,000 rows on the Q3 report. Has the 10,000-row cap been lifted?",
    createdAt: minutesAgo(90),
  },
  {
    id: 953,
    ticketId: 1003,
    senderId: 3,
    senderName: "Mei Lin Chen",
    content:
      "The cap is still in place on the reporting job. I have raised it with the platform team and will post back here once it ships.",
    createdAt: minutesAgo(70),
  },
]

/** @type {Array<Record<string, unknown>>} */
const documents = [
  {
    id: 700,
    title: "Employee Handbook 2026",
    fileName: "employee-handbook-2026.pdf",
    companyId: COMPANY_ID,
    contentType: "application/pdf",
    fileSize: 4_812_004,
    category: DOCUMENT_CATEGORY.HANDBOOK,
    status: DOCUMENT_STATUS.APPROVED,
    rejectionReason: null,
    createdAt: daysAgo(30),
  },
  {
    id: 701,
    title: "Incident Response SOP",
    fileName: "incident-response-sop.docx",
    companyId: COMPANY_ID,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 288_140,
    category: DOCUMENT_CATEGORY.SOP,
    status: DOCUMENT_STATUS.APPROVED,
    rejectionReason: null,
    createdAt: daysAgo(22),
  },
  {
    id: 702,
    title: "Q1 Marketing Campaign Brief",
    fileName: "q1-campaign-brief.pdf",
    companyId: COMPANY_ID,
    contentType: "application/pdf",
    fileSize: 1_204_882,
    category: DOCUMENT_CATEGORY.REPORT,
    status: DOCUMENT_STATUS.REJECTED,
    rejectionReason:
      "Not relevant to internal helpdesk knowledge and contains external marketing copy.",
    createdAt: daysAgo(9),
  },
  {
    id: 703,
    title: "Expense Claim Form",
    fileName: "expense-claim-form.csv",
    companyId: COMPANY_ID,
    contentType: "text/csv",
    fileSize: 4_096,
    category: DOCUMENT_CATEGORY.FORM,
    status: DOCUMENT_STATUS.UPLOADED,
    rejectionReason: null,
    createdAt: minutesAgo(20),
  },
]

/** Monotonic id source so created rows get stable, non-colliding ids. */
let nextTicketId = 1100
let nextConversationId = 600
let nextDocumentId = 800
let nextUserId = 20
let nextTicketMessageId = 960

export const store = {
  companyId: COMPANY_ID,
  companyName: "Acme Corporation",
  company,
  users,
  tickets,
  conversations,
  messages,
  ticketMessages,
  documents,

  reset() {
    users.length = 0
    tickets.length = 0
    conversations.length = 0
    messages.length = 0
    ticketMessages.length = 0
    documents.length = 0
    company.apiKey = null
    company.apiKeyUpdatedAt = null
    nextTicketId = 1100
    nextConversationId = 600
    nextDocumentId = 800
    nextUserId = 20
    nextTicketMessageId = 960
  },

  nextTicketId: () => nextTicketId++,
  nextConversationId: () => nextConversationId++,
  nextDocumentId: () => nextDocumentId++,
  nextUserId: () => nextUserId++,
  nextTicketMessageId: () => nextTicketMessageId++,
}

/**
 * Strip the password before anything is serialised towards the browser --
 * mirroring what the real backend does NOT do on `POST /invitation/send`,
 * which leaks the inviter's BCrypt hash. The mock behaves correctly on
 * purpose so the UI never learns to depend on the leak.
 *
 * @param {MockUser} user
 */
export function toUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  }
}