import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { setStage } from '../stages'
import { generateSeed, createRoom, joinRoom } from '../rooms'

const PARTY_CAPACITIES = [3, 4, 5, 6, 7, 8]
import { saveRoomSession } from '../roomSession'

export const Route = createFileRoute('/chamber')({
  component: ChamberNexus,
})

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'The record could not be completed.'
}

function ChamberNexus() {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  const [partySize, setPartySize] = useState(4)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cipher, setCipher] = useState('')

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const res = await createRoom(
        { maxPlayers: partySize, seed: generateSeed(), mapSize: 'medium', difficulty: 'medium' },
        user?.name ?? 'A condemned',
        token,
      )
      saveRoomSession(res.hash, res.inviteCode)
      setStage(2)
      navigate({ to: '/lobby' })
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!token || cipher.trim().length === 0) return
    setError(null)
    setBusy(true)
    try {
      const res = await joinRoom(cipher.trim(), user?.name ?? 'A condemned', token)
      saveRoomSession(res.hash, res.room.inviteCode)
      setStage(2)
      navigate({ to: '/lobby' })
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nexus">
      {/* Section Title */}
      <div className="pagehead__heading">
        <h1 className="pagehead__title">
          <span className="pagehead__title-label">Chamber Nexus</span>
          <span className="pagehead__title-sep">//</span>
          <span className="pagehead__title-sub">Matchmaking</span>
        </h1>
      </div>

      {error && (
        <p className="intake__error" role="alert">
          {error}
        </p>
      )}

      <div className="nexus__grid">
        {/* LEFT: FORGE */}
        <section className="pathcard pathcard--gold" aria-label="Founder rite">
          <div className="pathcard__corner pathcard__corner--tl" />
          <div className="pathcard__corner pathcard__corner--tr" />
          <div className="pathcard__head">
            <span className="pathcard__kicker">
              <span className="pathcard__kicker-dot" />
              Path Alpha // Founder Rite
            </span>
            <span className="pathcard__tag">
              <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem' }}>auto_fix_high</span>
              Host Inscription
            </span>
          </div>
          <h2 className="pathcard__title">Create Expedition Chamber</h2>
          <p className="pathcard__body">Inscribe a new sanctuary seed and calibrate cadre soul resonance limits.</p>
          <div className="pathcard__divider" />
          <form onSubmit={handleCreate} className="pathcard__form" noValidate>
            <div className="field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="field__label" htmlFor="nexus-party-size">
                  Cadre Soul Resonance Limit
                </label>
                <span style={{ fontFamily: 'Cinzel', fontSize: '0.5625rem', color: '#8a702b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Aether-Tuned</span>
              </div>
              <div className="capacity">
                {PARTY_CAPACITIES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`capacity__opt${n === partySize ? ' capacity__opt--active' : ''}`}
                    aria-pressed={n === partySize}
                    onClick={() => setPartySize(n)}
                  >
                    <span className="capacity__num">{n} Arcanists</span>
                    <span className="capacity__label">{n === 2 ? 'Duo Rite' : n === 3 ? 'Triumvirate' : n === 4 ? 'Full Cadre' : 'Extended Cadre'}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              <span>Forge Chamber & Enter Lobby</span>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
            </button>
          </form>
        </section>

        {/* RIGHT: JOIN */}
        <section className="pathcard pathcard--violet" aria-label="Attunement rite">
          <div className="pathcard__corner pathcard__corner--tl" />
          <div className="pathcard__corner pathcard__corner--tr" />
          <div className="pathcard__head">
            <span className="pathcard__kicker">
              <span className="pathcard__kicker-dot" />
              Path Beta // Attunement Rite
            </span>
            <span className="pathcard__tag">
              <span className="material-symbols-outlined" style={{ fontSize: '0.8125rem' }}>cell_tower</span>
              Ingress Sync
            </span>
          </div>
          <h2 className="pathcard__title">Join Existing Chamber</h2>
          <p className="pathcard__body">Attune to an active party rune cipher or private ward password.</p>
          <div className="pathcard__divider pathcard__divider--violet" />
          <form onSubmit={handleJoin} className="pathcard__form" noValidate>
            <div className="field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="field__label" htmlFor="nexus-cipher">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span className="material-symbols-outlined" style={{ color: '#c084fc', fontSize: '0.875rem' }}>vpn_key</span>
                    Chamber Rune Cipher
                  </span>
                </label>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.5625rem', color: '#c084fc', textTransform: 'uppercase' }}>Format: #XXXX-XX</span>
              </div>
              <input
                id="nexus-cipher"
                className="input"
                value={cipher}
                onChange={(e) => setCipher(e.target.value.toUpperCase())}
                placeholder="ENTER CIPHER (e.g. #K7X9-M2) OR PASSWORD"
                maxLength={20}
                spellCheck={false}
                autoComplete="off"
                style={{ letterSpacing: '0.15em', borderColor: 'rgba(192,132,252,0.3)' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn--violet"
              disabled={busy || cipher.trim().length === 0}
            >
              <span>Decipher & Enter Lobby</span>
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
