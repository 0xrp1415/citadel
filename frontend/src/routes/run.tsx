import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { setStage } from '../stages'
import type { ConsumableType, MapPublicJSON, PlayerPublic, PlayerRunEntity, RoomData, Stats } from '../rooms'
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
  { id: 'r10', speaker: 'data', text: "the warden's blade finds your flank", indent: true },
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
  const [mapOpen, setMapOpen] = useState(false)
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (event.key === 'm' || event.key === 'M') {
        if (openPlayerId) return
        event.preventDefault()
        setMapOpen((prev) => !prev)
        return
      }

      if (event.key === 'p' || event.key === 'P') {
        if (mapOpen) return
        event.preventDefault()
        if (openPlayerId) {
          setOpenPlayerId(null)
        } else if (room && room.players.length > 0) {
          const self = room.players.find((p) => p.playerId === selfPlayerId)
          setOpenPlayerId(self?.playerId ?? room.players[0].playerId)
        }
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [room, selfPlayerId, openPlayerId, mapOpen])

  const officer = socketError
    ? socketError
    : room?.status === 'in-run'
      ? connected
        ? 'The descent is live. The record is continuous.'
        : 'The line is down — retrying the connection…'
      : "The register opens. Await the officer\u2019s word."

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

      <aside className="descent__rail descent__rail--map" aria-label="Current room">
        {room && <CurrentRoomCard room={room} onOpenMap={() => setMapOpen(true)} />}
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

      {mapOpen && room?.map && (
        <MapModal room={room} onClose={() => setMapOpen(false)} />
      )}
    </div>
  )
}

const RACE_LABELS: Record<string, string> = {
  human: 'Human',
  elf: 'Elf',
  dwarf: 'Dwarf',
  orc: 'Orc',
  goblin: 'Goblin',
  troll: 'Troll',
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
          const s = player.stats
          const hpPct = s.health.MaxHealth > 0
            ? Math.round((s.health.CurrentHealth / s.health.MaxHealth) * 100)
            : 0
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
              <div className="board__cell">
                <div className="board__top">
                  <button
                    type="button"
                    className="board__select"
                    title={player.name}
                    aria-haspopup="dialog"
                    aria-expanded={isFocused}
                    aria-label={`View ${player.name}'s file`}
                    onClick={() => onSelect(player.playerId)}
                  >
                    <span className="board__name">{player.name}</span>
                  </button>
                  <div className="board__tags">
                    {player.isHost && <span className="board__tag board__tag--host">lead</span>}
                    {isSelf && <span className="board__tag board__tag--you">you</span>}
                  </div>
                </div>
                <div className="board__detail">
                  <span className="board__race">{RACE_LABELS[s.race] ?? s.race}</span>
                  <span className="board__sep">·</span>
                  <span className="board__level">Lv.{s.level}</span>
                  <span className="board__sep">·</span>
                  <span className="board__hp">
                    <span className="board__hp-track">
                      <span
                        className={`board__hp-fill${hpPct <= 25 ? ' board__hp-fill--low' : ''}`}
                        style={{ width: `${hpPct}%` }}
                      />
                    </span>
                    <span className="board__hp-num">
                      {s.health.CurrentHealth}/{s.health.MaxHealth}
                    </span>
                  </span>
                </div>
              </div>
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

const ROOM_LABELS: Record<string, string> = {
  grace: 'Grace',
  normal: 'Normal',
  boss: 'Boss',
  puzzle: 'Puzzle',
  miniboss: 'Miniboss',
  treasure: 'Treasure',
  secret: 'Secret',
}

function CurrentRoomCard({ room, onOpenMap }: { room: RoomData; onOpenMap: () => void }) {
  const map = room.map
  const currentRoom = room.currentRoom
  const roomIndex = currentRoom.index

  const adj = map?.rooms[roomIndex]?.adjacentRooms
  const neighbors = adj
    ? (['left', 'right', 'up', 'down'] as const)
        .filter((d) => adj[d] !== null)
        .map((d) => {
          const neighborIdx = adj[d]!
          const neighborRoom = map?.rooms[neighborIdx]
          return { dir: d, type: neighborRoom?.type ?? 'unknown' }
        })
    : []

  return (
    <section className="board currentroom" aria-label="Current room">
      <div className="board__head">
        <span className="board__title">Current room</span>
        <span className="board__sub board__sub--muted">floor {room.floor}</span>
      </div>
      <div className="currentroom__body">
        <span className={`currentroom__type currentroom__type--${currentRoom.type}`}>
          {ROOM_LABELS[currentRoom.type] ?? currentRoom.type}
        </span>
        {neighbors.length > 0 && (
          <ul className="currentroom__neighbors">
            {neighbors.map((n) => (
              <li className="currentroom__neighbor" key={n.dir}>
                <span className="currentroom__dir">{n.dir}</span>
                <span className={`currentroom__dot currentroom__dot--${n.type}`} />
                <span className="currentroom__ntype">{ROOM_LABELS[n.type] ?? n.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        className="currentroom__mapbtn"
        onClick={onOpenMap}
        aria-label="Open descent map"
        title="Open map (M)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <span>map</span>
      </button>
    </section>
  )
}

interface MapRoom {
  index: number
  type: string
  gx: number
  gy: number
  isCurrentRoom: boolean
}

function computePositions(map: MapPublicJSON): Map<number, { x: number; y: number }> {
  const offsets: Record<string, { dx: number; dy: number }> = {
    up:    { dx: 0, dy: -1 },
    down:  { dx: 0, dy: 1 },
    left:  { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  }
  const dirs = ['up', 'down', 'left', 'right'] as const

  const positions = new Map<number, { x: number; y: number }>()
  positions.set(map.startRoomIndex, { x: 0, y: 0 })

  const visited = new Set<number>([map.startRoomIndex])
  const queue = [map.startRoomIndex]

  while (queue.length > 0) {
    const idx = queue.shift()!
    const pos = positions.get(idx)!
    const room = map.rooms[idx]!

    for (const dir of dirs) {
      const neighborIdx = room.adjacentRooms[dir]
      if (neighborIdx === null || visited.has(neighborIdx)) continue
      const off = offsets[dir]!
      positions.set(neighborIdx, { x: pos.x + off.dx, y: pos.y + off.dy })
      visited.add(neighborIdx)
      queue.push(neighborIdx)
    }
  }

  let fx = 0
  for (let i = 0; i < map.rooms.length; i++) {
    if (!positions.has(i)) {
      positions.set(i, { x: fx, y: 0 })
      fx++
    }
  }

  return positions
}

const LEGEND_TYPES = ['grace', 'normal', 'boss', 'puzzle', 'miniboss', 'treasure'] as const

interface Connector {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function MapCanvas({ map }: { map: MapPublicJSON }) {
  const [hovered, setHovered] = useState<MapRoom | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, panX: 0, panY: 0 })
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)

  const positions = computePositions(map)
  const visibleRooms = map.rooms
    .map((r, i) => ({ ...r, index: i }))
    .filter((r) => r.type !== 'secret')
  const visibleIds = new Set(visibleRooms.map((r) => r.index))

  const nodes: MapRoom[] = visibleRooms.map((r) => {
    const pos = positions.get(r.index) ?? { x: 0, y: 0 }
    return { index: r.index, type: r.type, gx: pos.x, gy: pos.y, isCurrentRoom: r.isCurrentRoom }
  })

  const nodeByIndex = new Map(nodes.map((n) => [n.index, n]))

  const gxValues = nodes.map((n) => n.gx)
  const gyValues = nodes.map((n) => n.gy)
  const minGx = Math.min(...gxValues)
  const maxGx = Math.max(...gxValues)
  const minGy = Math.min(...gyValues)
  const maxGy = Math.max(...gyValues)
  const spanX = maxGx - minGx
  const spanY = maxGy - minGy

  const cellPct = 18
  const paddingPct = (100 - (spanX + 1) * cellPct) / 2
  const paddingYPct = (100 - (spanY + 1) * cellPct) / 2

  const roomPct = 12

  const toLeft = (gx: number) => paddingPct + (gx - minGx) * cellPct + (cellPct - roomPct) / 2
  const toTop = (gy: number) => paddingYPct + (gy - minGy) * cellPct + (cellPct - roomPct) / 2
  const toCenterX = (gx: number) => paddingPct + (gx - minGx) * cellPct + cellPct / 2
  const toCenterY = (gy: number) => paddingYPct + (gy - minGy) * cellPct + cellPct / 2

  const connectors: Connector[] = []
  const gridPassages = map.passages.filter(
    (p) => p.direction !== null && visibleIds.has(p.roomA) && visibleIds.has(p.roomB),
  )
  const seenConnector = new Set<string>()
  for (const p of gridPassages) {
    const a = nodeByIndex.get(p.roomA)
    const b = nodeByIndex.get(p.roomB)
    if (!a || !b) continue
    const key = a.index < b.index ? `${a.index}-${b.index}` : `${b.index}-${a.index}`
    if (seenConnector.has(key)) continue
    seenConnector.add(key)

    const cx1 = toCenterX(a.gx)
    const cy1 = toCenterY(a.gy)
    const cx2 = toCenterX(b.gx)
    const cy2 = toCenterY(b.gy)
    connectors.push({ key, x1: cx1, y1: cy1, x2: cx2, y2: cy2 })
  }

  const currentRoom = nodes.find((n) => n.isCurrentRoom)

  useEffect(() => {
    if (!currentRoom || pan !== null) return
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const canvasH = 40 * 16
    const cxPct = toCenterX(currentRoom.gx)
    const cyPct = toCenterY(currentRoom.gy)
    const targetPxX = (cxPct / 100) * rect.width
    const targetPxY = (cyPct / 100) * canvasH
    setPan({ x: rect.width / 2 - targetPxX, y: rect.height / 2 - targetPxY })
  }, [currentRoom?.index])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = viewportRef.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, panX: pan?.x ?? 0, panY: pan?.y ?? 0 }
    el.style.cursor = 'grabbing'
  }, [pan])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current.dragging = false
    const el = viewportRef.current
    if (el) {
      el.releasePointerCapture(e.pointerId)
      el.style.cursor = 'grab'
    }
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(3, Math.max(0.3, zoom * delta))

    const currentPanX = pan?.x ?? 0
    const currentPanY = pan?.y ?? 0

    const worldX = (mouseX - currentPanX) / zoom
    const worldY = (mouseY - currentPanY) / zoom

    const newPanX = mouseX - worldX * newZoom
    const newPanY = mouseY - worldY * newZoom

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [zoom, pan])

  return (
    <div className="mapmodal__inner">
      <div
        className="map__viewport"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="map__canvas map__canvas--large"
          style={{
            transform: pan
              ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
              : undefined,
            transformOrigin: '0 0',
          }}
        >
          {connectors.map((c) => {
            const isHoriz = c.y1 === c.y2
            const left = Math.min(c.x1, c.x2)
            const top = Math.min(c.y1, c.y2)
            const w = isHoriz ? Math.abs(c.x2 - c.x1) : 2.5
            const h = isHoriz ? 2.5 : Math.abs(c.y2 - c.y1)
            return (
              <div
                key={c.key}
                className="map__connector"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                }}
              />
            )
          })}
          {nodes.map((node) => (
            <button
              type="button"
              key={node.index}
              className={`map__room map__room--${node.type}${
                node.isCurrentRoom ? ' map__room--current' : ''
              }${hovered?.index === node.index ? ' map__room--active' : ''}`}
              style={{
                left: `${toLeft(node.gx)}%`,
                top: `${toTop(node.gy)}%`,
                width: `${roomPct}%`,
                aspectRatio: '1',
              }}
              onMouseEnter={() => setHovered(node)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(node)}
              onBlur={() => setHovered(null)}
              aria-label={ROOM_LABELS[node.type] ?? node.type}
            >
              <span className="map__room-label">{ROOM_LABELS[node.type] ?? node.type}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="map__legend" aria-hidden="true">
        {LEGEND_TYPES.map((t) => (
          <span className="map__legend-item" key={t}>
            <span className={`map__legend-dot map__room--${t}`} />
            <span className="map__legend-label">{ROOM_LABELS[t]}</span>
          </span>
        ))}
      </div>
      <div className="map__cover" role="status" aria-live="polite">
        {hovered ? (
          <span className="map__cover-name">{ROOM_LABELS[hovered.type] ?? hovered.type}</span>
        ) : (
          <span className="map__cover-name map__cover-name--idle">hover a room</span>
        )}
      </div>
    </div>
  )
}

function MapModal({ room, onClose }: { room: RoomData; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'm' || event.key === 'M') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="mapmodal__scrim" onClick={onClose}>
      <div
        className="mapmodal"
        role="dialog"
        aria-modal="true"
        aria-label="Descent map"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mapmodal__head">
          <span className="mapmodal__title">Descent map</span>
          <span className="mapmodal__sub">floor {room.floor}</span>
          <button
            ref={closeRef}
            type="button"
            className="mapmodal__close"
            onClick={onClose}
            aria-label="Close map"
          >
            close ✕
          </button>
        </div>
        {room.map && <MapCanvas map={room.map} />}
      </div>
    </div>
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
  const onSwitchRef = useRef(onSwitch)
  onSwitchRef.current = onSwitch
  const nextRef = useRef(next)
  nextRef.current = next
  const previousRef = useRef(previous)
  previousRef.current = previous

  const stats = player.stats
  const health = stats.health
  const healthPct =
    health.MaxHealth > 0
      ? Math.round((health.CurrentHealth / health.MaxHealth) * 100)
      : 0

  const items = itemList(stats)
  const xpPct = stats.level > 0 ? Math.round((stats.experience / (stats.level * 100)) * 100) : 0

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
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onSwitchRef.current(previousRef.current.playerId)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        onSwitchRef.current(nextRef.current.playerId)
        return
      }
      if (event.key === 'p' || event.key === 'P') {
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
            <div className="filecard__identity">
              <span className="filecard__race">{stats.race}</span>
              <span className="filecard__sep">·</span>
              <span className="filecard__level">Lv. {stats.level}</span>
              <span className="filecard__sep">·</span>
              <span className="filecard__gold">{stats.gold} gold</span>
            </div>
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

          <div className="filecard__bars">
            <div className="filecard__bar">
              <span className="filecard__bar-label">Health</span>
              <span className="filecard__bar-track">
                <span
                  className={`filecard__bar-fill${healthPct <= 25 ? ' filecard__bar-fill--low' : ''}`}
                  style={{ width: `${healthPct}%` }}
                />
              </span>
              <span className="filecard__bar-num">
                {health.CurrentHealth}/{health.MaxHealth}
              </span>
            </div>
            <div className="filecard__bar">
              <span className="filecard__bar-label">XP</span>
              <span className="filecard__bar-track">
                <span
                  className="filecard__bar-fill filecard__bar-fill--xp"
                  style={{ width: `${xpPct}%` }}
                />
              </span>
              <span className="filecard__bar-num">
                {stats.experience}/{stats.level * 100}
              </span>
            </div>
          </div>

          <dl className="filecard__stats">
            {DOSSIER_FIELDS.map((field) => {
              const base = stats.base_stats[field.key]
              const mod = stats.stat_modifiers[field.key]
              const total = base + mod
              return (
                <div className="filecard__stat" key={field.key}>
                  <dt className="filecard__k">{field.label}</dt>
                  <dd className="filecard__v">
                    {total}
                    {mod !== 0 && (
                      <span className={`filecard__mod${mod > 0 ? ' filecard__mod--pos' : ''}`}>
                        {mod > 0 ? `+${mod}` : mod}
                      </span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>

          <div className="filecard__weapon">
            <span className="filecard__weapon-k">Weapon</span>
            <span className="filecard__weapon-name">{stats.weapon_stats.weaponName}</span>
            <div className="filecard__weapon-stats">
              {Object.entries(stats.weapon_stats.stats)
                .filter(([, v]) => v !== 0)
                .map(([k, v]) => (
                  <span className="filecard__ws" key={k}>
                    <span className="filecard__ws-k">{k}</span>
                    <span className={`filecard__ws-v${v > 0 ? ' filecard__ws-v--pos' : ''}`}>
                      {v > 0 ? `+${v}` : v}
                    </span>
                  </span>
                ))}
            </div>
          </div>

          <div className="filecard__columns">
            <div className="filecard__col">
              <span className="filecard__col-k">Armor</span>
              <ul className="filecard__list">
                {[
                  { slot: 'head', piece: stats.armor_stats.head },
                  { slot: 'chest', piece: stats.armor_stats.chest },
                  { slot: 'greaves', piece: stats.armor_stats.greaves },
                ].map(({ slot, piece }) => (
                  <li className="filecard__item" key={slot}>
                    <span className="filecard__item-slot">{slot}</span>
                    {piece.armorName}
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

          {stats.skill_points > 0 && (
            <p className="filecard__note filecard__note--warn">
              {stats.skill_points} skill point{stats.skill_points === 1 ? '' : 's'} unspent
            </p>
          )}

          <footer className="filecard__foot">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onSwitch(previous.playerId)}
            >
              <span className="filecard__nav-arrow">{'\u2039'}</span>
              <span className="filecard__nav-name">{previous.name}</span>
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onSwitch(next.playerId)}>
              <span className="filecard__nav-name">{next.name}</span>
              <span className="filecard__nav-arrow">{'\u203A'}</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}
