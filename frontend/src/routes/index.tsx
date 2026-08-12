import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { Roundel } from '../components/Roundel'
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
      setError('Entry rejected — the register could not be opened. Check the name and try again.')
    } finally {
      setBusy(false)
    }
  }

  const officer =
    status === 'loading'
      ? 'Opening the trail register…'
      : status === 'anonymous'
        ? 'The register is open. Sign in to plan a descent.'
        : `Register on file. Welcome, ${user?.name}.`

  return (
    <LedgerFrame>
      <PageHead
        kicker="office of the descent · expedition permit"
        title="The Descent"
        wordmark
        roundel="expedition"
        officer={officer}
      />

      <dl className="trailhead">
        <div className="trailhead__item">
          <dt className="trailhead__k">Party</dt>
          <dd className="trailhead__v">3–8</dd>
        </div>
        <div className="trailhead__item">
          <dt className="trailhead__k">Record</dt>
          <dd className="trailhead__v">Continuous</dd>
        </div>
        <div className="trailhead__item">
          <dt className="trailhead__k">Verdict</dt>
          <dd className="trailhead__v">Live</dd>
        </div>
      </dl>

      {status === 'loading' && <p className="officer officer--dim">The page turns…</p>}

      {status === 'anonymous' && (
        <form onSubmit={handleSubmit} className="register" noValidate>
          <div className="panel">
            <div className="panel__head">
              <span className="panel__title">Sign the register</span>
              <span className="panel__sub">entry form · name only</span>
            </div>
            <p className="register__lede">
              Leave your name at the trailhead. The record begins when you descend.
            </p>
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
                {busy ? 'Opening…' : 'Begin the descent'}
              </button>
            </div>
          </div>
        </form>
      )}

      {status === 'authenticated' && user && (
        <>
          <div className="identity">
            <div className="identity__roundel">
              <Roundel label="on file" size={88} />
            </div>
            <div>
              <dl className="idline">
                <div className="idline__row">
                  <dt className="idline__k">Expeditioner</dt>
                  <dd className="idline__v idline__v--you">{user.name}</dd>
                </div>
                <div className="idline__row">
                  <dt className="idline__k">Status</dt>
                  <dd className="idline__v">At the trailhead · awaiting the party</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="intake__actions intake__actions--stacked">
            <Link to="/lobby" className="btn btn--primary" onClick={() => setStage(1)}>
              To the staging grounds
            </Link>
            <button
              onClick={() => {
                setStage(0)
                logout()
              }}
              className="btn btn--danger"
            >
              Surrender the register
            </button>
          </div>
        </>
      )}
    </LedgerFrame>
  )
}
