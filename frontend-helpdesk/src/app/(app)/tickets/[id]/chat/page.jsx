import { TicketChat } from "@/components/ticket-chat"
import { getServerSession } from "@/lib/auth/server"

export default async function TicketChatPage({ params }) {
  const session = await getServerSession()
  // `params` is a Promise in Next.js 16.
  const { id } = await params

  return <TicketChat session={session} ticketId={Number(id)} />
}