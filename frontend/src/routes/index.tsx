import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-zinc-950 pb-16 text-zinc-100">
      <h1 className="text-4xl">Citadel</h1>
      <p className="text-zinc-400">Enter the tower. The gate is open.</p>
      <Link
        to="/lobby"
        className="rounded border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-zinc-400"
      >
        Form an expedition
      </Link>
    </main>
  )
}
