The confirmed stack for the Citadel MVP.

- **Client** — React 19 (Vite) + TanStack Router + Tailwind v4 + socket.io-client; static SPA, no install
- **Server** — Node.js ESM + Socket.io + Express; single process for MVP
- **AI** — LangChain.js, in-process; DungeonMaster bound to Groq (`openai/gpt-oss-20b`): `Resolve` (free text → structured verdict) + `Narrate` (event → prose)
- **Icons** — `@iconify/react` with `@iconify-json/game-icons` (game icons) + Google Fonts Material Symbols Outlined (UI icons)
- **State** — in-memory (users, game rooms, run state); everything is lost on server restart
- **Transport** — REST for entry/routing, Socket.io for live game events (see [[Request Flow]])

## Rules

- **Single process** — one Node server holds sockets, game state, and the in-process agent for the MVP
- **AI is bound to Groq** — the DungeonMaster uses ChatGroq (`openai/gpt-oss-20b`)
- **State is in-memory** — no database; users and game rooms live in memory and are cleared on restart
- **No install client** — the browser is the only client

See also: [[Architecture/Architecture]]
