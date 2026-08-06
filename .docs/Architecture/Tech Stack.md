The confirmed stack for the Citadel MVP.

- **Client** — React (Vite) + socket.io-client; static SPA, no install
- **Server** — Node.js + Socket.io (Express/Fastify for REST); single process for MVP
- **AI** — LangChain.js, in-process; one Citadel Agent (structuring, validation, narration); provider-agnostic, model decided later
- **Database** — PostgreSQL; free, self-hosted; JSONB for run snapshots; live session state stays in-memory
- **Transport** — REST for entry/routing, Socket.io for live game events (see [[Request Flow]])

## Rules

- **Single process** — one Node server holds sockets, game state, and the in-process agent for the MVP
- **Provider-agnostic AI** — the agent interface is a port, so the model/provider can be swapped without touching game logic
- **State split** — live session state is in-memory; PostgreSQL persists identity and run snapshots
- **No install client** — the browser is the only client

See also: [[Architecture/Architecture]]
