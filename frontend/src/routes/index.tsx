import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { setStage } from '../stages'

export const Route = createFileRoute('/')({
  component: Gate,
})

function Gate() {
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
      setError('The wax seal rejected your inscription. Try again with a different cognomen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate">
      {/* Sacred Geometry Background */}
      <div className="gate__bg" aria-hidden="true">
        <div className="gate__bg-glow" />
        <div className="gate__bg-glow-2" />
        <svg className="gate__bg-svg gate__bg-svg--outer" viewBox="0 0 500 500" fill="none">
          <circle cx="250" cy="250" r="242" stroke="currentColor" strokeDasharray="3 6" strokeWidth="0.8" />
          <circle cx="250" cy="250" r="236" stroke="currentColor" strokeWidth="0.4" />
          <circle cx="250" cy="250" r="185" stroke="currentColor" strokeDasharray="8 8" strokeWidth="0.75" />
          <circle cx="250" cy="250" r="140" stroke="currentColor" strokeWidth="0.6" />
          <polygon points="250,30 440,360 60,360" stroke="currentColor" strokeWidth="0.65" />
          <polygon points="250,470 60,140 440,140" stroke="currentColor" strokeWidth="0.65" />
          <circle cx="250" cy="30" fill="currentColor" r="3.5" />
          <circle cx="440" cy="360" fill="currentColor" r="3.5" />
          <circle cx="60" cy="360" fill="currentColor" r="3.5" />
          <circle cx="250" cy="470" fill="currentColor" r="3.5" />
          <circle cx="60" cy="140" fill="currentColor" r="3.5" />
          <circle cx="440" cy="140" fill="currentColor" r="3.5" />
        </svg>
        <svg className="gate__bg-svg gate__bg-svg--inner" viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="195" stroke="currentColor" strokeDasharray="1 5" strokeWidth="0.7" />
          <rect height="250" stroke="currentColor" strokeWidth="0.5" transform="rotate(45 200 200)" width="250" x="75" y="75" />
          <rect height="250" stroke="currentColor" strokeWidth="0.5" width="250" x="75" y="75" />
          <circle cx="200" cy="200" r="95" stroke="currentColor" strokeDasharray="4 8" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="gate__grid">
        {/* CENTER INSCRIPTION DESK */}
        <div className="gate__col gate__col--center" style={{ alignItems: 'center' }}>
          {status === 'anonymous' ? (
            <div className="inscription">
              <div className="corner-accent corner-accent--tl corner-accent--gold" />
              <div className="corner-accent corner-accent--tr corner-accent--gold" />
              <div className="corner-accent corner-accent--bl corner-accent--gold" />
              <div className="corner-accent corner-accent--br corner-accent--gold" />
              <div className="inscription__head">
                <span className="inscription__sigil">
                  <span className="inscription__sigil-glyph">✦</span>
                  Covenant Inscription // Step 01
                  <span className="inscription__sigil-glyph">✦</span>
                </span>
                <h1 className="inscription__title">
                  <span className="inscription__title-glyph">❦</span>
                  Inscribe Your Cognomen
                  <span className="inscription__title-glyph">❧</span>
                </h1>
                <p className="inscription__lede">
                  Enter your sworn arcanist moniker to bind your soul-thread to the subterranean leyline.
                </p>
                <div className="inscription__divider">
                  <div className="inscription__divider-line" />
                  <span className="inscription__divider-mark">◇─── § ───◇</span>
                  <div className="inscription__divider-line inscription__divider-line--right" />
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="field">
                  <label className="field__label" htmlFor="cognomen">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span className="material-symbols-outlined" style={{ color: '#f2ca50', fontSize: '0.875rem' }}>edit_note</span>
                      Arcane Moniker
                    </span>
                    <span className="field__hint">limit: xxvi chars</span>
                  </label>
                  <div className="input__wrap">
                    <span className="input__icon">
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>token</span>
                    </span>
                    <input
                      id="cognomen"
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. MORVATH_THE_SEER"
                      maxLength={26}
                      required
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <span className="input__cursor" />
                  </div>
                  <div className="input__meta">
                    <span className="input__hash">HASH: <span className="input__hash-value">{name.trim() ? '0x7F...CONVERGED' : '0x7F...UNBOUND'}</span></span>
                    <span className="input__status">
                      <span className="input__status-dot" />
                      Sigil: Primed
                    </span>
                  </div>
                </div>

                {error && <p className="intake__error" role="alert">{error}</p>}

                <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>
                  <span>{busy ? 'Communing with Nexus…' : 'Confirm Cognomen & Proceed'}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>→</span>
                </button>

                <div className="protocol-badge">
                  <span className="protocol-badge__dot" />
                  <span>Protocol: Ephemeral In-Memory Session // No Database Tether</span>
                </div>
              </form>

              <div className="security-footer">
                <span className="security-footer__item">
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#8a702b' }}>lock_clock</span>
                  AES-GCM 256-Void
                </span>
                <span className="security-footer__item">
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#c084fc' }}>auto_mode</span>
                  Entropy Seed: Sync
                </span>
              </div>
            </div>
          ) : (
            <div className="inscription">
              <div className="corner-accent corner-accent--tl corner-accent--gold" />
              <div className="corner-accent corner-accent--tr corner-accent--gold" />
              <div className="corner-accent corner-accent--bl corner-accent--gold" />
              <div className="corner-accent corner-accent--br corner-accent--gold" />
              <div className="inscription__head">
                <span className="inscription__sigil">
                  <span className="inscription__sigil-glyph">✦</span>
                  Inscription Sealed
                  <span className="inscription__sigil-glyph">✦</span>
                </span>
                <h1 className="inscription__title">
                  <span className="inscription__title-glyph">❦</span>
                  Welcome, {user?.name}
                  <span className="inscription__title-glyph">❧</span>
                </h1>
                <p className="inscription__lede">
                  Your cognomen is filed in the record. Proceed to the Chamber Nexus to inscribe or
                  join an expedition when ready.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <Link to="/chamber" className="btn btn--primary" onClick={() => setStage(1)}>
                  <span>To the Chamber Nexus</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>→</span>
                </Link>
                <button
                  onClick={() => { setStage(0); logout(); }}
                  className="btn btn--danger"
                >
                  Surrender the Inscription
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
