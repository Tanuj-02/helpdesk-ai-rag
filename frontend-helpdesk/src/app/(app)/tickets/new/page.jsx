import { TicketForm } from "@/components/ticket-form"
import { getServerSession } from "@/lib/auth/server"

export default async function NewTicketPage() {
  const session = await getServerSession()
  return <TicketForm session={session} />
}