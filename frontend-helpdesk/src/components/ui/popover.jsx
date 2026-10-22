"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "cn"

/**
 * Popover.
 *
 * A light, bordered surface that floats above the page. The one place a
 * shadow is used for structure, because a floating surface has to separate
 * itself from what is behind it.
 */
function Popover({
  ...props
}) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverPortal({
  ...props
}) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />;
}

function PopoverPositioner({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  ...props
}) {
  return (
    <PopoverPrimitive.Positioner
      data-slot="popover-positioner"
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      className={cn("isolate z-50", className)}
      {...props} />
  );
}

function PopoverPopup({
  className,
  ...props
}) {
  return (
    <PopoverPrimitive.Popup
      data-slot="popover-content"
      className={cn(
        "z-50 w-72 origin-(--transform-origin) rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-[var(--shadow-popover)] outline-none duration-150 data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-left-1 data-[side=inline-start]:slide-in-from-right-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className
      )}
      {...props} />
  );
}

function PopoverTitle({
  className,
  ...props
}) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("text-[13px] font-semibold text-foreground", className)}
      {...props} />
  );
}

function PopoverDescription({
  className,
  ...props
}) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-[12px] leading-relaxed text-muted-foreground", className)}
      {...props} />
  );
}

function PopoverClose({
  ...props
}) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

function PopoverArrow({
  className,
  ...props
}) {
  return (
    <PopoverPrimitive.Arrow
      data-slot="popover-arrow"
      className={cn(
        "z-50 size-2.5 rotate-45 rounded-[2px] border border-border bg-popover",
        className
      )}
      {...props} />
  );
}

export {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverDescription,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
}
