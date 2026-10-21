/**
 * A deliberately tiny STOMP 1.2 client over a native `WebSocket`.
 *
 * `ticketChatService` speaks STOMP: it exposes `/ws`, an application prefix of
 * `/app`, and a simple broker on `/topic`, and it authenticates inside the
 * CONNECT frame (there is no way to attach a header to the WebSocket
 * handshake itself). One screen needs only CONNECT / SUBSCRIBE / SEND, so this
 * avoids adding a socket library for the whole app.
 *
 * Heartbeats are disabled (`0,0`); the frames are plain text with a NUL
 * terminator. Only what the app uses is implemented -- anything unexpected is
 * surfaced through `onStatus` rather than thrown.
 */

const NUL = "\u0000"
const LF = "\n"

/** @typedef {{ state: "connecting" | "connected" | "reconnecting" | "error", message?: string }} StompStatus */

function serialize({ command, headers = {}, body = "" }) {
  const lines = [command]
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue
    // Header values must not contain newlines; strip any that slip in.
    lines.push(`${key}:${String(value).replace(/[\n\r]/g, "")}`)
  }
  return `${lines.join(LF)}${LF}${LF}${body}${NUL}`
}

function parseFrame(raw) {
  // Headers and body are separated by the first blank line.
  const separator = raw.indexOf(`${LF}${LF}`)
  const head = separator === -1 ? raw : raw.slice(0, separator)
  const body = separator === -1 ? "" : raw.slice(separator + 2)

  const lines = head.split(/\r?\n/)
  const command = lines.shift()?.trim()
  if (!command) return null

  const headers = {}
  for (const line of lines) {
    const colon = line.indexOf(":")
    if (colon === -1) continue
    headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return { command, headers, body }
}

export class StompClient {
  /**
   * @param {string} url
   * @param {{
   *   token: string,
   *   onMessage?: (payload: unknown, destination: string) => void,
   *   onStatus?: (status: StompStatus) => void,
   * }} options
   */
  constructor(url, { token, onMessage, onStatus } = {}) {
    this.url = url
    this.token = token
    this.onMessage = onMessage ?? (() => {})
    this.onStatus = onStatus ?? (() => {})

    /** @type {WebSocket | null} */
    this.socket = null
    this.buffer = ""
    this.connected = false
    this.closedByUs = false
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.reconnectTimer = null
    /** @type {Map<string, { id: string, destination: string, handler: (payload: unknown) => void }>} */
    this.subscriptions = new Map()
    this.seq = 0
  }

  connect() {
    this.closedByUs = false
    this.onStatus({ state: "connecting" })

    let socket
    try {
      socket = new WebSocket(this.url)
    } catch {
      this.onStatus({ state: "error", message: "Invalid chat address." })
      return
    }
    this.socket = socket

    socket.onopen = () => {
      socket.send(
        serialize({
          command: "CONNECT",
          headers: {
            "accept-version": "1.2",
            "heart-beat": "0,0",
            Authorization: `Bearer ${this.token}`,
          },
        }),
      )
    }

    socket.onmessage = (event) => this.#receive(String(event.data))

    socket.onerror = () => {
      this.onStatus({ state: "error", message: "The chat connection dropped." })
    }

    socket.onclose = () => {
      this.connected = false
      this.socket = null
      if (this.closedByUs) return
      this.onStatus({ state: "reconnecting" })
      this.reconnectTimer = setTimeout(() => this.connect(), 3000)
    }
  }

  /**
   * @param {string} destination
   * @param {(payload: unknown) => void} handler
   * @returns {() => void} unsubscribe
   */
  subscribe(destination, handler) {
    const id = `sub-${this.seq++}`
    const subscription = { id, destination, handler }
    this.subscriptions.set(id, subscription)
    if (this.connected) this.#sendSubscribe(subscription)

    return () => {
      this.subscriptions.delete(id)
      if (this.connected && this.socket) {
        this.socket.send(serialize({ command: "UNSUBSCRIBE", headers: { id } }))
      }
    }
  }

  /**
   * @param {string} destination
   * @param {unknown} body
   * @returns {boolean} whether the frame was actually written
   */
  publish(destination, body) {
    if (!this.connected || !this.socket) return false
    this.socket.send(
      serialize({
        command: "SEND",
        headers: { destination, "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    )
    return true
  }

  disconnect() {
    this.closedByUs = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    if (this.connected && this.socket) {
      try {
        this.socket.send(serialize({ command: "DISCONNECT" }))
      } catch {
        // The socket may already be closing; closing below is what matters.
      }
    }
    this.socket?.close()
    this.socket = null
    this.connected = false
  }

  #receive(chunk) {
    this.buffer += chunk

    // Every frame ends in a NUL. Anything before the last NUL is complete.
    let end
    while ((end = this.buffer.indexOf(NUL)) !== -1) {
      const raw = this.buffer.slice(0, end)
      this.buffer = this.buffer.slice(end + 1)
      // A leading newline is a heartbeat and is skipped.
      const frame = parseFrame(raw.replace(/^\n+/, ""))
      if (frame) this.#dispatch(frame)
    }
  }

  #dispatch(frame) {
    if (frame.command === "CONNECTED") {
      this.connected = true
      this.onStatus({ state: "connected" })
      // Re-establish subscriptions after a reconnect.
      for (const subscription of this.subscriptions.values()) {
        this.#sendSubscribe(subscription)
      }
      return
    }

    if (frame.command === "MESSAGE") {
      const destination = frame.headers.destination ?? ""
      let payload = frame.body
      try {
        payload = JSON.parse(frame.body)
      } catch {
        // Leave non-JSON bodies as raw text.
      }

      const subscription = [...this.subscriptions.values()].find(
        (s) => s.destination === destination,
      )
      if (subscription) subscription.handler(payload)
      else this.onMessage(payload, destination)
      return
    }

    if (frame.command === "ERROR") {
      this.onStatus({
        state: "error",
        message: frame.headers.message ?? frame.body ?? "The chat service rejected the connection.",
      })
    }
  }

  #sendSubscribe(subscription) {
    if (!this.socket) return
    this.socket.send(
      serialize({
        command: "SUBSCRIBE",
        headers: { id: subscription.id, destination: subscription.destination },
      }),
    )
  }

  disconnectSilently() {
    this.disconnect()
  }
}