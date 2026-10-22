"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "@phosphor-icons/react"

import { api } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import {
  TICKET_CATEGORY_SUGGESTIONS,
  TICKET_PRIORITY,
  TICKET_PRIORITY_LABEL,
} from "@/lib/constants"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

/**
 * Ticket creation.
 *
 * `POST /ticket/create` returns `201` with the plain string body
 * "Ticket created successfully" and **no ticket object**, so there is no id to
 * navigate to afterwards. The user is therefore returned to the list, where
 * their new ticket is visible.
 *
 * `category` is a free-text nullable column upstream, not an enum, so the
 * options offered here are suggestions only.
 */
export function TicketForm({ session }) {
  const router = useRouter()
  const [subject, setSubject] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [priority, setPriority] = React.useState(TICKET_PRIORITY.MEDIUM)
  const [category, setCategory] = React.useState(TICKET_CATEGORY_SUGGESTIONS[0])
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)

  const trimmedSubject = subject.trim()

  async function handleSubmit(event) {
    event.preventDefault()
    if (!trimmedSubject) return

    setSaving(true)
    setError(null)

    try {
      await api.createTicket(session, {
        subject: trimmedSubject,
        description: description.trim(),
        ticketPriority: priority,
        category: category || null,
      })
      notify.success("Ticket created", {
        description: "The support team can see it now.",
      })
      router.push("/tickets")
      router.refresh()
    } catch (err) {
      notifyApiError(err, "Could not create the ticket")
      setError(err?.message ?? "Something went wrong.")
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground" render={<Link href="/tickets" />}>
        <ArrowLeft aria-hidden />
        All tickets
      </Button>

      <header className="flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
          New ticket
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Describe the problem and someone from support will pick it up.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-border bg-surface p-4 sm:p-5"
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="subject">Subject</FieldLabel>
            <Input
              id="subject"
              required
              maxLength={120}
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value)
                setError(null)
              }}
              placeholder="Short summary of the problem"
              disabled={saving}
              className="h-9"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              rows={7}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What happened, what you expected, and anything you already tried."
              disabled={saving}
            />
            <FieldDescription>
              The assistant can help you draft this from the workspace
              documents.
            </FieldDescription>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="priority">Priority</FieldLabel>
              <Select
                value={priority}
                onValueChange={(value) => value && setPriority(value)}
              >
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TICKET_PRIORITY).map((option) => (
                    <SelectItem key={option} value={option}>
                      {TICKET_PRIORITY_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="category">Category</FieldLabel>
              <Select
                value={category}
                onValueChange={(value) => value && setCategory(value)}
              >
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORY_SUGGESTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-[13px]">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="self-start" disabled={saving || !trimmedSubject}>
            {saving ? "Creating" : "Create ticket"}
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}
