import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * Convenience wrapper over the shadcn `Empty` primitives.
 *
 * The primitives want a fixed child order (header / media / content) and a
 * `<div>` inside the header for the title and description. Composing that at
 * every call site is noisy and easy to get subtly wrong, so this takes a few
 * props instead.
 *
 * @param {{
 *   icon?: React.ReactNode,
 *   title: string,
 *   description?: React.ReactNode,
 *   action?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <Empty className={className}>
      {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}