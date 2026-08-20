import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { Fleuron } from '../components/Fleuron'
import { PermitCopy } from '../components/PermitCopy'
import { DisconnectCountdown } from '../components/DisconnectCountdown'
import { setStage } from '../stages'
import {
  changePlayerStatsBy,
  createRoom,
  generateSeed,
  joinRoom,
  kickPlayer,
  leaveRoom,
  sendAction,
  setPlayerRace,
  updateRoomConfig,
} from '../rooms'
import type { PlayerPublic, Race, RoomData, Stats } from '../rooms'
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

const RACES: Race[] = ['elf', 'dwarf', 'human', 'orc', 'goblin', 'troll']

const SHEET_STATS: { key: keyof Stats; label: string }[] = [
  { key: 'hp', label: 'Vitality' },
  { key: 'strength', label: 'Strength' },
  { key: 'dexterity', label: 'Dexterity' },
  { key: 'agility', label: 'Agility' },
  { key: 'intelligence', label: 'Wits' },
  { key: 'wisdom', label: 'Resolve' },
]

const STAT_FLOOR = 20
const STAT_CAP = 40
const CREATE_BUDGET = 50

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
  const [mapSize, setMapSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [joinCode, setJoinCode] = useState('')
  const [seed, setSeed] = useState(() => generateSeed())
  const [createOpen, setCreateOpen] = useState(false)

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
  const isHost = me?.isHost ?? false
  const hasGhosts = room?.players.some((p) => isGhost(p.status)) ?? false

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const res = await createRoom(
        { maxPlayers: partySize, seed: seed.trim(), mapSize, difficulty },
        user?.name ?? 'Prisoner',
        token,
      )
      saveRoomSession(res.hash, res.inviteCode)
      setRoomToken(res.hash)
      setInviteCode(res.inviteCode)
      setPartySize(res.room.config.maxPlayers)
      setSeed(res.room.config.seed)
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

  async function handleSetRace(race: Race) {
    if (!roomToken) return
    setActionError(null)
    setBusy(true)
    try {
      await setPlayerRace(roomToken, race)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleChangeStat(stat: keyof Stats, amount: number) {
    if (!roomToken) return
    setActionError(null)
    setBusy(true)
    try {
      await changePlayerStatsBy(roomToken, stat, amount)
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
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
          : "The register opens. Await the officer's word."
        : 'The line is down — retrying the connection…'

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
          onSetRace={handleSetRace}
          onChangeStat={handleChangeStat}
        />
      ) : (
        <>
          {error && (
            <p className="intake__error" role="alert">
              {error}
            </p>
          )}
          <div className="grounds">
            <section className="panel" aria-label="The trailhead">
              <div className="panel__head">
                <span className="panel__title">The trailhead</span>
                <span className="panel__sub">staging grounds</span>
              </div>
              <p className="register__lede">
                Register a descent and hand out permits, or answer a permit already on the board. The
                party gathers at the trailhead.
              </p>
              <div className="intake__actions intake__actions--stacked">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setCreateOpen(true)}
                >
                  Plan an expedition
                </button>
              </div>
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

          {createOpen && (
            <CreateGameModal
              name={user?.name ?? 'Unnamed'}
              partySize={partySize}
              busy={busy}
              error={error}
              onPartySize={setPartySize}
              onSubmit={handleCreate}
              onClose={() => setCreateOpen(false)}
            />
          )}
        </>
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

interface CreateGameModalProps {
  name: string
  partySize: number
  busy: boolean
  error: string | null
  onPartySize: (size: number) => void
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

function CreateGameModal({
  name,
  partySize,
  busy,
  error,
  onPartySize,
  onSubmit,
  onClose,
}: CreateGameModalProps) {
  return (
    <FileCardModal
      num="LEDGER"
      label="plan an expedition · lead the party"
      closeLabel="planner"
      ariaLabel="Plan an expedition"
      onClose={onClose}
    >
      <header className="filecard__head">
        <span className="filecard__kicker">the expedition ledger</span>
        <h2 className="filecard__name">{name}</h2>
        <div className="filecard__tags">
          <span className="board__tag board__tag--host">lead</span>
        </div>
      </header>

      <form onSubmit={onSubmit} className="register" noValidate>
        <p className="register__lede">
          Register a descent and hand out permits. The party gathers at the trailhead.
        </p>
        <div className="field">
          <label className="field__label" htmlFor="modal-party-size">
            Party size
          </label>
          <select
            id="modal-party-size"
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
        {error && (
          <p className="intake__error" role="alert">
            {error}
          </p>
        )}
        <div className="intake__actions intake__actions--stacked">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy}
          >
            Register the expedition
          </button>
        </div>
      </form>
    </FileCardModal>
  )
}

interface ManageModalProps {
  players: PlayerPublic[]
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
                {player.isHost && <span className="board__tag board__tag--host">lead</span>}
                {!player.isHost && (
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
  onSetRace: (race: Race) => void
  onChangeStat: (stat: keyof Stats, amount: number) => void
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
  onSetRace,
  onChangeStat,
}: LiveRoomProps) {
  const slotCount = room?.config.maxPlayers ?? 4
  const slots: (PlayerPublic | undefined)[] = Array.from(
    { length: slotCount },
    (_, i) => room?.players[i],
  )

  const [pendingKick, setPendingKick] = useState<string | null>(null)
  const kickTimerRef = useRef<number | null>(null)
  const [fileOpen, setFileOpen] = useState(false)
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

  const base = me?.stats?.base_stats
  const spent = base
    ? SHEET_STATS.reduce((sum, { key }) => sum + base[key], 0) - STAT_FLOOR * SHEET_STATS.length
    : 0
  const remaining = Math.max(0, CREATE_BUDGET - spent)

  return (
    <div className="grounds">
      <section className="board" aria-label="The party">
        <div className="board__head">
          <span className="board__title">The party</span>
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
                {player.status === 'disconnected' && player.disconnectedAt != null && (
                  <DisconnectCountdown disconnectedAt={player.disconnectedAt} />
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

      <section className="panel" aria-label="The descent">
        <div className="panel__head">
          <span className="panel__title">The descent</span>
          {isHost && (
            <button
              type="button"
              className="panel__gear"
              aria-label="Manage the expedition"
              title="Manage the expedition"
              disabled={!connected}
              onClick={() => setManageOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94 7.07 7.07 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.55 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88L2.67 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.39.32.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.1.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
              </svg>
            </button>
          )}
        </div>

        <div className="permit">
          <span className="permit__label">Permit nº</span>
          {inviteCode ? (
            <PermitCopy code={inviteCode} className="permit__code-copy" />
          ) : (
            <span className="permit__code">——</span>
          )}
          <span className="permit__note">click to copy — share it with your party</span>
        </div>

        {actionError && (
          <p className="intake__error" role="alert">
            {actionError}
          </p>
        )}

        <div className="intake__actions intake__actions--stacked grounds__actions">
          {isHost ? (
            <>
              <div className="grounds__castoff">
                <button className="btn btn--primary" disabled={busy || !connected} onClick={onStart}>
                  Cast off
                </button>
                {hasGhosts && (
                  <button
                    className="btn btn--danger"
                    disabled={busy || !connected}
                    onClick={onConfirmStart}
                  >
                    Purge &amp; cast off
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                className="btn"
                disabled={busy || !connected || me?.status === 'joined'}
                onClick={onReady}
              >
                {me?.status === 'ready' ? 'Stand down' : 'Geared up'}
              </button>
            </>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => setFileOpen(true)}>
            Your file
          </button>
          <button className="btn btn--ghost" disabled={busy} onClick={onLeave}>
            Sign out of this expedition
          </button>
          <Link to="/" className="btn btn--ghost" onClick={() => setStage(0)}>
            Back to the trailhead
          </Link>
        </div>

        <Fleuron small className="grounds__fleuron" />
      </section>

      {me && room?.status === 'lobby' && fileOpen && (
        <CharacterModal
          player={me}
          busy={busy}
          remaining={remaining}
          onClose={() => setFileOpen(false)}
          onSetRace={onSetRace}
          onChangeStat={onChangeStat}
        />
      )}

      {isHost && room?.status === 'lobby' && manageOpen && (
        <ManageModal
          players={room?.players ?? []}
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

interface CharacterModalProps {
  player: PlayerPublic
  busy: boolean
  remaining: number
  onClose: () => void
  onSetRace: (race: Race) => void
  onChangeStat: (stat: keyof Stats, amount: number) => void
}

function CharacterModal({
  player,
  busy,
  remaining,
  onClose,
  onSetRace,
  onChangeStat,
}: CharacterModalProps) {
  const base = player.stats.base_stats
  const health = player.stats.health
  const healthPct =
    health.MaxHealth > 0
      ? Math.round((health.CurrentHealth / health.MaxHealth) * 100)
      : 0

  return (
    <FileCardModal
      num="YOURS"
      label="your file · on record with the officer"
      closeLabel="file"
      ariaLabel="Your file — on record with the officer"
      onClose={onClose}
    >
      <header className="filecard__head">
        <span className="filecard__kicker">on file with the officer</span>
        <h2 className="filecard__name">{player.name}</h2>
        <div className="filecard__tags">
          <span className="board__tag board__tag--you">you</span>
          <span className={`board__tag board__tag--${player.status}`}>
            {statusLabel(player.status)}
          </span>
        </div>
      </header>

      <div className="filecard__health">
        <span className="filecard__k filecard__health-k">Health</span>
        <span className="filecard__health-bar">
          <span className="filecard__health-fill" style={{ width: `${healthPct}%` }} />
        </span>
        <span className="filecard__health-num">
          {health.CurrentHealth}
          <span className="filecard__slash">/</span>
          {health.MaxHealth}
        </span>
      </div>

      <div className="filecard__sheet-field">
        <div className="field">
          <label className="field__label" htmlFor="sheet-race">
            Race
          </label>
          <select
            id="sheet-race"
            className="select"
            value={player.stats.race}
            disabled={busy}
            onChange={(e) => onSetRace(e.target.value as Race)}
          >
            {RACES.map((race) => (
              <option key={race} value={race}>
                {race}
              </option>
            ))}
          </select>
        </div>
        <div className="sheet__budget" aria-live="polite">
          <span className="sheet__budget-k">Points</span>
          <span className="sheet__budget-v">
            {remaining} of {CREATE_BUDGET} unspent
          </span>
        </div>
      </div>

      <ul className="sheet__stats sheet__stats--file">
        {SHEET_STATS.map(({ key, label }) => {
          const value = base[key]
          return (
            <li className="sheet__row" key={key}>
              <span className="sheet__row-k">{label}</span>
              <span className="sheet__row-v">{value}</span>
              <span className="sheet__row-steppers">
                <button
                  type="button"
                  className="btn btn--ghost sheet__step"
                  disabled={busy || value <= STAT_FLOOR}
                  onClick={() => onChangeStat(key, -1)}
                  aria-label={`lower ${label}`}
                >
                  −
                </button>
                <button
                  type="button"
                  className="btn btn--ghost sheet__step"
                  disabled={busy || value >= STAT_CAP || remaining === 0}
                  onClick={() => onChangeStat(key, 1)}
                  aria-label={`raise ${label}`}
                >
                  +
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      <p className="filecard__note">
        Lv {player.stats.level} · {player.stats.race} · {player.stats.gold} gold ·{' '}
        {player.stats.skill_points} point{player.stats.skill_points === 1 ? '' : 's'} unspent
      </p>
    </FileCardModal>
  )
}
