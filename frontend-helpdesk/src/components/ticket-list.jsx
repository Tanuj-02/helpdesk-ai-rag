"use client"

import * as React from "react"
import Link from "next/link"
import {
  CaretDown,
  Funnel,
  Ticket as TicketIcon,
  Warning,
} from "@phosphor-icons/react"

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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Badge variants for status, kept semantically consistent across the app.
 *
 * Status is a *state*, so it uses the quiet outline/secondary treatment.
 * Priority is a *severity*, so it escalates: muted, then warning, then
 * danger. The accent fill is never used for either, so the eye is not pulled
 * to a table of 40 rows.
 */
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
 * Saved views.
 *
 * There is no saved-view endpoint, so these are derived from the filters
 * that are actually applied -- and they are labelled honestly as filters,
 * not as persisted server-side views. See "Backend changes".
 */
const SAVED_VIEWS = [
  { id: "all", label: "All open", statuses: [TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS] },
  { id: "unassigned", label: "Needs an owner", statuses: [TICKET_STATUS.OPEN], unassigned: true },
  { id: "urgent", label: "Urgent", priorities: [TICKET_PRIORITY.URGENT] },
  { id: "mine", label: "Waiting on me", statuses: [TICKET_STATUS.IN_PROGRESS] },
]

/**
 * Ticket list.
 *
 * There is no statistics endpoint on the backend, so the four summary counts
 * are derived from the tickets already returned for this role. They are
 * therefore counts *of the current page*, not of the whole company.
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

  // Filters are client-side: the list endpoint takes no filter parameters.
  const [view, setView] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState([])
  const [priorityFilter, setPriorityFilter] = React.useState([])
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState([])

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

  const activeView = SAVED_VIEWS.find((item) => item.id === view) ?? SAVED_VIEWS[0]

  const visibleRows = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((ticket) => {
      if (activeView.statuses && !activeView.statuses.includes(ticket.ticketStatus)) {
        return false
      }
      if (activeView.priorities && !activeView.priorities.includes(ticket.ticketPriority)) {
        return false
      }
      if (activeView.unassigned && ticket.agentId) return false
      if (statusFilter.length && !statusFilter.includes(ticket.ticketStatus)) return false
      if (priorityFilter.length && !priorityFilter.includes(ticket.ticketPriority)) {
        return false
      }
      if (term) {
        const haystack = `${ticket.id} ${ticket.subject ?? ""} ${ticket.category ?? ""}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [rows, activeView, statusFilter, priorityFilter, query])

  const allSelected = visibleRows.length > 0 && selected.length === visibleRows.length

  function toggleRow(id) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleAll() {
    setSelected((current) =>
      allSelected ? [] : visibleRows.map((ticket) => ticket.id),
    )
  }

  async function bulkUpdate(key, value, valueLabel) {
    const targets = selected
      .map((id) => rows.find((row) => row.id === id))
      .filter((row) => row && row[key] !== value)

    if (!targets.length) return

    // Sequential, not parallel: the backend has no bulk endpoint, and firing
    // twenty writes at once is a good way to get rate-limited.
    for (const ticket of targets) {
      await handleUpdate(ticket, key, value, valueLabel)
    }
    setSelected([])
  }

  const scopeLabel =
    TICKET_LIST_ENDPOINT[role] === "company-tickets"
      ? "All company tickets"
      : TICKET_LIST_ENDPOINT[role] === "agent-tickets"
        ? "Tickets assigned to you"
        : "Your tickets"

  const isAgentView = role === ROLE.AGENT || role === ROLE.ADMIN

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
            Tickets
          </h1>
          <p className="text-[13px] text-muted-foreground">{scopeLabel}</p>
        </div>
        <Button render={<Link href="/tickets/new" />}>
          <TicketIcon aria-hidden />
          New ticket
        </Button>
      </header>

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <StatCell label="On this page" value={rows.length} />
        <StatCell label="Open" value={counts[TICKET_STATUS.OPEN]} />
        <StatCell label="In progress" value={counts[TICKET_STATUS.IN_PROGRESS]} />
        <StatCell
          label="Urgent"
          value={counts[TICKET_PRIORITY.URGENT]}
          tone={counts[TICKET_PRIORITY.URGENT] > 0 ? "danger" : "default"}
        />
      </div>

      {isAgentView ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            {SAVED_VIEWS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                aria-pressed={view === item.id}
                className={`rounded px-2 py-1 text-[12px] font-medium transition-colors duration-150 ${
                  view === item.id
                    ? "bg-surface-sunken text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm">
                  <Funnel aria-hidden />
                  Filters
                  {statusFilter.length + priorityFilter.length > 0 ? (
                    <span className="ml-0.5 rounded bg-primary/10 px-1 font-mono text-[10px] text-primary">
                      {statusFilter.length + priorityFilter.length}
                    </span>
                  ) : null}
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {TICKET_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={(checked) =>
                    setStatusFilter((current) =>
                      checked
                        ? [...current, status]
                        : current.filter((item) => item !== status),
                    )
                  }
                >
                  {TICKET_STATUS_LABEL[status]}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Priority</DropdownMenuLabel>
              {TICKET_PRIORITIES.map((priority) => (
                <DropdownMenuCheckboxItem
                  key={priority}
                  checked={priorityFilter.includes(priority)}
                  onCheckedChange={(checked) =>
                    setPriorityFilter((current) =>
                      checked
                        ? [...current, priority]
                        : current.filter((item) => item !== priority),
                    )
                  }
                >
                  {TICKET_PRIORITY_LABEL[priority]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative w-56">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by id or subject"
              aria-label="Filter tickets"
              className="h-7 pr-2 text-[12px]"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="tnum">{visibleRows.length}</span> of{" "}
            <span className="tnum">{rows.length}</span> shown
          </div>
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
          <span className="text-[12px] font-medium text-foreground">
            <span className="tnum">{selected.length}</span> selected
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <BulkSetStatus onPick={(value) => bulkUpdate("ticketStatus", value, TICKET_STATUS_LABEL[value])} />
            <BulkSetPriority onPick={(value) => bulkUpdate("ticketPriority", value, TICKET_PRIORITY_LABEL[value])} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected([])}
              className="text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {loading ? (
          <div className="flex flex-col gap-0" aria-busy="true">
            <span className="sr-only">Loading tickets</span>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState title="Could not load tickets" description={error} />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<TicketIcon className="size-4" aria-hidden />}
              title={
                rows.length === 0
                  ? "No tickets yet"
                  : "Nothing matches these filters"
              }
              description={
                rows.length === 0
                  ? role === ROLE.EMPLOYEE
                    ? "Ask the assistant first, or raise a ticket and the support team will pick it up."
                    : "Nothing has been assigned yet."
                  : "Clear a filter to see the rest of the page."
              }
              action={
                rows.length === 0 ? (
                  <Button render={<Link href="/tickets/new" />}>
                    Create the first ticket
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setView("all")
                      setStatusFilter([])
                      setPriorityFilter([])
                      setQuery("")
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {isAgentView ? (
                  <TableHead className="w-9 pr-0">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all tickets on this page"
                      className="size-3.5 cursor-pointer accent-[var(--primary)]"
                    />
                  </TableHead>
                ) : null}
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-24">Priority</TableHead>
                <TableHead className="hidden w-28 lg:table-cell">Assignee</TableHead>
                <TableHead className="hidden w-32 xl:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((ticket) => (
                <TableRow key={ticket.id} data-selected={selected.includes(ticket.id) || undefined}>
                  {isAgentView ? (
                    <TableCell className="pr-0">
                      <input
                        type="checkbox"
                        checked={selected.includes(ticket.id)}
                        onChange={() => toggleRow(ticket.id)}
                        aria-label={`Select ticket ${ticket.id}`}
                        className="size-3.5 cursor-pointer accent-[var(--primary)]"
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-mono text-[12px] text-muted-foreground">
                    {ticket.id}
                  </TableCell>
                  <TableCell className="max-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      {ticket.ticketPriority === TICKET_PRIORITY.URGENT ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={<span className="shrink-0 text-destructive" />}
                          >
                            <Warning weight="fill" className="size-3.5" aria-hidden />
                          </TooltipTrigger>
                          <TooltipContent>Urgent priority</TooltipContent>
                        </Tooltip>
                      ) : null}
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="truncate font-medium text-foreground hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {ticket.subject}
                      </Link>
                      {ticket.category ? (
                        <span className="hidden shrink-0 text-[11px] text-muted-foreground md:inline">
                          {ticket.category}
                        </span>
                      ) : null}
                    </div>
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
                          size="sm"
                          className="w-28"
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
                          size="sm"
                          className="w-24"
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
                  <TableCell className="hidden text-[12px] text-muted-foreground lg:table-cell">
                    {ticket.agentId ? `#${ticket.agentId}` : "Unassigned"}
                  </TableCell>
                  <TableCell className="hidden text-[12px] text-muted-foreground xl:table-cell">
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
          <p className="text-[12px] text-muted-foreground">
            Page <span className="tnum">{result.number + 1}</span> of{" "}
            <span className="tnum">{result.totalPages}</span> &middot;{" "}
            <span className="tnum">{result.totalElements}</span> total
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

/**
 * A single statistic cell. A hairline-separated strip, not four floating
 * cards: the numbers are context for the table, not the headline.
 */
function StatCell({ label, value, tone = "default" }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-surface px-3.5 py-3">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span
        className={`tnum text-[16px] font-semibold ${
          tone === "danger" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value ?? 0}
      </span>
    </div>
  )
}

function BulkSetStatus({ onPick }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            Status
            <CaretDown aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {TICKET_STATUSES.map((status) => (
          <DropdownMenuItem key={status} onClick={() => onPick(status)}>
            {TICKET_STATUS_LABEL[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BulkSetPriority({ onPick }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            Priority
            <CaretDown aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {TICKET_PRIORITIES.map((priority) => (
          <DropdownMenuItem key={priority} onClick={() => onPick(priority)}>
            {TICKET_PRIORITY_LABEL[priority]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
