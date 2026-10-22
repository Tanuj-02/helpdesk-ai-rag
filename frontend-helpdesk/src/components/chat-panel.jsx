"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowClockwise,
  Check,
  Copy,
  PaperPlaneRight,
  Plus,
  ThumbsDown,
  ThumbsUp,
  StopCircle,
  User,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react"
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
import { workspaceName } from "@/lib/workspace"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Message,
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
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  SourcePanel,
  SourceRow,
  deriveSources,
  renderWithCitations,
} from "@/components/chat-sources"

/**
 * Starter questions.
 *
 * Drawn from the kinds of things a company handbook actually covers, phrased
 * the way an employee would type them. Rendered as plain text chips, not as
 * gradient cards.
 */
const PROMPT_SUGGESTIONS = [
  "What is our policy on travel and expense reimbursement?",
  "How do I request hardware equipment or IT access?",
  "How much annual leave do I get, and how do I book it?",
  "Who do I contact about payroll or payslips?",
]

/** Stable empty array so the derived view does not change identity each render. */
const EMPTY_MESSAGES = []

/**
 * Styling for assistant markdown. The project has no typography plugin, so the
 * element styles are applied with Tailwind descendant variants on one wrapper.
 */
const MARKDOWN_CLASSES = [
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2",
  "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_strong]:font-semibold [&_em]:italic [&_del]:line-through",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_li]:pl-0.5",
  "[&_h1]:mt-4 [&_h1]:mb-1.5 [&_h1]:text-[16px] [&_h1]:font-semibold",
  "[&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:text-[14px] [&_h2]:font-semibold",
  "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_hr]:my-4 [&_hr]:border-border",
  "[&_code]:rounded-sm [&_code]:bg-surface-sunken [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:ring-1 [&_code]:ring-border/60",
  "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface-sunken [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:ring-0 [&_pre_code]:text-[0.85em]",
  "[&_table]:my-3 [&_table]:w-full [&_table]:text-[12px]",
  "[&_th]:border [&_th]:border-border [&_th]:bg-surface-sunken [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium",
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5",
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
  const [activeSource, setActiveSource] = React.useState(null)
  const [feedback, setFeedback] = React.useState({})

  const abortRef = React.useRef(null)
  const scrollRef = React.useRef(null)

  const company = workspaceName(session)

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

  async function copyAnswer(text) {
    try {
      await navigator.clipboard.writeText(text)
      notify.success("Answer copied")
    } catch {
      notify.error("Could not copy the answer")
    }
  }

  function rateAnswer(messageId, value) {
    setFeedback((current) => ({ ...current, [messageId]: value }))
    // No feedback endpoint exists yet -- see "Backend changes".
    notify.info(
      value === "up" ? "Marked as helpful" : "Marked as not helpful",
      { description: "Thanks. Feedback is not sent anywhere yet." },
    )
  }

  const grouped = React.useMemo(() => groupByDate(conversations), [conversations])

  return (
    <div className="workspace-chat flex flex-col overflow-hidden md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-border bg-sidebar md:w-64 md:border-r md:border-b-0">
        <div className="flex h-13 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
          <h2 className="text-[13px] font-semibold text-foreground">Conversations</h2>
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

        <div className="max-h-44 flex-1 overflow-y-auto p-2 md:max-h-none">
          {conversations.length === 0 ? (
            <p className="px-2 py-6 text-[12px] leading-relaxed text-muted-foreground">
              No conversations yet. Ask a question to start one.
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="mb-3 last:mb-0">
                <p className="px-2 pb-1 text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setActiveId(conversation.id)}
                      aria-current={conversation.id === activeId ? "true" : undefined}
                      className={`flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ${
                        conversation.id === activeId
                          ? "bg-surface-sunken text-foreground"
                          : "text-muted-foreground hover:bg-surface-sunken/60 hover:text-foreground"
                      }`}
                    >
                      <span className="w-full truncate text-[12px] font-medium">
                        {conversation.title || "New conversation"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatWhen(conversation.updatedAt ?? conversation.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-13 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate text-[14px] font-semibold text-foreground">
              Assistant
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              Answers are drawn only from {company}&rsquo;s indexed documents.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label htmlFor="model" className="sr-only">
              Answer model
            </label>
            <Select
              value={model}
              onValueChange={(value) => setModel(value ?? DEFAULT_AI_MODEL)}
            >
              <SelectTrigger id="model" className="h-7 w-40 text-[12px]">
                <SelectValue>{AI_MODEL_LABEL[model]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {AI_MODEL_LABEL[option.id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {aiStatus.loading ? (
          <div className="px-4 pt-3">
            <Alert>
              <Spinner />
              <AlertTitle>Checking assistant availability</AlertTitle>
            </Alert>
          </div>
        ) : !aiStatus.configured ? (
          <div className="px-4 pt-3">
            <Alert variant="destructive">
              <Warning weight="fill" aria-hidden />
              <AlertTitle>Assistant unavailable</AlertTitle>
              <AlertDescription>
                {aiStatus.error ?? AI_KEY_REQUIRED_MESSAGE}
                {session?.role === ROLE.ADMIN ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    render={<a href="/admin/settings" />}
                  >
                    Add a Gemini API key
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {quotaError && aiStatus.configured ? (
          <div className="px-4 pt-3">
            <Alert variant="destructive">
              <Warning weight="fill" aria-hidden />
              <AlertTitle>{AI_QUOTA_TITLE}</AlertTitle>
              <AlertDescription>
                {AI_QUOTA_MESSAGE}
                {session?.role === ROLE.ADMIN ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    render={<a href="/admin/settings" />}
                  >
                    Manage the Gemini API key
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {visibleMessages.length === 0 ? (
            <EmptyThread
              configured={aiStatus.configured}
              company={company}
              onPick={(suggestion) => setDraft(suggestion)}
            />
          ) : (
            <MessageScrollerProvider autoScroll>
              <MessageScroller className="flex-1">
                <MessageScrollerViewport>
                  <div className="mx-auto w-full max-w-[45rem] px-4 py-6 sm:px-6">
                    <MessageScrollerContent className="gap-7">
                      {visibleMessages.map((message) => (
                        <MessageScrollerItem
                          key={message.id}
                          messageId={message.id}
                          scrollAnchor={message.role === MESSAGE_ROLE.USER}
                        >
                          <AnswerBlock
                            message={message}
                            company={company}
                            onOpenSource={setActiveSource}
                            onCopy={copyAnswer}
                            onRate={rateAnswer}
                            feedback={feedback[message.id]}
                            canRaiseTicket={session?.role !== ROLE.ADMIN}
                          />
                        </MessageScrollerItem>
                      ))}
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
            <div className="mx-auto w-full max-w-[45rem] px-4 py-3 sm:px-6">
              <div className="flex items-end gap-2 rounded-lg border border-input bg-background p-1.5 transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    aiStatus.configured
                      ? `Ask about ${company}'s documents`
                      : "The assistant is unavailable"
                  }
                  disabled={!aiStatus.configured || busy}
                  rows={1}
                  aria-label="Message"
                  className="max-h-40 min-h-9 resize-none border-0 bg-transparent px-1.5 py-1.5 text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault()
                      send(event)
                    }
                  }}
                />
                {busy ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={stop}
                    aria-label="Stop generating"
                    className="size-8 shrink-0"
                  >
                    <StopCircle weight="fill" className="size-4 text-destructive" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!draft.trim() || !aiStatus.configured}
                    aria-label="Send message"
                    className="size-8 shrink-0"
                  >
                    <PaperPlaneRight weight="fill" className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Answers are based only on {company}&rsquo;s documents. Shift+Enter
                for a new line.
              </p>
            </div>
          </form>
        </div>
      </div>

      <SourcePanel
        source={activeSource}
        companyName={company}
        open={activeSource !== null}
        onOpenChange={(open) => {
          if (!open) setActiveSource(null)
        }}
      />
    </div>
  )
}

/**
 * The empty thread: a plain explanation plus starter questions as text chips.
 */
function EmptyThread({ configured, company, onPick }) {
  return (
    <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-10 sm:px-6">
      <div className="w-full max-w-[45rem]">
        <h2 className="text-[15px] font-semibold text-foreground">
          {configured ? `Ask ${company}` : "Assistant unavailable"}
        </h2>
        <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
          {configured
            ? `Every answer is retrieved from ${company}'s own indexed documents and cited back to you. If the documents do not cover something, the assistant will say so and offer to raise a ticket.`
            : "A workspace administrator has to add a Gemini API key in Settings before the assistant can answer anything."}
        </p>

        {configured ? (
          <div className="mt-6">
            <p className="text-[11px] font-medium text-muted-foreground">
              Common questions
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onPick(suggestion)}
                  className="group flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-[13px] text-foreground transition-colors duration-150 hover:border-border-strong hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ArrowClockwise
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * One turn in the thread.
 *
 * The assistant's reply is set as document text: no bubble, no avatar, no
 * fill. The person's message is a quiet tinted block, right-aligned.
 */
function AnswerBlock({
  message,
  company,
  onOpenSource,
  onCopy,
  onRate,
  feedback,
  canRaiseTicket,
}) {
  const fromUser = message.role === MESSAGE_ROLE.USER
  const stamp = formatClock(message.createdAt)
  const sources = fromUser ? [] : deriveSources(message)
  const failedToFind = fromUser
    ? false
    : /could not find|couldn't find|no information|not find .* in .*document/i.test(
        message.content ?? "",
      )

  if (fromUser) {
    return (
      <Message align="end">
        <MessageContent>
          <MessageHeader>
            <span className="text-[11px] font-normal text-muted-foreground">
              {stamp}
            </span>
          </MessageHeader>
          <div className="max-w-[85%] rounded-md border border-border bg-surface-sunken px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
            {message.content}
          </div>
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message align="start">
      <MessageContent>
        <MessageHeader>
          <span className="font-semibold text-foreground">Assistant</span>
          {stamp ? (
            <>
              <span className="text-muted-foreground/50">&middot;</span>
              <span className="font-normal text-muted-foreground">{stamp}</span>
            </>
          ) : null}
        </MessageHeader>

        {message.streaming && !message.content ? (
          <div className="flex items-center gap-2 py-1 text-[13px] text-muted-foreground">
            <Spinner className="size-3.5" />
            Searching {company}&rsquo;s documents
          </div>
        ) : (
          <div
            className={`max-w-[46rem] text-[13.5px] leading-[1.65] text-foreground ${
              message.streaming ? "stream-caret" : ""
            }`}
          >
            <div className={MARKDOWN_CLASSES}>
              {renderWithCitations(message.content, sources).map((part, index) =>
                typeof part === "string" ? (
                  <span key={index}>{part}</span>
                ) : (
                  part
                ),
              )}
            </div>
          </div>
        )}

        {failedToFind ? (
          <div className="mt-3 max-w-[46rem] rounded-lg border border-border bg-surface p-3.5">
            <div className="flex items-start gap-2.5">
              <WarningCircle
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-[13px] font-semibold text-foreground">
                  I couldn&rsquo;t find this in {company}&rsquo;s documents
                </p>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  The indexed documents do not cover this yet. Raise a ticket and
                  the support team will answer directly &mdash; your question will
                  be attached to it.
                </p>
                {canRaiseTicket ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    render={<Link href="/tickets/new" />}
                  >
                    Create ticket
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {message.content ? (
          <MessageFooter>
            <Separator className="mb-2" />
            <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
              <SourceRow
                sources={sources}
                companyName={company}
                onOpen={onOpenSource}
              />
              <div className="ml-auto flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onCopy(message.content)}
                        aria-label="Copy answer"
                      />
                    }
                  >
                    <Copy aria-hidden />
                  </TooltipTrigger>
                  <TooltipContent>Copy answer</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onRate(message.id, "up")}
                        aria-label="Mark answer as helpful"
                        className={
                          feedback === "up" ? "text-success" : undefined
                        }
                      />
                    }
                  >
                    {feedback === "up" ? (
                      <Check weight="bold" aria-hidden />
                    ) : (
                      <ThumbsUp aria-hidden />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>Helpful</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onRate(message.id, "down")}
                        aria-label="Mark answer as not helpful"
                        className={
                          feedback === "down" ? "text-destructive" : undefined
                        }
                      />
                    }
                  >
                    {feedback === "down" ? (
                      <Check weight="bold" aria-hidden />
                    ) : (
                      <ThumbsDown aria-hidden />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>Not helpful</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </MessageFooter>
        ) : null}
      </MessageContent>
    </Message>
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

/**
 * Group conversations by relative date so the sidebar reads like a history,
 * not an undifferentiated pile.
 */
function groupByDate(list) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfYesterday = startOfToday - 86_400_000
  const sevenDaysAgo = startOfToday - 6 * 86_400_000

  const buckets = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier this week", items: [] },
    { label: "Older", items: [] },
  ]

  for (const conversation of list) {
    const raw = conversation.updatedAt ?? conversation.createdAt
    const time = raw ? new Date(raw).getTime() : NaN
    if (Number.isNaN(time)) {
      buckets[3].items.push(conversation)
    } else if (time >= startOfToday) {
      buckets[0].items.push(conversation)
    } else if (time >= startOfYesterday) {
      buckets[1].items.push(conversation)
    } else if (time >= sevenDaysAgo) {
      buckets[2].items.push(conversation)
    } else {
      buckets[3].items.push(conversation)
    }
  }

  return buckets.filter((bucket) => bucket.items.length > 0)
}
