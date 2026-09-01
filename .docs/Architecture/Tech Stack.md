The confirmed stack for the Citadel MVP.

- **Client** — React (Vite) + socket.io-client; static SPA, no install
- **Server** — Node.js + Socket.io (Express/Fastify for REST); single process for MVP
- **AI** — LangChain.js, in-process; DungeonMaster bound to Groq (`openai/gpt-oss-120b`): `Resolve` (free text → structured verdict) + `Narrate` (event → prose)
- **State** — in-memory (users, game rooms, run state); everything is lost on server restart
- **Transport** — REST for entry/routing, Socket.io for live game events (see [[Request Flow]])

## Rules

- **Single process** — one Node server holds sockets, game state, and the in-process agent for the MVP
- **AI is bound to Groq** — the DungeonMaster uses ChatGroq (`openai/gpt-oss-120b`)
- **State is in-memory** — no database; users and game rooms live in memory and are cleared on restart
- **No install client** — the browser is the only client

See also: [[Architecture/Architecture]]
