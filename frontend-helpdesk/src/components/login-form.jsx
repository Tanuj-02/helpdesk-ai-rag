"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, LockKey } from "@phosphor-icons/react"

import { api, ApiError } from "@/lib/api/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Work email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
              disabled={pending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
            />
            <FieldDescription>
              Use the address your workspace admin invited.
            </FieldDescription>
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
              className="h-9"
            />
          </Field>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Field>
            <Button type="submit" size="touch" className="w-full" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Signing in" : "Sign in"}
              {!pending ? <ArrowRight aria-hidden /> : null}
            </Button>
            <FieldDescription className="text-[11px]">
              Lost your password? A workspace administrator has to reset it for
              you.
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
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          Demo accounts
        </span>
        <span className="text-[11px] text-muted-foreground">
          Click to fill the form
        </span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            disabled={disabled}
            onClick={() => onPick({ email: account.email, password })}
            className="flex flex-col items-start gap-1 rounded-md border border-border bg-surface px-2.5 py-2 text-left transition-colors duration-150 hover:border-border-strong hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="truncate text-[12px] font-medium text-foreground">
                {account.name.split(" ")[0]}
              </span>
              <Badge variant="outline" className="shrink-0">
                {account.role}
              </Badge>
            </div>
            <span className="w-full truncate font-mono text-[11px] text-muted-foreground">
              {account.email}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
