import { redirect } from "next/navigation"

import { getServerSession } from "@/lib/auth/server"
import { AiSettings } from "@/components/ai-settings"

export default async function AdminSettingsPage() {
  const session = await getServerSession()
  if (!session) redirect("/login")

  return <AiSettings session={session} />
}
