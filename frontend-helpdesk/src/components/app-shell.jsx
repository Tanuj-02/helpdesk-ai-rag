"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChatsCircle,
  GearSix,
  List,
  SignOut,
  Ticket,
  UploadSimple,
  Users,
} from "@phosphor-icons/react"

import { api } from "@/lib/api/client"
import { notify, notifyApiError } from "@/lib/toast"
import { ROLE, ROLE_LABEL } from "@/lib/constants"
import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * Application chrome: sidebar, topbar, and the role-filtered navigation.
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
  { href: "/chat", label: "Assistant", icon: ChatsCircle },
  { href: "/admin/users", label: "People", icon: Users, roles: [ROLE.ADMIN] },
  {
    href: "/admin/documents",
    label: "Documents",
    icon: UploadSimple,
    roles: [ROLE.ADMIN],
  },
  { href: "/admin/settings", label: "Settings", icon: GearSix, roles: [ROLE.ADMIN] },
]

function initialsOf(name, email) {
  const source = name?.trim() || email?.split("@")[0] || "?"
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function AppShell({ session, children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)

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

  return (
    <div className="bg-muted/20 flex min-h-svh w-full">
      <aside className="bg-sidebar sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border lg:flex">
        <SidebarContent session={session} items={items} pathname={pathname} onLogout={handleLogout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 px-4 sm:px-6 backdrop-blur-md">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <List />
                </Button>
              }
            />
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <BrandMark />
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

          {/* Breadcrumb / Status hint */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>RAG Engine Online</span>
            </span>
          </div>

          <div className="flex-1" />

          <ThemeToggle />

          <Badge variant="secondary" className="font-medium text-xs px-2.5">
            {ROLE_LABEL[session.role]}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="gap-2 px-2 hover:bg-muted/60">
                  <Avatar className="size-7 ring-1 ring-border">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {initialsOf(session.name, session.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs font-medium sm:inline">{session.name || session.email}</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate font-semibold">{session.name || "Signed in"}</span>
                  <span className="text-muted-foreground truncate text-xs font-normal">
                    {session.email}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <SignOut className="size-4" aria-hidden />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function SidebarContent({ session, items, pathname, onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <BrandMark />
      </div>

      {/* Tenant Indicator */}
      {session ? (
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-medium truncate text-foreground">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">Workspace #{session.companyId || "101"}</span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {session.role}
            </span>
          </div>
        </div>
      ) : null}

      <nav className="flex-1 flex flex-col gap-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cnNav(active)}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer controls */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="px-2 text-[10px] text-muted-foreground font-mono flex items-center justify-between">
          <span>STOMP :8085</span>
          <span className="text-emerald-500 font-semibold">&bull; Connected</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full justify-start gap-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <SignOut className="size-4 shrink-0" aria-hidden />
          Sign out
        </Button>
      </div>
    </div>
  )
}

function cnNav(active) {
  return [
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
    active
      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  ].join(" ")
}