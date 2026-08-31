import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { setStage } from '../stages'
import type { ConsumableType, MapPublicJSON, PlayerPublic, PlayerRunEntity, RoomData, RoomMessage, Stats } from '../rooms'
import { changePlayerStatsBy, sendAction } from '../rooms'
import { clearRoomSession, decodeRoomToken, getRoomToken } from '../roomSession'
import { isFatalRoomSocketError, useRoomSocket } from '../useRoomSocket'
import { DisconnectCountdown } from '../components/DisconnectCountdown'

export const Route = createFileRoute('/run')({
  component: Run,
})

interface RecordLine {
  id: string
  speaker: 'player' | 'officer' | 'ruling' | 'data'
  text: string
  name?: string
  isSelf?: boolean
  indent?: boolean
}

const OPENING_LINE: RecordLine = {
  id: 'opening',
  speaker: 'officer',
  text: 'Descent begins. The record is continuous. It will not pause.',
}

function linesFromMessages(
  messages: RoomMessage[],
  playerNames: Map<string, string>,
  selfPublicId: string | null,
): RecordLine[] {
  return messages.map((msg, i) => {
    if (msg.from.startsWith('player:')) {
      const id = msg.from.slice('player:'.length).trim()
      const name = playerNames.get(id) ?? id
      return {
        id: `${i}-player`,
        speaker: 'player' as const,
        text: msg.message,
        name,
        isSelf: selfPublicId !== null && id === selfPublicId,
      }
    }
    if (msg.from === 'dungeon_master') {
      return { id: `${i}-dm`, speaker: 'officer' as const, text: msg.message }
    }
    return { id: `${i}-data`, speaker: 'data' as const, text: msg.message }
  })
}

const WHITESPACE = /\s/

function findPendingMention(text: string, caret: number): { start: number; query: string } | null {
  if (caret <= 0) return null
  let i = caret
  while (i > 0) {
    const ch = text[i - 1]
    if (WHITESPACE.test(ch)) return null
    if (ch === '@') {
      const before = text[i - 2]
      const atBoundary = before === undefined || WHITESPACE.test(before)
      return atBoundary ? { start: i - 1, query: text.slice(i, caret) } : null
    }
    i--
  }
  return null
}

function MentionText({ text, names }: { text: string; names: Map<string, string> }) {
  return (
    <>
      {text.split(/(<@[A-Za-z0-9_-]+>)/).map((part, i) => {
        const m = /^<@([A-Za-z0-9_-]+)>$/.exec(part)
        if (m) {
          const name = names.get(m[1])
          return name ? (
            <span key={i} className="record__mention">
              @{name}
            </span>
          ) : (
            <span key={i} className="record__mention record__mention--ghost">
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
  const { room, connected, error: socketError, confirmation } = useRoomSocket(roomToken)

  const selfPlayerId = roomToken ? (decodeRoomToken(roomToken)?.playerId ?? null) : null
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [composerBusy, setComposerBusy] = useState(false)
  const [playError, setPlayError] = useState<string | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const caretRef = useRef(0)
  const [mentionIndex, setMentionIndex] = useState(0)

  const handleChangeStat = useCallback(async (stat: keyof Stats, amount: number) => {
    if (!roomToken) return
    setBusy(true)
    try {
      await changePlayerStatsBy(roomToken, stat, amount)
    } catch {
      // backend rejects via encounter guard; silent
    } finally {
      setBusy(false)
    }
  }, [roomToken])

  const autoGrowComposer = useCallback(() => {
    const el = composerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  const resetComposer = useCallback(() => {
    const el = composerRef.current
    if (el) el.style.height = ''
  }, [])

  const handlePlay = useCallback(async () => {
    const raw = draft.trim()
    if (!raw || !roomToken) return
    const idByName = new Map<string, string>((room?.players ?? []).map((p) => [p.name, p.playerPublicId]))
    let text = raw
    for (const [name, id] of idByName) {
      const re = new RegExp(`@${escapeRegExp(name)}(?=\\s|$)`, 'g')
      text = text.replace(re, `<@${id}>`)
    }
    setComposerBusy(true)
    setPlayError(null)
    try {
      console.log('sending player_play:', JSON.stringify(text))
      await sendAction(roomToken, 'player_play', text)
      setDraft('')
      resetComposer()
    } catch (err) {
      setPlayError(errorMessage(err))
    } finally {
      setComposerBusy(false)
    }
  }, [draft, room, roomToken, resetComposer])

  const handleConfirm = useCallback(
    async (accept: boolean) => {
      if (!roomToken) return
      setPlayError(null)
      try {
        await sendAction(roomToken, 'player_confirm', { accept })
      } catch (err) {
        setPlayError(errorMessage(err))
      }
    },
    [roomToken],
  )

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

  const messageCount = room?.message?.length ?? 0
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messageCount])

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

  const dmActive = composerBusy || room?.dungeonMasterState === 'active'

  const officer = socketError
    ? socketError
    : room?.status === 'in-run'
      ? connected
        ? dmActive
          ? 'The officer deliberates. The record is continuous.'
          : 'The descent is live. The record is continuous.'
        : 'The line is down — retrying the connection…'
      : "The register opens. Await the officer\u2019s word."

  const selfPlayer = room?.players.find((p) => p.playerId === selfPlayerId) ?? null
  const selfPublicId = selfPlayer?.playerPublicId ?? null
  const playerNameById = new Map<string, string>(
    (room?.players ?? []).map((p) => [p.playerPublicId, p.name]),
  )
  const lines = [OPENING_LINE, ...linesFromMessages(room?.message ?? [], playerNameById, selfPublicId)]

  const pendingMention = findPendingMention(draft, caretRef.current)
  const mentionQuery = (pendingMention?.query ?? '').toLowerCase()
  const mentionMembers =
    pendingMention === null
      ? []
      : (room?.players ?? []).filter(
          (p) => p.playerPublicId !== selfPublicId && p.name.toLowerCase().includes(mentionQuery),
        )

  const acceptMention = (playerPublicId: string) => {
    const el = composerRef.current
    const m = findPendingMention(draft, caretRef.current)
    if (!m || !el) return
    const name = playerNameById.get(playerPublicId) ?? playerPublicId
    const token = `@${name} `
    const next = draft.slice(0, m.start) + token + draft.slice(caretRef.current)
    setDraft(next)
    const newCaret = m.start + token.length
    caretRef.current = newCaret
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newCaret, newCaret)
      autoGrowComposer()
    })
  }

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
          <div className="record-scroll" ref={scrollRef}>
            <div className="record">
              {lines.map((line) => (
                <span
                  key={line.id}
                  className={`record__row record__row--${line.speaker}${
                    line.indent ? ' record__indent' : ''
                  }${line.isSelf ? ' record__row--self' : ''}`}
                >
                  <span className="record__rune" aria-hidden="true">
                    {line.speaker === 'player'
                      ? line.isSelf
                        ? '‹'
                        : '›'
                      : line.speaker === 'officer'
                        ? '✦'
                        : line.speaker === 'ruling'
                          ? '§'
                          : '·'}
                  </span>
                  <span className="record__text">
                    {line.speaker === 'player' && line.name && !line.isSelf && (
                      <span className="record__who">{line.name} › </span>
                    )}
                    <MentionText text={line.text} names={playerNameById} />
                  </span>
                </span>
              ))}
              {dmActive && (
                <span className="record__row record__row--pending">the officer deliberates…</span>
              )}
              <span className="caret" aria-hidden="true" />
            </div>
          </div>
          {playError && (
            <p className="composer__error" role="alert">
              {playError}
            </p>
          )}
          <div className="composer">
            <div className="composer__field">
              {mentionMembers.length > 0 && (
                <ul className="composer__pick" role="listbox" aria-label="Mention a member">
                  {mentionMembers.map((p, i) => (
                    <li
                      key={p.playerPublicId}
                      role="option"
                      aria-selected={i === mentionIndex}
                      className={`composer__pick-item${
                        i === mentionIndex ? ' composer__pick-item--active' : ''
                      }`}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        acceptMention(p.playerPublicId)
                      }}
                      onMouseEnter={() => setMentionIndex(i)}
                    >
                      @{p.name}
                    </li>
                  ))}
                </ul>
              )}
              <textarea
                ref={composerRef}
                className="composer__input"
                rows={1}
                value={draft}
                onChange={(event) => {
                  caretRef.current = event.target.selectionStart
                  setMentionIndex(0)
                  setDraft(event.target.value)
                  autoGrowComposer()
                }}
                onKeyDown={(event) => {
                  if (mentionMembers.length > 0) {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      setMentionIndex((i) => (i + 1) % mentionMembers.length)
                      return
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      setMentionIndex((i) => (i - 1 + mentionMembers.length) % mentionMembers.length)
                      return
                    }
                    if (event.key === 'Enter' && mentionMembers[mentionIndex]) {
                      event.preventDefault()
                      acceptMention(mentionMembers[mentionIndex].playerPublicId)
                      return
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      const m = findPendingMention(draft, caretRef.current)
                      if (m) {
                        const next = draft.slice(0, m.start)
                        setDraft(next)
                        caretRef.current = m.start
                        const el = composerRef.current
                        if (el) {
                          el.focus()
                          el.setSelectionRange(m.start, m.start)
                          autoGrowComposer()
                        }
                      }
                      return
                    }
                  }
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void handlePlay()
                  }
                }}
                placeholder="Say what you do…"
                disabled={dmActive}
                aria-label="Your next action"
              />
            </div>
            <button
              type="button"
              className="btn btn--primary composer__send"
              onClick={() => void handlePlay()}
              disabled={dmActive || !draft.trim()}
            >
              {dmActive ? 'judging…' : 'speak'}
            </button>
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
          hostPublicId={room?.hostPublicId ?? null}
          currentRoomType={room?.currentRoom.type ?? 'grace'}
          busy={busy}
          onChangeStat={handleChangeStat}
          onClose={() => setOpenPlayerId(null)}
          onSwitch={setOpenPlayerId}
        />
      )}

      {mapOpen && room?.map && (
        <MapModal room={room} onClose={() => setMapOpen(false)} />
      )}

      {confirmation && (
        <ConfirmationModal
          type={confirmation.type}
          votes={confirmation.votes}
          deadlineAt={confirmation.deadlineAt}
          durationMs={confirmation.durationMs}
          totalVoters={
            (room?.players ?? []).filter((p) => p.status !== 'disconnected' && p.status !== 'left')
              .length
          }
          playerNameById={playerNameById}
          selfPublicId={selfPublicId}
          onVote={handleConfirm}
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
                    {player.playerPublicId === room.hostPublicId && <span className="board__tag board__tag--host">lead</span>}
                    {isSelf && <span className="board__tag board__tag--you">you</span>}
                  </div>
                </div>
                <div className="board__detail">
                  {player.status === 'disconnected' && player.disconnectedAt != null ? (
                    <DisconnectCountdown disconnectedAt={player.disconnectedAt} />
                  ) : (
                    <>
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
                    </>
                  )}
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

  const exits = map?.rooms[roomIndex]?.exits
  const neighbors = exits
    ? (['left', 'right', 'up', 'down'] as const)
        .filter((d) => exits[d] !== null)
        .map((d) => {
          const exit = exits[d]!
          const neighborRoom = map?.rooms[exit.targetRoomId]
          return { dir: d, isVisited: neighborRoom?.isVisited ?? false, type: neighborRoom?.type ?? 'unknown' }
        })
        .filter((n) => n.isVisited)
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
      const exit = room.exits[dir]
      const neighborIdx = exit?.targetRoomId ?? null
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
    .filter((r) => r.isVisited)
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
  const seenConnector = new Set<string>()
  for (let i = 0; i < map.rooms.length; i++) {
    if (!visibleIds.has(i)) continue
    const roomNode = nodeByIndex.get(i)
    if (!roomNode) continue
    const room = map.rooms[i]!
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      const exit = room.exits[dir]
      if (!exit) continue
      const targetIdx = exit.targetRoomId
      if (!visibleIds.has(targetIdx)) continue
      const targetNode = nodeByIndex.get(targetIdx)
      if (!targetNode) continue
      const key = i < targetIdx ? `${i}-${targetIdx}` : `${targetIdx}-${i}`
      if (seenConnector.has(key)) continue
      seenConnector.add(key)

      const cx1 = toCenterX(roomNode.gx)
      const cy1 = toCenterY(roomNode.gy)
      const cx2 = toCenterX(targetNode.gx)
      const cy2 = toCenterY(targetNode.gy)
      connectors.push({ key, x1: cx1, y1: cy1, x2: cx2, y2: cy2 })
    }
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

interface ConfirmationModalProps {
  type: 'unanimous' | 'majority'
  votes: Record<string, boolean>
  deadlineAt: number
  durationMs: number
  totalVoters: number
  playerNameById: Map<string, string>
  selfPublicId: string | null
  onVote: (accept: boolean) => void
}

function ConfirmationModal({
  type,
  votes,
  deadlineAt,
  durationMs,
  totalVoters,
  playerNameById,
  selfPublicId,
  onVote,
}: ConfirmationModalProps) {
  const voteRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    confirmRef.current?.focus()

    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 250)
    return () => {
      window.clearInterval(id)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const myVote = selfPublicId !== null ? votes[selfPublicId] : undefined
  const hasSpoken = myVote !== undefined
  const remainingMs = Math.max(0, deadlineAt - now)
  const remainingSec = Math.ceil(remainingMs / 1000)
  const pct = totalVoters > 0 && durationMs > 0 ? Math.min(100, (remainingMs / durationMs) * 100) : 0

  const forwards = Object.entries(votes)
    .filter(([, v]) => v)
    .map(([id]) => playerNameById.get(id) ?? id)
  const holds = Object.entries(votes)
    .filter(([, v]) => !v)
    .map(([id]) => playerNameById.get(id) ?? id)
  const unspoken = Math.max(0, totalVoters - (forwards.length + holds.length))

  return (
    <div className="mapmodal__scrim">
      <div
        className="mapmodal confirmmodal"
        role="dialog"
        aria-modal="true"
        aria-label="Party vote"
        ref={voteRef}
      >
        <header className="confirmmodal__head">
          <span className="confirmmodal__eyebrow">the descent</span>
          <h2 className="confirmmodal__title">
            {type === 'unanimous' ? 'moves as one' : 'the party decides'}
          </h2>
          <p className="confirmmodal__rule">
            {type === 'unanimous'
              ? 'silence is consent — only a spoken hold can refuse the turn.'
              : 'the party moves, and a majority settles the course.'}
          </p>
          <div className="confirmmodal__clock" aria-label={`${remainingSec} seconds remain`}>
            <span className="confirmmodal__clock-num">{remainingSec}</span>
            <span className="confirmmodal__clock-unit">s remain</span>
          </div>
          <div
            className="confirmmodal__rod"
            role="presentation"
            style={pct > 0 ? { width: `${pct}%` } : undefined}
          />
        </header>

        <div className="confirmmodal__body">
          <div className="confirmmodal__roll">
            <section className="confirmmodal__col confirmmodal__col--yes">
              <span className="confirmmodal__col-head">forward</span>
              <span className="confirmmodal__col-count">{forwards.length}</span>
              <div className="confirmmodal__names">
                {forwards.length === 0 ? (
                  <span className="confirmmodal__empty">none yet</span>
                ) : (
                  forwards.map((name) => (
                    <span key={name} className="confirmmodal__name confirmmodal__name--yes">
                      {name}
                    </span>
                  ))
                )}
              </div>
            </section>

            <section className="confirmmodal__col confirmmodal__col--no">
              <span className="confirmmodal__col-head">hold</span>
              <span className="confirmmodal__col-count">{holds.length}</span>
              <div className="confirmmodal__names">
                {holds.length === 0 ? (
                  <span className="confirmmodal__empty">none yet</span>
                ) : (
                  holds.map((name) => (
                    <span key={name} className="confirmmodal__name confirmmodal__name--no">
                      {name}
                    </span>
                  ))
                )}
              </div>
            </section>
          </div>

          {unspoken > 0 && (
            <p className="confirmmodal__unspoken">
              {unspoken} silent — counted as forward
            </p>
          )}

          <div className="confirmmodal__actions">
            <button
              ref={confirmRef}
              type="button"
              className="btn confirmmodal__choice confirmmodal__choice--yes"
              onClick={() => onVote(true)}
              aria-pressed={myVote === true}
            >
              forward
            </button>
            <button
              type="button"
              className="btn confirmmodal__choice confirmmodal__choice--no"
              onClick={() => onVote(false)}
              aria-pressed={myVote === false}
            >
              hold
            </button>
          </div>

          {hasSpoken && (
            <p className="confirmmodal__spoken">
              you may change your voice while time holds.
            </p>
          )}
        </div>
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
  hostPublicId: string | null
  currentRoomType: string
  busy: boolean
  onChangeStat: (stat: keyof Stats, amount: number) => void
  onClose: () => void
  onSwitch: (playerId: string) => void
}

function DossierCard({ player, players, selfPlayerId, hostPublicId, currentRoomType, busy, onChangeStat, onClose, onSwitch }: DossierCardProps) {
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

  const [activeTab, setActiveTab] = useState<'stats' | 'gear' | 'items' | 'abilities'>('stats')

  const canModifyStats =
    player.playerId === selfPlayerId && stats.skill_points > 0 && currentRoomType === 'grace'

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
              <span className="filecard__level">Lv. {stats.level}</span>
              <span className="filecard__sep">·</span>
              <span className="filecard__gold">{stats.gold} gold</span>
            </div>
            <div className="filecard__tags">
              {player.playerPublicId === hostPublicId && (
                <span className="board__tag board__tag--host">lead</span>
              )}
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

          <div className="filecard__secs" role="tablist" aria-label="Expeditioner file sections">
            {(
              [
                { id: 'stats', label: 'Stats' },
                { id: 'gear', label: 'Gear' },
                { id: 'items', label: 'Items' },
                { id: 'abilities', label: 'Abilities' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`filecard__sec${activeTab === tab.id ? ' filecard__sec--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="filecard__tabpanel" role="tabpanel">
            {activeTab === 'stats' &&
              (canModifyStats ? (
                <ul className="sheet__stats sheet__stats--file">
                  {SHEET_STATS.map(({ key, label }) => {
                    const base = stats.base_stats[key]
                    const mod = stats.stat_modifiers[key]
                    return (
                      <li className="sheet__row" key={key}>
                        <span className="sheet__row-k">{label}</span>
                        <span className="sheet__row-v">
                          {base}
                          {mod !== 0 && (
                            <span className={`filecard__mod${mod > 0 ? ' filecard__mod--pos' : ''}`}>
                              {mod > 0 ? `+${mod}` : mod}
                            </span>
                          )}
                        </span>
                        <span className="sheet__row-steppers">
                          <button
                            type="button"
                            className="btn btn--ghost sheet__step"
                            disabled={busy || base <= STAT_FLOOR}
                            onClick={() => onChangeStat(key, -1)}
                            aria-label={`lower ${label}`}
                          >
                            --
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost sheet__step"
                            disabled={busy || base >= STAT_CAP || stats.skill_points <= 0}
                            onClick={() => onChangeStat(key, +1)}
                            aria-label={`raise ${label}`}
                          >
                            +
                          </button>
                        </span>
                      </li>
                    )
                  })}
                  <li className="sheet__row sheet__row--meta">
                    <span className="sheet__row-k">Skill points</span>
                    <span className="sheet__row-v">{stats.skill_points}</span>
                  </li>
                </ul>
              ) : (
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
              ))}

            {activeTab === 'gear' && (
              <ul className="filecard__gear">
                {[
                  { label: 'Weapon', name: stats.weapon_stats.weaponName, stats: stats.weapon_stats.stats },
                  { label: 'Head', name: stats.armor_stats.head.armorName, stats: stats.armor_stats.head.stats },
                  { label: 'Chest', name: stats.armor_stats.chest.armorName, stats: stats.armor_stats.chest.stats },
                  { label: 'Greaves', name: stats.armor_stats.greaves.armorName, stats: stats.armor_stats.greaves.stats },
                ].map(({ label, name, stats: pieceStats }) => {
                  const entries = Object.entries(pieceStats).filter(([, v]) => v !== 0)
                  return (
                    <li className="filecard__gear-row" key={label}>
                      <span className="filecard__gear-slot">{label}</span>
                      <span className="filecard__gear-body">
                        <span className="filecard__gear-name">{name}</span>
                        {entries.length > 0 && (
                          <span className="filecard__gear-stats">
                            {entries.map(([k, v]) => (
                              <span className="filecard__ws" key={k}>
                                <span className="filecard__ws-k">{k}</span>
                                <span className={`filecard__ws-v${v > 0 ? ' filecard__ws-v--pos' : ''}`}>
                                  {v > 0 ? `+${v}` : v}
                                </span>
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            {activeTab === 'items' && (
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
            )}

            {activeTab === 'abilities' &&
              (stats.abilities.length > 0 ? (
                <ul className="filecard__chips">
                  {stats.abilities.map((ability) => (
                    <li className="filecard__chip" key={ability}>
                      {ability}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="filecard__empty">none mastered</span>
              ))}
          </div>

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
