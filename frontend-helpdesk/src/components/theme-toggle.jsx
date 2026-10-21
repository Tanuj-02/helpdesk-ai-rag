"use client"

import { MoonStars, Sun } from "@phosphor-icons/react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

/**
 * Navbar light/dark switch.
 *
 * Renders a single button that flips to the opposite of what is currently
 * shown. The first click also opts the user out of "system", since an explicit
 * choice is exactly what a manual switch means.
 */
export function ThemeToggle({ className }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun aria-hidden /> : <MoonStars aria-hidden />}
    </Button>
  )
}