import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { Fleuron } from '../components/Fleuron'
import { setStage } from '../stages'
import {
  confirmStart,
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  toggleReady,
  updateRoomConfig,
} from '../rooms'
import type { PlayerPublic, RoomData } from '../rooms'
import {
  clearRoomSession,
  decodeRoomToken,
  getInviteCode,
  getRoomToken,
  saveRoomSession,
} from '../roomSession'
import { isFatalRoomSocketError, useRoomSocket } from '../useRoomSocket'

export const Route = createFileRoute('/lobby')({
  component: Lobby,
})

const PARTY_SIZES = [3, 4, 5, 6, 7, 8]

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'The record could not be completed.'
}

function statusLabel(status: PlayerPublic['status']): string {
  switch (status) {
    case 'ready':
      return 'geared up'
    case 'connected':
      return 'on trail'
    case 'joined':
      return 'checking in'
    case 'disconnected':
      return 'off trail'
    case 'in-run':
      return 'descending'
    default:
      return status
  }
}

function isGhost(status: PlayerPublic['status']): boolean {
  return status === 'joined' || status === 'disconnected'
}

function Lobby() {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  const [roomToken, setRoomToken] = useState<string | null>(() => getRoomToken())
  const [inviteCode, setInviteCode] = useState<string | null>(() => getInviteCode())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [partySize, setPartySize] = useState(4)
  const [joinCode, setJoinCode] = useState('')

  const { room, connected, error: socketError } = useRoomSocket(roomToken)

  useEffect(() => {
    if (socketError && isFatalRoomSocketError(socketError)) {
      clearRoomSession()
      setRoomToken(null)
      setInviteCode(null)
      setError(socketError)
    }
  }, [socketError])

  useEffect(() => {
    if (room?.status === 'in-run') {
      setStage(2)
      navigate({ to: '/run' })
    }
  }, [room?.status, navigate])

  useEffect(() => {
    if (room?.config.maxPlayers) {
      setPartySize(room.config.maxPlayers)
    }
  }, [room?.config.maxPlayers])

  const selfPlayerId = roomToken ? (decodeRoomToken(roomToken)?.playerId ?? null) : null
  const me = room?.players.find((p) => p.playerId === selfPlayerId)
  const isHost = me?.isHost ?? false
  const hasGhosts = room?.players.some((p) => isGhost(p.status)) ?? false

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const res = await createRoom({ maxPlayers: partySize }, user?.name ?? 'Prisoner', token)
      saveRoomSession(res.hash, res.inviteCode)
      setRoomToken(res.hash)
      setInviteCode(res.inviteCode)
      setPartySize(res.room.config.maxPlayers)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const res = await joinRoom(joinCode, user?.name ?? 'Prisoner', token)
      saveRoomSession(res.hash, res.room.inviteCode)
      setRoomToken(res.hash)
      setInviteCode(res.room.inviteCode)
      setPartySize(res.room.config.maxPlayers)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleReady() {
    if (!roomToken) return
    setActionError(null)
    try {
      await toggleReady(roomToken)
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  async function handleStart() {
    if (!roomToken) return
    setActionError(null)
    setBusy(true)
    try {
      await startGame(roomToken)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmStart() {
    if (!roomToken) return
    setActionError(null)
    setBusy(true)
    try {
      await confirmStart(roomToken)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handlePartySize(size: number) {
    if (!roomToken) return
    setPartySize(size)
    setActionError(null)
    try {
      await updateRoomConfig(roomToken, { maxPlayers: size })
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  async function handleLeave() {
    if (!roomToken) return
    setBusy(true)
    try {
      await leaveRoom(roomToken)
    } catch {
      // the expedition may already be dissolved; clear locally regardless
    }
    clearRoomSession()
    setRoomToken(null)
    setInviteCode(null)
    setActionError(null)
    setError(null)
    setBusy(false)
  }

  const officer = room?.status === 'in-run'
    ? 'Cast off — the descent is underway.'
    : socketError
      ? socketError
      : connected
        ? room
          ? 'The expedition is filed. Await your party.'
          : 'The register opens. Await the officer\u2019s word.'
        : 'The line is down — retrying the connection\u2026'

  return (
    <LedgerFrame wide>
      <PageHead
        waypoint
        kicker="trailhead · staging grounds"
        title="The Staging Grounds"
        officer={officer}
      />

      {roomToken ? (
        <LiveRoom
          room={room}
          connected={connected}
          inviteCode={inviteCode}
          selfPlayerId={selfPlayerId}
          isHost={isHost}
          me={me}
          hasGhosts={hasGhosts}
          partySize={partySize}
          busy={busy}
          actionError={actionError}
          onPartySize={handlePartySize}
          onReady={handleReady}
          onStart={handleStart}
          onConfirmStart={handleConfirmStart}
          onLeave={handleLeave}
        />
      ) : (
        <>
          {error && (
            <p className="intake__error" role="alert">
              {error}
            </p>
          )}
          <div className="grounds">
            <section className="panel" aria-label="Plan an expedition">
              <div className="panel__head">
                <span className="panel__title">Plan an expedition</span>
                <span className="panel__sub">lead the party</span>
              </div>
              <form onSubmit={handleCreate} className="register" noValidate>
                <p className="register__lede">
                  Register a descent and hand out permits. The party gathers at the trailhead.
                </p>
                <div className="field">
                  <span className="field__label">Expeditioner</span>
                  <span className="idline__v idline__v--you">
                    {user?.name ?? 'Unnamed'}
                  </span>
                </div>
                <div className="field" style={{ marginTop: '0.9rem' }}>
                  <label className="field__label" htmlFor="party-size">
                    Party size
                  </label>
                  <select
                    id="party-size"
                    className="select"
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                  >
                    {PARTY_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="intake__actions intake__actions--stacked">
                  <button type="submit" className="btn btn--primary" disabled={busy}>
                    Register the expedition
                  </button>
                </div>
              </form>
            </section>

            <section className="panel" aria-label="Join a party">
              <div className="panel__head">
                <span className="panel__title">Join a party</span>
                <span className="panel__sub">by permit</span>
              </div>
              <form onSubmit={handleJoin} className="register" noValidate>
                <p className="register__lede">
                  A permit opens a slot in an expedition already on the board.
                </p>
                <div className="field">
                  <label className="field__label" htmlFor="join-code">
                    Permit code
                  </label>
                  <input
                    id="join-code"
                    className="input"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    required
                    style={{ letterSpacing: '0.3em' }}
                  />
                </div>
                <div className="intake__actions intake__actions--stacked">
                  <button
                    type="submit"
                    className="btn"
                    disabled={busy || joinCode.trim().length === 0}
                  >
                    Enter by permit
                  </button>
                </div>
              </form>
            </section>
          </div>
          <div className="intake__actions">
            <Link to="/" className="btn btn--ghost" onClick={() => setStage(0)}>
              Back to the trailhead
            </Link>
          </div>
        </>
      )}
    </LedgerFrame>
  )
}

interface LiveRoomProps {
  room: RoomData | null
  connected: boolean
  inviteCode: string | null
  selfPlayerId: string | null
  isHost: boolean
  me: PlayerPublic | undefined
  hasGhosts: boolean
  partySize: number
  busy: boolean
  actionError: string | null
  onPartySize: (size: number) => void
  onReady: () => void
  onStart: () => void
  onConfirmStart: () => void
  onLeave: () => void
}

function LiveRoom({
  room,
  connected,
  inviteCode,
  selfPlayerId,
  isHost,
  me,
  hasGhosts,
  partySize,
  busy,
  actionError,
  onPartySize,
  onReady,
  onStart,
  onConfirmStart,
  onLeave,
}: LiveRoomProps) {
  const slotCount = room?.config.maxPlayers ?? 4
  const slots: (PlayerPublic | undefined)[] = Array.from(
    { length: slotCount },
    (_, i) => room?.players[i],
  )

  const condition = room?.status === 'in-run'
    ? 'Cast off — the descent is underway'
    : connected
      ? 'All accounted for — awaiting the signal'
      : 'Awaiting the line'

  return (
    <div className="grounds">
      <section className="board" aria-label="Party roll">
        <div className="board__head">
          <span className="board__title">Party roll</span>
          <span className="board__sub">
            {room ? `party size · ${room.totalPlayers}/${room.config.maxPlayers}` : 'party size · —'}
          </span>
        </div>
        <ol className="board__list">
          {slots.map((player, i) =>
            player ? (
              <li
                key={player.playerId}
                className={player.playerId === selfPlayerId ? 'board__row board__row--you' : 'board__row'}
              >
                <span className="board__no">{String(i + 1).padStart(2, '0')}</span>
                <span className="board__name">{player.name}</span>
                {player.isHost && <span className="board__tag board__tag--host">lead</span>}
                {player && !player.isHost && (
                  <span className={`board__tag board__tag--${player.status}`}>
                    {statusLabel(player.status)}
                  </span>
                )}
                {player.playerId === selfPlayerId && (
                  <span className="board__tag board__tag--you">you</span>
                )}
              </li>
            ) : (
              <li key={`empty-${i}`} className="board__empty">
                space available
              </li>
            ),
          )}
        </ol>
        {!connected && (
          <div className="board__foot">
            <p>The line is down — the board is not live. The connection is being retried.</p>
          </div>
        )}
      </section>

      <section className="panel" aria-label="The expedition">
        <div className="panel__head">
          <span className="panel__title">The expedition</span>
          <span className="panel__sub">record nº · {room?.status ?? 'pending'}</span>
        </div>

        <div className="permit">
          <span className="permit__label">Permit nº</span>
          <span className="permit__code">{inviteCode ?? '——'}</span>
          <span className="permit__note">share this code — seats go to the first to arrive</span>
        </div>

        <dl className="idline" style={{ marginTop: '1.1rem' }}>
          <div className="idline__row">
            <dt className="idline__k">Condition</dt>
            <dd className="idline__v">{condition}</dd>
          </div>
        </dl>

        {actionError && (
          <p className="intake__error" role="alert">
            {actionError}
          </p>
        )}

        <div className="intake__actions intake__actions--stacked grounds__actions">
          {isHost ? (
            <>
              <div className="hostrow">
                <label className="field__label" htmlFor="party-size">
                  Party size
                </label>
                <select
                  id="party-size"
                  className="select"
                  value={partySize}
                  disabled={busy}
                  onChange={(e) => onPartySize(Number(e.target.value))}
                >
                  {PARTY_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn--primary" disabled={busy || !connected} onClick={onStart}>
                Cast off
              </button>
              {hasGhosts && (
                <button
                  className="btn btn--danger"
                  disabled={busy || !connected}
                  onClick={onConfirmStart}
                >
                  Purge the absent &amp; cast off
                </button>
              )}
            </>
          ) : (
            <button
              className="btn"
              disabled={busy || !connected || me?.status === 'joined'}
              onClick={onReady}
            >
              {me?.status === 'ready' ? 'Stand down' : 'Geared up'}
            </button>
          )}
          <button className="btn btn--ghost" disabled={busy} onClick={onLeave}>
            Sign out of this expedition
          </button>
          <Link to="/" className="btn btn--ghost" onClick={() => setStage(0)}>
            Back to the trailhead
          </Link>
        </div>

        <Fleuron small className="grounds__fleuron" />
      </section>
    </div>
  )
}
