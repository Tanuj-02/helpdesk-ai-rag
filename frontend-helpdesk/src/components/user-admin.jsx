"use client"

import * as React from "react"

import { api } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import { ROLE_LABEL, ROLES, USER_STATUS_LABEL, USER_STATUSES } from "@/lib/constants"
import { personInitials } from "@/lib/workspace"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
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
import { EmptyState } from "@/components/empty-state"

const USER_STATUS_VARIANT = {
  ACTIVE: "success",
  INVITED: "info",
  SUSPENDED: "warning",
  DEACTIVATED: "secondary",
}

/**
 * Admin user management.
 *
 * `GET /admin/users` is ADMIN-only at the Spring Security layer, so a non-admin
 * reaching this URL gets a real 403 rather than an empty table. `src/proxy.js`
 * already redirects them, so this is defence in depth.
 */
export function UserAdmin() {
  const [page, setPage] = React.useState(0)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [busyId, setBusyId] = React.useState(null)
  // Derived rather than assigned inside the effect: `loading` is true whenever
  // the rendered result is not the page that was asked for.
  const [settledPage, setSettledPage] = React.useState(null)

  const loading = settledPage !== page

  React.useEffect(() => {
    let active = true

    api
      .listUsers({ page, size: 25 })
      .then((data) => {
        if (!active) return
        setResult(data)
        setError(null)
        setSettledPage(page)
      })
      .catch((err) => {
        if (!active) return
        setResult(null)
        setError(err?.message ?? "Could not load people.")
        setSettledPage(page)
      })

    return () => {
      active = false
    }
  }, [page])

  async function changeStatus(user, status) {
    if (status === user.status) return
    setBusyId(user.id)
    try {
      await api.updateUserStatus(user.id, status)
      setResult((prev) => ({
        ...prev,
        content: prev.content.map((row) => (row.id === user.id ? { ...row, status } : row)),
      }))
      notify.success(`${user.name} is now ${USER_STATUS_LABEL[status].toLowerCase()}`)
    } catch (err) {
      notifyApiError(err, "Could not change status")
    } finally {
      setBusyId(null)
    }
  }

  async function changeRole(user, role) {
    if (role === user.role) return
    setBusyId(user.id)
    try {
      await api.updateUserRole(user.id, role)
      setResult((prev) => ({
        ...prev,
        content: prev.content.map((row) => (row.id === user.id ? { ...row, role } : row)),
      }))
      notify.success(`${user.name} is now ${ROLE_LABEL[role].toLowerCase()}`)
    } catch (err) {
      notifyApiError(err, "Could not change role")
    } finally {
      setBusyId(null)
    }
  }

  const rows = result?.content ?? []

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
          People
        </h1>
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">
          Everyone in this workspace, and what they can reach. Role changes take
          effect the next time the person loads a page.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {loading ? (
          <div aria-busy="true">
            <span className="sr-only">Loading people</span>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-border px-3.5 py-3 last:border-0"
              >
                <Skeleton className="size-6" />
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="ml-auto h-3.5 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState title="Could not load people" description={error} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No people yet" description="Invite someone to get started." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="w-28">Role</TableHead>
                <TableHead className="w-36">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-6">
                        <AvatarFallback>{personInitials(user.name, user.email)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-[12px] text-muted-foreground md:table-cell">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      disabled={busyId === user.id}
                      onValueChange={(value) => value && changeRole(user, value)}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-24"
                        aria-label={`Role for ${user.name}`}
                      >
                        <SelectValue>{ROLE_LABEL[user.role] ?? user.role}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.status}
                      disabled={busyId === user.id}
                      onValueChange={(value) => value && changeStatus(user, value)}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-32"
                        aria-label={`Status for ${user.name}`}
                      >
                        {busyId === user.id ? (
                          <Spinner className="size-3" />
                        ) : (
                          <SelectValue>
                            {USER_STATUS_LABEL[user.status] ?? user.status}
                          </SelectValue>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {USER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {USER_STATUS_LABEL[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
