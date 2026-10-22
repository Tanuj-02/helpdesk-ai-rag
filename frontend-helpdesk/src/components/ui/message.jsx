import * as React from "react"
import { cn } from "cn"

/**
 * Message layout primitives.
 *
 * `align="start"` is the assistant: document-style text, no bubble, no
 * avatar column. `align="end"` is the person: a tinted block, right-aligned.
 */
function MessageGroup({
  className,
  ...props
}) {
  return (
    <div
      data-slot="message-group"
      className={cn("flex min-w-0 flex-col gap-6", className)}
      {...props} />
  );
}

function Message({
  className,
  align = "start",
  ...props
}) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        "group/message relative flex w-full min-w-0 flex-col gap-1.5 text-[13px] data-[align=end]:items-end",
        className
      )}
      {...props} />
  );
}

function MessageAvatar({
  className,
  ...props
}) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(
        "flex w-fit min-w-7 shrink-0 items-center justify-center self-start overflow-hidden rounded-md",
        className
      )}
      {...props} />
  );
}

function MessageContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 wrap-break-word group-data-[align=end]/message:items-end",
        className
      )}
      {...props} />
  );
}

function MessageHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        "flex max-w-full min-w-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0",
        className
      )}
      {...props} />
  );
}

function MessageFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "flex max-w-full min-w-0 items-center gap-1 text-[12px] font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end",
        className
      )}
      {...props} />
  );
}

export {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
}
