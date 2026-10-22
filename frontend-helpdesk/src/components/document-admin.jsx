"use client"

import * as React from "react"
import {
  CheckCircle,
  FilePdf,
  MagnifyingGlass,
  Trash,
  UploadSimple,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState } from "@/components/empty-state"

/**
 * Document status -> badge variant and label.
 *
 * The backend only ever writes UPLOADED, APPROVED and REJECTED, but the enum
 * also carries PROCESSING and FAILED, so all five are handled.
 */
const STATUS_VIEW = {
  [DOCUMENT_STATUS.UPLOADED]: { variant: "secondary", label: "Uploading" },
  [DOCUMENT_STATUS.PROCESSING]: { variant: "info", label: "Indexing" },
  [DOCUMENT_STATUS.APPROVED]: { variant: "success", label: "Indexed" },
  [DOCUMENT_STATUS.REJECTED]: { variant: "danger", label: "Rejected" },
  [DOCUMENT_STATUS.FAILED]: { variant: "danger", label: "Failed" },
}

/**
 * Company document management.
 *
 * Uploads are verified asynchronously and their verdict arrives over RabbitMQ,
 * so a freshly uploaded file returns as `UPLOADED` and later becomes
 * `APPROVED` or `REJECTED`. The list below reads `GET /admin/document`, which
 * returns the workspace's documents.
 *
 * `POST /admin/document` accepts `title` and `category` as **query
 * parameters**, not form fields, and returns the created document.
 */
export function DocumentAdmin() {
  const [title, setTitle] = React.useState("")
  const [category, setCategory] = React.useState(DOCUMENT_CATEGORIES[0])
  const [file, setFile] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)

  const [docs, setDocs] = React.useState([])
  const [listError, setListError] = React.useState(null)
  // Bumped to force a refetch. `loading` is derived from whether the rendered
  // result corresponds to the current token, which keeps the effect body free
  // of synchronous setState.
  const [reloadToken, setReloadToken] = React.useState(0)
  const [settledToken, setSettledToken] = React.useState(null)
  const loading = settledToken !== reloadToken

  const [query, setQuery] = React.useState("")

  // The document awaiting delete confirmation, and the one currently being
  // deleted (so its confirm button can show progress and be disabled).
  const [pendingDelete, setPendingDelete] = React.useState(null)
  const [deletingId, setDeletingId] = React.useState(null)

  const fileInputRef = React.useRef(null)

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

  const visibleDocs = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return docs
    return docs.filter((doc) =>
      `${doc.title ?? ""} ${doc.fileName ?? ""} ${doc.category ?? ""}`
        .toLowerCase()
        .includes(term),
    )
  }, [docs, query])

  function acceptFile(candidate) {
    if (!candidate) return
    // The backend rejects unsupported types with a 500, so the browser filters
    // them first.
    const allowed = ACCEPTED_UPLOAD_EXTENSIONS.split(",").map((ext) =>
      ext.trim().toLowerCase(),
    )
    const name = candidate.name.toLowerCase()
    if (!allowed.some((ext) => name.endsWith(ext))) {
      notify.error("That file type is not supported", {
        description: `Upload a ${allowed.join(", ")} file.`,
      })
      return
    }
    if (candidate.size > MAX_UPLOAD_BYTES) {
      notify.error("That file is too large", {
        description: `The limit is ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      })
      return
    }
    setFile(candidate)
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
          Documents
        </h1>
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">
          Every file here is verified, chunked and indexed before the assistant
          is allowed to cite it. A document that is not indexed cannot be
          retrieved.
        </p>
      </header>

      <form
        onSubmit={handleUpload}
        className="rounded-lg border border-border bg-surface p-4 sm:p-5"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="flex flex-col gap-4">
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
          </div>

          {/*
            The dropzone. Understated on purpose: a dashed hairline and a
            short line of text. A large illustrated target would imply a
            marketing page, not an admin tool.
          */}
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              acceptFile(event.dataTransfer.files?.[0])
            }}
            className={`flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center transition-colors duration-150 ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border-strong bg-surface-sunken/40"
            }`}
          >
            <UploadSimple className="size-4 text-muted-foreground" aria-hidden />
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Drop a file here, or
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Choose a file
            </Button>
            <Input
              ref={fileInputRef}
              id="doc-file"
              type="file"
              accept={ACCEPTED_UPLOAD_EXTENSIONS}
              onChange={(e) => acceptFile(e.target.files?.[0])}
              disabled={uploading}
              className="sr-only"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-[11px] text-muted-foreground">
            {ACCEPTED_UPLOAD_EXTENSIONS.replace(/,/g, ", ")} up to{" "}
            {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.
            {file ? (
              <span className="ml-1 font-medium text-foreground">
                {file.name} ({formatBytes(file.size)})
              </span>
            ) : null}
          </p>
          <Button type="submit" size="sm" disabled={!file || uploading}>
            {uploading ? "Uploading" : "Upload document"}
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search documents"
            aria-label="Search documents"
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <span className="text-[11px] text-muted-foreground">
          <span className="tnum">{visibleDocs.length}</span> of{" "}
          <span className="tnum">{docs.length}</span> documents
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {loading ? (
          <div aria-busy="true">
            <span className="sr-only">Loading documents</span>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-border px-3.5 py-3 last:border-0"
              >
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="ml-auto h-3.5 w-20" />
              </div>
            ))}
          </div>
        ) : listError ? (
          <div className="p-6">
            <EmptyState
              icon={<WarningCircle className="size-4" aria-hidden />}
              title="Could not load documents"
              description={listError}
            />
          </div>
        ) : docs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<FilePdf className="size-4" aria-hidden />}
              title="No documents yet"
              description="Upload a policy, handbook or SOP so the assistant can cite it."
            />
          </div>
        ) : visibleDocs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No documents match"
              description={`Nothing here matches “${query}”.`}
              action={
                <Button variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead className="hidden w-32 md:table-cell">Category</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="hidden w-32 lg:table-cell">Added</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleDocs.map((doc) => {
                const view = STATUS_VIEW[doc.status] ?? {
                  variant: "secondary",
                  label: DOCUMENT_STATUS_LABEL[doc.status] ?? doc.status,
                }
                const pending =
                  doc.status === DOCUMENT_STATUS.UPLOADED ||
                  doc.status === DOCUMENT_STATUS.PROCESSING

                return (
                  <TableRow key={doc.id}>
                    <TableCell className="max-w-0">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium text-foreground">
                          {doc.title}
                        </span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          {doc.fileName}
                        </span>
                        {doc.status === DOCUMENT_STATUS.REJECTED && doc.rejectionReason ? (
                          <span className="mt-0.5 text-[11px] leading-relaxed text-destructive">
                            {doc.rejectionReason}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-[12px] text-muted-foreground md:table-cell">
                      {DOCUMENT_CATEGORY_LABEL[doc.category] ?? doc.category}
                    </TableCell>
                    <TableCell>
                      <Badge variant={view.variant} className="gap-1">
                        {pending ? (
                          <Spinner className="size-2.5" />
                        ) : doc.status === DOCUMENT_STATUS.APPROVED ? (
                          <CheckCircle weight="fill" className="size-3" aria-hidden />
                        ) : doc.status === DOCUMENT_STATUS.REJECTED ||
                          doc.status === DOCUMENT_STATUS.FAILED ? (
                          <XCircle weight="fill" className="size-3" aria-hidden />
                        ) : null}
                        {view.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-[12px] text-muted-foreground lg:table-cell">
                      {formatDate(doc.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${doc.title}`}
                        disabled={deletingId !== null}
                        onClick={() => setPendingDelete(doc)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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

function formatDate(value) {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
