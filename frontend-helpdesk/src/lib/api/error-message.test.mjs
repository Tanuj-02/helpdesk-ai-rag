import assert from "node:assert/strict"
import test from "node:test"

import { apiErrorMessage } from "./error-message.js"

test("wrong credentials have a safe, specific message", () => {
  assert.equal(apiErrorMessage(401, null, "auth/login"), "Email or password is incorrect.")
})

test("validation and permission errors keep useful backend details", () => {
  assert.equal(apiErrorMessage(400, { message: "title: must not be blank" }), "title: must not be blank")
  assert.equal(apiErrorMessage(403, { message: "Only admins can upload file" }), "Only admins can upload file")
  assert.equal(apiErrorMessage(403, null), "You do not have permission to do that.")
})

test("unknown server failures do not expose internal details", () => {
  assert.equal(apiErrorMessage(500, { message: "SQL connection password=secret" }),
    "The server could not complete your request. Please try again.")
})

test("missing and rate-limited errors have clear fallbacks", () => {
  assert.equal(apiErrorMessage(404, null), "The requested item was not found.")
  assert.equal(apiErrorMessage(429, null), "Too many requests. Please wait and try again.")
})
