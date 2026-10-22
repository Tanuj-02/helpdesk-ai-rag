"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, ArrowDown, FileText, ChatCircleDots, Ticket, ShieldCheck, Check, Sparkle, Broadcast, LockKey } from "@phosphor-icons/react"
import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"

const previews = [
  { label: "Ask a question", question: "How do I get access to the company VPN?", answer: "Start with the VPN setup guide in your company knowledge base. It covers the access request and the steps to connect.", source: "IT onboarding · VPN setup", status: "Answer with a source", icon: FileText },
  { label: "Raise a ticket", question: "I followed the guide, but I still can’t connect.", answer: "Let’s bring in your support team. Create a ticket with the issue and continue the conversation with your assigned agent.", source: "Connection issue · IT support", status: "A clear next step", icon: Ticket },
  { label: "Talk to your team", question: "Can someone help me check my access?", answer: "Your ticket has its own conversation. Share what you’ve tried and work through the issue with your assigned agent.", source: "Ticket conversation · Employee + agent", status: "Keep the context together", icon: ChatCircleDots },
]

export function LandingPage({ session }) {
  const root = React.useRef(null)
  const [preview, setPreview] = React.useState(0)
  const [motionPaused, setMotionPaused] = React.useState(false)
  const item = previews[preview]
  const Icon = item.icon
  const destination = session ? "/tickets" : "/login"

  React.useEffect(() => {
    if (!window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible")
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
    root.current?.querySelectorAll("[data-reveal]").forEach((element) => {
      element.classList.add("reveal-ready")
      observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={root} className={`landing ${motionPaused ? "motion-paused" : ""}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="landing-nav">
        <Link href="/" aria-label="Helpdesk home"><BrandMark /></Link>
        <nav aria-label="Main navigation">
          <a href="#features">The experience</a><a href="#how-it-works">How it works</a><a href="#roles">Your team</a>
        </nav>
        <div className="flex items-center gap-2"><ThemeToggle /><Link className="landing-button small" href={destination}>{session ? "Workspace" : "Sign in"}<ArrowRight aria-hidden /></Link></div>
      </header>

      <main id="main-content">
        <section className="landing-hero landing-container">
          <div className="hero-copy">
            <span className="eyebrow"><span className="status-dot" /> YOUR KNOWLEDGE. CONNECTED.</span>
            <h1>Less searching.<br />More <span className="serif-accent">solving.</span></h1>
            <p>A little clarity goes a long way. Bring your company’s knowledge, AI answers, and human support into one thoughtful workspace.</p>
            <div className="hero-actions"><Link className="landing-button" href={destination}>{session ? "Open your workspace" : "Find your workspace"}<ArrowRight aria-hidden /></Link><a className="text-link" href="#features">Take a look around <ArrowDown aria-hidden /></a></div>
            <div className="hero-note"><ShieldCheck aria-hidden /> Company knowledge. Personal support.</div>
          </div>
          <div className="knowledge-art" role="img" aria-label="Company documents, AI answers, and support tickets connected around a shared knowledge hub">
            <div className="art-halo" /><div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="knowledge-core"><div className="core-inner"><Sparkle weight="fill" /><span>Good questions.<br />Better answers.</span></div></div>
            <div className="floating-card card-document"><span className="art-icon"><FileText /></span><div><strong>Your knowledge</strong><small>Everything starts here</small></div><Check className="text-primary" /></div>
            <div className="floating-card card-answer"><span className="art-icon"><Sparkle /></span><div><strong>A little clarity</strong><small>Grounded in your documents</small></div></div>
            <div className="floating-card card-ticket"><span className="art-icon"><ChatCircleDots /></span><div><strong>A human, when it matters</strong><small>Keep the conversation going</small></div></div>
            <span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✦</span>
          </div>
          <div className="hero-bottom"><span>BUILT AROUND THE WAY YOUR TEAM WORKS</span><button type="button" onClick={() => setMotionPaused(!motionPaused)} aria-pressed={motionPaused}>{motionPaused ? "Resume ambient motion" : "Pause ambient motion"}</button></div>
        </section>

        <div className="capability-strip"><div className="landing-container"><span><FileText /> Trusted knowledge</span><span><Sparkle /> Thoughtful AI</span><span><Ticket /> Clear next steps</span><span><Broadcast /> Real conversations</span></div></div>

        <section id="features" className="landing-container experience-section" data-reveal>
          <div className="section-heading"><span className="eyebrow">01 / A BETTER EVERYDAY</span><h2>From “where do I find…”<br />to <span className="serif-accent">“got it.”</span></h2><p>Start with a question. Find an answer in your documents. Bring in your team when you need a hand.</p></div>
          <div className="experience-layout">
            <div className="experience-options" role="tablist" aria-label="Explore the support experience" aria-orientation="vertical">
              {previews.map((entry, index) => <button key={entry.label} id={`preview-tab-${index}`} role="tab" aria-selected={preview === index} aria-controls="experience-preview" tabIndex={preview === index ? 0 : -1} onClick={() => setPreview(index)} onKeyDown={(event) => {
                const next = event.key === "ArrowDown" ? (index + 1) % previews.length : event.key === "ArrowUp" ? (index + previews.length - 1) % previews.length : event.key === "Home" ? 0 : event.key === "End" ? previews.length - 1 : null
                if (next !== null) { event.preventDefault(); setPreview(next); document.getElementById(`preview-tab-${next}`)?.focus() }
              }}><span className="step-number">0{index + 1}</span><span><strong>{entry.label}</strong><small>{["Less digging through documents.", "Make the next step a simple one.", "Support with a human touch."][index]}</small></span><ArrowRight aria-hidden /></button>)}
            </div>
            <div id="experience-preview" role="tabpanel" aria-labelledby={`preview-tab-${preview}`} tabIndex={0} className="product-preview">
              <div className="preview-bar"><span><Sparkle weight="fill" /> Helpdesk assistant</span><span className="example-label">ILLUSTRATIVE PREVIEW</span></div>
              <div key={preview} className="preview-conversation"><div className="preview-question">{item.question}</div><div className="preview-answer"><span className="answer-avatar"><Sparkle weight="fill" /></span><div><strong>A little help, right here.</strong><p>{item.answer}</p><span className="preview-source"><Icon aria-hidden />{item.source}</span></div></div><div className="preview-status"><Check aria-hidden />{item.status}</div></div>
              <Link href={session ? "/chat" : "/login"} className="preview-composer">Ask your own question <span><ArrowRight aria-hidden /></span></Link>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="workflow-section">
          <div className="landing-container" data-reveal><div className="section-heading"><span className="eyebrow">02 / BEHIND EVERY GOOD ANSWER</span><h2>Your knowledge,<br /><span className="serif-accent">with a little momentum.</span></h2><p>A considered path from company documents to everyday answers.</p></div>
            <div className="workflow-grid">{[
              [FileText, "Bring it together", "Upload your company’s guides, policies, and support documents."],
              [ShieldCheck, "Make it useful", "Documents are checked for relevance before entering your knowledge base."],
              [Sparkle, "Find the connection", "The assistant searches the knowledge indexed for your company."],
              [ChatCircleDots, "Move forward", "Get a grounded answer or continue with a support ticket."],
            ].map(([StepIcon, title, description], index) => <article key={title} className="workflow-step"><div className="workflow-top"><StepIcon aria-hidden /><span>0{index + 1}</span></div><h3>{title}</h3><p>{description}</p></article>)}</div>
          </div>
        </section>

        <section id="roles" className="landing-container roles-section" data-reveal>
          <div className="section-heading"><span className="eyebrow">03 / SPACE FOR EVERYONE</span><h2>One team.<br /><span className="serif-accent">A shared sense of clarity.</span></h2></div>
          <div className="role-grid">{[
            ["01", "For employees", "A good place to start.", ["Ask questions about company documents", "Raise a ticket and follow its progress", "Talk directly with your assigned agent"]],
            ["02", "For agents", "Context comes with you.", ["See the tickets assigned to you", "Keep priority and status up to date", "Resolve issues in one conversation"]],
            ["03", "For admins", "Bring it all together.", ["Build your company knowledge base", "Manage people and workspace roles", "Configure your AI assistant"]],
          ].map(([number, role, title, points]) => <article key={role} className="role-card"><div className="role-label"><span>{role}</span><span>{number}</span></div><h3>{title}</h3><ul>{points.map(point => <li key={point}><Check aria-hidden />{point}</li>)}</ul></article>)}</div>
          <div className="privacy-note"><LockKey aria-hidden /><p><strong>Your workspace is your own.</strong> Documents, conversations, and tickets are scoped to your company.</p></div>
        </section>

        <section className="landing-container closing-section" data-reveal><span className="eyebrow">A LITTLE LESS FRICTION. A LITTLE MORE FLOW.</span><h2>Make room for<br /><span className="serif-accent">better work.</span></h2><Link href={destination} className="landing-button">{session ? "Back to your workspace" : "Sign in to your workspace"}<ArrowRight aria-hidden /></Link><p>Use the work email your administrator invited.</p></section>
      </main>
      <footer className="landing-footer landing-container"><BrandMark /><span>Knowledge connects us. Support moves us forward.</span><a href="#main-content">Back to top ↑</a></footer>
    </div>
  )
}
