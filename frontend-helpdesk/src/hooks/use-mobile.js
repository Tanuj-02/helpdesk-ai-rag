import * as React from "react"

/**
 * Mobile breakpoint hook used by the sidebar to collapse to a sheet.
 *
 * Rewritten from the stock shadcn version, which called `setIsMobile` inside
 * the effect body. That triggers a cascading render and trips
 * `react-hooks/set-state-in-effect`. `useSyncExternalStore` is the correct
 * primitive here: `window.matchMedia` *is* an external store, and this hook
 * becomes a pure subscription to it.
 *
 * Behavioural note: the server snapshot is always `false`, so the very first
 * client render agrees with the server and hydration is clean. React then
 * re-renders with the real value immediately after hydration.
 */

const MOBILE_BREAKPOINT = 768

const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onStoreChange) {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}