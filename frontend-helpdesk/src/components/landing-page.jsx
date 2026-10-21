"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowsClockwise,
  Broadcast,
  CheckCircle,
  Cpu,
  Database,
  FilePdf,
  FileText,
  Key,
  Lightning,
  LockKey,
  PaperPlaneRight,
  ShieldCheck,
  Sparkle,
  Terminal,
  Ticket,
  UploadSimple,
  User,
  Users,
} from "@phosphor-icons/react"

import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LandingPage({ session }) {
  const [copiedRole, setCopiedRole] = React.useState(null)

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden">
        <div className="h-[34rem] w-[75rem] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group transition-opacity hover:opacity-90">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#capabilities" className="transition-colors hover:text-foreground">
              Capabilities
            </a>
            <a href="#interactive-preview" className="transition-colors hover:text-foreground">
              Live Interactive Demo
            </a>
            <a href="#architecture" className="transition-colors hover:text-foreground">
              Architecture
            </a>
            <a href="#test-drive" className="transition-colors hover:text-foreground">
              Demo Access
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? (
              <Button size="sm" className="gap-2 shadow-sm" render={<Link href="/tickets" />}>
                <span>Workspace</span>
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                  Sign in
                </Button>
                <Button size="sm" className="gap-2 shadow-sm" render={<Link href="/login" />}>
                  <span>Launch App</span>
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Status badge pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-foreground backdrop-blur-sm transition-all hover:border-primary/40">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold text-primary">Microservices Live</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Java 25 + Spring AI 2.0 + Qdrant</span>
          </div>

          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Enterprise support with{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-chart-1 bg-clip-text text-transparent">
              verified truth
            </span>
            .
          </h1>

          <p className="mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            A multi-tenant helpdesk pairing Qdrant vector retrieval, automated document audit
            pipelines (Apache Tika + Spring AI), and real-time STOMP agent chat. Accurate answers
            in milliseconds with zero hallucinations.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {session ? (
              <Button size="lg" className="h-11 gap-2 px-6 shadow-md shadow-primary/25" render={<Link href="/tickets" />}>
                <span>Enter Workspace</span>
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button size="lg" className="h-11 gap-2 px-6 shadow-md shadow-primary/25" render={<Link href="/login" />}>
                <span>Get Started Now</span>
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="h-11 gap-2 px-6"
              render={<a href="#interactive-preview" />}
            >
              <span>Explore Live Interface</span>
            </Button>
          </div>

          {/* Quick Telemetry Bar */}
          <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-4 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm sm:grid-cols-4">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold tracking-tight text-foreground">&lt; 15ms</span>
              <span className="text-xs text-muted-foreground">Vector Search Latency</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold tracking-tight text-foreground">100%</span>
              <span className="text-xs text-muted-foreground">Tenant Isolated</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold tracking-tight text-foreground">STOMP 1.2</span>
              <span className="text-xs text-muted-foreground">Live WebSocket Chat</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold tracking-tight text-foreground">Tika + LLM</span>
              <span className="text-xs text-muted-foreground">Doc Audit Pipeline</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Preview */}
        <div id="interactive-preview" className="mt-16 scroll-mt-24">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-2xl shadow-primary/5 backdrop-blur-xl ring-1 ring-border/50">
            {/* Window chrome header */}
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-destructive/60" />
                <span className="size-3 rounded-full bg-amber-500/60" />
                <span className="size-3 rounded-full bg-emerald-500/60" />
                <span className="ml-2 text-xs font-mono font-medium text-muted-foreground">
                  helpdesk.internal/workspace
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1 font-mono text-[11px]">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  raghelpdesk:8080 &bull; chat:8085
                </Badge>
              </div>
            </div>

            {/* Interactive Workspace Tabs */}
            <div className="p-4 sm:p-6">
              <Tabs defaultValue="assistant" className="w-full">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
                  <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger value="assistant" className="gap-2 text-xs font-medium">
                      <Sparkle className="size-3.5 text-primary" />
                      <span>RAG Assistant</span>
                    </TabsTrigger>
                    <TabsTrigger value="tickets" className="gap-2 text-xs font-medium">
                      <Ticket className="size-3.5 text-primary" />
                      <span>Live Tickets & SLA</span>
                    </TabsTrigger>
                    <TabsTrigger value="live-chat" className="gap-2 text-xs font-medium">
                      <Broadcast className="size-3.5 text-primary" />
                      <span>Agent STOMP Chat</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-2 text-xs font-medium">
                      <FileText className="size-3.5 text-primary" />
                      <span>Document Ingestion</span>
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">Company Tenant #101 (Acme Corp)</span>
                  </div>
                </div>

                {/* Tab 1: AI Assistant */}
                <TabsContent value="assistant" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Grounding Context
                      </div>
                      <div className="rounded-lg border border-border/40 bg-card p-3 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <FilePdf className="size-4 text-rose-500" />
                          <span>Global_Travel_Policy_2026.pdf</span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          Audited by Tika & Spring AI. Chunk #14 (Cosine 0.93)
                        </p>
                        <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Qdrant Vector Matched
                        </Badge>
                      </div>

                      <div className="rounded-lg border border-border/40 bg-card p-3 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <FilePdf className="size-4 text-rose-500" />
                          <span>IT_Hardware_Allowance.pdf</span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          Chunk #8 &bull; Verified by fileVerification worker
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                      <div className="flex flex-col gap-3">
                        {/* User query */}
                        <div className="flex justify-end">
                          <div className="max-w-md rounded-2xl bg-primary px-4 py-2.5 text-xs text-primary-foreground">
                            Can I get reimbursed for hotel stays during regional client workshops?
                          </div>
                        </div>

                        {/* AI RAG Answer */}
                        <div className="flex justify-start">
                          <div className="max-w-lg space-y-2 rounded-2xl border border-border/50 bg-card p-4 text-xs shadow-sm">
                            <div className="flex items-center gap-1.5 font-semibold text-primary">
                              <Sparkle weight="fill" className="size-3.5" />
                              <span>Assistant (gemini-2.5-flash &bull; RAG Advisor)</span>
                            </div>
                            <p className="leading-relaxed text-foreground">
                              Yes. According to Section 4.2 of the{" "}
                              <span className="font-semibold underline decoration-primary/50">
                                Global Travel Policy 2026
                              </span>
                              , lodging is reimbursable up to $220/night for domestic client-facing
                              workshops. Please keep digital itemized receipts and submit expense claims
                              within 14 calendar days.
                            </p>
                            <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                              <span>Source: Travel_Policy_2026.pdf &bull; p. 12</span>
                              <Button variant="ghost" size="xs" className="h-6 gap-1 text-[11px]">
                                <Ticket className="size-3" />
                                <span>Create Ticket</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Tickets */}
                <TabsContent value="tickets" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Showing active company tickets filtered by priority</span>
                      <Button size="xs" render={<Link href="/tickets/new" />}>
                        + New Ticket
                      </Button>
                    </div>
                    <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card">
                      <div className="flex items-center justify-between p-3.5 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground">#1042</span>
                            <span className="font-semibold text-foreground">
                              VPN Gateway unresponsive for Singapore office
                            </span>
                            <Badge variant="destructive" className="text-[10px]">
                              URGENT
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            Auto-triage AI summary: Network outage preventing remote employee authentication.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="text-[10px]">IN_PROGRESS</Badge>
                          <span className="text-muted-foreground">Agent: Alex Chen</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3.5 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground">#1039</span>
                            <span className="font-semibold text-foreground">
                              Request developer seat license for Qdrant Cloud
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              MEDIUM
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            AI Summary: Infrastructure provisioning for search indexing.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-[10px]">OPEN</Badge>
                          <span className="text-muted-foreground">Agent: Unassigned</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: STOMP Chat */}
                <TabsContent value="live-chat" className="mt-4">
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-semibold">STOMP WebSocket Connected (/topic/ticket/1042)</span>
                      </div>
                      <span className="text-muted-foreground font-mono text-[11px]">Service Port: 8085</span>
                    </div>

                    <div className="space-y-2.5 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[11px] text-muted-foreground">Alex Chen (Support Specialist) &bull; 10:41 AM</span>
                        <div className="rounded-2xl rounded-bl-sm bg-card border border-border/60 px-3.5 py-2 text-xs shadow-xs">
                          Checking the Singapore node route tables now. Found a dropped interface on gateway-02.
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[11px] text-muted-foreground">You (Employee) &bull; 10:42 AM</span>
                        <div className="rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-3.5 py-2 text-xs">
                          Thanks Alex! Let us know when interface reboot completes.
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 4: Document Ingestion */}
                <TabsContent value="documents" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="border-border/60">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs flex items-center justify-between">
                          <span>S3 Upload Pipeline</span>
                          <UploadSimple className="size-4 text-primary" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                        Direct upload to AWS S3 bucket, publishing <code className="text-primary font-mono text-[10px]">document.verification.requested</code> to RabbitMQ.
                      </CardContent>
                    </Card>

                    <Card className="border-border/60">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs flex items-center justify-between">
                          <span>fileVerification Service</span>
                          <ShieldCheck className="size-4 text-emerald-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                        Apache Tika extracts full text. Spring AI audits relevance & safety before chunk approval.
                      </CardContent>
                    </Card>

                    <Card className="border-border/60">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs flex items-center justify-between">
                          <span>vector-service (Qdrant)</span>
                          <Database className="size-4 text-indigo-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                        Embeds text chunks into Qdrant collection with <code className="text-primary font-mono text-[10px]">companyId</code> metadata filters for sub-second recall.
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Bento Grid */}
      <section id="capabilities" className="border-t border-border/40 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
              Full-Stack Microservice Architecture
            </h2>
            <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Built for precision, resilience, and high scale.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Every request is authenticated, strictly isolated by tenant, and grounded in verified enterprise knowledge.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Database className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Qdrant Vector Store Ingestion
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Vector embeddings strictly partitioned by <code className="text-foreground font-mono">companyId</code>. Fast semantic search via Spring AI Advisor with zero cross-tenant contamination.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Broadcast className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                STOMP Real-Time Ticket Chat
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Dedicated microservice on port 8085 backed by MongoDB. Live bi-directional WebSocket messaging between ticket authors and assigned agents with JWT verification.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Automated Document LLM Audit
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Uploaded PDFs undergo Apache Tika extraction and an asynchronous Spring AI audit pipeline on RabbitMQ before any embeddings are admitted into the vector DB.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Cpu className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                AI Function Calling & Auto-Triage
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Intelligent ticket classification with <code className="text-foreground font-mono">TicketTool</code>. If a query cannot be answered by documents, an agent ticket is structured and raised automatically.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group rounded-2xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Lightning className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Event-Driven RabbitMQ Bus
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Robust async processing across exchanges: <code className="text-foreground font-mono">document.exchange</code>, vector purging on delete, and urgent email notifications via JavaMail.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group rounded-2xl border border-border/60 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Role-Based Tenant Isolation
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Tailored views for <code className="text-foreground font-mono">ADMIN</code>, <code className="text-foreground font-mono">AGENT</code>, and <code className="text-foreground font-mono">EMPLOYEE</code>. Bulk CSV invitation support and secure token expiration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Test-Drive Role Selector Section */}
      <section id="test-drive" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-3 font-semibold text-primary">
              One-Click Quick Access
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Explore the system through every role
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Experience how different personas interact with the multi-tenant helpdesk.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Admin Role */}
            <Card className="border-border/70 transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="text-xs">ADMIN</Badge>
                  <Key className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="mt-2 text-lg">Workspace Administrator</CardTitle>
                <CardDescription className="text-xs">
                  Full control over company documents, Gemini API key, user permissions, and company-wide ticket queues.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Upload & audit company documents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Configure Gemini API keys
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Manage team roles & statuses
                  </li>
                </ul>
                <Button className="w-full mt-4" size="sm" render={<Link href="/login" />}>
                  Sign in as Admin
                </Button>
              </CardContent>
            </Card>

            {/* Agent Role */}
            <Card className="border-border/70 transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">AGENT</Badge>
                  <Broadcast className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="mt-2 text-lg">Support Specialist</CardTitle>
                <CardDescription className="text-xs">
                  Dedicated queue of assigned customer tickets, real-time STOMP messaging, and resolution tools.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Receive urgent ticket assignments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Chat live with employees over STOMP
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Update ticket status and priority
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4" size="sm" render={<Link href="/login" />}>
                  Sign in as Agent
                </Button>
              </CardContent>
            </Card>

            {/* Employee Role */}
            <Card className="border-border/70 transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">EMPLOYEE</Badge>
                  <User className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="mt-2 text-lg">Company Employee</CardTitle>
                <CardDescription className="text-xs">
                  Self-service knowledge search via AI Assistant, raising tickets, and tracking their resolution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Instant RAG answers from internal docs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Submit new support tickets
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="size-3.5 text-emerald-500" />
                    Follow real-time chat with support
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4" size="sm" render={<Link href="/login" />}>
                  Sign in as Employee
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="border-t border-border/50 bg-muted/20 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <span className="text-xs text-muted-foreground">
              Internal Multi-Tenant HelpDesk &bull; Event-Driven Architecture
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>MySQL &bull; MongoDB &bull; Qdrant &bull; RabbitMQ &bull; AWS S3</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
