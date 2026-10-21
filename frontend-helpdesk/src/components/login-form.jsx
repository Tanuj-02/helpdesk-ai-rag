"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { api, ApiError } from "@/lib/api/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

/**
 * Sign-in form.
 *
 * There is deliberately NO "Login with Google" button: this app has no OAuth2
 * or social sign-in, and an earlier version of this file shipped one, which
 * invited users to click a dead end.
 *
 * There is also no "Forgot your password?" link, because the backend exposes no
 * password-reset endpoint of any kind. Credentials are cleared by an
 * administrator.
 */
export function LoginForm({ className, ...props }) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState(null)
  const [pending, startTransition] = React.useTransition()

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const result = await api.login({ email: email.trim(), password })
        // Land somewhere the signed-in user can actually use.
        router.replace(result?.role === "ADMIN" ? "/admin/users" : "/tickets")
        router.refresh()
      } catch (err) {
        // The backend returns a bare 403 for bad credentials, and 400 with a
        // message for an unknown account. Both collapse to one safe message
        // so the form never leaks which emails exist.
        setError(
          err instanceof ApiError && err.isAuthError
            ? "Those details did not match an active account."
            : (err?.message ?? "Something went wrong. Please try again."),
        )
      }
    })
  }

  return (
    <div className={className} {...props}>
      <Card>
        {/* No CardTitle: the page renders the single <h1> for this screen, and
            repeating it made "Sign in" appear three times in the accessibility
            tree. CardTitle is a plain <div> anyway, so it could not have served
            as the heading. */}
        <CardHeader>
          <CardDescription>Use the email address your workspace admin invited.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  disabled={pending}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={pending}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign-in failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <Button type="submit" className="w-full h-10 font-medium shadow-sm" disabled={pending}>
                  {pending ? <Spinner /> : null}
                  {pending ? "Signing in..." : "Sign in"}
                </Button>
                <FieldDescription className="text-[11px]">
                  Lost your password? A workspace administrator has to reset it for you.
                </FieldDescription>
              </Field>

              <DemoAccountPicker
                disabled={pending}
                onPick={({ email: nextEmail, password: nextPassword }) => {
                  setEmail(nextEmail)
                  setPassword(nextPassword)
                  setError(null)
                }}
              />
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Helper that lists the seeded logins for quick role switching during testing.
 */
export function DemoAccountPicker({ onPick, disabled }) {
  const [accounts, setAccounts] = React.useState([])
  const [password, setPassword] = React.useState(null)

  React.useEffect(() => {
    let active = true
    api
      .getDemoAccounts()
      .then((data) => {
        if (!active || !data?.accounts?.length) return
        setAccounts(data.accounts)
        setPassword(data.password)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  if (accounts.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Test-Drive Roles
        </span>
        <span className="text-[10px] text-muted-foreground">Click to fill</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {accounts.map((account) => {
          const roleBadgeVariant =
            account.role === "ADMIN"
              ? "default"
              : account.role === "AGENT"
                ? "secondary"
                : "outline"

          return (
            <button
              key={account.email}
              type="button"
              disabled={disabled}
              onClick={() => onPick({ email: account.email, password })}
              className="flex flex-col items-start gap-1 rounded-lg border border-border/70 bg-card p-2.5 text-left transition-all hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate">
                  {account.name.split(" ")[0]}
                </span>
                <Badge variant={roleBadgeVariant} className="text-[9px] px-1.5 py-0 uppercase">
                  {account.role}
                </Badge>
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full">
                {account.email}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}