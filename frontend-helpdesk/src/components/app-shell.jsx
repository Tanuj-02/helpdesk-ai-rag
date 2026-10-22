"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Buildings,
  ChatCircleDots,
  Command,
  GearSix,
  List,
  MagnifyingGlass,
  SignOut,
  Ticket,
  UploadSimple,
  Users,
} from "@phosphor-icons/react"

import { api } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import { ROLE, ROLE_LABEL } from "@/lib/constants"
import { personInitials, workspaceInitials, workspaceName, workspaceSlug } from "@/lib/workspace"
import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Application chrome: workspace sidebar, top bar and command palette.
 *
 * Navigation is filtered by role here, but that is a UX affordance, not a
 * control. `src/proxy.js` redirects the obvious cases and the backend rejects
 * anything unauthorised regardless of what this renders.
 */

/**
 * @type {Array<{ href: string, label: string, icon: any, roles?: string[] }>}
 * `roles` omitted means every signed-in role.
 */
const NAV_ITEMS = [
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/chat", label: "Assistant", icon: ChatCircleDots },
  { href: "/admin/users", label: "People", icon: Users, roles: [ROLE.ADMIN] },
  {
    href: "/admin/documents",
    label: "Documents",
    icon: UploadSimple,
    roles: [ROLE.ADMIN],
  },
  { href: "/admin/settings", label: "Settings", icon: GearSix, roles: [ROLE.ADMIN] },
]

/** Shortcut hints shown in the command palette. */
const PALETTE_SHORTCUTS = {
  "/tickets": "G then T",
  "/chat": "G then A",
  "/admin/users": "G then P",
  "/admin/documents": "G then D",
  "/admin/settings": "G then S",
}

export function AppShell({ session, children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(session.role),
  )

  // The mobile drawer is closed by the nav links themselves (see
  // `onNavigate`). An effect keyed on `pathname` would be a cascading render
  // for something the click already knows about.
  async function handleLogout() {
    try {
      await api.logout()
      router.replace("/login")
      router.refresh()
    } catch (error) {
      notifyApiError(error, "Could not sign you out. Try again.")
    }
  }

  function navigate(href) {
    setPaletteOpen(false)
    setMobileOpen(false)
    router.push(href)
  }

  // Cmd/Ctrl+K opens the palette from anywhere in the app.
  React.useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <TooltipProvider>
      <div className="workspace-shell flex min-h-svh w-full bg-background">
        <aside className="workspace-sidebar sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
          <SidebarContent
            session={session}
            items={items}
            pathname={pathname}
            onLogout={handleLogout}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="workspace-topbar sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b border-border bg-background px-4 sm:px-5">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open navigation"
                  >
                    <List />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                </SheetHeader>
                <SidebarContent
                  session={session}
                  items={items}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                  onLogout={handleLogout}
                />
              </SheetContent>
            </Sheet>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex h-8 w-full max-w-64 items-center gap-2 rounded-md border border-border bg-surface-sunken/60 px-2.5 text-left text-[12px] text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <MagnifyingGlass className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Search or jump to</span>
              <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-1 font-mono text-[10px] leading-4 text-muted-foreground sm:inline">
                ⌘K
              </kbd>
            </button>

            <div className="flex-1" />

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-8 gap-2 px-1.5 hover:bg-surface-sunken"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-6">
                      <AvatarFallback>
                        {personInitials(session.name, session.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-32 truncate text-[12px] font-medium sm:inline">
                      {session.name || session.email}
                    </span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate text-[13px] font-semibold text-foreground">
                      {session.name || "Signed in"}
                    </span>
                    <span className="truncate text-[11px] font-normal text-muted-foreground">
                      {session.email}
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-[11px] text-muted-foreground">Role</span>
                    <Badge variant="outline">{ROLE_LABEL[session.role]}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-[11px] text-muted-foreground">Workspace</span>
                    <span className="truncate font-mono text-[11px] text-foreground">
                      {workspaceSlug(session)}
                    </span>
                  </div>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <SignOut className="size-4" aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="workspace-content min-h-0 min-w-0 flex-1">{children}</main>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={items}
        onNavigate={navigate}
      />
    </TooltipProvider>
  )
}

function SidebarContent({ session, items, pathname, onNavigate, onLogout }) {
  const slug = workspaceSlug(session)
  const name = workspaceName(session)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-13 shrink-0 items-center border-b border-border px-3.5">
        <BrandMark />
      </div>

      {/*
        Tenant indicator. Always visible, never collapsible: knowing which
        workspace you are in is the single most important piece of context in
        a multi-tenant product.
      */}
      <div className="px-2.5 pt-3 pb-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex w-full cursor-default items-center gap-2.5 rounded-md border border-border bg-surface-sunken/50 px-2 py-1.5 text-left">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-[5px] bg-primary/10 text-[10px] font-semibold text-primary"
                  aria-hidden
                >
                  {workspaceInitials(session)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-[12px] font-semibold text-foreground">
                    {name}
                  </span>
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {slug}
                  </span>
                </span>
              </div>
            }
          />
          <TooltipContent side="right">
            Workspace {name} ({slug}) &middot; tenant {session.companyId ?? "—"}
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-0.5 p-2.5" aria-label="Main">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={navItemClass(active)}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <Separator />

      <div className="p-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start gap-2.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <SignOut className="size-4 shrink-0" aria-hidden />
          Sign out
        </Button>
      </div>
    </div>
  )
}

function navItemClass(active) {
  return [
    "workspace-nav-link flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150",
    active
      ? "bg-surface-sunken font-medium text-foreground"
      : "text-muted-foreground hover:bg-surface-sunken/60 hover:text-foreground",
  ].join(" ")
}

/**
 * Command palette.
 *
 * A dialog, not a modal: the list is a flat set of destinations. The filter
 * matches on label, path and section, and Enter opens the highlighted row.
 */
function CommandPalette({ open, onOpenChange, items, onNavigate }) {
  // The query and the highlighted row live in one state object so a new query
  // resets the highlight in the same update, without an effect.
  const [state, setState] = React.useState({ query: "", highlight: 0 })
  const { query, highlight } = state
  const inputRef = React.useRef(null)

  const commands = React.useMemo(() => {
    const list = [
      ...items.map((item) => ({
        id: item.href,
        label: item.label,
        hint: item.href,
        section: "Go to",
        icon: item.icon,
      })),
      { id: "/tickets/new", label: "New ticket", hint: "Raise a ticket", section: "Create", icon: Ticket },
    ]
    const term = query.trim().toLowerCase()
    if (!term) return list
    return list.filter(
      (command) =>
        command.label.toLowerCase().includes(term) ||
        command.hint.toLowerCase().includes(term) ||
        command.section.toLowerCase().includes(term),
    )
  }, [items, query])

  // The highlight can never point past the end of the filtered list.
  const activeIndex = Math.min(highlight, Math.max(commands.length - 1, 0))

  // Focus the field once the dialog has mounted.
  React.useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(timer)
  }, [open])

  function setQuery(value) {
    setState({ query: value, highlight: 0 })
  }

  function handleOpenChange(next) {
    if (!next) setState({ query: "", highlight: 0 })
    onOpenChange(next)
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setState((current) => ({
        ...current,
        highlight: Math.min(current.highlight + 1, commands.length - 1),
      }))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setState((current) => ({
        ...current,
        highlight: Math.max(current.highlight - 1, 0),
      }))
    } else if (event.key === "Enter") {
      event.preventDefault()
      const target = commands[activeIndex]
      if (target) onNavigate(target.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="top-[18%] max-w-lg translate-y-0 gap-0 p-0 sm:max-w-lg"
        onKeyDown={onKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Search pages and actions.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border px-3">
          <Command className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a page or action"
            aria-label="Search commands"
            className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="shrink-0 rounded border border-border bg-surface-sunken px-1 font-mono text-[10px] leading-4 text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5">
          {commands.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-[12px] text-muted-foreground">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            commands.map((command, index) => {
              const Icon = command.icon
              return (
                <button
                  key={command.id}
                  type="button"
                  onMouseEnter={() =>
                    setState((current) => ({ ...current, highlight: index }))
                  }
                  onClick={() => onNavigate(command.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-100 ${
                    index === activeIndex
                      ? "bg-surface-sunken text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate text-[13px] font-medium">{command.label}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                    {PALETTE_SHORTCUTS[command.id] ?? command.hint}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
