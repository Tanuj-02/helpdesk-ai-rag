"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "@phosphor-icons/react"

import { api, ApiError } from "@/lib/api/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-input"
import { Spinner } from "@/components/ui/spinner"

export function CompanyRegistrationForm() {
  const [error, setError] = React.useState(null)
  const [created, setCreated] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") ?? "")
    if (password !== form.get("confirmPassword")) {
      setError("Passwords do not match.")
      return
    }

    const payload = {
      companyName: String(form.get("companyName") ?? "").trim(),
      companyEmail: String(form.get("companyEmail") ?? "").trim(),
      adminName: String(form.get("adminName") ?? "").trim(),
      adminEmail: String(form.get("adminEmail") ?? "").trim(),
      password,
    }
    setError(null)
    startTransition(async () => {
      try {
        await api.registerCompany(payload)
        setCreated(true)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not create the workspace. Try again.")
      }
    })
  }

  if (created) {
    return (
      <div className="space-y-4">
        <Alert variant="info">
          <AlertTitle>Workspace created</AlertTitle>
          <AlertDescription>Your admin account is ready. Sign in with the email and password you just entered.</AlertDescription>
        </Alert>
        <Button render={<Link href="/login" />} size="touch" className="w-full">
          Continue to sign in <ArrowRight aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="company-name">Company name</FieldLabel>
          <Input id="company-name" name="companyName" autoComplete="organization" required maxLength={120} disabled={pending} className="h-9" />
        </Field>
        <Field>
          <FieldLabel htmlFor="company-email">Company email</FieldLabel>
          <Input id="company-email" name="companyEmail" type="email" autoComplete="email" required disabled={pending} className="h-9" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="admin-name">Your name</FieldLabel>
            <Input id="admin-name" name="adminName" autoComplete="name" required maxLength={120} disabled={pending} className="h-9" />
          </Field>
          <Field>
            <FieldLabel htmlFor="admin-email">Your work email</FieldLabel>
            <Input id="admin-email" name="adminEmail" type="email" autoComplete="email" required disabled={pending} className="h-9" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="admin-password">Password</FieldLabel>
            <PasswordInput id="admin-password" name="password" autoComplete="new-password" required disabled={pending} />
          </Field>
          <Field>
            <FieldLabel htmlFor="admin-confirm-password">Confirm password</FieldLabel>
            <PasswordInput id="admin-confirm-password" name="confirmPassword" autoComplete="new-password" required disabled={pending} />
          </Field>
        </div>
        {error ? <Alert variant="destructive"><AlertTitle>Could not create workspace</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Button type="submit" size="touch" className="w-full" disabled={pending}>
          {pending ? <Spinner /> : null}{pending ? "Creating workspace" : "Create workspace"}
        </Button>
        <p className="text-center text-[12px] text-muted-foreground">
          Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </FieldGroup>
    </form>
  )
}
