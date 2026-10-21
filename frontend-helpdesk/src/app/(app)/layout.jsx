import { redirect } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { getServerSession } from "@/lib/auth/server"
import { Toaster } from "@/components/ui/toast"

/**
 * Layout for every authenticated page.
 *
 * The session is read on the server from the httpOnly cookie, so an
 * unauthenticated visitor never sees a frame of the app before being redirected.
 * `src/proxy.js` also guards these paths, but that is a redirect convenience --
 * this check is what actually decides whether a page renders.
 */
export default async function AppLayout({ children }) {
  const session = await getServerSession()

  if (!session) redirect("/login")

  return (
    <AppShell session={session}>
      {/*
        One toaster for the whole app. Inside the authenticated tree so the
        sign-in screen does not need its own.
      */}
      <Toaster />
      {children}
    </AppShell>
  )
}