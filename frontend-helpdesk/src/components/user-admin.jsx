"use client"

import * as React from "react"

import { api } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import { ROLE_LABEL, ROLES, USER_STATUS_LABEL, USER_STATUSES } from "@/lib/constants"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-muted-foreground text-sm">
          Everyone in this workspace, and what they can reach.
        </p>
      </header>

      <div className="bg-background overflow-hidden rounded-lg border">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
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
                <TableHead className="w-36">Role</TableHead>
                <TableHead className="w-44">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((user) => {
                const initials = user.name
                  ?.split(" ")
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "?"

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7 ring-1 ring-border">
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground text-sm">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                      {user.email}
                    </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      disabled={busyId === user.id}
                      onValueChange={(value) => value && changeRole(user, value)}
                    >
                      <SelectTrigger size="sm" className="w-32" aria-label={`Role for ${user.name}`}>
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
                      <SelectTrigger size="sm" className="w-40" aria-label={`Status for ${user.name}`}>
                        {busyId === user.id ? <Spinner /> : <SelectValue>{USER_STATUS_LABEL[user.status] ?? user.status}</SelectValue>}
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
              );
            })}
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