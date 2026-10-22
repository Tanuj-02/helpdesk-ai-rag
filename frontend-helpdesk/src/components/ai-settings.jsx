"use client"

import * as React from "react"
import {
  Key,
  LockKey,
  ShieldCheck,
  Trash,
  Warning,
} from "@phosphor-icons/react"

import { api } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import { AI_MODELS } from "@/lib/constants"
import { workspaceName, workspaceSlug } from "@/lib/workspace"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

/**
 * Workspace AI settings.
 *
 * Stores the company's Gemini key. The key is write-only from the browser's
 * point of view: once saved it is never returned again, only a masked form.
 * That is enforced on the server, and this screen never keeps the value in
 * state after a successful save.
 */
export function AiSettings({ session }) {
  const [state, setState] = React.useState({
    loading: true,
    configured: false,
    maskedKey: null,
    updatedAt: null,
  })

  const [apiKey, setApiKey] = React.useState("")
  const [error, setError] = React.useState(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    let active = true

    api
      .getAiConfig()
      .then((config) => {
        if (active) setState({ loading: false, ...config })
      })
      .catch((err) => {
        if (active) {
          notifyApiError(err, "Could not load AI settings")
          setState((s) => ({ ...s, loading: false }))
        }
      })

    return () => {
      active = false
    }
  }, [])

  const trimmed = apiKey.trim()

  async function handleSubmit(event) {
    event.preventDefault()

    setSaving(true)
    setError(null)

    const toastId = notify.loading("Saving API key")

    try {
      const result = await api.saveAiConfig(trimmed)

      setState({ loading: false, ...result })

      // Clear immediately: the raw key must not linger in the DOM or in state.
      setApiKey("")

      notify.update(toastId, {
        title: "API key saved",
      })
    } catch (err) {
      notify.update(toastId, {
        type: "error",
        title: "Could not save the key",
        description: err?.message,
      })

      setError(err?.message ?? "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setSaving(true)

    try {
      const result = await api.clearAiConfig()

      setState({
        loading: false,
        ...result,
      })

      notify.success("API key removed", {
        description:
          "The assistant is now unavailable to everyone in this workspace.",
      })
    } catch (err) {
      notifyApiError(err, "Could not remove the key")
    } finally {
      setSaving(false)
    }
  }

  if (state.loading) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6" aria-busy="true">
        <span className="sr-only">Loading settings</span>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Workspace-wide configuration for {workspaceName(session)}.
        </p>
      </header>

      {!state.configured ? (
        <Alert variant="destructive">
          <Warning weight="fill" aria-hidden />
          <AlertTitle>The assistant is turned off</AlertTitle>
          <AlertDescription>
            Until a Gemini API key is saved here, the assistant is unavailable
            to every member of this workspace.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Key className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <h2 className="text-[13px] font-semibold text-foreground">
            Gemini API key
          </h2>
        </div>

        <div className="px-4 py-4">
          <p className="max-w-prose text-[12px] leading-relaxed text-muted-foreground">
            Used for every AI answer in this workspace. Requests are billed to
            this key, so it belongs to your organisation, not to an individual.
          </p>

          <form id="ai-key-form" onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor="api-key">
                {state.configured ? "Replace key" : "API key"}
              </FieldLabel>
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="AIza..."
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value)
                  setError(null)
                }}
                disabled={saving}
                className="h-9 max-w-sm font-mono"
              />
              <FieldDescription>
                {state.configured ? (
                  <>
                    Currently using{" "}
                    <code className="font-mono">{state.maskedKey}</code>
                    {state.updatedAt
                      ? ` (saved ${new Date(
                          state.updatedAt
                        ).toLocaleDateString()})`
                      : null}
                    . It cannot be displayed again.
                  </>
                ) : (
                  "Paste the key from Google AI Studio. It is sent over this app's own API and stored server-side."
                )}
              </FieldDescription>
            </Field>

            {error ? (
              <p role="alert" className="text-destructive text-[13px]">
                {error}
              </p>
            ) : null}

            <p className="text-[11px] text-muted-foreground">
              Available models:{" "}
              {AI_MODELS.map((model) => model.label).join(", ")}. Members
              choose which one to use in the Assistant screen.
            </p>
          </form>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!state.configured || saving}
            onClick={handleRemove}
          >
            <Trash aria-hidden />
            Remove key
          </Button>

          <Button type="submit" form="ai-key-form" size="sm" disabled={saving || !trimmed}>
            {saving ? <Spinner /> : null}
            {state.configured ? "Replace key" : "Save key"}
          </Button>
        </div>
      </section>

      {/*
        Data isolation and security. This is the section an IT lead or a CISO
        reads first, so it states plainly what the system does -- and does not
        pretend to implement features it does not.
      */}
      <section className="rounded-lg border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <h2 className="text-[13px] font-semibold text-foreground">
            Data isolation and security
          </h2>
        </div>

        <dl className="flex flex-col">
          <SecurityRow label="Workspace">
            <span className="flex items-center gap-2">
              <span className="font-mono text-[12px]">{workspaceSlug(session)}</span>
              <Badge variant="outline">tenant {session?.companyId ?? "—"}</Badge>
            </span>
          </SecurityRow>
          <Separator />
          <SecurityRow label="Retrieval scope">
            Every vector search is filtered by company id, so one workspace can
            never retrieve another&rsquo;s documents.
          </SecurityRow>
          <Separator />
          <SecurityRow label="Session">
            A signed token is held in an httpOnly cookie. Page scripts cannot
            read it, and it expires after 24 hours.
          </SecurityRow>
          <Separator />
          <SecurityRow label="Your role">
            <span className="flex items-center gap-2">
              <LockKey className="size-3 text-muted-foreground" aria-hidden />
              <span className="text-[12px]">Admin</span>
            </span>
          </SecurityRow>
          <Separator />
          <SecurityRow label="Billing">
            AI requests are billed to this workspace&rsquo;s key, never to an
            individual&rsquo;s account.
          </SecurityRow>
        </dl>
      </section>
    </div>
  )
}

/**
 * A labelled row inside the security section.
 */
function SecurityRow({ label, children }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-[12px] leading-relaxed text-foreground">
        {typeof children === "string" ? children : children}
      </dd>
    </div>
  )
}
