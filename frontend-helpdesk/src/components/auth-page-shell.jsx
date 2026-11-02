import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr"

import { BrandMark } from "@/components/brand-mark"
import { ThemeToggle } from "@/components/theme-toggle"

export function AuthPageShell({ title, description, children }) {
  return (
    <main className="login-page flex min-h-svh flex-col bg-background">
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <BrandMark />
        <div className="flex items-center gap-1.5">
          <Link href="/login" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="size-3.5" aria-hidden />
            <span>Sign in</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="login-card w-full max-w-xl">
          <h1 className="text-[28px] font-medium tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
