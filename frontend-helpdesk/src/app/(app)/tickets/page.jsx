import { TicketList } from "@/components/ticket-list"
import { getServerSession } from "@/lib/auth/server"

export default async function TicketsPage() {
  // The layout already guarantees a session; read it again only to pass the
  // role through, since the role decides which list endpoint exists.
  const session = await getServerSession()

  return <TicketList role={session.role} />
}