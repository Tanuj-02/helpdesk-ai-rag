"use client"

import * as React from "react"
import { PaperPlaneRight, Plus, Sparkle, StopCircle, User, Warning } from "@phosphor-icons/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { api, ApiError, isAiQuotaError } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import {
  AI_KEY_REQUIRED_MESSAGE,
  AI_MODEL_LABEL,
  AI_MODELS,
  AI_QUOTA_MESSAGE,
  AI_QUOTA_TITLE,
  DEFAULT_AI_MODEL,
  MESSAGE_ROLE,
  ROLE,
} from "@/lib/constants"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

const PROMPT_SUGGESTIONS = [
  "What is our policy on travel and expense reimbursement?",
  "How do I request hardware equipment or IT access?",
  "What are our standard SLA response times for urgent tickets?",
  "How can an agent escalate a critical customer issue?",
]

/** Stable empty array so the derived view does not change identity each render. */
const EMPTY_MESSAGES = []

/**
 * Styling for assistant markdown. The project has no typography plugin, so the
 * element styles are applied with Tailwind descendant variants on one wrapper.
 */
const MARKDOWN_CLASSES = [
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5",
  "[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2",
  "[&_strong]:font-semibold [&_em]:italic [&_del]:line-through",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-semibold",
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:font-semibold",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-semibold",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:opacity-80",
  "[&_hr]:my-3 [&_hr]:border-border",
  "[&_code]:rounded [&_code]:bg-foreground/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-foreground/10 [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[0.85em]",
  "[&_table]:my-2 [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
].join(" ")

/**
 * Assistant chat.
 *
 * 1. `GET /ai/chat` is a **GET**, so the question travels in the query string
 *    and lands in the server's access logs. That is the backend's design and
 *    cannot be fixed from here; it is noted so nobody is surprised.
 * 2. The company Gemini key gates the whole feature. When it is missing the
 *    user gets an explanatory empty state rather than a failed send.
 */
export function ChatPanel({ session, initialConversations = [] }) {
  const [conversations, setConversations] = React.useState(initialConversations)
  const [activeId, setActiveId] = React.useState(initialConversations[0]?.id ?? null)
  const [messages, setMessages] = React.useState([])
  const [model, setModel] = React.useState(DEFAULT_AI_MODEL)
  const [draft, setDraft] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [quotaError, setQuotaError] = React.useState(false)
  const [aiStatus, setAiStatus] = React.useState({ loading: true, configured: false, error: null })

  const abortRef = React.useRef(null)
  const scrollRef = React.useRef(null)

  // --- is the assistant available at all? --------------------------------

  React.useEffect(() => {
    let active = true
    api
      .getAiConfig()
      .then((config) => {
        if (!active) return
        setAiStatus({ loading: false, configured: config.configured, error: null })
      })
      .catch((error) => {
        if (!active) return
        setAiStatus({
          loading: false,
          configured: false,
          error: error instanceof ApiError ? error.message : "Could not reach the server.",
        })
      })
    return () => {
      active = false
    }
  }, [])

  // --- the user's existing conversations -----------------------------------
  //
  // Without this the panel opens empty every time and past chats are invisible,
  // which is exactly what `GET /conversation` exists to prevent.

  React.useEffect(() => {
    let active = true
    api
      .listConversations()
      .then((page) => {
        if (!active) return
        const items = sortConversations(page?.content ?? [])
        setConversations(items)
        // Open the most recent conversation; leave a deliberate choice alone.
        setActiveId((current) => current ?? items[0]?.id ?? null)
      })
      .catch((error) => {
        if (active) notifyApiError(error, "Could not load your conversations")
      })
    return () => {
      active = false
    }
  }, [])

  // --- load history whenever the active conversation changes ---------------

  React.useEffect(() => {
    if (activeId == null) return
    let active = true

    api
      .listMessages(activeId)
      .then((page) => {
        if (!active) return
        // The backend's `...createdAtDesc` query ignores the `sort=createdAt,asc`
        // we send, so a reload would otherwise render the thread newest-first.
        setMessages(sortChronologically(page?.content ?? []))
      })
      .catch((error) => {
        // A conversation that fails to load is not fatal -- the user can still
        // send a new message.
        if (active) notifyApiError(error, "Could not load this conversation")
      })

    return () => {
      active = false
    }
  }, [activeId])

  // With no active conversation there is nothing to show. Derived rather than
  // cleared inside the effect, which would be a cascading render.
  const visibleMessages = activeId == null ? EMPTY_MESSAGES : messages

  // Keep the newest message in view as the answer streams in.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function startConversation() {
    try {
      const created = await api.createConversation()
      const nextId = created?.id
      if (!nextId) throw new ApiError("The server did not return a conversation id.")
      const now = new Date().toISOString()
      setConversations((prev) =>
        sortConversations([
          {
            id: nextId,
            title: null,
            createdAt: created?.createdAt ?? now,
            updatedAt: now,
          },
          ...prev,
        ]),
      )
      setActiveId(nextId)
      return nextId
    } catch (error) {
      notifyApiError(error, "Could not start a conversation")
      return null
    }
  }

  function newChat() {
    setActiveId(null)
  }

  /**
   * Re-read the list after a turn so a title the server generated from the
   * first message shows up. Purely cosmetic, so failures stay silent.
   */
  async function refreshConversations() {
    try {
      const page = await api.listConversations()
      setConversations(sortConversations(page?.content ?? []))
    } catch {
      // Ignore: the list is only a convenience.
    }
  }

  async function send(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return

    if (!aiStatus.configured) {
      notifyApiError(new ApiError(AI_KEY_REQUIRED_MESSAGE), "The assistant is unavailable")
      return
    }

    const conversationId = activeId ?? (await startConversation())
    if (conversationId == null) return

    setDraft("")
    setBusy(true)
    const turn = Date.now()
    const sentAt = new Date(turn).toISOString()

    // Sending a message makes this the most recently active conversation, so
    // lift it to the top straight away rather than waiting for the refresh.
    setConversations((prev) =>
      sortConversations(
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, updatedAt: sentAt }
            : conversation,
        ),
      ),
    )

    setMessages((prev) => [
      ...prev,
      { id: `local-${turn}`, role: MESSAGE_ROLE.USER, content: text, createdAt: sentAt, pending: true },
      // Empty placeholder that the stream fills in place. The id must be unique
      // per turn, or a second send in the same conversation repeats the key.
      { id: `stream-${conversationId}-${turn}`, role: MESSAGE_ROLE.ASSISTANT, content: "", createdAt: sentAt, streaming: true },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await api.streamChat({ query: text, chatId: conversationId, model }, (chunk, full) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.streaming ? { ...message, content: full } : message,
          ),
        )
      }, controller.signal)
      // A clean turn clears a quota banner raised by an earlier send.
      setQuotaError(false)
    } catch (error) {
      if (error?.name === "AbortError") {
        notify.info("Stopped generating")
      } else if (isAiQuotaError(error)) {
        // A billing state, not a bug. One persistent, actionable banner beats a
        // toast that scrolls away, and the failed turn is dropped so the thread
        // is not left with an empty assistant bubble.
        setMessages((prev) => prev.filter((message) => !message.streaming))
        setQuotaError(true)
        notify.error(AI_QUOTA_TITLE, { description: AI_QUOTA_MESSAGE })
      } else {
        // Drop the empty placeholder rather than leaving a blank bubble.
        setMessages((prev) => prev.filter((message) => !message.streaming))
        notifyApiError(error, "The assistant could not answer")
      }
    } finally {
      setMessages((prev) =>
        prev.map((message) =>
          message.streaming
            ? { ...message, streaming: false, pending: false, partial: true }
            : { ...message, pending: false },
        ),
      )
      setBusy(false)
      abortRef.current = null
      refreshConversations()
    }
  }

  function stop() {
    abortRef.current?.abort()
  }

  return (
    <div className="flex h-[calc(100svh-7rem)] flex-col gap-4 md:flex-row">
      <aside className="flex shrink-0 flex-col gap-2 md:w-64">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Conversations</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={newChat}
            disabled={busy}
          >
            <Plus weight="bold" aria-hidden />
            New
          </Button>
        </div>
        <div className="max-h-40 flex flex-col gap-1 overflow-y-auto rounded-lg border border-border/60 p-1.5 md:max-h-none md:flex-1">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-xs">
              No conversations yet.
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setActiveId(conversation.id)}
                className={
                  "flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition-all " +
                  (conversation.id === activeId
                    ? "bg-primary/10 text-primary font-medium shadow-xs border border-primary/20"
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground")
                }
              >
                <span className="w-full truncate text-xs font-semibold">
                  {conversation.title || "New conversation"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatWhen(conversation.updatedAt ?? conversation.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Assistant</h1>
            <Badge variant="outline" className="text-[11px] font-mono text-primary gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Qdrant RAG
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Answers are grounded in your workspace documents.
          </p>
        </div>

        {/* The model picker. */}
        <div className="flex items-center gap-2">
          <label htmlFor="model" className="text-muted-foreground text-xs font-medium">
            Model
          </label>
          <Select value={model} onValueChange={(value) => setModel(value ?? DEFAULT_AI_MODEL)}>
            <SelectTrigger id="model" className="w-52 h-9 text-xs">
              <SelectValue>{AI_MODEL_LABEL[model]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((option) => (
                <SelectItem key={option.id} value={option.id} className="text-xs">
                  {AI_MODEL_LABEL[option.id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {aiStatus.loading ? (
        <Alert>
          <Spinner />
          <AlertTitle>Checking assistant availability</AlertTitle>
        </Alert>
      ) : !aiStatus.configured ? (
        <Alert variant="destructive">
          <Warning weight="fill" aria-hidden />
          <AlertTitle>Assistant unavailable</AlertTitle>
          <AlertDescription>
            {aiStatus.error ?? AI_KEY_REQUIRED_MESSAGE}
            {session?.role === ROLE.ADMIN ? (
              <Button variant="outline" size="sm" className="mt-3" render={<a href="/admin/settings" />}>
                Add a Gemini API key
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {quotaError && aiStatus.configured ? (
        <Alert variant="destructive">
          <Warning weight="fill" aria-hidden />
          <AlertTitle>{AI_QUOTA_TITLE}</AlertTitle>
          <AlertDescription>
            {AI_QUOTA_MESSAGE}
            {session?.role === ROLE.ADMIN ? (
              <Button variant="outline" size="sm" className="mt-3" render={<a href="/admin/settings" />}>
                Manage the Gemini API key
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 shadow-xs">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
              <Sparkle className="size-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {aiStatus.configured ? "Ask your workspace assistant" : "Assistant unavailable"}
            </h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-xs">
              {aiStatus.configured
                ? "Every response is grounded in approved internal documents and verified through vector retrieval."
                : "A workspace administrator must configure an active Gemini API key in Settings."}
            </p>

            {aiStatus.configured ? (
              <div className="mt-6 flex flex-col gap-2 w-full max-w-md">
                <span className="text-[11px] font-medium text-muted-foreground">Try asking:</span>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setDraft(suggestion)}
                      className="rounded-lg border border-border/70 bg-card p-2.5 text-left text-xs text-foreground transition-all hover:border-primary/50 hover:bg-muted/40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="flex-1">
              <MessageScrollerViewport className="p-4 sm:p-6">
                <MessageScrollerContent className="gap-5">
                  {visibleMessages.map((message) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={message.role === MESSAGE_ROLE.USER}
                    >
                      <MessageBubble message={message} />
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}

        <form onSubmit={send} className="flex items-end gap-2 border-t border-border/60 bg-muted/10 p-3">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              aiStatus.configured
                ? `Ask ${AI_MODEL_LABEL[model]} anything… (Shift+Enter for new line)`
                : "The assistant is unavailable"
            }
            disabled={!aiStatus.configured || busy}
            className="max-h-40 min-h-11 resize-none text-xs"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                send(event)
              }
            }}
          />
          {busy ? (
            <Button type="button" variant="outline" size="icon" onClick={stop} aria-label="Stop generating">
              <StopCircle weight="fill" className="size-4 text-destructive" aria-hidden />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!draft.trim() || !aiStatus.configured}
              aria-label="Send message"
            >
              <PaperPlaneRight weight="fill" className="size-4" aria-hidden />
            </Button>
          )}
        </form>
      </div>
      </div>
    </div>
  )
}

/**
 * Order a conversation oldest -> newest.
 */
function sortChronologically(messages) {
  return [...messages].sort((a, b) => {
    const byDate = String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
    if (byDate !== 0) return byDate
    return (a.id ?? 0) - (b.id ?? 0)
  })
}

function formatWhen(iso) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/** Wall-clock time shown under a message bubble. */
function formatClock(iso) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function sortConversations(list) {
  return [...list].sort((a, b) => {
    const byDate = String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
      String(a.updatedAt ?? a.createdAt ?? ""),
    )
    if (byDate !== 0) return byDate
    return (b.id ?? 0) - (a.id ?? 0)
  })
}

function MessageBubble({ message }) {
  const fromUser = message.role === MESSAGE_ROLE.USER
  const stamp = formatClock(message.createdAt)

  return (
    <Message align={fromUser ? "end" : "start"}>
      <MessageAvatar>
        <Avatar className="size-7">
          <AvatarFallback
            className={
              fromUser
                ? "bg-secondary text-secondary-foreground text-[10px] font-semibold"
                : "bg-primary text-primary-foreground text-[10px]"
            }
          >
            {fromUser ? <User className="size-3.5" /> : <Sparkle weight="fill" className="size-3.5" />}
          </AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent>
        <MessageHeader>
          <span className="font-semibold text-foreground text-xs">
            {fromUser ? "You" : "HelpDesk Assistant"}
          </span>
          {stamp ? (
            <>
              <span className="mx-1 text-muted-foreground/50">&bull;</span>
              <span className="text-[11px] font-normal text-muted-foreground">{stamp}</span>
            </>
          ) : null}
        </MessageHeader>
        <Bubble variant={fromUser ? "default" : "secondary"} align={fromUser ? "end" : "start"}>
          <BubbleContent className="rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[42rem]">
            {message.streaming && !message.content ? (
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                <Spinner /> Searching vectors & formulating answer…
              </span>
            ) : fromUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <div className={MARKDOWN_CLASSES}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            )}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}