import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { LedgerFrame } from '../components/LedgerFrame'
import { Fleuron } from '../components/Fleuron'
import { PermitCopy } from '../components/PermitCopy'
import { DisconnectCountdown } from '../components/DisconnectCountdown'
import { setStage } from '../stages'
import {
  generateSeed,
  kickPlayer,
  leaveRoom,
  sendAction,
  updateRoomConfig,
} from '../rooms'
import type { PlayerPublic, RoomData } from '../rooms'
import {
  clearRoomSession,
  decodeRoomToken,
  getInviteCode,
  getRoomToken,
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
  useAuth()
  const navigate = useNavigate()

  const [roomToken, setRoomToken] = useState<string | null>(() => getRoomToken())
  const [inviteCode, setInviteCode] = useState<string | null>(() => getInviteCode())
  const [busy, setBusy] = useState(false)
  const [, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [partySize, setPartySize] = useState(4)
  const [mapSize, setMapSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [seed, setSeed] = useState(() => generateSeed())

  const { room, connected, error: socketError } = useRoomSocket(roomToken)

  useEffect(() => {
    if (socketError && isFatalRoomSocketError(socketError)) {
      clearRoomSession()
      setRoomToken(null)
    }
  }, [socketError])

  useEffect(() => {
    if (!roomToken) {
      setStage(2)
    }
  }, [roomToken])

  useEffect(() => {
    if (room?.status === 'in-run') {
      setStage(3)
      navigate({ to: '/run' })
    }
  }, [room?.status, navigate])

  useEffect(() => {
    if (room?.config.maxPlayers) {
      setPartySize(room.config.maxPlayers)
    }
    if (room?.config.seed) {
      setSeed(room.config.seed)
    }
    if (room?.config.mapSize) {
      setMapSize(room.config.mapSize)
    }
    if (room?.config.difficulty) {
      setDifficulty(room.config.difficulty)
    }
  }, [room?.config.maxPlayers, room?.config.seed, room?.config.mapSize, room?.config.difficulty])

  const selfPlayerId = roomToken ? (decodeRoomToken(roomToken)?.playerId ?? null) : null
  const me = room?.players.find((p) => p.playerId === selfPlayerId)
  const isHost = (me?.playerPublicId ?? null) === (room?.hostPublicId ?? null)
  const hasGhosts = room?.players.some((p) => isGhost(p.status)) ?? false

  async function handleReady() {
    if (!roomToken) return
    setActionError(null)
    try {
      await sendAction(roomToken, 'player_toggle_ready')
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  async function handleStart() {
    if (!roomToken) return
    setActionError(null)
    setBusy(true)
    try {
      await sendAction(roomToken, 'start_game')
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
      await sendAction(roomToken, 'confirm_start')
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleKick(targetPlayerId: string) {
    if (!roomToken) return
    setActionError(null)
    setBusy(true)
    try {
      await kickPlayer(roomToken, targetPlayerId)
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
      await updateRoomConfig(roomToken, { maxPlayers: size, seed, mapSize, difficulty })
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  async function handleMapSize(size: 'small' | 'medium' | 'large') {
    if (!roomToken) return
    setMapSize(size)
    setActionError(null)
    try {
      await updateRoomConfig(roomToken, { maxPlayers: partySize, seed, mapSize: size, difficulty })
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  async function handleDifficulty(diff: 'easy' | 'medium' | 'hard') {
    if (!roomToken) return
    setDifficulty(diff)
    setActionError(null)
    try {
      await updateRoomConfig(roomToken, { maxPlayers: partySize, seed, mapSize, difficulty: diff })
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  async function handleRerollSeed() {
    if (!roomToken) return
    setActionError(null)
    setBusy(true)
    const next = generateSeed()
    try {
      await updateRoomConfig(roomToken, { maxPlayers: partySize, seed: next, mapSize, difficulty })
      setSeed(next)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function handleSeedChange(value: string) {
    setSeed(value)
    if (!roomToken) return
    updateRoomConfig(roomToken, { maxPlayers: partySize, seed: value, mapSize, difficulty }).catch(
      (err) => setActionError(errorMessage(err)),
    )
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
          : "The register opens. Await the officer's word."
        : 'The line is down — retrying the connection…'

  return (
    <LedgerFrame wide>
      <div className="pagehead__heading">
        <h1 className="pagehead__title">
          <span className="pagehead__title-label">Staging Grounds</span>
          <span className="pagehead__title-sep">//</span>
          <span className="pagehead__title-sub">Cadre Lobby</span>
        </h1>
        {officer && <p className="pagehead__subtitle">{officer}</p>}
      </div>

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
          mapSize={mapSize}
          difficulty={difficulty}
          seed={seed}
          busy={busy}
          actionError={actionError}
          onPartySize={handlePartySize}
          onMapSize={handleMapSize}
          onDifficulty={handleDifficulty}
          onReady={handleReady}
          onStart={handleStart}
          onConfirmStart={handleConfirmStart}
          onKick={handleKick}
          onLeave={handleLeave}
          onRerollSeed={handleRerollSeed}
          onSeedChange={handleSeedChange}
        />
      ) : (
        <div className="grounds">
          <div className="panel">
            <div className="panel__head">
              <span className="panel__title">No expedition on file</span>
            </div>
            <p className="register__lede">
              Return to the Chamber Nexus to forge or join a descent.
            </p>
            <div className="intake__actions">
              <Link to="/chamber" className="btn btn--primary" onClick={() => setStage(1)}>
                Chamber Nexus
              </Link>
            </div>
          </div>
        </div>
      )}
    </LedgerFrame>
  )
}

interface FileCardModalProps {
  num: string
  label: string
  closeLabel: string
  ariaLabel: string
  onClose: () => void
  children: ReactNode
}

function FileCardModal({ num, label, closeLabel, ariaLabel, onClose, children }: FileCardModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="filecard__scrim" onClick={onClose}>
      <div
        className="filecard"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="filecard__tab">
          <span className="filecard__tab-num">{num}</span>
          <span className="filecard__tab-label">{label}</span>
          <button
            ref={closeRef}
            type="button"
            className="filecard__close"
            onClick={onClose}
            aria-label={`Close ${closeLabel}`}
          >
            close ✕
          </button>
        </div>
        <div className="filecard__sheet">{children}</div>
      </div>
    </div>
  )
}

interface ManageModalProps {
  players: PlayerPublic[]
  hostPublicId: string | null
  pendingKick: string | null
  partySize: number
  mapSize: 'small' | 'medium' | 'large'
  difficulty: 'easy' | 'medium' | 'hard'
  seed: string
  busy: boolean
  connected: boolean
  onPartySize: (size: number) => void
  onMapSize: (size: 'small' | 'medium' | 'large') => void
  onDifficulty: (diff: 'easy' | 'medium' | 'hard') => void
  onRerollSeed: () => void
  onSeedChange: (seed: string) => void
  onKick: (playerId: string) => void
  onRequestKick: (playerId: string) => void
  onClose: () => void
}

function ManageModal({
  players,
  hostPublicId,
  pendingKick,
  partySize,
  mapSize,
  difficulty,
  seed,
  busy,
  connected,
  onPartySize,
  onMapSize,
  onDifficulty,
  onRerollSeed,
  onSeedChange,
  onKick,
  onRequestKick,
  onClose,
}: ManageModalProps) {
  const [tab, setTab] = useState<'party' | 'server'>('party')

  return (
    <FileCardModal
      num="MANAGE"
      label={tab === 'party' ? 'party · lead only' : 'server · lead only'}
      closeLabel="manage"
      ariaLabel="Manage the expedition"
      onClose={onClose}
    >
      <div className="filecard__tabs" role="tablist" aria-label="Manage the expedition">
        <button
          type="button"
          role="tab"
          id="manage-tab-party"
          aria-selected={tab === 'party'}
          aria-controls="manage-pane-party"
          className={tab === 'party' ? 'filecard__tabbtn filecard__tabbtn--active' : 'filecard__tabbtn'}
          onClick={() => setTab('party')}
        >
          Party
        </button>
        <button
          type="button"
          role="tab"
          id="manage-tab-server"
          aria-selected={tab === 'server'}
          aria-controls="manage-pane-server"
          className={tab === 'server' ? 'filecard__tabbtn filecard__tabbtn--active' : 'filecard__tabbtn'}
          onClick={() => setTab('server')}
        >
          Server
        </button>
      </div>

      {tab === 'party' ? (
        <div className="filecard__pane" id="manage-pane-party" role="tabpanel" aria-labelledby="manage-tab-party">
          <header className="filecard__head">
            <span className="filecard__kicker">the lead&apos;s roll</span>
            <h2 className="filecard__name">Party management</h2>
          </header>

          <ul className="filecard__roster">
            {players.map((player) => (
              <li key={player.playerId} className="filecard__roster-row">
                <span className="filecard__roster-name">{player.name}</span>
                {player.playerPublicId === hostPublicId && (
                  <span className="board__tag board__tag--host">lead</span>
                )}
                {player.playerPublicId !== hostPublicId && (
                  <>
                    <span className={`board__tag board__tag--${player.status}`}>
                      {statusLabel(player.status)}
                    </span>
                    <button
                      type="button"
                      className={
                        pendingKick === player.playerId
                          ? 'btn btn--danger filecard__roster-kick filecard__roster-kick--confirm'
                          : 'btn btn--ghost filecard__roster-kick'
                      }
                      disabled={busy}
                      onClick={() => {
                        if (pendingKick === player.playerId) {
                          onKick(player.playerId)
                        } else {
                          onRequestKick(player.playerId)
                        }
                      }}
                    >
                      {pendingKick === player.playerId ? `Expel ${player.name}?` : 'Expel'}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <p className="filecard__note">
            off trail members are the ghosts of dropped lines. confirm to expel them from the roll.
          </p>
        </div>
      ) : (
        <div className="filecard__pane" id="manage-pane-server" role="tabpanel" aria-labelledby="manage-tab-server">
          <header className="filecard__head">
            <span className="filecard__kicker">the expedition ledger</span>
            <h2 className="filecard__name">Server settings</h2>
            <div className="filecard__tags">
              <span className="board__tag board__tag--host">lead</span>
            </div>
          </header>

          <div className="filecard__sheet-field">
            <div className="field">
              <label className="field__label" htmlFor="settings-party-size">
                Party size
              </label>
              <select
                id="settings-party-size"
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
            <div className="field">
              <label className="field__label" htmlFor="settings-map-size">
                Map size
              </label>
              <select
                id="settings-map-size"
                className="select"
                value={mapSize}
                disabled={busy}
                onChange={(e) => onMapSize(e.target.value as 'small' | 'medium' | 'large')}
              >
                <option value="small">small · 10–15 rooms</option>
                <option value="medium">medium · 25–30 rooms</option>
                <option value="large">large · 35–40 rooms</option>
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="settings-difficulty">
                Difficulty
              </label>
              <select
                id="settings-difficulty"
                className="select"
                value={difficulty}
                disabled={busy}
                onChange={(e) => onDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </div>
            <div className="seedrow">
              <span className="field__label">Run seed</span>
              <span className="seedrow__control">
                <input
                  className="input seedrow__input"
                  value={seed}
                  disabled={busy || !connected}
                  onChange={(e) => onSeedChange(e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  maxLength={64}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="btn btn--ghost seedrow__reroll"
                  disabled={busy || !connected}
                  onClick={onRerollSeed}
                >
                  Reroll
                </button>
              </span>
              <span className="seedrow__note">
                the same seed and party descend the same tower
              </span>
            </div>
          </div>

          <p className="filecard__note">
            changes are recorded on the board the moment they are made.
          </p>
        </div>
      )}
    </FileCardModal>
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
  mapSize: 'small' | 'medium' | 'large'
  difficulty: 'easy' | 'medium' | 'hard'
  seed: string
  busy: boolean
  actionError: string | null
  onPartySize: (size: number) => void
  onMapSize: (size: 'small' | 'medium' | 'large') => void
  onDifficulty: (diff: 'easy' | 'medium' | 'hard') => void
  onReady: () => void
  onStart: () => void
  onConfirmStart: () => void
  onKick: (playerId: string) => void
  onLeave: () => void
  onRerollSeed: () => void
  onSeedChange: (seed: string) => void
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
  mapSize,
  difficulty,
  seed,
  busy,
  actionError,
  onPartySize,
  onMapSize,
  onDifficulty,
  onReady,
  onStart,
  onConfirmStart,
  onKick,
  onLeave,
  onRerollSeed,
  onSeedChange,
}: LiveRoomProps) {
  const slotCount = room?.config.maxPlayers ?? 4
  const slots: (PlayerPublic | undefined)[] = Array.from(
    { length: slotCount },
    (_, i) => room?.players[i],
  )

  const [pendingKick, setPendingKick] = useState<string | null>(null)
  const kickTimerRef = useRef<number | null>(null)
  const [manageOpen, setManageOpen] = useState(false)

  useEffect(() => {
    return () => {
      if (kickTimerRef.current !== null) window.clearTimeout(kickTimerRef.current)
    }
  }, [])

  function requestKick(playerId: string) {
    if (kickTimerRef.current !== null) window.clearTimeout(kickTimerRef.current)
    setPendingKick(playerId)
    kickTimerRef.current = window.setTimeout(() => {
      setPendingKick(null)
      kickTimerRef.current = null
    }, 3000)
  }

  const hostPlayer = room?.players.find((p) => p.playerPublicId === room?.hostPublicId)
  const playerCount = room?.totalPlayers ?? 0
  const maxPlayers = room?.config.maxPlayers ?? 4

  return (
    <div className="grounds">
      <div className="chamber-banner">
          <div className="chamber-banner__cipher">
            <div className="chamber-banner__icon">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>key</span>
            </div>
            <span className="chamber-banner__label">Cipher Code</span>
            {inviteCode ? (
              <PermitCopy code={inviteCode} className="chamber-banner__copy" />
            ) : (
              <span className="chamber-banner__code">————</span>
            )}
          </div>

          <div className="chamber-banner__center">
            <div className="chamber-banner__quorum">
              <span className="chamber-banner__cadre">{playerCount}</span>
              <span className="chamber-banner__cadre-sep">/</span>
              <span className="chamber-banner__cadre-max">{maxPlayers}</span>
              <span className="chamber-banner__cadre-label">cadre</span>
            </div>
            <div className="chamber-banner__divider" />
            <div className="chamber-banner__quorum">
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#c084fc' }}>schedule</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5625rem', color: '#9d9280' }}>
                awaiting quorum
              </span>
            </div>
          </div>

          {hostPlayer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ fontFamily: '"Cinzel", serif', fontSize: '0.625rem', color: '#9d9280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                led by
              </span>
              <span style={{ fontFamily: '"Cinzel", serif', fontSize: '0.75rem', fontWeight: 700, color: '#f2ca50' }}>
                {hostPlayer.name}
              </span>
            </div>
          )}
        </div>

      <div className="staging">
        <div className="staging__main">
           <div className="delver-grid">
            {slots.map((player, i) =>
              player ? (
                <div
                  key={player.playerId}
                  className={`delver ${player.playerPublicId === room?.hostPublicId ? 'delver--gold' : 'delver--violet'}`}
                >
                  <div className={`corner-accent corner-accent--tl ${player.playerPublicId === room?.hostPublicId ? 'corner-accent--gold' : 'corner-accent--violet'}`} />
                  <div className={`corner-accent corner-accent--tr ${player.playerPublicId === room?.hostPublicId ? 'corner-accent--gold' : 'corner-accent--violet'}`} />
                  <div className="delver__halo" />
                  <div className="delver__head">
                    <div className="delver__head-left">
                      <span className="delver__slot">slot {String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="delver__tag-group">
                      {player.playerPublicId === room?.hostPublicId && (
                        <span className="delver__tag delver__tag--host">host</span>
                      )}
                      {player.status === 'ready' && (
                        <span className="delver__tag delver__tag--ready">ready</span>
                      )}
                      {player.status !== 'ready' && player.status !== 'disconnected' && (
                        <span className="delver__tag delver__tag--idle">not ready</span>
                      )}
                      {player.status === 'disconnected' && (
                        <>
                          <span className="delver__tag delver__tag--vacant">off trail</span>
                          {player.disconnectedAt != null && (
                            <DisconnectCountdown disconnectedAt={player.disconnectedAt} />
                          )}
                        </>
                      )}
                      {player.playerId === selfPlayerId && (
                        <span className="delver__tag delver__tag--self">you</span>
                      )}
                    </div>
                  </div>
                  <div className="delver__body">
                    <span className="delver__name"><span className="delver__name-label">Name:</span> {player.name}</span>
                  </div>
                  {slots.length <= 3 && (
                    <div className="delver__sheet">
                      <div className="delver__sheet-row">
                        <span className="material-symbols-outlined delver__sheet-icon">paid</span>
                        <span className="delver__sheet-label">Gold</span>
                        <span className="delver__sheet-value">{player.stats.gold}</span>
                      </div>
                      <div className="delver__sheet-row">
                        <span className="material-symbols-outlined delver__sheet-icon">auto_awesome</span>
                        <span className="delver__sheet-label">Abilities</span>
                        <span className="delver__sheet-value">{player.stats.abilities.length}</span>
                      </div>
                      <div className="delver__sheet-row">
                        <span className="material-symbols-outlined delver__sheet-icon">inventory_2</span>
                        <span className="delver__sheet-label">Items</span>
                        <span className="delver__sheet-value">{player.stats.items.length}</span>
                      </div>
                      <div className="delver__sheet-row">
                        <span className="material-symbols-outlined delver__sheet-icon">star</span>
                        <span className="delver__sheet-label">XP</span>
                        <span className="delver__sheet-value">{player.stats.experience}</span>
                      </div>
                      <div className="delver__sheet-divider" />
                      <div className="delver__stat-grid">
                        <div className="delver__stat-cell">
                          <span className="delver__stat-cell-k">STR</span>
                          <span className="delver__stat-cell-v">{player.stats.base_stats.strength}</span>
                        </div>
                        <div className="delver__stat-cell">
                          <span className="delver__stat-cell-k">DEX</span>
                          <span className="delver__stat-cell-v">{player.stats.base_stats.dexterity}</span>
                        </div>
                        <div className="delver__stat-cell">
                          <span className="delver__stat-cell-k">INT</span>
                          <span className="delver__stat-cell-v">{player.stats.base_stats.intelligence}</span>
                        </div>
                        <div className="delver__stat-cell">
                          <span className="delver__stat-cell-k">WIS</span>
                          <span className="delver__stat-cell-v">{player.stats.base_stats.wisdom}</span>
                        </div>
                        <div className="delver__stat-cell">
                          <span className="delver__stat-cell-k">AGI</span>
                          <span className="delver__stat-cell-v">{player.stats.base_stats.agility}</span>
                        </div>
                        <div className="delver__stat-cell">
                          <span className="delver__stat-cell-k">HP</span>
                          <span className="delver__stat-cell-v">{player.stats.base_stats.hp}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {slots.length > 3 && slots.length <= 6 && (
                    <div className="delver__stat-grid">
                      <div className="delver__stat-cell">
                        <span className="delver__stat-cell-k">STR</span>
                        <span className="delver__stat-cell-v">{player.stats.base_stats.strength}</span>
                      </div>
                      <div className="delver__stat-cell">
                        <span className="delver__stat-cell-k">DEX</span>
                        <span className="delver__stat-cell-v">{player.stats.base_stats.dexterity}</span>
                      </div>
                      <div className="delver__stat-cell">
                        <span className="delver__stat-cell-k">INT</span>
                        <span className="delver__stat-cell-v">{player.stats.base_stats.intelligence}</span>
                      </div>
                      <div className="delver__stat-cell">
                        <span className="delver__stat-cell-k">WIS</span>
                        <span className="delver__stat-cell-v">{player.stats.base_stats.wisdom}</span>
                      </div>
                      <div className="delver__stat-cell">
                        <span className="delver__stat-cell-k">AGI</span>
                        <span className="delver__stat-cell-v">{player.stats.base_stats.agility}</span>
                      </div>
                      <div className="delver__stat-cell">
                        <span className="delver__stat-cell-k">HP</span>
                        <span className="delver__stat-cell-v">{player.stats.base_stats.hp}</span>
                      </div>
                    </div>
                  )}
                  <div className="delver__stats">
                    <div className="delver__bar">
                      <div
                        className="delver__bar-fill"
                        style={{
                          width: `${(player.stats.health.CurrentHealth / player.stats.health.MaxHealth) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={`empty-${i}`} className="delver delver--empty">
                  <div className="delver-empty">
                    <div className="delver-empty__pulse">
                      <div className="delver-empty__pulse-ring" />
                      <div className="delver-empty__pulse-core">
                        <span className="material-symbols-outlined delver-empty__pulse-core-icon">
                          radar
                        </span>
                      </div>
                    </div>
                    <span className="delver-empty__title">vacant slot</span>
                    <span className="delver-empty__sub">
                      awaiting a delver to fill this position
                    </span>
                  </div>
                </div>
              )
            )}
           </div>
        </div>

        <div className="staging__side">
          <div className="rites">
            <div className="rites__head">
              <span className="rites__title">
                <span className="material-symbols-outlined rites__title-icon">info</span>
                Chamber Stats
              </span>
            </div>
            <div className="rites__body">
              <div className="rites__row">
                <div className="rites__row-left">
                  <span className="material-symbols-outlined rites__row-icon">group</span>
                  <div>
                    <span className="rites__row-name">Cadre Limit</span>
                    <span className="rites__row-sub">{maxPlayers} delvers</span>
                  </div>
                </div>
                <span className="rites__value">{maxPlayers}</span>
              </div>
              <div className="rites__row">
                <div className="rites__row-left">
                  <span className="material-symbols-outlined rites__row-icon">terrain</span>
                  <div>
                    <span className="rites__row-name">Difficulty</span>
                    <span className="rites__row-sub">{difficulty}</span>
                  </div>
                </div>
                <span className="rites__value">{difficulty}</span>
              </div>
              <div className="rites__row">
                <div className="rites__row-left">
                  <span className="material-symbols-outlined rites__row-icon">map</span>
                  <div>
                    <span className="rites__row-name">Map Size</span>
                    <span className="rites__row-sub">{mapSize}</span>
                  </div>
                </div>
                <span className="rites__value">{mapSize}</span>
              </div>
              <div className="rites__row">
                <div className="rites__row-left">
                  <span className="material-symbols-outlined rites__row-icon">casino</span>
                  <div>
                    <span className="rites__row-name">Run Seed</span>
                    <span className="rites__row-sub">{seed}</span>
                  </div>
                </div>
                <span className="rites__value">{seed}</span>
              </div>
            </div>
            {isHost && (
              <button
                type="button"
                className="rites__settings"
                onClick={() => setManageOpen(true)}
              >
                <span className="material-symbols-outlined rites__settings-icon">settings</span>
                settings
              </button>
            )}
          </div>

        </div>
      </div>

      {actionError && (
        <div className="intake__error" role="alert" style={{ margin: '0 0.75rem' }}>
          {actionError}
        </div>
      )}

      <Fleuron small />

      <div className="dock">
        <div className="dock__left">
          <button
            type="button"
            className="dock__disband"
            disabled={busy}
            onClick={onLeave}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>logout</span>
            Disband Chamber // Leave
          </button>
          {!connected && (
            <span className="dock__note">connection lost — reconnecting</span>
          )}
        </div>
        <div className="dock__right">
          {isHost ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {hasGhosts && (
                <button
                  type="button"
                  className="btn btn--danger"
                  style={{ fontSize: '0.625rem', padding: '0.5rem 1rem' }}
                  disabled={busy || !connected}
                  onClick={onConfirmStart}
                >
                  Purge &amp; cast off
                </button>
              )}
              <button
                className="dock__cast"
                disabled={busy || !connected}
                onClick={onStart}
              >
                <span className="material-symbols-outlined dock__cast-icon">sailing</span>
                Cast Off Into The Depths
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <span className="dock__quorum-label">your status</span>
                <span className="dock__quorum-value">{statusLabel(me?.status ?? 'joined')}</span>
              </div>
              <button
                className="dock__cast"
                disabled={busy || !connected || me?.status === 'joined'}
                onClick={onReady}
              >
                <span className="material-symbols-outlined dock__cast-icon">
                  {me?.status === 'ready' ? 'remove_circle' : 'check_circle'}
                </span>
                {me?.status === 'ready' ? 'Stand Down' : 'Geared Up'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isHost && room?.status === 'lobby' && manageOpen && (
        <ManageModal
          players={room?.players ?? []}
          hostPublicId={room?.hostPublicId ?? null}
          pendingKick={pendingKick}
          partySize={partySize}
          mapSize={mapSize}
          difficulty={difficulty}
          seed={seed}
          busy={busy}
          connected={connected}
          onPartySize={onPartySize}
          onMapSize={onMapSize}
          onDifficulty={onDifficulty}
          onRerollSeed={onRerollSeed}
          onSeedChange={onSeedChange}
          onKick={onKick}
          onRequestKick={requestKick}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  )
}
