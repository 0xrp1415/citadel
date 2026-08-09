import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { Seal } from '../components/Seal'
import { setStage } from '../stages'

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
      setError('Entry rejected — the record could not be opened. Check the name and try again.')
    } finally {
      setBusy(false)
    }
  }

  const officer =
    status === 'loading'
      ? 'Opening the record…'
      : status === 'anonymous'
        ? 'Record begins. State your name.'
        : `Identity filed. Welcome, ${user?.name}.`

  return (
    <LedgerFrame>
      <PageHead
        kicker="records of the citadel · office of the descent"
        title="The Citadel"
        wordmark
        officer={officer}
      />

      {status === 'loading' && <p className="officer officer--dim">The page turns…</p>}

      {status === 'anonymous' && (
        <form onSubmit={handleSubmit} className="intake" noValidate>
          <div className="panel">
            <div className="panel__head">
              <span className="panel__title">Prisoner intake</span>
              <span className="panel__sub">form nº 1 · identity</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="State your name"
                required
                autoComplete="name"
              />
            </div>
            {error && (
              <p className="intake__error" role="alert">
                {error}
              </p>
            )}
            <div className="intake__actions">
              <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>
                {busy ? 'Filing…' : 'Enter the tower'}
              </button>
            </div>
          </div>
        </form>
      )}

      {status === 'authenticated' && user && (
        <>
          <div className="identity">
            <div className="identity__seal">
              <Seal label="filed" />
            </div>
            <div>
              <dl className="idline">
                <div className="idline__row">
                  <dt className="idline__k">Prisoner</dt>
                  <dd className="idline__v idline__v--you">{user.name}</dd>
                </div>
                <div className="idline__row">
                  <dt className="idline__k">Status</dt>
                  <dd className="idline__v">Processed · awaiting expedition</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="intake__actions intake__actions--stacked">
            <Link to="/lobby" className="btn btn--primary" onClick={() => setStage(1)}>
              Proceed to staging
            </Link>
            <button
              onClick={() => {
                setStage(0)
                logout()
              }}
              className="btn btn--danger"
            >
              Surrender the record
            </button>
          </div>
        </>
      )}
    </LedgerFrame>
  )
}
