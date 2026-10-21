"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, PaperPlaneRight, WarningCircle } from "@phosphor-icons/react"

import { api, ApiError } from "@/lib/api/client"
import { notifyApiError } from "@/lib/toast"
import { StompClient } from "@/lib/stomp"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

/** Stable empty array so derived values keep a stable identity. */
const EMPTY_MESSAGES = []

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
 * The page is UI-only in the sense that it assumes the service is reachable; it
 * degrades to a clear error rather than a blank screen when it is not.
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
    <div className="flex h-[calc(100svh-7rem)] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link
          href={`/tickets/${ticketId}`}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to ticket
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Ticket chat</h1>
          <ConnectionBadge status={effectiveStatus} mode={mode} />
        </div>
        {ticket ? (
          <p className="text-muted-foreground text-sm">
            #{ticket.id} — {ticket.subject}
          </p>
        ) : null}
      </div>

      {ticketResolved && !canChat ? (
        <EmptyNotice
          title="Ticket not found"
          body="This ticket is not visible to you, so there is no conversation to show."
        />
      ) : (
        <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
          {status === "error" || status === "reconnecting" ? (
            <div className="border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
              {status === "reconnecting"
                ? "Connection lost — reconnecting…"
                : statusMessage || "The chat connection dropped."}
            </div>
          ) : null}
          {error ? (
            <div className="p-4 flex-1">
              <EmptyNotice title="Chat unavailable" body={error} tone="error" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-muted-foreground flex h-full flex-1 flex-col items-center justify-center gap-2 text-center text-sm p-4">
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
                <MessageScrollerViewport className="p-4">
                  <MessageScrollerContent className="gap-4">
                    {messages.map((message) => {
                      const mine = message.senderId === session.userId
                      const name = message.senderName?.trim() || "Unknown"
                      const initials = mine ? "You" : name.slice(0, 2).toUpperCase()

                      return (
                        <MessageScrollerItem
                          key={message.id ?? `${message.senderId}-${message.createdAt}-${message.content}`}
                          messageId={message.id}
                          scrollAnchor={mine}
                        >
                          <Message align={mine ? "end" : "start"}>
                            <MessageAvatar>
                              <Avatar className="size-7">
                                <AvatarFallback className="text-[10px] font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </MessageAvatar>
                            <MessageContent>
                              <MessageHeader>
                                <span>{mine ? "You" : name}</span>
                                <span className="mx-1 text-muted-foreground/50">&bull;</span>
                                <span className="text-[11px] font-normal text-muted-foreground">
                                  {formatStamp(message.createdAt)}
                                </span>
                              </MessageHeader>
                              <Bubble variant={mine ? "default" : "secondary"} align={mine ? "end" : "start"}>
                                <BubbleContent className="rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap">
                                  {message.content}
                                </BubbleContent>
                              </Bubble>
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      )
                    })}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          )}

          <form onSubmit={send} className="flex items-end gap-3 border-t border-border/60 p-3 bg-muted/10">
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
              placeholder="Write a message… (Press Enter to send)"
              disabled={!canChat || Boolean(error)}
              rows={1}
              className="max-h-40 min-h-10 resize-none text-xs"
              aria-label="Message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!canChat || sending || !draft.trim()}
              aria-label="Send message"
            >
              {sending ? <Spinner /> : <PaperPlaneRight className="size-4" />}
            </Button>
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
      ? "bg-emerald-500"
      : status === "connecting" || status === "reconnecting"
        ? "bg-amber-500"
        : "bg-destructive"

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
      <span className={`size-1.5 rounded-full ${tone}`} aria-hidden />
      {labels[status] ?? status}
    </span>
  )
}

function EmptyNotice({ title, body, tone = "muted" }) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border p-6 text-center text-sm ${
        tone === "error" ? "border-destructive/40 text-destructive" : "text-muted-foreground"
      }`}
    >
      <WarningCircle className="size-5" aria-hidden />
      <p className="text-foreground font-medium">{title}</p>
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