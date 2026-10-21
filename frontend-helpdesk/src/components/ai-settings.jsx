"use client"

import * as React from "react"
import { Key, Trash, Warning } from "@phosphor-icons/react"

import { api } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import { AI_MODELS } from "@/lib/constants"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
export function AiSettings() {
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
      <div className="flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Settings
        </h1>

        <p className="text-muted-foreground text-sm">
          Workspace-wide configuration for the assistant.
        </p>
      </header>

      {!state.configured ? (
        <Alert variant="destructive">
          <Warning weight="fill" aria-hidden />

          <AlertTitle>
            The assistant is turned off
          </AlertTitle>

          <AlertDescription>
            Until a Gemini API key is saved here, the assistant is unavailable
            to every member of this workspace.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key weight="bold" aria-hidden />
            Gemini API key
          </CardTitle>

          <CardDescription>
            Used for every AI answer in this workspace. Requests are billed to
            this key, so it belongs to your organisation, not to an individual.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            id="ai-key-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
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
              />

              <FieldDescription>
                {state.configured ? (
                  <>
                    Currently using{" "}
                    <code className="font-mono">
                      {state.maskedKey}
                    </code>

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
              <p
                role="alert"
                className="text-destructive text-sm"
              >
                {error}
              </p>
            ) : null}

            <p className="text-muted-foreground text-xs">
              Available models:{" "}
              {AI_MODELS.map((model) => model.label).join(", ")}. Members
              choose which one to use in the Assistant screen.
            </p>
          </form>
        </CardContent>

        <CardFooter className="justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!state.configured || saving}
            onClick={handleRemove}
          >
            <Trash aria-hidden />
            Remove key
          </Button>

          <Button
            type="submit"
            form="ai-key-form"
            disabled={saving || !trimmed}
          >
            {saving ? <Spinner /> : null}
            {state.configured ? "Replace key" : "Save key"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}