"use client"

import * as React from "react"
import { FileText, ArrowSquareOut, Clock } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * Source citations for an assistant answer.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The retrieval pipeline already knows which chunks grounded an answer --
 * `QuestionAnswerAdvisor` fetched them from Qdrant -- but `GET /ai/chat`
 * returns a bare `Flux<String>`, so the browser never receives that list.
 * Everything below is written to consume a `sources` array in the shape the
 * backend should start returning:
 *
 *   { id, title, section?, page?, updatedAt?, snippet? }
 *
 * Until it does, `deriveSources()` falls back to parsing inline reference
 * markers out of the answer text, which is what a grounded model tends to
 * emit anyway ("...per the handbook [1]"). If neither is available the UI
 * says so honestly rather than inventing a citation.
 *
 * See "Backend changes" in the redesign notes.
 */

/**
 * @typedef {Object} ChatSource
 * @property {string} id
 * @property {string} title
 * @property {string} [section]  section heading, e.g. "Leave and absence"
 * @property {string|number} [page]
 * @property {string} [updatedAt] ISO date
 * @property {string} [snippet]   the exact text that was retrieved
 */

/**
 * Normalise whatever the server sent into a list of sources.
 *
 * Accepts either an explicit `sources` array on the message, or inline
 * markers in the answer text.
 *
 * @param {Record<string, any>} message
 * @returns {ChatSource[]}
 */
export function deriveSources(message) {
  if (Array.isArray(message?.sources) && message.sources.length > 0) {
    return message.sources
      .map((source, index) => ({
        id: String(source.id ?? index + 1),
        title: source.title ?? source.documentTitle ?? "Untitled document",
        section: source.section ?? source.documentSection ?? undefined,
        page: source.page ?? source.documentPage ?? undefined,
        updatedAt: source.updatedAt ?? source.lastUpdated ?? undefined,
        snippet: source.snippet ?? source.content ?? undefined,
      }))
      .filter((source) => source.title)
  }

  return parseInlineMarkers(message?.content ?? "")
}

/**
 * Pull `[1]`-style reference markers and the document titles that follow
 * them out of an answer.
 *
 * Two shapes are recognised:
 *   "...the policy [1]."                  -> source number 1, no title
 *   "...the policy [1: Employee Handbook]"-> source number 1, titled
 *
 * @param {string} content
 * @returns {ChatSource[]}
 */
function parseInlineMarkers(content) {
  if (!content) return []

  const pattern = /\[(\d+)(?::\s*([^\]]{2,80}))?\]/g
  const found = new Map()

  for (const match of content.matchAll(pattern)) {
    const number = match[1]
    if (found.has(number)) continue
    found.set(number, {
      id: number,
      title: match[2]?.trim() || `Reference ${number}`,
      section: undefined,
      page: undefined,
      updatedAt: undefined,
      snippet: undefined,
    })
  }

  return [...found.values()].sort((a, b) => Number(a.id) - Number(b.id))
}

/**
 * Replace `[1]` with a superscript reference that links to the source row.
 *
 * Done as text substitution rather than a markdown plugin so the answer body
 * stays exactly what the model produced.
 *
 * @param {string} content
 * @param {ChatSource[]} sources
 * @returns {React.ReactNode[]}
 */
export function renderWithCitations(content, sources) {
  if (!content) return []
  if (!sources.length) return [content]

  const known = new Set(sources.map((source) => source.id))
  const pattern = /\[(\d+)(?::\s*([^\]]{2,80}))?\]/g
  const parts = []
  let lastIndex = 0

  for (const match of content.matchAll(pattern)) {
    const number = match[1]
    if (!known.has(number)) continue

    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    const source = sources.find((item) => item.id === number)
    parts.push(
      <sup
        key={`cite-${match.index}`}
        className="mx-px inline-flex min-w-4 translate-y-[-0.15em] items-center justify-center rounded-[3px] border border-primary/30 bg-primary/10 px-1 font-mono text-[10px] leading-[14px] font-semibold text-primary"
        title={source?.title}
      >
        {number}
      </sup>,
    )

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length ? parts : [content]
}

/**
 * The compact "Sources" row that sits under an answer.
 *
 * Clicking a source opens a side panel with the retrieved text. With no
 * backend citations available it renders a single honest line instead of an
 * empty container.
 */
export function SourceRow({ sources, companyName, onOpen }) {
  if (!sources.length) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Grounded in {companyName}&rsquo;s indexed documents. Citations are not
        available for this answer.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">Sources</span>
      {sources.map((source) => (
        <button
          key={source.id}
          type="button"
          onClick={() => onOpen?.(source)}
          className="inline-flex max-w-56 items-center gap-1.5 rounded-md border border-border bg-surface-sunken/60 px-1.5 py-1 text-[11px] text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          title={source.title}
        >
          <FileText className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{source.title}</span>
          {source.section ? (
            <span className="shrink-0 text-muted-foreground/70">&middot;</span>
          ) : null}
          {source.section ? (
            <span className="shrink-0 truncate opacity-80">{source.section}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

/**
 * The side panel that previews one source.
 */
export function SourcePanel({ source, companyName, open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 pr-8">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{source?.title ?? "Source"}</span>
          </SheetTitle>
          {source ? (
            <SheetDescription>
              {source.section ? `${source.section} · ` : ""}
              {source.page ? `Page ${source.page} · ` : ""}
              {companyName}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        {source ? (
          <div className="flex-1 overflow-y-auto p-4">
            <dl className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-medium text-muted-foreground">
                  Document
                </dt>
                <dd className="text-[13px] text-foreground">{source.title}</dd>
              </div>

              {source.section ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-medium text-muted-foreground">
                    Section
                  </dt>
                  <dd className="text-[13px] text-foreground">{source.section}</dd>
                </div>
              ) : null}

              {source.page ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-medium text-muted-foreground">
                    Page
                  </dt>
                  <dd className="text-[13px] text-foreground">{source.page}</dd>
                </div>
              ) : null}

              {source.updatedAt ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Clock className="size-3" aria-hidden />
                    Last updated
                  </dt>
                  <dd className="text-[13px] text-foreground">
                    {formatDate(source.updatedAt)}
                  </dd>
                </div>
              ) : null}
            </dl>

            {source.snippet ? (
              <div className="mt-5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Retrieved text
                </p>
                <blockquote className="mt-1.5 border-l-2 border-border pl-3 text-[13px] leading-relaxed text-foreground">
                  {source.snippet}
                </blockquote>
              </div>
            ) : (
              <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
                The full text of this document is not included in the answer
                response. Open the Documents section to read it.
              </p>
            )}

            <div className="mt-6 flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {companyName}
              </Badge>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowSquareOut aria-hidden />
                Open document
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
