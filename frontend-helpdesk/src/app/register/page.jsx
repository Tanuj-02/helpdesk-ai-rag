import { redirect } from "next/navigation"

import { getServerSession } from "@/lib/auth/server"
import { AuthPageShell } from "@/components/auth-page-shell"
import { InvitationRegistrationForm } from "@/components/invitation-registration-form"

export default async function RegisterPage({ searchParams }) {
  const session = await getServerSession()
  if (session) redirect(session.role === "ADMIN" ? "/admin/users" : "/tickets")
  const query = await searchParams
  const token = typeof query?.token === "string" ? query.token : ""

  return (
    <AuthPageShell
      title="Join your workspace"
      description="Set up your account using the invitation link sent by your administrator."
    >
      <InvitationRegistrationForm token={token} />
    </AuthPageShell>
  )
}
