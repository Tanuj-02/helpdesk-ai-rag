/**
 * Seeded logins, exposed at `/api/auth/active-users`.
 *
 * This is a MOCK-MODE convenience only: while the backend is down there is no
 * other way to see the app as an admin, an agent or an employee, and role-aware
 * navigation is impossible to review without switching roles quickly.
 *
 * It exists behind a single request so it can be removed wholesale when the
 * real service is wired up -- delete this file and the `active-users` branch in
 * `src/app/api/[...path]/route.js`.
 */

import { ROLE } from "@/lib/constants"

/** @type {Array<{ email: string, name: string, role: string, hint: string }>} */
export const demoAccounts = [
  {
    email: "admin@acme.com",
    name: "Priya Raman",
    role: ROLE.ADMIN,
    hint: "Full company tickets, user management, document upload, invitations",
  },
  {
    email: "agent@acme.com",
    name: "Daniel Okafor",
    role: ROLE.AGENT,
    hint: "Only tickets assigned to them, plus their own AI chats",
  },
  {
    email: "sam@acme.com",
    name: "Sam Whitfield",
    role: ROLE.EMPLOYEE,
    hint: "Only their own tickets and conversations",
  },
  {
    email: "yusuf@acme.com",
    name: "Yusuf Demir",
    role: ROLE.EMPLOYEE,
    hint: "Second employee, so ticket assignment can be seen working",
  },
]

/** Every seeded account uses this password. Shown on the sign-in screen. */
export const DEMO_PASSWORD = "password"