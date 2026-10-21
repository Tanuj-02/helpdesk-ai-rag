"use client"

import * as React from "react"
import { FilePdf, Trash, UploadSimple } from "@phosphor-icons/react"

import { api } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABEL,
  DOCUMENT_STATUS,
  DOCUMENT_STATUS_LABEL,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/empty-state"

/**
 * Company document management.
 *
 * Uploads are verified asynchronously and their verdict arrives over RabbitMQ,
 * so a freshly uploaded file returns as `UPLOADED` and later becomes `VERIFIED`
 * or `REJECTED`. The list below reads `GET /admin/document`, which returns the
 * workspace's documents.
 *
 * `POST /admin/document` accepts `title` and `category` as **query
 * parameters**, not form fields, and returns the created document.
 */
export function DocumentAdmin() {
  const [title, setTitle] = React.useState("")
  const [category, setCategory] = React.useState(DOCUMENT_CATEGORIES[0])
  const [file, setFile] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)

  const [docs, setDocs] = React.useState([])
  const [listError, setListError] = React.useState(null)
  // Bumped to force a refetch. `loading` is derived from whether the rendered
  // result corresponds to the current token, which keeps the effect body free
  // of synchronous setState.
  const [reloadToken, setReloadToken] = React.useState(0)
  const [settledToken, setSettledToken] = React.useState(null)
  const loading = settledToken !== reloadToken

  // The document awaiting delete confirmation, and the one currently being
  // deleted (so its confirm button can show progress and be disabled).
  const [pendingDelete, setPendingDelete] = React.useState(null)
  const [deletingId, setDeletingId] = React.useState(null)

  React.useEffect(() => {
    let active = true

    api
      .listDocuments()
      .then((page) => {
        if (!active) return
        setDocs(page?.content ?? [])
        setListError(null)
        setSettledToken(reloadToken)
      })
      .catch((err) => {
        if (!active) return
        setDocs([])
        setListError(err?.message ?? "Could not list documents.")
        setSettledToken(reloadToken)
      })

    return () => {
      active = false
    }
  }, [reloadToken])

  async function handleUpload(event) {
    event.preventDefault()
    if (!file) return

    setUploading(true)
    const toastId = notify.loading(`Uploading ${file.name}`)

    try {
      await api.uploadDocument({
        file,
        title: title.trim() || file.name,
        category,
      })
      notify.update(toastId, {
        title: "Uploaded",
        description: `${file.name} is being verified.`,
      })
      setTitle("")
      setFile(null)
      // Reset the native input so re-picking the same file fires onChange.
      if (fileInputRef.current) fileInputRef.current.value = ""
      setReloadToken((token) => token + 1)
    } catch (err) {
      notify.update(toastId, {
        type: "error",
        title: "Upload failed",
        description: err?.message,
      })
      notifyApiError(err)
    } finally {
      setUploading(false)
    }
  }

  async function handleConfirmDelete() {
    const doc = pendingDelete
    if (!doc) return

    setDeletingId(doc.id)
    try {
      await api.deleteDocument(doc.id)
      setDocs((prev) => prev.filter((item) => item.id !== doc.id))
      notify.success("Document deleted", {
        description: `${doc.title} was removed from the knowledge base.`,
      })
      setPendingDelete(null)
    } catch (err) {
      notifyApiError(err, "Could not delete the document")
    } finally {
      setDeletingId(null)
    }
  }

  const fileInputRef = React.useRef(null)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground text-sm">
          Uploaded documents are verified in the background, then used to ground
          assistant answers.
        </p>
      </header>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadSimple aria-hidden />
            Upload a document
          </CardTitle>
          <CardDescription>
            {ACCEPTED_UPLOAD_EXTENSIONS.replace(/,/g, ", ")} up to{" "}
            {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="doc-title">Title</FieldLabel>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank to use the file name"
                disabled={uploading}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="doc-category">Category</FieldLabel>
              <Select
                value={category}
                onValueChange={(value) => value && setCategory(value)}
              >
                <SelectTrigger id="doc-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {DOCUMENT_CATEGORY_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="doc-file">File</FieldLabel>
              <Input
                id="doc-file"
                type="file"
                ref={fileInputRef}
                accept={ACCEPTED_UPLOAD_EXTENSIONS}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={uploading}
              />
              <FieldDescription>
                Rejected file types come back as a server error, so the browser
                filters them first.
              </FieldDescription>
            </Field>

            <Button type="submit" disabled={!file || uploading} className="self-start">
              {uploading ? "Uploading" : "Upload"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="bg-background overflow-hidden rounded-lg border">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : listError ? (
          <div className="p-6">
            <EmptyState
              title="Could not load documents"
              description={listError}
            />
          </div>
        ) : docs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FilePdf className="size-8" aria-hidden />}
              title="No documents yet"
              description="Upload a policy, handbook or SOP so the assistant can cite it."
            />
          </div>
        ) : (
          <ul className="divide-y">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {DOCUMENT_CATEGORY_LABEL[doc.category] ?? doc.category}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {doc.status === "VERIFIED" ? (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Verified
                    </Badge>
                  ) : doc.status === "REJECTED" ? (
                    <Badge variant="destructive">
                      Rejected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Spinner className="size-3" />
                      <span>Verifying</span>
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${doc.title}`}
                    disabled={deletingId !== null}
                    onClick={() => setPendingDelete(doc)}
                  >
                    <Trash aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title} will be removed from the knowledge base and
              its embeddings purged, so the assistant stops citing it. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingId !== null}
              onClick={handleConfirmDelete}
            >
              {deletingId !== null ? <Spinner /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}