import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { setStage } from '../stages'
import type { ConsumableType, PlayerPublic, PlayerRunEntity, RoomData, Stats } from '../rooms'
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

      <aside className="descent__rail descent__rail--map" aria-label="Descent map">
        <MapCard />
      </aside>

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
        <span className="board__sub board__sub--muted">
          {room ? `${room.totalPlayers} in the descent` : '· —'}
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

interface MapRoom {
  id: string
  cover: string
  x: number
  y: number
  missed?: boolean
}

const MAP_NODES: MapRoom[] = [
  { id: 'm1', cover: 'Gatehall', x: 50, y: 8 },
  { id: 'm2', cover: 'Vestry', x: 50, y: 21 },
  { id: 'm3', cover: 'Warden’s Hall', x: 24, y: 36 },
  { id: 'm4', cover: 'Sunken Gallery', x: 76, y: 36, missed: true },
  { id: 'm5', cover: 'Bone Crypt', x: 50, y: 51 },
  { id: 'm6', cover: 'The Gantlet', x: 24, y: 66 },
  { id: 'm7', cover: 'Mirror Well', x: 76, y: 66, missed: true },
  { id: 'm8', cover: 'Sealed Door', x: 50, y: 80 },
  { id: 'm9', cover: 'The Deep', x: 50, y: 93 },
]

const MAP_EDGES: [string, string][] = [
  ['m1', 'm2'],
  ['m2', 'm3'],
  ['m2', 'm4'],
  ['m3', 'm5'],
  ['m4', 'm5'],
  ['m5', 'm6'],
  ['m5', 'm7'],
  ['m6', 'm8'],
  ['m7', 'm8'],
  ['m8', 'm9'],
]

const VISITED_ROOMS = new Set([MAP_NODES[0].id])

function MapCard() {
  const [hovered, setHovered] = useState<MapRoom | null>(null)
  const nodeById = new Map(MAP_NODES.map((n) => [n.id, n]))

  const parentsOf = (id: string): string[] =>
    MAP_EDGES.filter(([, to]) => to === id).map(([from]) => from)

  const roomStatus = (id: string): 'seen' | 'frontier' | 'hidden' => {
    if (VISITED_ROOMS.has(id)) return 'seen'
    return parentsOf(id).some((pid) => VISITED_ROOMS.has(pid)) ? 'frontier' : 'hidden'
  }

  return (
    <section className="board map" aria-label="Descent map">
      <div className="board__head">
        <span className="board__title">Descent map</span>
        <span className="board__sub board__sub--muted">charted</span>
      </div>
      <div className="map__canvas">
        <svg
          className="map__svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="map-arrow"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L6 3 L0 6 z" fill="rgba(90, 74, 52, 0.5)" />
            </marker>
          </defs>
          {MAP_EDGES.map(([from, to]) => {
            const a = nodeById.get(from)
            const b = nodeById.get(to)
            if (!a || !b || roomStatus(from) === 'hidden' || roomStatus(to) === 'hidden') {
              return null
            }
            return (
              <line
                key={`${from}-${to}`}
                className="map__edge"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                markerEnd="url(#map-arrow)"
              />
            )
          })}
        </svg>
        {MAP_NODES.map((room, i) => {
          const status = roomStatus(room.id)
          if (status === 'hidden') return null
          const isCurrent = VISITED_ROOMS.has(room.id)
          return (
            <button
              type="button"
              key={room.id}
              className={`map__node${status === 'frontier' ? ' map__node--frontier' : ''}${
                isCurrent ? ' map__node--current' : ''
              }${room.missed && status === 'seen' ? ' map__node--missed' : ''}${
                hovered?.id === room.id ? ' map__node--active' : ''
              }`}
              style={{ left: `${room.x}%`, top: `${room.y}%` }}
              onMouseEnter={() => setHovered(room)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(room)}
              onBlur={() => setHovered(null)}
              aria-label={
                status === 'frontier'
                  ? 'Unexplored chamber'
                  : `${room.cover}${room.missed ? ' — missed item' : ''}`
              }
              aria-describedby="map-cover"
            >
              <span className="map__node-index">
                {status === 'frontier' ? '?' : String(i + 1).padStart(2, '0')}
              </span>
            </button>
          )
        })}
      </div>
      <div className="map__cover" id="map-cover" role="status" aria-live="polite">
        {hovered ? (
          roomStatus(hovered.id) === 'seen' ? (
            <>
              <span className="map__cover-name">{hovered.cover}</span>
              {hovered.missed && <span className="map__cover-miss">missed item</span>}
            </>
          ) : (
            <span className="map__cover-name map__cover-name--unknown">unexplored chamber</span>
          )
        ) : (
          <span className="map__cover-name map__cover-name--idle">hover a room</span>
        )}
      </div>
    </section>
  )
}

const DOSSIER_FIELDS: { label: string; key: keyof Stats }[] = [
  { label: 'Vitality', key: 'hp' },
  { label: 'Strength', key: 'strength' },
  { label: 'Dexterity', key: 'dexterity' },
  { label: 'Agility', key: 'agility' },
  { label: 'Wits', key: 'intelligence' },
  { label: 'Resolve', key: 'wisdom' },
]

const CONSUMABLE_LABELS: Record<ConsumableType, string> = {
  health_potion: 'health potion',
  gold_key: 'gold key',
  lockpick: 'lockpick',
}

function gearList(stats: PlayerRunEntity): string[] {
  return [
    stats.weapon_stats.weaponName,
    stats.armor_stats.head.armorName,
    stats.armor_stats.chest.armorName,
    stats.armor_stats.greaves.armorName,
  ]
}

function itemList(stats: PlayerRunEntity): string[] {
  const items: string[] = []
  for (const type of Object.keys(CONSUMABLE_LABELS) as ConsumableType[]) {
    const count = stats.consumables[type]
    if (count > 0) items.push(`${CONSUMABLE_LABELS[type]} ×${count}`)
  }
  return items
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

  const stats = player.stats
  const health = stats.health
  const healthPct =
    health.MaxHealth > 0
      ? Math.round((health.CurrentHealth / health.MaxHealth) * 100)
      : 0

  const gear = gearList(stats)
  const items = itemList(stats)

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
            {DOSSIER_FIELDS.map((field) => (
              <div className="filecard__stat" key={field.key}>
                <dt className="filecard__k">{field.label}</dt>
                <dd className="filecard__v">{stats.base_stats[field.key]}</dd>
              </div>
            ))}
          </dl>

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

          <div className="filecard__columns">
            <div className="filecard__col">
              <span className="filecard__col-k">Gear</span>
              <ul className="filecard__list">
                {gear.map((item) => (
                  <li className="filecard__item" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="filecard__col">
              <span className="filecard__col-k">Items</span>
              <ul className="filecard__list">
                {items.length > 0 ? (
                  items.map((item) => (
                    <li className="filecard__item" key={item}>
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="filecard__item">none carried</li>
                )}
              </ul>
            </div>
          </div>

          <p className="filecard__note">
            Lv {stats.level} · {stats.race} · {stats.gold} gold · {stats.skill_points} point
            {stats.skill_points === 1 ? '' : 's'} unspent
          </p>

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
