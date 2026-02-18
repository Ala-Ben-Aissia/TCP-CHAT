# tcp-chat

A real-time multi-user terminal chat app built on raw TCP using `node:net` and `node:readline`. No HTTP, no WebSockets, no external runtime dependencies — just TCP sockets, JSON framing, and a hand-rolled terminal UI.

## Architecture

```
client A ──┐
client B ──┤── TCP ──► server (broadcast hub) ◄── TCP ── client C
client D ──┘
```

The server is a pure broadcast hub. Each client maintains its own connection state. Messages flow as newline-delimited JSON over the TCP stream.

### Wire protocol

```
{ "type": "join",         "username": "alice_smith"     }\n
{ "type": "chat",         "message": "hello world"      }\n
{ "type": "typing_start"                                }\n
{ "type": "typing_stop"                                 }\n

{ "type": "user_joined",  "username": "alice_smith"     }\n
{ "type": "user_left",    "username": "alice_smith"     }\n
{ "type": "chat",         "username": "alice_smith", "message": "hello" }\n
{ "type": "typing",       "username": "alice_smith", "isTyping": true   }\n
```

Newline `\n` acts as the frame delimiter. The server and client each maintain a per-connection string buffer and extract complete frames by scanning for `\n`, handling TCP chunking and coalescing correctly.

## Project structure

```
├── server.ts      — TCP server, broadcast hub, per-socket state
├── client.ts      — Terminal UI, readline prompt, typing detection
├── utils.ts       — Username generation, ANSI formatting, cursor management
├── types.ts       — ClientMessage / ServerMessage discriminated unions
└── constants.ts   — CONFIG, COLORS (ANSI 256), USER_EMOJIS
```

## Features

- **Newline-delimited JSON framing** — robust against TCP chunking; each connection has an isolated buffer
- **Typing indicators** — debounced `typing_start` / `typing_stop` events (2s idle timeout); server broadcasts to all other clients
- **Cursor-safe UI redraws** — the typing status line is rendered above the readline prompt; incoming messages move the cursor up and clear the indicator lines before writing, then redraw the full UI with `readline.moveCursor` + `clearLine`
- **Deterministic identity** — username and emoji avatar assigned by hashing the username string (`hashCode → djb2`), so the same user always gets the same color and emoji across sessions
- **ANSI 256-color palette** — 18 distinct user colors, all visually separated from system colors (join/leave/error use a reserved palette)
- **Graceful shutdown** — `SIGINT` on the server drains all client sockets with a 5s force-destroy fallback; client sends `socket.end()` and exits cleanly

## Key implementation details

### Buffer isolation per connection

Each `net.Socket` gets its own `ClientData` object with a `buffer: string` field. On every `data` event, the chunk is appended, then frames are extracted in a `while` loop:

```ts
clientData.buffer += chunk.toString('utf-8');
while ((newlineIndex = clientData.buffer.indexOf('\n')) !== -1) {
  const line = clientData.buffer.substring(0, newlineIndex);
  clientData.buffer = clientData.buffer.substring(newlineIndex + 1);
  // parse and dispatch
}
```

This correctly handles the case where a single `data` event carries multiple messages, or a message is split across two events.

### Typing indicator redraws

The terminal has two conceptual lines at the bottom:

```
[typing indicator — optional, 0 or 1 lines]
[readline prompt  — always present          ]
```

When a new message or event arrives, `prepareForNewContent()` moves the cursor up through the estimated number of lines the indicator occupies (accounting for terminal width wrapping), clears each line, then lets the caller `console.log` its content. After that, `redrawUI()` re-renders the indicator (if still needed) and re-prompts.

The line-count estimation strips ANSI escape sequences before computing `Math.ceil(text.length / columns)`.

### Username generation

`faker.js` + `enforce-unique` ensures no two active connections share a username. The `UniqueEnforcer` instance is module-level, so uniqueness is enforced across the process lifetime.

## Getting started

**Prerequisites:** Node.js 18+, pnpm (or npm)

```bash
# install
pnpm install

# terminal 1 — start the server
pnpm tsx server.ts

# terminal 2, 3, 4 — connect clients
pnpm tsx client.ts
pnpm tsx client.ts
pnpm tsx client.ts
```

The server listens on `127.0.0.1:8080` by default. Change `CONFIG.port` / `CONFIG.hostname` in `constants.ts`.

## Dependencies

| Package           | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `@faker-js/faker` | Random first/last name generation          |
| `enforce-unique`  | Guarantees no two sockets share a username |
| `tsx`             | Run TypeScript directly (dev only)         |

`node:net`, `node:readline` — Node built-ins, no install needed.

## Known limitations / extension ideas

- **No persistence** — messages exist only in terminals; there's no history for new joiners
- **No rooms** — single global broadcast channel
- **No authentication** — any client can claim any username; the server trusts the first `join` message
- **Plain text over loopback** — add TLS with `node:tls` (`tls.createServer`) for network use
