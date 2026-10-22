import { redirect } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Building,
  LockKey,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr"

import { getServerSession } from "@/lib/auth/server"
import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { LoginForm } from "@/components/login-form"

/** Sign-in with the existing tenant-aware authentication flow. */
export default async function LoginPage() {
  const session = await getServerSession()
  if (session) redirect(session.role === "ADMIN" ? "/admin/users" : "/tickets")

  return (
    <main className="login-page flex min-h-svh flex-col bg-background">
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <BrandMark />
        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors duration-150 hover:bg-surface-sunken hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            <span>Back</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
          <div className="login-card w-full">
            <h1 className="text-[28px] font-medium tracking-tight text-foreground">
              Sign in to your workspace
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Use the work email your workspace admin invited. Your workspace
              is selected automatically from the domain.
            </p>

            <div className="mt-6">
              <LoginForm />
            </div>
          </div>

          {/*
            The trust panel. Three plain statements about what the system
            guarantees, and one honest line about what it does not have yet.
          */}
          <aside className="login-story flex flex-col justify-center gap-4"><div className="eyebrow">A LITTLE CLARITY STARTS HERE</div><h2 className="login-story-heading">Your people.<br /><span className="serif-accent">Your knowledge.</span></h2>
            <div className="flex flex-col gap-3">
              <TrustRow icon={Building} title="Isolated by tenant">
                Documents, tickets and chats are partitioned per company. A
                search never crosses a workspace boundary.
              </TrustRow>
              <TrustRow icon={LockKey} title="Session held server-side">
                Your session token is stored in an httpOnly cookie, so page
                scripts cannot read it. It expires after 24 hours.
              </TrustRow>
              <TrustRow icon={ShieldCheck} title="Grounded answers">
                The assistant answers only from your company&rsquo;s indexed
                documents and cites the section it used.
              </TrustRow>
            </div>

            <p className="border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
              Single sign-on is not enabled on this deployment. Credentials are
              issued and reset by your workspace administrator.
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}

function TrustRow({ icon: Icon, title, children }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12px] font-medium text-foreground">{title}</span>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {children}
        </p>
      </div>
    </div>
  )
}
