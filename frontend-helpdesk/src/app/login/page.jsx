import { redirect } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Broadcast,
  CheckCircle,
  Database,
  LockKey,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr"

import { getServerSession } from "@/lib/auth/server"
import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { LoginForm } from "@/components/login-form"
import { Badge } from "@/components/ui/badge"

export default async function LoginPage() {
  const session = await getServerSession()
  if (session) redirect(session.role === "ADMIN" ? "/admin/users" : "/tickets")

  return (
    <main className="relative grid min-h-svh lg:grid-cols-12 bg-background">
      {/* Top Controls */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          <span>Home</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Left Column: Sign-in form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:col-span-5 lg:px-12">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <BrandMark />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sign in to your workspace
            </h1>
            <p className="text-xs text-muted-foreground">
              Internal helpdesk grounded in verified enterprise documents & real-time agent triage.
            </p>
          </div>

          <LoginForm />

          <p className="text-center text-[11px] text-muted-foreground">
            End-to-end encrypted session with JWT &bull; Strictly tenant isolated
          </p>
        </div>
      </div>

      {/* Right Column: Premium Visual Showcase */}
      <div className="relative hidden lg:col-span-7 lg:flex flex-col justify-between overflow-hidden border-l border-border/50 bg-gradient-to-br from-card via-card/90 to-background p-12">
        {/* Subtle radial glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-[32rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-[32rem] rounded-full bg-chart-1/10 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          <Badge variant="outline" className="gap-1.5 border-primary/20 bg-primary/5 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-primary">Microservices Online</span>
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            v2.4 &bull; Multi-Tenant RAG
          </span>
        </div>

        {/* Feature showcase cards */}
        <div className="relative z-10 my-auto max-w-xl space-y-5">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Verified answers. <br />
              Zero hallucinations.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every assistant response is grounded in approved workspace documents, indexed in
              Qdrant, and audited by Spring AI before reaching your employees.
            </p>
          </div>

          {/* Telemetry card stack */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                <Database className="size-4" />
                <span>Qdrant Vector DB</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cosine similarity matching scoped by company tenant id for sub-second retrieval.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
                <Broadcast className="size-4" />
                <span>STOMP WebSockets</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Dedicated ticketChatService on port 8085 providing instant live agent support.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-500 font-semibold text-xs">
                <ShieldCheck className="size-4" />
                <span>Document Audit</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Apache Tika extraction + Spring AI audit pipeline on RabbitMQ before vector storage.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-sm shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
                <LockKey className="size-4" />
                <span>Enterprise Isolation</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Role-based access control protecting corporate secrets across tickets and chats.
              </p>
            </div>
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative z-10 flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
          <span>Acme Corp Knowledge Base</span>
          <span>Security Verified</span>
        </div>
      </div>
    </main>
  )
}