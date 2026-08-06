import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/run')({
  component: Run,
})

function Run() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-zinc-950 pb-16 text-zinc-100">
      <h1 className="text-4xl">The descent</h1>
      <p className="text-zinc-400">The tower speaks, and the party acts.</p>
      <Link to="/lobby" className="text-sm text-zinc-500 hover:text-zinc-300">
        Back to staging
      </Link>
    </main>
  )
}
