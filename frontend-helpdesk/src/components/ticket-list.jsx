"use client"

import * as React from "react"
import Link from "next/link"
import { Ticket as TicketIcon } from "@phosphor-icons/react"

import { api, ApiError } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import {
  ROLE,
  TICKET_LIST_ENDPOINT,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/empty-state"

/** Badge variants for status, kept semantically consistent across the app. */
const STATUS_VARIANT = {
  [TICKET_STATUS.OPEN]: "secondary",
  [TICKET_STATUS.IN_PROGRESS]: "default",
  [TICKET_STATUS.RESOLVED]: "outline",
  [TICKET_STATUS.CLOSED]: "outline",
}

const PRIORITY_VARIANT = {
  [TICKET_PRIORITY.LOW]: "outline",
  [TICKET_PRIORITY.MEDIUM]: "secondary",
  [TICKET_PRIORITY.HIGH]: "default",
  [TICKET_PRIORITY.URGENT]: "destructive",
}

/**
 * Ticket list.
 *
 * There is no statistics endpoint on the backend, so the four summary counts
 * are derived from the tickets already returned for this role. They are
 * therefore counts *of the current page*, not of the whole company -- labelling
 * them "on this page" would be noise, so the cards are scoped to what the list
 * itself contains and nothing more is implied.
 */
export function TicketList({ role }) {
  const [page, setPage] = React.useState(0)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState(null)
  // Which page the current `result` belongs to. Deriving `loading` from this
  // instead of setting it inside the effect avoids a cascading render.
  const [settledPage, setSettledPage] = React.useState(null)

  const loading = settledPage !== page

  // Agents and admins may move a ticket through its lifecycle; employees only
  // read it. Mirrors the backend's `PUT /ticket/{id}` permission check.
  const canManageStatus = role === ROLE.AGENT || role === ROLE.ADMIN
  const [savingId, setSavingId] = React.useState(null)

  React.useEffect(() => {
    let active = true

    api
      .listTickets(role, { page, size: 20 })
      .then((data) => {
        if (!active) return
        setResult(data)
        setError(null)
        setSettledPage(page)
      })
      .catch((err) => {
        if (!active) return
        setResult(null)
        setError(err instanceof ApiError ? err.message : "Could not load tickets.")
        setSettledPage(page)
      })

    return () => {
      active = false
    }
  }, [page, role])

  /** Replace one row in place, so an optimistic change does not refetch the page. */
  function patchRow(id, patch) {
    setResult((current) =>
      current
        ? {
            ...current,
            content: current.content.map((row) =>
              row.id === id ? { ...row, ...patch } : row,
            ),
          }
        : current,
    )
  }

  async function handleUpdate(ticket, key, value, valueLabel) {
    if (!value || value === ticket[key]) return

    const previous = ticket[key]
    setSavingId(ticket.id)
    // Optimistic: the row updates immediately, then rolls back on failure.
    patchRow(ticket.id, { [key]: value })

    try {
      const updated = await api.updateTicket(ticket.id, { [key]: value })
      if (updated) patchRow(ticket.id, updated)
      notify.success(`Ticket #${ticket.id} updated`, {
        description: `${key === "ticketStatus" ? "Status" : "Priority"} is now ${valueLabel}.`,
      })
    } catch (err) {
      patchRow(ticket.id, { [key]: previous })
      notifyApiError(err, "Could not update the ticket")
    } finally {
      setSavingId(null)
    }
  }

  const rows = React.useMemo(() => result?.content ?? [], [result])
  const counts = React.useMemo(() => countBy(rows), [rows])

  const scopeLabel =
    TICKET_LIST_ENDPOINT[role] === "company-tickets"
      ? "All company tickets"
      : TICKET_LIST_ENDPOINT[role] === "agent-tickets"
        ? "Tickets assigned to you"
        : "Your tickets"

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground text-sm">{scopeLabel}</p>
        </div>
        <Button render={<Link href="/tickets/new" />}>New ticket</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total on page" value={rows.length} tone="default" />
        <SummaryCard label="Open Tickets" value={counts[TICKET_STATUS.OPEN]} tone="open" />
        <SummaryCard label="In Progress" value={counts[TICKET_STATUS.IN_PROGRESS]} tone="progress" />
        <SummaryCard label="Urgent Priority" value={counts[TICKET_PRIORITY.URGENT]} tone="urgent" />
      </div>

      <div className="bg-background overflow-hidden rounded-lg border">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState title="Could not load tickets" description={error} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<TicketIcon className="size-8" aria-hidden />}
              title="No tickets yet"
              description={
                role === "EMPLOYEE"
                  ? "Raise a ticket and the assistant will help you draft it."
                  : "Nothing has been assigned yet."
              }
              action={
                <Button render={<Link href="/tickets/new" />}>Create the first ticket</Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-28">Priority</TableHead>
                <TableHead className="hidden w-32 md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {ticket.id}
                  </TableCell>
                  <TableCell className="max-w-0">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {canManageStatus ? (
                      <Select
                        value={ticket.ticketStatus}
                        onValueChange={(next) =>
                          handleUpdate(
                            ticket,
                            "ticketStatus",
                            next,
                            TICKET_STATUS_LABEL[next] ?? next,
                          )
                        }
                        disabled={savingId === ticket.id}
                      >
                        <SelectTrigger
                          className="w-36"
                          aria-label={`Status of ticket ${ticket.id}`}
                        >
                          <SelectValue>
                            {TICKET_STATUS_LABEL[ticket.ticketStatus] ?? ticket.ticketStatus}
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
                  </TableCell>
                  <TableCell>
                    {canManageStatus ? (
                      <Select
                        value={ticket.ticketPriority}
                        onValueChange={(next) =>
                          handleUpdate(
                            ticket,
                            "ticketPriority",
                            next,
                            TICKET_PRIORITY_LABEL[next] ?? next,
                          )
                        }
                        disabled={savingId === ticket.id}
                      >
                        <SelectTrigger
                          className="w-28"
                          aria-label={`Priority of ticket ${ticket.id}`}
                        >
                          <SelectValue>
                            {TICKET_PRIORITY_LABEL[ticket.ticketPriority] ??
                              ticket.ticketPriority}
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
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                    {formatDate(ticket.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {result && result.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            Page {result.number + 1} of {result.totalPages} &middot; {result.totalElements} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={result.first}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={result.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({ label, value, tone = "default" }) {
  const tones = {
    default: "border-border/60 hover:border-primary/40",
    open: "border-border/60 hover:border-primary/40",
    progress: "border-border/60 hover:border-amber-500/40",
    urgent: "border-border/60 hover:border-destructive/50",
  }
  return (
    <div className={`bg-card rounded-xl border p-4 shadow-xs transition-all ${tones[tone] || tones.default}`}>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        {tone === "urgent" && Number(value) > 0 ? (
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-destructive" />
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">{value ?? 0}</p>
    </div>
  )
}

function countBy(rows) {
  return rows.reduce((acc, row) => {
    acc[row.ticketStatus] = (acc[row.ticketStatus] ?? 0) + 1
    acc[row.ticketPriority] = (acc[row.ticketPriority] ?? 0) + 1
    return acc
  }, {})
}

function formatDate(value) {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}