"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { api, ApiError } from "@/lib/api/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-input"
import { Spinner } from "@/components/ui/spinner"

export function InvitationRegistrationForm({ token }) {
  const router = useRouter()
  const [error, setError] = React.useState(null)
  const [pending, startTransition] = React.useTransition()

  function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") ?? "")
    if (password !== form.get("confirmPassword")) {
      setError("Passwords do not match.")
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await api.register({
          token,
          name: String(form.get("name") ?? "").trim(),
          password,
        })
        router.replace(result?.role === "ADMIN" ? "/admin/users" : "/tickets")
        router.refresh()
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not accept this invitation. Try again.")
      }
    })
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="warning"><AlertTitle>Invitation link missing</AlertTitle><AlertDescription>Open the link from your invitation email, or ask your workspace administrator to send a new invitation.</AlertDescription></Alert>
        <Link href="/login" className="text-[13px] font-medium text-primary hover:underline">Back to sign in</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="invite-name">Your name</FieldLabel>
          <Input id="invite-name" name="name" autoComplete="name" required maxLength={120} disabled={pending} className="h-9" />
        </Field>
        <Field>
          <FieldLabel htmlFor="invite-password">Password</FieldLabel>
          <PasswordInput id="invite-password" name="password" autoComplete="new-password" required disabled={pending} />
        </Field>
        <Field>
          <FieldLabel htmlFor="invite-confirm-password">Confirm password</FieldLabel>
          <PasswordInput id="invite-confirm-password" name="confirmPassword" autoComplete="new-password" required disabled={pending} />
        </Field>
        {error ? <Alert variant="destructive"><AlertTitle>Could not join workspace</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Button type="submit" size="touch" className="w-full" disabled={pending}>
          {pending ? <Spinner /> : null}{pending ? "Joining workspace" : "Accept invitation"}
        </Button>
      </FieldGroup>
    </form>
  )
}
