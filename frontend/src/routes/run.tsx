import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { setStage } from '../stages'
import type { PlayerPublic, RoomData } from '../rooms'
import { clearRoomSession, decodeRoomToken, getRoomToken } from '../roomSession'
import { isFatalRoomSocketError, useRoomSocket } from '../useRoomSocket'

export const Route = createFileRoute('/run')({
  component: Run,
})

interface RecordLine {
  id: string
  speaker: 'player' | 'officer' | 'ruling' | 'data'
  text: string
  indent?: boolean
}

const TRANSCRIPT: RecordLine[] = [
  { id: 'r1', speaker: 'officer', text: 'Descent begins. The record is continuous. It will not pause.' },
  { id: 'r2', speaker: 'player', text: 'I advance, blade low, toward the warden' },
  { id: 'r3', speaker: 'ruling', text: '→ RULING: ADMISSIBLE' },
  { id: 'r4', speaker: 'data', text: 'roll 12 + 26 vs 18 → hit' },
  { id: 'r5', speaker: 'data', text: '14 damage to the warden', indent: true },
  { id: 'r6', speaker: 'officer', text: 'The hall narrows. Walls close. Your party presses deeper.' },
  { id: 'r7', speaker: 'player', text: 'I hold the line, shield raised, calling the others behind me' },
  { id: 'r8', speaker: 'ruling', text: '→ RULING: ADMISSIBLE — RESOLVED' },
  { id: 'r9', speaker: 'data', text: 'roll 9 + 22 vs 15 → miss' },
  { id: 'r10', speaker: 'data', text: 'the warden’s blade finds your flank', indent: true },
]

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

function Run() {
  const navigate = useNavigate()
  const roomToken = getRoomToken()
  const { room, connected, error: socketError } = useRoomSocket(roomToken)

  const selfPlayerId = roomToken ? (decodeRoomToken(roomToken)?.playerId ?? null) : null
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!roomToken) {
      setStage(1)
      navigate({ to: '/lobby' })
      return
    }
    if (socketError && isFatalRoomSocketError(socketError)) {
      clearRoomSession()
      setStage(1)
      navigate({ to: '/lobby' })
      return
    }
    if (room && room.status !== 'in-run') {
      setStage(1)
      navigate({ to: '/lobby' })
    }
  }, [room, roomToken, socketError, navigate])

  useEffect(() => {
    if (!room) return
    setOpenPlayerId((current) =>
      current && room.players.some((p) => p.playerId === current) ? current : null,
    )
  }, [room])

  useEffect(() => {
    if (openPlayerId) return
    returnFocusRef.current?.focus()
  }, [openPlayerId])

  const officer = socketError
    ? socketError
    : room?.status === 'in-run'
      ? connected
        ? 'The descent is live. The record is continuous.'
        : 'The line is down — retrying the connection\u2026'
      : 'The register opens. Await the officer\u2019s word.'

  const openPlayer = room?.players.find((p) => p.playerId === openPlayerId) ?? null

  const openFile = (playerId: string) => {
    returnFocusRef.current = document.activeElement as HTMLElement | null
    setOpenPlayerId(playerId)
  }

  return (
    <div className="descent">
      <aside className="descent__rail" aria-label="Expedition file">
        <PartyManifest
          room={room}
          selfPlayerId={selfPlayerId}
          connected={connected}
          focusedPlayerId={openPlayerId}
          onSelect={openFile}
        />
      </aside>

      <LedgerFrame xwide className="descent__log">
        <PageHead
          waypoint
          kicker="the descent · continuous field log"
          title="The Descent"
          officer={officer}
        />

        <section className="panel" aria-label="Field log">
          <div className="panel__head">
            <span className="panel__title">Field log</span>
            <span className="panel__sub">live · every word judged</span>
          </div>
          <div className="record-scroll">
            <div className="record">
              {TRANSCRIPT.map((line) => (
                <span
                  key={line.id}
                  className={`record__row record__row--${line.speaker}${
                    line.indent ? ' record__indent' : ''
                  }`}
                  style={{ animationDelay: `${TRANSCRIPT.indexOf(line) * 90}ms` }}
                >
                  {line.speaker === 'player' && <span className="record__mark">&gt; </span>}
                  {line.text}
                </span>
              ))}
              <span className="caret" aria-hidden="true" />
            </div>
          </div>
        </section>
      </LedgerFrame>

      {openPlayer && (
        <DossierCard
          player={openPlayer}
          players={room?.players ?? []}
          selfPlayerId={selfPlayerId}
          onClose={() => setOpenPlayerId(null)}
          onSwitch={setOpenPlayerId}
        />
      )}
    </div>
  )
}

interface PartyManifestProps {
  room: RoomData | null
  selfPlayerId: string | null
  connected: boolean
  focusedPlayerId: string | null
  onSelect: (playerId: string) => void
}

function PartyManifest({
  room,
  selfPlayerId,
  connected,
  focusedPlayerId,
  onSelect,
}: PartyManifestProps) {
  return (
    <div className="board">
      <div className="board__head">
        <span className="board__title">Party manifest</span>
        <span className="board__sub">
          {room ? `${room.totalPlayers} in the descent · permit ${room.inviteCode}` : '· —'}
        </span>
      </div>
      <ol className="board__list">
        {room?.players.map((player) => {
          const isSelf = player.playerId === selfPlayerId
          const isFocused = player.playerId === focusedPlayerId
          return (
            <li
              key={player.playerId}
              className={`board__row${isSelf ? ' board__row--you' : ''}${
                isFocused ? ' board__row--focused' : ''
              }`}
            >
              <span
                className={`board__mark board__mark--${player.status}`}
                title={statusLabel(player.status)}
                aria-label={`status: ${statusLabel(player.status)}`}
              />
              <button
                type="button"
                className="board__select"
                title={player.name}
                aria-haspopup="dialog"
                aria-expanded={isFocused}
                aria-label={`View ${player.name}’s file`}
                onClick={() => onSelect(player.playerId)}
              >
                <span className="board__name">{player.name}</span>
              </button>
              {player.isHost && <span className="board__tag board__tag--host">lead</span>}
              {isSelf && <span className="board__tag board__tag--you">you</span>}
            </li>
          )
        })}
        {!room && <li className="board__empty">awaiting the record…</li>}
      </ol>
      {!connected && (
        <div className="board__foot">
          <p>The line is down — the manifest is not live. The connection is being retried.</p>
        </div>
      )}
    </div>
  )
}

const DOSSIER_FIELDS = ['Vitality', 'Strength', 'Agility', 'Wits', 'Resolve', 'Provision']

const GEAR_POOL = [
  'brass longsword',
  'lantern spear',
  'hide buckler',
  'coil-bound greaves',
  'waxen hauberk',
  'officer’s blade',
  'pinned half-plate',
  'knotted mace',
  'glass visor',
  'trail satchel',
]

const ITEM_POOL = [
  'salt ration ×3',
  'water-skin',
  'bandage roll',
  'torch · short',
  'smoke pellet',
  'rope · 20ft',
  'whetstone',
  'bitter tincture',
]

const ANNOTATIONS = [
  'The officer flags a fine edge — kept sharp since the second landing.',
  'The file notes the whetstone is loaned, and will be returned at the gate.',
  'The officer recorded no remarks since the warden gate.',
  'The lantern is carried low tonight; the file asks it stay lit.',
]

interface DossierData {
  stats: number[]
  health: { current: number; max: number }
  gear: string[]
  items: string[]
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickRandom<T>(rand: () => number, pool: readonly T[], count: number): T[] {
  const copy = [...pool]
  const out: T[] = []
  while (copy.length > 0 && out.length < count) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0])
  }
  return out
}

function dossierFor(player: PlayerPublic): DossierData {
  const rand = mulberry32(seedFrom(player.playerId))
  const roll = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

  const vitality = roll(8, 18)
  const maxHealth = vitality + 10
  const current = Math.max(1, maxHealth - roll(0, 8))

  return {
    stats: [vitality, roll(6, 18), roll(6, 18), roll(6, 18), roll(6, 18), roll(6, 18)],
    health: { current, max: maxHealth },
    gear: pickRandom(rand, GEAR_POOL, 3),
    items: pickRandom(rand, ITEM_POOL, 3),
  }
}

function annotationFor(playerId: string): string {
  return ANNOTATIONS[seedFrom(playerId) % ANNOTATIONS.length]
}

interface DossierCardProps {
  player: PlayerPublic
  players: PlayerPublic[]
  selfPlayerId: string | null
  onClose: () => void
  onSwitch: (playerId: string) => void
}

function DossierCard({ player, players, selfPlayerId, onClose, onSwitch }: DossierCardProps) {
  const index = players.findIndex((p) => p.playerId === player.playerId)
  const previous = index > 0 ? players[index - 1] : players[players.length - 1]
  const next = index < players.length - 1 ? players[index + 1] : players[0]

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const data = dossierFor(player)
  const healthPct = Math.round((data.health.current / data.health.max) * 100)

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
        aria-label={`${player.name} — expeditioner file`}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="filecard__tab">
          <span className="filecard__tab-num">
            {String(index + 1).padStart(2, '0')} / {String(players.length).padStart(2, '0')}
          </span>
          <span className="filecard__tab-label">expeditioner file</span>
          <button
            ref={closeRef}
            type="button"
            className="filecard__close"
            onClick={onClose}
            aria-label="Close file"
          >
            close ✕
          </button>
        </div>

        <div className="filecard__sheet" key={player.playerId}>
          <header className="filecard__head">
            <span className="filecard__kicker">on file with the officer</span>
            <h2 className="filecard__name">{player.name}</h2>
            <div className="filecard__tags">
              {player.isHost && <span className="board__tag board__tag--host">lead</span>}
              {player.playerId === selfPlayerId && (
                <span className="board__tag board__tag--you">you</span>
              )}
              <span className={`board__tag board__tag--${player.status}`}>
                {statusLabel(player.status)}
              </span>
            </div>
            <span className="filecard__stamp" aria-hidden="true">
              {statusLabel(player.status)}
            </span>
          </header>

          <dl className="filecard__stats">
            {DOSSIER_FIELDS.map((field, i) => (
              <div className="filecard__stat" key={field}>
                <dt className="filecard__k">{field}</dt>
                <dd className="filecard__v">{data.stats[i]}</dd>
              </div>
            ))}
          </dl>

          <div className="filecard__health">
            <span className="filecard__k filecard__health-k">Health</span>
            <span className="filecard__health-bar">
              <span className="filecard__health-fill" style={{ width: `${healthPct}%` }} />
            </span>
            <span className="filecard__health-num">
              {data.health.current}
              <span className="filecard__slash">/</span>
              {data.health.max}
            </span>
          </div>

          <div className="filecard__columns">
            <div className="filecard__col">
              <span className="filecard__col-k">Gear</span>
              <ul className="filecard__list">
                {data.gear.map((item) => (
                  <li className="filecard__item" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="filecard__col">
              <span className="filecard__col-k">Items</span>
              <ul className="filecard__list">
                {data.items.map((item) => (
                  <li className="filecard__item" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="filecard__note">{annotationFor(player.playerId)}</p>

          <footer className="filecard__foot">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onSwitch(previous.playerId)}
            >
              <span className="filecard__nav-arrow">‹</span>
              <span className="filecard__nav-name">{previous.name}</span>
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onSwitch(next.playerId)}>
              <span className="filecard__nav-name">{next.name}</span>
              <span className="filecard__nav-arrow">›</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
