"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, PaperPlaneRight, WarningCircle } from "@phosphor-icons/react"

import { api, ApiError } from "@/lib/api/client"
import { notifyApiError } from "@/lib/toast"
import { StompClient } from "@/lib/stomp"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { personInitials } from "@/lib/workspace"

/**
 * Per-ticket chat between the ticket's owner and its assigned agent.
 *
 * Transport is mode-dependent because the chat lives in `ticketChatService`,
 * which exposes history over REST but sending only over STOMP:
 *
 *   - live: history over the BFF proxy, live messages and sends over a
 *     WebSocket (`src/lib/stomp.js`).
 *   - mock: the BFF stands in for both, and this page polls for new messages.
 *
 * The page is UI-only in the sense that it assumes the service is reachable;
 * it degrades to a clear error rather than a blank screen when it is not.
 */
export function TicketChat({ session, ticketId }) {
  const [config, setConfig] = React.useState(null)
  const [ticket, setTicket] = React.useState(undefined)
  const [messages, setMessages] = React.useState([])
  const [draft, setDraft] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [status, setStatus] = React.useState("connecting")
  const [statusMessage, setStatusMessage] = React.useState("")
  const [error, setError] = React.useState(null)

  const scrollRef = React.useRef(null)
  const clientRef = React.useRef(null)

  const mode = config?.mode ?? null
  const wsUrl = config?.ticketChat?.wsUrl ?? null
  const ticketResolved = ticket !== undefined
  const canChat = ticketResolved && ticket !== null
  // Mock mode has no socket to wait on, so it is always effectively connected.
  const effectiveStatus = mode === "mock" ? "connected" : status

  // --- ticket header + runtime config -------------------------------------

  React.useEffect(() => {
    let active = true

    api
      .findTicket(session.role, ticketId)
      .then((found) => {
        if (active) setTicket(found ?? null)
      })
      .catch(() => {
        if (active) setTicket(null)
      })

    api
      .getRuntimeConfig()
      .then((value) => {
        if (active) setConfig(value ?? { mode: "mock" })
      })
      .catch(() => {
        // A config failure must not dead-end the page; the mock transport is
        // the safest assumption.
        if (active) setConfig({ mode: "mock" })
      })

    return () => {
      active = false
    }
  }, [session.role, ticketId])

  // --- history + live transport -------------------------------------------

  React.useEffect(() => {
    if (!mode || !canChat) return
    let active = true

    api
      .listTicketMessages(ticketId)
      .then((rows) => {
        if (active) setMessages(Array.isArray(rows) ? rows : [])
      })
      .catch((err) => {
        if (!active) return
        // A ticket with no chat thread yet reports 404 upstream. That is an
        // empty conversation, not a failure, so it must not blank the page.
        if (err instanceof ApiError && err.status === 404) return
        setError(err instanceof ApiError ? err.message : "Could not load this chat.")
      })

    // Mock mode has no socket: poll the BFF for new messages instead. Its
    // connection state is derived from `mode`, so nothing is set here.
    if (mode === "mock") {
      const timer = setInterval(() => {
        api
          .listTicketMessages(ticketId)
          .then((rows) => {
            if (active && Array.isArray(rows)) setMessages(rows)
          })
          .catch(() => {})
      }, 3000)
      return () => {
        active = false
        clearInterval(timer)
      }
    }

    // Live mode: authenticate the STOMP CONNECT and subscribe to this ticket.
    let client = null
    api
      .getTicketChatToken()
      .then(({ token }) => {
        if (!active || !token) return
        client = new StompClient(wsUrl, {
          token,
          onStatus: (next) => {
            if (!active) return
            setStatus(next.state)
            setStatusMessage(next.message ?? "")
          },
          onMessage: (message) => {
            if (active) setMessages((prev) => mergeMessages(prev, [message]))
          },
        })
        clientRef.current = client
        client.subscribe(`/topic/ticket/${ticketId}`, (message) => {
          if (active) setMessages((prev) => mergeMessages(prev, [message]))
        })
        client.connect()
      })
      .catch((err) => {
        if (active) {
          setStatus("error")
          setError(err instanceof ApiError ? err.message : "The chat service is unavailable.")
        }
      })

    return () => {
      active = false
      client?.disconnect()
      clientRef.current = null
    }
  }, [mode, wsUrl, canChat, ticketId])

  // Keep the newest message in view.
  React.useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages])

  async function send(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending) return

    setSending(true)
    try {
      if (mode === "live") {
        const published = clientRef.current?.publish("/app/ticket/chat", {
          ticketId,
          senderName: session.name ?? "",
          content,
        })
        if (!published) {
          throw new ApiError("The chat is not connected yet. Try again in a moment.")
        }
      } else {
        const saved = await api.postTicketMessage(ticketId, content)
        setMessages((prev) => mergeMessages(prev, [saved]))
      }
      setDraft("")
    } catch (err) {
      notifyApiError(err, "Could not send your message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="workspace-chat flex flex-col">
      <div className="flex h-13 shrink-0 items-center gap-3 border-b border-border px-4">
        <Link
          href={`/tickets/${ticketId}`}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-[12px] transition-colors duration-150"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to ticket
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[14px] font-semibold text-foreground">
            {ticket ? `#${ticket.id} — ${ticket.subject}` : "Ticket chat"}
          </h1>
        </div>
        <ConnectionBadge status={effectiveStatus} mode={mode} />
      </div>

      {ticketResolved && !canChat ? (
        <div className="p-4">
          <EmptyNotice
            title="Ticket not found"
            body="This ticket is not visible to you, so there is no conversation to show."
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {status === "error" || status === "reconnecting" ? (
            <div className="border-b border-warning/30 bg-warning/5 px-4 py-2 text-[12px] text-warning">
              {status === "reconnecting"
                ? "Connection lost — reconnecting…"
                : statusMessage || "The chat connection dropped."}
            </div>
          ) : null}
          {error ? (
            <div className="flex-1 p-4">
              <EmptyNotice title="Chat unavailable" body={error} tone="error" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-[13px]">
              {effectiveStatus === "connecting" ? (
                <>
                  <Spinner />
                  <span>Connecting to the conversation…</span>
                </>
              ) : (
                <span>No messages yet. Say hello to get started.</span>
              )}
            </div>
          ) : (
            <MessageScrollerProvider autoScroll>
              <MessageScroller className="flex-1">
                <MessageScrollerViewport>
                  <div className="mx-auto w-full max-w-[44rem] px-4 py-5">
                    <MessageScrollerContent className="gap-5">
                      {messages.map((message) => {
                        const mine = message.senderId === session.userId
                        const name = message.senderName?.trim() || "Unknown"

                        return (
                          <MessageScrollerItem
                            key={message.id ?? `${message.senderId}-${message.createdAt}-${message.content}`}
                            messageId={message.id}
                            scrollAnchor={mine}
                          >
                            <Message align={mine ? "end" : "start"}>
                              <MessageAvatar>
                                <Avatar className="size-6">
                                  <AvatarFallback>
                                    {mine
                                      ? personInitials(session.name, session.email)
                                      : personInitials(name)}
                                  </AvatarFallback>
                                </Avatar>
                              </MessageAvatar>
                              <MessageContent>
                                <MessageHeader>
                                  <span className="font-medium text-foreground">
                                    {mine ? "You" : name}
                                  </span>
                                  <span className="text-muted-foreground/50">&middot;</span>
                                  <span className="font-normal text-muted-foreground">
                                    {formatStamp(message.createdAt)}
                                  </span>
                                </MessageHeader>
                                <div
                                  className={`max-w-[80%] rounded-md border px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                                    mine
                                      ? "border-border bg-surface-sunken text-foreground"
                                      : "border-border bg-surface text-foreground"
                                  }`}
                                >
                                  {message.content}
                                </div>
                              </MessageContent>
                            </Message>
                          </MessageScrollerItem>
                        )
                      })}
                    </MessageScrollerContent>
                  </div>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          )}

          <form
            onSubmit={send}
            className="shrink-0 border-t border-border bg-background"
          >
            <div className="mx-auto w-full max-w-[44rem] px-4 py-3">
              <div className="flex items-end gap-2 rounded-lg border border-input bg-background p-1.5 transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter sends; Shift+Enter adds a newline.
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      send(event)
                    }
                  }}
                  placeholder="Write a message"
                  disabled={!canChat || Boolean(error)}
                  rows={1}
                  className="max-h-40 min-h-9 resize-none border-0 bg-transparent px-1.5 py-1.5 text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0"
                  aria-label="Message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!canChat || sending || !draft.trim()}
                  aria-label="Send message"
                  className="size-8 shrink-0"
                >
                  {sending ? <Spinner /> : <PaperPlaneRight className="size-4" />}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Enter sends. Shift+Enter adds a new line.
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/** Deduplicate by id and keep chronological order. */
function mergeMessages(prev, incoming) {
  const byId = new Map(prev.map((message) => [message.id, message]))
  for (const message of incoming) {
    if (message && message.id != null) byId.set(message.id, message)
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

function ConnectionBadge({ status, mode }) {
  const labels = {
    connecting: "Connecting…",
    connected: mode === "mock" ? "Demo mode" : "Live",
    reconnecting: "Reconnecting…",
    disconnected: "Disconnected",
    error: "Disconnected",
  }
  const tone =
    status === "connected"
      ? "bg-success"
      : status === "connecting" || status === "reconnecting"
        ? "bg-warning"
        : "bg-destructive"

  return (
    <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 text-[12px]">
      <span className={`size-1.5 rounded-full ${tone}`} aria-hidden />
      {labels[status] ?? status}
    </span>
  )
}

function EmptyNotice({ title, body, tone = "muted" }) {
  return (
    <div
      className={`flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left text-[13px] ${
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-surface text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-2">
        <WarningCircle className="size-4 shrink-0" aria-hidden />
        <p className="text-foreground font-medium">{title}</p>
      </div>
      <p>{body}</p>
    </div>
  )
}

/**
 * Message timestamp. Time alone while the message is from today reads cleanest;
 * anything older gets its date so a long-running thread stays readable.
 */
function formatStamp(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) return time
  const day = date.toLocaleDateString(undefined, { day: "numeric", month: "short" })
  return `${day}, ${time}`
}
