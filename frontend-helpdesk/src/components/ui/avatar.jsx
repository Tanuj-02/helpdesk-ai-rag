"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "cn"

/**
 * Avatar.
 *
 * 6px radius, not a circle: a square-ish initial tile reads as an
 * identifier in a data table, where a circle reads as an avatar badge. The
 * hairline ring is a border, not a shadow.
 */
function Avatar({
  className,
  size = "default",
  ...props
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-7 shrink-0 select-none overflow-hidden rounded-md border border-border bg-surface-sunken",
        className
      )}
      {...props} />
  );
}

function AvatarImage({
  className,
  ...props
}) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props} />
  );
}

function AvatarFallback({
  className,
  ...props
}) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center bg-surface-sunken text-[11px] font-semibold text-secondary-foreground group-data-[size=sm]/avatar:text-[10px]",
        className
      )}
      {...props} />
  );
}

function AvatarBadge({
  className,
  ...props
}) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=default]/avatar:size-2.5",
        className
      )}
      {...props}
    />
  );
}

function AvatarGroup({
  className,
  ...props
}) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props} />
  );
}

function AvatarGroupCount({
  className,
  ...props
}) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-[11px] font-medium text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-9 [&>svg]:size-3.5",
        className
      )}
      {...props} />
  );
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
