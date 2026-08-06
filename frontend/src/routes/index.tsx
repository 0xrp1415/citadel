import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../auth'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { user, status, login, logout } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(name.trim())
    } catch {
      setError('Could not register. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-zinc-950 pb-16 text-zinc-100">
      <h1 className="text-4xl">Citadel</h1>
      {status === 'loading' && <p className="text-zinc-400">Entering the tower…</p>}

      {status === 'anonymous' && (
        <form
          onSubmit={handleSubmit}
          className="flex w-72 flex-col gap-3 text-zinc-200"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 outline-none focus:border-zinc-400"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded border border-zinc-700 px-4 py-2 hover:border-zinc-400 disabled:opacity-50"
          >
            {busy ? 'Entering…' : 'Enter the tower'}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}

      {status === 'authenticated' && user && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-zinc-400">
            Welcome, <span className="text-zinc-100">{user.name}</span>. The gate is open.
          </p>
          <Link
            to="/lobby"
            className="rounded border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-zinc-400"
          >
            Form an expedition
          </Link>
          <button onClick={logout} className="text-sm text-zinc-500 hover:text-zinc-300">
            Sign out
          </button>
        </div>
      )}
    </main>
  )
}
