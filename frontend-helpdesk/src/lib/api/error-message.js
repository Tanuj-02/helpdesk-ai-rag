function detailFromPayload(payload) {
  if (payload && typeof payload === "object") {
    const detail = payload.message ?? payload.detail
    return typeof detail === "string" ? detail.trim() : ""
  }
  return ""
}

export function apiErrorMessage(status, payload, path = "") {
  const detail = detailFromPayload(payload)

  if (status === 401) {
    return path === "auth/login"
      ? "Email or password is incorrect."
      : "Your session has ended. Please sign in again."
  }
  if (status === 403) return detail || "You do not have permission to do that."
  if (status === 404) return detail || "The requested item was not found."
  if (status === 409) return detail || "This item already exists."
  if (status === 413) return detail || "This file is too large to upload."
  if (status === 429) return detail || "Too many requests. Please wait and try again."
  if (status === 502 || status === 503 || status === 504) {
    return detail && detail !== "Something went wrong"
      ? detail
      : "A service is temporarily unavailable. Please try again."
  }
  if (status >= 500) return "The server could not complete your request. Please try again."
  if (detail) return detail
  if (status === 400 || status === 422) return "Check the information you entered and try again."
  return `Request failed (${status}). Please try again.`
}
