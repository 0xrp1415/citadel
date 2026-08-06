import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/lobby')({
  component: Lobby,
})

function Lobby() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-zinc-950 pb-16 text-zinc-100">
      <h1 className="text-4xl">Staging grounds</h1>
      <p className="text-zinc-400">Customize your character, then ready up.</p>
      <Link
        to="/run"
        className="rounded border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-zinc-400"
      >
        Open the gate
      </Link>
      <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        Back
      </Link>
    </main>
  )
}
