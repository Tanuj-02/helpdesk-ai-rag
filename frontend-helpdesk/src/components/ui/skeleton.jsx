import { cn } from "cn"

/**
 * Skeleton.
 *
 * A soft pulse with a single-pass sheen, so a loading screen has the same
 * rhythm as the content that replaces it. Always pair a skeleton with
 * `aria-busy` on its container and a screen-reader-only "Loading" label.
 */
function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-sheen animate-pulse rounded-sm bg-surface-sunken", className)}
      {...props} />
  );
}

export { Skeleton }
