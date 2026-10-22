import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority";
import { cn } from "cn"

/**
 * Badge.
 *
 * A badge is a *label*, not a button. It is square-ish (4px radius), quiet,
 * and never uses the accent fill unless it is genuinely the primary status.
 * Status hues are exposed as named variants so every screen says the same
 * thing the same way.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-[20px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded border border-transparent px-1.5 text-[11px] font-medium leading-none whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/85",
        secondary: "bg-surface-sunken text-secondary-foreground",
        outline: "border-border-strong text-muted-foreground",
        ghost: "text-muted-foreground",
        success: "border-success/25 bg-success/10 text-success",
        warning: "border-warning/25 bg-warning/10 text-warning",
        danger: "border-destructive/25 bg-destructive/10 text-destructive",
        info: "border-primary/25 bg-primary/10 text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

function Badge({
  className,
  variant = "secondary",
  render,
  ...props
}) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps({
      className: cn(badgeVariants({ variant }), className),
    }, props),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants }
