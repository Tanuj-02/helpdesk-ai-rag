"use client"

import * as React from "react"

/**
 * Light / dark / system theme.
 *
 * The effective theme is applied by toggling `.dark` on `<html>`, which is the
 * same hook `globals.css` already uses (`@custom-variant dark (&:is(.dark *))`).
 * The initial class is written by a tiny inline script in `app/layout.js`
 * *before* React hydrates, so a dark-mode user never sees a white flash.
 *
 * The DOM class is the single source of truth. It is read through
 * `useSyncExternalStore` rather than mirrored into React state from an effect,
 * which keeps the two from ever disagreeing and avoids a cascading render.
 */

const STORAGE_KEY = "hd-theme"

/** @typedef {"light" | "dark" | "system"} ThemeName */
/** @typedef {"light" | "dark"} ResolvedTheme */

const ThemeContext = React.createContext(
  /** @type {{ resolvedTheme: "light" | "dark", setTheme: (t: "light" | "dark" | "system") => void }} */ ({
    resolvedTheme: "light",
    setTheme: () => {},
  }),
)

const THEME_EVENT = "hd-theme-change"

function systemPrefersDark() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/** Apply a theme to the document and return the actually-resolved one. */
function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark())
  const root = document.documentElement
  root.classList.toggle("dark", dark)
  // Keeps native form controls, scrollbars and the address bar in step.
  root.style.colorScheme = dark ? "dark" : "light"
  return dark ? "dark" : "light"
}

/** The stored preference, falling back to "system". */
function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (value === "light" || value === "dark" || value === "system") return value
  } catch {
    // localStorage can throw in private mode / sandboxed iframes.
  }
  return "system"
}

/** @param {() => void} onStoreChange */
function subscribe(onStoreChange) {
  const query = window.matchMedia("(prefers-color-scheme: dark)")
  const mediaListener = () => {
    // Only meaningful while the preference is "system".
    if (readStoredTheme() === "system") onStoreChange()
  }
  query.addEventListener("change", mediaListener)
  window.addEventListener("storage", onStoreChange)
  window.addEventListener("themechange", onStoreChange)
  return () => {
    query.removeEventListener("change", mediaListener)
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener("themechange", onStoreChange)
  }
}

/** What the document is showing right now. */
function getSnapshot() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

/** The server has no DOM, so it always renders light and corrects on hydrate. */
function getServerSnapshot() {
  return "light"
}

export function ThemeProvider({ children }) {
  const resolvedTheme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Guarantees the DOM matches storage even if the pre-hydration script was
  // blocked (e.g. by a strict CSP). Dispatching the event re-reads the snapshot.
  React.useEffect(() => {
    applyTheme(readStoredTheme())
    window.dispatchEvent(new Event("themechange"))
  }, [])

  const setTheme = React.useCallback((next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Non-fatal: the theme simply will not persist across reloads.
    }
    applyTheme(next)
    window.dispatchEvent(new Event("themechange"))
  }, [])

  const value = React.useMemo(
    () => ({ resolvedTheme, setTheme }),
    [resolvedTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return React.useContext(ThemeContext)
}