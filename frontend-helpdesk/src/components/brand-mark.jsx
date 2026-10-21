import { Sparkle } from "@phosphor-icons/react/dist/ssr"

/**
 * Wordmark used across the application header, sidebar, and landing page.
 * Uses `@phosphor-icons/react/dist/ssr` for server-safe rendering.
 */
export function BrandMark({ className, compact = false }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/30 ring-1 ring-white/20 dark:ring-white/10">
          <Sparkle weight="fill" className="size-4.5 transition-transform duration-300 group-hover:rotate-12" aria-hidden />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-background" />
        </span>
        {!compact ? (
          <span className="flex flex-col leading-none">
            <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
              HelpDesk
              <span className="rounded bg-primary/10 px-1 py-0.2 text-[10px] font-semibold text-primary">
                AI
              </span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
              Enterprise RAG Desk
            </span>
          </span>
        ) : null}
      </div>
    </div>
  )
}