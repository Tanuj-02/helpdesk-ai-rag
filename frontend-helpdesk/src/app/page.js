import { getServerSession } from "@/lib/auth/server"
import { LandingPage } from "@/components/landing-page"

export default async function HomePage() {
  const session = await getServerSession()
  return <LandingPage session={session} />
}
