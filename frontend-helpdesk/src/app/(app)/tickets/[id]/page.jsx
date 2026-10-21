import { TicketDetail } from "@/components/ticket-detail"
import { getServerSession } from "@/lib/auth/server"

export default async function TicketPage({ params }) {
  const session = await getServerSession()
  // `params` is a Promise in Next.js 16.
  const { id } = await params

  return <TicketDetail role={session.role} ticketId={Number(id)} />
}