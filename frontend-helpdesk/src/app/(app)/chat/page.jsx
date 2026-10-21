import { ChatPanel } from "@/components/chat-panel"
import { getServerSession } from "@/lib/auth/server"

export default async function ChatPage() {
  const session = await getServerSession()
  return <ChatPanel session={session} />
}