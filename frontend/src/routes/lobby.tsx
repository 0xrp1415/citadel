import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Icon } from '@iconify/react'
import { LedgerFrame } from '../components/LedgerFrame'
import { Fleuron } from '../components/Fleuron'
import { DisconnectCountdown } from '../components/DisconnectCountdown'
import { setStage } from '../stages'
import { useToast } from '../toast'
import {
  generateSeed,
  kickPlayer,
  leaveRoom,
  sendAction,
  updateRoomConfig,
  STARTER_KITS,
} from '../rooms'
import type { PlayerPublic, RoomData, StarterKitId } from '../rooms'
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
  const navigate = useNavigate()

  const [roomToken, setRoomToken] = useState<string | null>(() => getRoomToken())
  const [inviteCode, setInviteCode] = useState<string | null>(() => getInviteCode())
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const [partySize, setPartySize] = useState(4)
  const [mapSize, setMapSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [seed, setSeed] = useState(() => generateSeed())

  const { room, connected, error: socketError } = useRoomSocket(roomToken)

  useEffect(() => {
    if (socketError && isFatalRoomSocketError(socketError)) {
      clearRoomSession()
      setRoomToken(null)
      setInviteCode(null)
      setStage(1)
      navigate({ to: '/chamber' })
    }
  }, [socketError])

  useEffect(() => {
    if (!roomToken) {
      setStage(1)
      navigate({ to: '/chamber' })
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
    try {
      await sendAction(roomToken, 'player_toggle_ready')
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  async function handleStart() {
    if (!roomToken) return
    setBusy(true)
    try {
      await sendAction(roomToken, 'start_game')
    } catch (err) {
      toast('error', errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmStart() {
    if (!roomToken) return
    setBusy(true)
    try {
      await sendAction(roomToken, 'confirm_start')
    } catch (err) {
      toast('error', errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleKick(targetPlayerId: string) {
    if (!roomToken) return
    setBusy(true)
    try {
      await kickPlayer(roomToken, targetPlayerId)
      toast('success', 'Player expelled')
    } catch (err) {
      toast('error', errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleKit(kit: StarterKitId) {
    if (!roomToken) return
    try {
      await sendAction(roomToken, 'set_kit', { kit })
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  async function handlePartySize(size: number) {
    if (!roomToken) return
    setPartySize(size)
    try {
      await updateRoomConfig(roomToken, { maxPlayers: size, seed, mapSize, difficulty })
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  async function handleMapSize(size: 'small' | 'medium' | 'large') {
    if (!roomToken) return
    setMapSize(size)
    try {
      await updateRoomConfig(roomToken, { maxPlayers: partySize, seed, mapSize: size, difficulty })
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  async function handleDifficulty(diff: 'easy' | 'medium' | 'hard') {
    if (!roomToken) return
    setDifficulty(diff)
    try {
      await updateRoomConfig(roomToken, { maxPlayers: partySize, seed, mapSize, difficulty: diff })
    } catch (err) {
      toast('error', errorMessage(err))
    }
  }

  async function handleRerollSeed() {
    if (!roomToken) return
    setBusy(true)
    const next = generateSeed()
    try {
      await updateRoomConfig(roomToken, { maxPlayers: partySize, seed: next, mapSize, difficulty })
      setSeed(next)
    } catch (err) {
      toast('error', errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function handleSeedChange(value: string) {
    setSeed(value)
    if (!roomToken) return
    updateRoomConfig(roomToken, { maxPlayers: partySize, seed: value, mapSize, difficulty }).catch(
      (err) => toast('error', errorMessage(err)),
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
          onPartySize={handlePartySize}
          onMapSize={handleMapSize}
          onDifficulty={handleDifficulty}
          onReady={handleReady}
          onStart={handleStart}
          onConfirmStart={handleConfirmStart}
          onKick={handleKick}
          onKit={handleKit}
          onLeave={handleLeave}
          onRerollSeed={handleRerollSeed}
          onSeedChange={handleSeedChange}
        />
      ) : null}
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
                <span className="board__tag" style={{ fontSize: '0.5rem', background: 'rgba(192,132,252,0.1)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.2)' }}>
                  <Icon icon={STARTER_KITS.find((k) => k.id === player.kit)?.icon ?? 'game-icons:boots'} style={{ fontSize: '0.625rem', verticalAlign: 'middle' }} />
                  {' '}{STARTER_KITS.find((k) => k.id === player.kit)?.name ?? 'Wanderer'}
                </span>
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
  onPartySize: (size: number) => void
  onMapSize: (size: 'small' | 'medium' | 'large') => void
  onDifficulty: (diff: 'easy' | 'medium' | 'hard') => void
  onReady: () => void
  onStart: () => void
  onConfirmStart: () => void
  onKick: (playerId: string) => void
  onKit: (kit: StarterKitId) => void
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
  onPartySize,
  onMapSize,
  onDifficulty,
  onReady,
  onStart,
  onConfirmStart,
  onKick,
  onKit,
  onLeave,
  onRerollSeed,
  onSeedChange,
}: LiveRoomProps) {
  const { toast } = useToast()
  const slotCount = room?.config.maxPlayers ?? 4
  const slots: (PlayerPublic | undefined)[] = Array.from(
    { length: slotCount },
    (_, i) => room?.players[i],
  )
  const nonHostPlayers = slots.filter((p): p is PlayerPublic => p != null && p.playerPublicId !== room?.hostPublicId)
  const readyCount = nonHostPlayers.filter((p) => p.status === 'ready').length
  const allReady = readyCount === nonHostPlayers.length

  const [pendingKick, setPendingKick] = useState<string | null>(null)
  const kickTimerRef = useRef<number | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [kitIdx, setKitIdx] = useState(0)

  useEffect(() => {
    return () => {
      if (kickTimerRef.current !== null) window.clearTimeout(kickTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (manageOpen) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setKitIdx((i) => (i > 0 ? i - 1 : STARTER_KITS.length - 1))
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setKitIdx((i) => (i < STARTER_KITS.length - 1 ? i + 1 : 0))
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (isHost) {
          if (allReady && !busy && connected) onStart()
        } else {
          onReady()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onReady, onStart, isHost, allReady, busy, connected, manageOpen])

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
          <div className="chamber-banner__center">
            <div className="chamber-banner__quorum">
              <span className="chamber-banner__cadre">{playerCount}</span>
              <span className="chamber-banner__cadre-sep">/</span>
              <span className="chamber-banner__cadre-max">{maxPlayers}</span>
              <span className="chamber-banner__cadre-label">cadre</span>
            </div>
            <div className="chamber-banner__divider" />
            <div className="chamber-banner__quorum">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c084fc' }}>terrain</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', color: '#9d9280' }}>
                {difficulty}
              </span>
            </div>
            <div className="chamber-banner__divider" />
            <div className="chamber-banner__quorum">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c084fc' }}>map</span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', color: '#9d9280' }}>
                {mapSize}
              </span>
            </div>
            <div className="chamber-banner__divider" />
            <div className="chamber-banner__quorum">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#c084fc' }}>key</span>
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem',
                  fontWeight: 700, color: '#f2ca50', letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
                onClick={async () => {
                  if (!inviteCode) return
                  try {
                    await navigator.clipboard.writeText(inviteCode)
                    toast('success', 'Invite code copied')
                  } catch {}
                }}
                title="Click to copy"
              >
                {inviteCode ?? '————'}
              </span>
            </div>
            <div className="chamber-banner__divider" />
            {hostPlayer && (
              <div className="chamber-banner__quorum">
                <span style={{ fontFamily: '"Cinzel", serif', fontSize: '0.6875rem', color: '#9d9280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  led by
                </span>
                <span style={{ fontFamily: '"Cinzel", serif', fontSize: '0.8125rem', fontWeight: 700, color: '#f2ca50' }}>
                  {hostPlayer.name}
                </span>
              </div>
            )}
          </div>

          {isHost && (
            <button
              type="button"
              className="btn btn--ghost"
              style={{ fontSize: '0.6875rem', padding: '0.375rem 0.75rem' }}
              onClick={() => setManageOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', verticalAlign: 'middle' }}>settings</span>
              {' '}settings
            </button>
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
                    <div className="delver__profile">
                      <div className="delver__avatar">
                        <Icon icon={STARTER_KITS.find((k) => k.id === player.kit)?.icon ?? 'game-icons:boots'} className="delver__avatar-icon" />
                      </div>
                      <div className="delver__identity">
                        <span className="delver__name">{player.name}</span>
                        <span className="delver__kit-label">
                          {STARTER_KITS.find((k) => k.id === player.kit)?.name ?? 'Wanderer'}
                        </span>
                      </div>
                    </div>
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
                      <div className="delver__stat-row">
                        <span className="delver__stat-inline">STR <b>{player.stats.base_stats.strength}</b></span>
                        <span className="delver__stat-inline">DEX <b>{player.stats.base_stats.dexterity}</b></span>
                        <span className="delver__stat-inline">INT <b>{player.stats.base_stats.intelligence}</b></span>
                      </div>
                      <div className="delver__stat-row">
                        <span className="delver__stat-inline">WIS <b>{player.stats.base_stats.wisdom}</b></span>
                        <span className="delver__stat-inline">AGI <b>{player.stats.base_stats.agility}</b></span>
                        <span className="delver__stat-inline">HP <b>{player.stats.base_stats.hp}</b></span>
                      </div>
                    </div>
                  )}
                  {slots.length > 3 && slots.length <= 6 && (
                      <>
                      <div className="delver__stat-row">
                        <span className="delver__stat-inline">STR <b>{player.stats.base_stats.strength}</b></span>
                        <span className="delver__stat-inline">DEX <b>{player.stats.base_stats.dexterity}</b></span>
                        <span className="delver__stat-inline">INT <b>{player.stats.base_stats.intelligence}</b></span>
                      </div>
                      <div className="delver__stat-row">
                        <span className="delver__stat-inline">WIS <b>{player.stats.base_stats.wisdom}</b></span>
                        <span className="delver__stat-inline">AGI <b>{player.stats.base_stats.agility}</b></span>
                        <span className="delver__stat-inline">HP <b>{player.stats.base_stats.hp}</b></span>
                      </div>
                      </>
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
                <span className="material-symbols-outlined rites__title-icon">backpack</span>
                Starter Kits
              </span>
              <span className="rites__sub">choose your loadout</span>
            </div>
            <div className="rites__kitlayout">
              <div className="rites__kitpreview">
                {me && (() => {
                  const k = STARTER_KITS.find((kit) => kit.id === me.kit)
                  if (!k) return null
                  const gearSlotIcons: Record<string, string> = {
                    weapon: 'game-icons:crossed-swords',
                    head: 'game-icons:centurion-helmet',
                    chest: 'game-icons:chest-armor',
                    greaves: 'game-icons:boots',
                  }
                  const gearEntries = [
                    k.gear.weapon && { name: k.gear.weapon.replace(/_/g, ' '), icon: gearSlotIcons.weapon },
                    k.gear.head && { name: k.gear.head.replace(/_/g, ' '), icon: gearSlotIcons.head },
                    k.gear.chest && { name: k.gear.chest.replace(/_/g, ' '), icon: gearSlotIcons.chest },
                    k.gear.greaves && { name: k.gear.greaves.replace(/_/g, ' '), icon: gearSlotIcons.greaves },
                  ].filter(Boolean) as { name: string; icon: string }[]
                  const abilIcons: Record<string, string> = {
                    iron_thews: 'game-icons:muscle-up',
                    mend_wounds: 'game-icons:healing',
                    crushing_blow: 'game-icons:slash',
                    swift_step: 'game-icons:sprint',
                    dodge: 'game-icons:dodge',
                    fleet_foot: 'game-icons:sprint',
                    arcane_bolt: 'game-icons:focused-lightning',
                    learned_lore: 'game-icons:book-aura',
                    grit: 'game-icons:determined',
                    clarity: 'game-icons:all-seeing-eye',
                  }
                  return (
                    <>
                      <div className="rites__kitpreview-head">
                        <Icon icon={k.icon} className="rites__kitpreview-icon" />
                        <span className="rites__kitpreview-name">{k.name}</span>
                      </div>
                      <p className="rites__kitpreview-desc">{k.description}</p>
                      <div className="rites__kitpreview-section">
                        <span className="rites__kitpreview-label">gear</span>
                        <div className="rites__kitpreview-chips">
                          {gearEntries.map((g) => (
                            <span key={g.name} className="rites__kit-chip rites__kit-chip--gear">
                              <Icon icon={g.icon} className="rites__kit-chip-icon" />
                              {g.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rites__kitpreview-section">
                        <span className="rites__kitpreview-label">abilities</span>
                        <div className="rites__kitpreview-chips">
                          {k.abilities.map((id) => (
                            <span key={id} className="rites__kit-chip rites__kit-chip--abil">
                              <Icon icon={abilIcons[id] ?? 'game-icons:flash'} className="rites__kit-chip-icon" />
                              {id.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="rites__kiticons">
                {STARTER_KITS.map((k, ki) => {
                  const isSelected = me?.kit === k.id
                  const isFocused = ki === kitIdx
                  return (
                    <button
                      key={k.id}
                      type="button"
                      className={`rites__kiticon-btn${isSelected ? ' rites__kiticon-btn--active' : ''}${isFocused ? ' rites__kiticon-btn--focused' : ''}`}
                      onClick={() => { setKitIdx(ki); onKit(k.id) }}
                      title={k.name}
                    >
                      <Icon icon={k.icon} className="rites__kiticon-glyph" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

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
                disabled={busy || !connected || !allReady}
                onClick={onStart}
                style={!allReady ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                <span className="material-symbols-outlined dock__cast-icon">sailing</span>
                {allReady ? 'Set Sail' : `${readyCount}/${nonHostPlayers.length} ready`}
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
