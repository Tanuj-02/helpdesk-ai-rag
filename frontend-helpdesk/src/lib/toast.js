import { toast } from "@/components/ui/toast"

/**
 * Thin wrapper over the shadcn/Base UI toast manager.
 *
 * The underlying manager only exposes `add` / `update` / `close` / `promise`,
 * so every call site would otherwise repeat the same object literal. Keeping the
 * shape in one place also means the `type` strings (which drive the icon the
 * ToastList renders) are validated in a single spot instead of being typed from
 * memory at each call site.
 *
 * @example
 *   notify.error("Could not save", { description: err.message })
 */

const VALID_TYPES = ["success", "info", "warning", "error", "loading"]

function send(type, title, description, options = {}) {
  return toast.add({
    type,
    title,
    description,
    // Keep a toast on screen while it is being worked on, and give failures
    // longer than successes so they can actually be read.
    timeout: type === "loading" ? 0 : options.timeout ?? (type === "error" ? 8000 : 5000),
    ...options,
  })
}

export const notify = {
  /** @param {string} title @param {{description?: string, timeout?: number}} [options] */
  success: (title, options) => send("success", title, undefined, options),
  info: (title, options) => send("info", title, undefined, options),
  warning: (title, options) => send("warning", title, undefined, options),
  error: (title, options) => send("error", title, undefined, options),
  loading: (title, options) => send("loading", title, undefined, options),

  /**
   * Replace a loading toast in place, so "Saving..." becomes "Saved" rather
   * than leaving two toasts stacked on screen.
   *
   * @param {string} id the id returned by `notify.loading`
   */
  update: (id, { type = "success", title, description, timeout }) => {
    if (!id) return
    if (!VALID_TYPES.includes(type)) {
      throw new Error(`Unknown toast type: ${type}`)
    }
    toast.update(id, { type, title, description, timeout: timeout ?? 5000 })
  },
}

/**
 * Reduce an `ApiError` to a toast. Returns the message so callers can also use
 * it inline if they need the string.
 *
 * @param {unknown} error
 */
export function notifyApiError(error, fallbackTitle = "Something went wrong") {
  const message = error?.message ?? fallbackTitle
  // 401/403 are almost always an expired session; the proxy will bounce the
  // user to /login shortly, so do not shout about it.
  if (error?.isAuthError) {
    notify.warning("Your session has ended", { description: "Redirecting you to sign in." })
    return message
  }
  notify.error(message, { description: fallbackTitle === message ? undefined : fallbackTitle })
  return message
}