"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChatCircleDots,
  Clock,
  Note,
  Tag,
  User,
} from "@phosphor-icons/react"

import { api, ApiError } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import {
  ROLE,
  TICKET_PRIORITIES,
  TICKET_PRIORITY,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS,
  TICKET_STATUSES,
  TICKET_STATUS_LABEL,
} from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/empty-state"

const STATUS_VARIANT = {
  [TICKET_STATUS.OPEN]: "outline",
  [TICKET_STATUS.IN_PROGRESS]: "info",
  [TICKET_STATUS.RESOLVED]: "success",
  [TICKET_STATUS.CLOSED]: "secondary",
}

const PRIORITY_VARIANT = {
  [TICKET_PRIORITY.LOW]: "secondary",
  [TICKET_PRIORITY.MEDIUM]: "outline",
  [TICKET_PRIORITY.HIGH]: "warning",
  [TICKET_PRIORITY.URGENT]: "danger",
}

/**
 * Single ticket view.
 *
 * Two columns on a wide screen: the conversation on the left, the ticket's
 * properties on the right. On a narrow screen they stack, properties first
 * so the essential facts stay above the fold.
 *
 * The body is resolved from `GET /ticket/{id}` where the backend allows it and
 * otherwise from the role-scoped list endpoint (see `findTicket`). Replies are
 * not shown inline: they live in the separate `ticketChatService`, so the
 * conversation panel links to the dedicated chat page rather than duplicating
 * that thread here.
 */
export function TicketDetail({ role, ticketId }) {
  const [ticket, setTicket] = React.useState(undefined)
  const [error, setError] = React.useState(null)
  // Editable copy of the fields staff may change. Reset from the ticket
  // whenever it reloads, so a save re-syncs to the server's truth.
  const [form, setForm] = React.useState(null)
  // The ticket object the current form was seeded from, so we can tell a real
  // change (a new ticket, or a ticket just saved) from an ordinary re-render.
  const [formSource, setFormSource] = React.useState(null)
  const [saving, setSaving] = React.useState(false)
  const [summaryOpen, setSummaryOpen] = React.useState(true)

  React.useEffect(() => {
    let active = true

    api
      .findTicket(role, ticketId)
      .then((found) => {
        if (!active) return
        setTicket(found ?? null)
      })
      .catch((err) => {
        if (!active) return
        setTicket(null)
        setError(err instanceof ApiError ? err.message : "Could not load this ticket.")
      })

    return () => {
      active = false
    }
  }, [role, ticketId])

  const loading = ticket === undefined && !error

  // Only staff change a ticket. The backend enforces the same rule, but hiding
  // the form from employees keeps the page honest about what they can do.
  const canEdit = role === ROLE.AGENT || role === ROLE.ADMIN

  // Re-seed the editable copy whenever the underlying ticket changes (first
  // load, or after a save). This is React's "adjust state during render"
  // pattern: it costs one immediate re-render instead of an effect pass.
  if (ticket && ticket !== formSource) {
    setFormSource(ticket)
    setForm({
      subject: ticket.subject ?? "",
      ticketStatus: ticket.ticketStatus,
      ticketPriority: ticket.ticketPriority,
    })
  }

  // Falls back to the ticket's own values before the seeded form is used.
  const draft = form ?? {
    subject: ticket?.subject ?? "",
    ticketStatus: ticket?.ticketStatus,
    ticketPriority: ticket?.ticketPriority,
  }

  function setField(key, value) {
    setForm((current) => ({ ...(current ?? draft), [key]: value }))
  }

  const subject = draft.subject.trim()
  const subjectTooShort = subject.length > 0 && subject.length < 3
  const changed =
    ticket != null &&
    (subject !== (ticket.subject ?? "") ||
      draft.ticketStatus !== ticket.ticketStatus ||
      draft.ticketPriority !== ticket.ticketPriority)

  async function handleSave(event) {
    event.preventDefault()
    if (!ticket || !changed || subjectTooShort) return

    // Send only what actually changed; the backend treats null fields as
    // "leave untouched".
    const patch = {}
    if (subject !== (ticket.subject ?? "")) patch.subject = subject
    if (draft.ticketStatus !== ticket.ticketStatus) {
      patch.ticketStatus = draft.ticketStatus
    }
    if (draft.ticketPriority !== ticket.ticketPriority) {
      patch.ticketPriority = draft.ticketPriority
    }

    setSaving(true)
    try {
      const updated = await api.updateTicket(ticket.id, patch)
      setTicket((current) => (updated ? { ...current, ...updated } : current))
      notify.success("Ticket updated", {
        description: `Ticket #${ticket.id} was updated.`,
      })
    } catch (err) {
      notifyApiError(err, "Could not update the ticket")
    } finally {
      setSaving(false)
    }
  }

  // Prefer the human-written description. `aiSummary` is populated for some
  // tickets even when no description was given, and showing "no description"
  // while simultaneously claiming a summary exists reads as a bug.
  const fallbackToSummary = Boolean(
    ticket && !ticket.description && ticket.aiSummary && ticket.aiSummary !== ticket.description,
  )
  const body = ticket?.description || (fallbackToSummary ? ticket.aiSummary : null)

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6" aria-busy="true">
        <span className="sr-only">Loading ticket</span>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState title="Could not load this ticket" description={error} />
      </div>
    )
  }

  if (ticket === null) {
    return (
      <div className="p-6">
        <EmptyState
          title="Ticket not found"
          description={`No ticket with id ${ticketId} is visible to you. If you expected to see it, it may belong to another member of staff.`}
          action={
            <Button render={<Link href="/tickets" />}>Back to tickets</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground" render={<Link href="/tickets" />}>
        <ArrowLeft aria-hidden />
        All tickets
      </Button>

      <header className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] text-muted-foreground">
            #{ticket.id}
          </span>
          <Badge variant={STATUS_VARIANT[ticket.ticketStatus] ?? "outline"}>
            {TICKET_STATUS_LABEL[ticket.ticketStatus] ?? ticket.ticketStatus}
          </Badge>
          <Badge variant={PRIORITY_VARIANT[ticket.ticketPriority] ?? "outline"}>
            {TICKET_PRIORITY_LABEL[ticket.ticketPriority] ?? ticket.ticketPriority}
          </Badge>
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight text-balance text-foreground">
          {ticket.subject}
        </h1>
        <p className="text-[12px] text-muted-foreground">
          Raised {formatDateTime(ticket.createdAt)}
          {ticket.category ? ` · ${ticket.category}` : null}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {/*
            The AI-conversation summary, as a collapsible block at the top of
            the thread. It is a summary of what the employee already tried,
            so it is collapsed by default for agents who have seen it and
            expanded for anyone new to the ticket.
          */}
          {ticket.aiSummary ? (
            <Collapsible
              open={summaryOpen}
              onOpenChange={setSummaryOpen}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <CollapsibleTrigger
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-surface-sunken/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Note className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-[12px] font-medium text-foreground">
                  AI conversation summary
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {summaryOpen ? "Hide" : "Show"}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border px-3.5 py-3">
                  <p className="text-[13px] leading-relaxed text-foreground">
                    {ticket.aiSummary}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Written by the assistant from the employee&rsquo;s chat. It is
                    a summary, not a verified source.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          <section className="rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
              <h2 className="text-[13px] font-semibold text-foreground">
                Description
              </h2>
              {fallbackToSummary ? (
                <span className="text-[11px] text-muted-foreground">
                  AI summary &mdash; no description was written
                </span>
              ) : null}
            </div>
            <div className="px-3.5 py-3">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
                {body || "No description was provided."}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
              <h2 className="text-[13px] font-semibold text-foreground">
                Conversation
              </h2>
              <Button size="sm" render={<Link href={`/tickets/${ticket.id}/chat`} />}>
                <ChatCircleDots aria-hidden />
                Open chat
              </Button>
            </div>
            <div className="px-3.5 py-3">
              <p className="max-w-prose text-[12px] leading-relaxed text-muted-foreground">
                Message the person who raised this ticket, or the assigned
                agent, in real time. Every message is kept with the ticket and
                is visible only to the people involved in it.
              </p>
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-lg border border-border bg-surface">
            <h2 className="border-b border-border px-3.5 py-2.5 text-[13px] font-semibold text-foreground">
              Properties
            </h2>

            <div className="flex flex-col gap-3.5 p-3.5">
              <PropertyRow label="Status">
                {canEdit ? (
                  <Select
                    value={draft.ticketStatus}
                    onValueChange={(next) =>
                      next && setField("ticketStatus", next)
                    }
                    disabled={saving}
                  >
                    <SelectTrigger className="w-full" aria-label="Ticket status">
                      <SelectValue>
                        {TICKET_STATUS_LABEL[draft.ticketStatus] ?? draft.ticketStatus}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {TICKET_STATUS_LABEL[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={STATUS_VARIANT[ticket.ticketStatus] ?? "outline"}>
                    {TICKET_STATUS_LABEL[ticket.ticketStatus] ?? ticket.ticketStatus}
                  </Badge>
                )}
              </PropertyRow>

              <PropertyRow label="Priority">
                {canEdit ? (
                  <Select
                    value={draft.ticketPriority}
                    onValueChange={(next) =>
                      next && setField("ticketPriority", next)
                    }
                    disabled={saving}
                  >
                    <SelectTrigger className="w-full" aria-label="Ticket priority">
                      <SelectValue>
                        {TICKET_PRIORITY_LABEL[draft.ticketPriority] ??
                          draft.ticketPriority}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {TICKET_PRIORITY_LABEL[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={PRIORITY_VARIANT[ticket.ticketPriority] ?? "outline"}>
                    {TICKET_PRIORITY_LABEL[ticket.ticketPriority] ??
                      ticket.ticketPriority}
                  </Badge>
                )}
              </PropertyRow>

              <PropertyRow label="Assignee">
                <span className="flex items-center gap-1.5 text-[12px] text-foreground">
                  <User className="size-3.5 text-muted-foreground" aria-hidden />
                  {ticket.agentId ? `#${ticket.agentId}` : "Unassigned"}
                </span>
              </PropertyRow>

              <PropertyRow label="Requester">
                <span className="flex items-center gap-1.5 text-[12px] text-foreground">
                  <User className="size-3.5 text-muted-foreground" aria-hidden />
                  {ticket.userId ? `#${ticket.userId}` : "Unknown"}
                </span>
              </PropertyRow>

              <PropertyRow label="Category">
                <span className="text-[12px] text-foreground">
                  {ticket.category || "Not set"}
                </span>
              </PropertyRow>

              <PropertyRow label="Tags">
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Tag className="size-3.5" aria-hidden />
                  None
                </span>
              </PropertyRow>

              <PropertyRow label="Linked documents">
                <span className="text-[12px] text-muted-foreground">None</span>
              </PropertyRow>
            </div>

            {canEdit ? (
              <>
                <Separator />
                <form onSubmit={handleSave} className="flex flex-col gap-3 p-3.5">
                  <Field>
                    <FieldLabel htmlFor="ticket-subject">Subject</FieldLabel>
                    <Input
                      id="ticket-subject"
                      value={draft.subject}
                      onChange={(event) => setField("subject", event.target.value)}
                      disabled={saving}
                    />
                    {subjectTooShort ? (
                      <FieldDescription className="text-destructive">
                        Subject must be at least 3 characters.
                      </FieldDescription>
                    ) : null}
                  </Field>

                  <Button
                    type="submit"
                    size="sm"
                    className="self-start"
                    disabled={saving || !changed || subjectTooShort}
                  >
                    {saving ? <Spinner /> : null}
                    Save changes
                  </Button>
                </form>
              </>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface">
            <h2 className="border-b border-border px-3.5 py-2.5 text-[13px] font-semibold text-foreground">
              Activity
            </h2>
            <div className="flex flex-col gap-3 p-3.5">
              <ActivityItem
                icon={Clock}
                title="Ticket raised"
                detail={formatDateTime(ticket.createdAt)}
              />
              <ActivityItem
                icon={ChatCircleDots}
                title="Conversation"
                detail="Open the chat to read and reply to the thread."
                action={
                  <Button
                    variant="link"
                    size="xs"
                    render={<Link href={`/tickets/${ticket.id}/chat`} />}
                  >
                    Open chat
                  </Button>
                }
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

/**
 * A labelled row inside the properties panel.
 */
function PropertyRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function ActivityItem({ icon: Icon, title, detail, action }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12px] font-medium text-foreground">{title}</span>
        <span className="text-[11px] leading-relaxed text-muted-foreground">
          {detail}
        </span>
        {action}
      </div>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return "an unknown date"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "an unknown date"
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
