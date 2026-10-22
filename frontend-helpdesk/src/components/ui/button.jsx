import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva } from "class-variance-authority";
import { cn } from "cn"

/**
 * Button.
 *
 * Hierarchy:
 *   default    -- one per screen. Solid accent, 6px radius.
 *   secondary  -- a tinted surface for the second-most likely action.
 *   outline    -- 1px border, for everything else that must look actionable.
 *   ghost      -- toolbar and icon affordances.
 *   destructive-- red, filled only when the action is irreversible.
 *
 * Heights: 32px (default) / 28px (sm) / 36px (lg) / 40px (touch, `touch`).
 * Focus is a 2px ring with a background-coloured offset, which is visible on
 * both light and dark surfaces.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 ease-[var(--ease-out-quiet)] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.08)]",
        outline:
          "border-border-strong bg-background text-foreground hover:bg-surface-sunken hover:border-border-strong/80",
        secondary:
          "bg-surface-sunken text-secondary-foreground hover:bg-surface-sunken/70 border border-border/60",
        ghost:
          "text-muted-foreground hover:bg-surface-sunken hover:text-foreground aria-expanded:bg-surface-sunken aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.08)]",
        link: "text-primary underline-offset-4 hover:underline rounded-sm px-0",
      },
      size: {
        default: "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-1.5 text-[12px] has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-7 gap-1.5 px-2.5 text-[12px] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-9 gap-1.5 px-3.5",
        touch: "h-10 gap-2 px-4",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      nativeButton={props.nativeButton ?? (!props.render || props.render.type === "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
