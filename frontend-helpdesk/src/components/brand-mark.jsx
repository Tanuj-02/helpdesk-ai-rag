import { FileText } from "@phosphor-icons/react/dist/ssr"

/** Shared wordmark for the public site and support workspace. */
export function BrandMark({ className, compact = false }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span
          className="brand-symbol flex size-8 shrink-0 items-center justify-center rounded-[5px] bg-primary text-primary-foreground"
          aria-hidden
        >
          <FileText className="size-3.5" weight="bold" />
        </span>
        {!compact ? (
          <span className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold tracking-tight">
              Helpdesk
            </span>
            <span className="mt-1 text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              Support workspace
            </span>
          </span>
        ) : null}
      </div>
    </div>
  )
}
