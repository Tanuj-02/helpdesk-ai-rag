"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, ChatCircleDots } from "@phosphor-icons/react"

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/empty-state"

/**
 * Single ticket view.
 *
 * The body is resolved from `GET /ticket/{id}` where the backend allows it and
 * otherwise from the role-scoped list endpoint (see `findTicket`). Replies are
 * not shown inline: they live in the separate `ticketChatService`, so the
 * Conversation card links to the dedicated chat page rather than duplicating
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

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Button variant="ghost" className="-ml-2 self-start" render={<Link href="/tickets" />}>
        <ArrowLeft aria-hidden />
        All tickets
      </Button>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <EmptyState title="Could not load this ticket" description={error} />
      ) : ticket === null ? (
        <EmptyState
          title="Ticket not found"
          description={`No ticket with id ${ticketId} is visible to you. If you expected to see it, it may belong to another member of staff.`}
          action={
            <Button render={<Link href="/tickets" />}>Back to tickets</Button>
          }
        />
      ) : (
        <>
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                #{ticket.id}
              </Badge>
              <Badge
                variant={
                  ticket.ticketStatus === TICKET_STATUS.OPEN ? "default" : "outline"
                }
              >
                {TICKET_STATUS_LABEL[ticket.ticketStatus] ?? ticket.ticketStatus}
              </Badge>
              <Badge
                variant={
                  ticket.ticketPriority === TICKET_PRIORITY.URGENT
                    ? "destructive"
                    : "outline"
                }
              >
                {TICKET_PRIORITY_LABEL[ticket.ticketPriority] ?? ticket.ticketPriority}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {ticket.subject}
            </h1>
            <p className="text-muted-foreground text-sm">
              Raised {formatDateTime(ticket.createdAt)}
              {ticket.category ? ` · ${ticket.category}` : null}
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              {body ? (
                <CardDescription>
                  {fallbackToSummary
                    ? "No description was written, so this is the AI-generated summary instead."
                    : "As written by the person who raised the ticket."}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {body || "No description was provided."}
              </p>
            </CardContent>
          </Card>

          {canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>Update ticket</CardTitle>
                <CardDescription>
                  Change the subject, status, or priority. The person who raised
                  the ticket sees the change straight away.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="ticket-status">Status</FieldLabel>
                      <Select
                        value={draft.ticketStatus}
                        onValueChange={(next) =>
                          next && setField("ticketStatus", next)
                        }
                        disabled={saving}
                      >
                        <SelectTrigger id="ticket-status" className="w-full">
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
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="ticket-priority">Priority</FieldLabel>
                      <Select
                        value={draft.ticketPriority}
                        onValueChange={(next) =>
                          next && setField("ticketPriority", next)
                        }
                        disabled={saving}
                      >
                        <SelectTrigger id="ticket-priority" className="w-full">
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
                    </Field>
                  </div>

                  <Button
                    type="submit"
                    className="self-start"
                    disabled={saving || !changed || subjectTooShort}
                  >
                    {saving ? <Spinner /> : null}
                    Save changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>
                Message the person who raised this ticket, or the assigned agent,
                in real time. Everything is kept with the ticket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href={`/tickets/${ticket.id}/chat`} />}>
                <ChatCircleDots aria-hidden />
                Open chat
              </Button>
            </CardContent>
          </Card>
        </>
      )}
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