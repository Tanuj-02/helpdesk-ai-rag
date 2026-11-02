import { redirect } from "next/navigation"

import { getServerSession } from "@/lib/auth/server"
import { AuthPageShell } from "@/components/auth-page-shell"
import { CompanyRegistrationForm } from "@/components/company-registration-form"

export default async function RegisterCompanyPage() {
  const session = await getServerSession()
  if (session) redirect(session.role === "ADMIN" ? "/admin/users" : "/tickets")

  return (
    <AuthPageShell
      title="Create a workspace"
      description="Register your company and create its first administrator account. You can invite your team after signing in."
    >
      <CompanyRegistrationForm />
    </AuthPageShell>
  )
}
