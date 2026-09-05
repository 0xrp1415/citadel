import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { setStage } from '../stages'
import type { Ability, CombatAction, CombatTarget, GearSlot, MapPublicJSON, PlayerPublic, Rarity, RoomData, RoomMessage, RunItem, Stats, VoteJSON } from '../rooms'
import { changePlayerStatsBy, equipItem, sendAction, setActiveAbility as requestSetActiveAbility, unequipItem, useInventoryItem as requestUseItem, selectCombatAction, selectCombatTarget, sendVoteOption } from '../rooms'
import { clearRoomSession, decodeRoomToken, getRoomToken } from '../roomSession'
import { isFatalRoomSocketError, useRoomSocket } from '../useRoomSocket'

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
  abilities?: Ability[]
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
  players: PlayerPublic[],
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
        abilities: players.find((p) => p.playerPublicId === id)?.stats.abilities,
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

function findPendingAbility(text: string, caret: number): { start: number; query: string } | null {
  if (caret <= 0) return null
  let i = caret
  while (i > 0) {
    const ch = text[i - 1]
    if (WHITESPACE.test(ch)) return null
    if (ch === '#') {
      const before = text[i - 2]
      const atBoundary = before === undefined || WHITESPACE.test(before)
      return atBoundary ? { start: i - 1, query: text.slice(i, caret) } : null
    }
    i--
  }
  return null
}

const RECORD_TOKENS = /(<@[A-Za-z0-9_-]+>|<#[A-Za-z0-9_]+>)/

function AbilityTooltip({ ability, rect }: { ability: Ability; rect: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { innerWidth, innerHeight } = window
    const gutter = 12
    const W = el.offsetWidth
    const H = el.offsetHeight
    let left = rect.right + gutter
    if (left + W > innerWidth - gutter) left = rect.left - gutter - W
    left = Math.max(gutter, left)
    let top = rect.top
    if (top + H > innerHeight - gutter) top = innerHeight - gutter - H
    top = Math.max(gutter, top)
    setPos({ left, top })
  }, [rect])

  const reqEntries = Object.entries(ability.minimumStats ?? {}).filter(([, v]) => v !== 0)

  return createPortal(
    <div
      ref={ref}
      className="filecard__tooltip filecard__tooltip--fixed"
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
    >
      <span className="filecard__tooltip-head">
        <span className="filecard__tooltip-name">{ability.name}</span>
        <span className="record__ability-target">
          {ability.targeting.kind}/{ability.targeting.scope}
        </span>
      </span>
      {ability.flavor_text && <span className="filecard__tooltip-desc">{ability.flavor_text}</span>}
      {ability.description && (
        <span className="filecard__tooltip-block">
          <span className="filecard__tooltip-label">effect</span>
          <span className="record__ability-desc">{ability.description}</span>
        </span>
      )}
      {(ability.minimumLevel > 0 || reqEntries.length > 0) && (
        <span className="filecard__tooltip-block">
          <span className="filecard__tooltip-label">requires</span>
          <span className="record__ability-req">
            <span>lvl {ability.minimumLevel}</span>
            {reqEntries.map(([k, v]) => (
              <span className="field__req-chip" key={k}>
                <span className="field__req-k">{k}</span>
                <span className="field__req-v">{v}</span>
              </span>
            ))}
          </span>
        </span>
      )}
    </div>,
    document.body,
  )
}

function RecordAbilityChip({ ability, text }: { ability: Ability; text: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  return (
    <>
      <span
        className="record__mention record__mention--ability"
        onMouseEnter={(event) => setRect(event.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setRect(null)}
      >
        {text}
      </span>
      {rect && <AbilityTooltip ability={ability} rect={rect} />}
    </>
  )
}

function RecordText({
  text,
  names,
  abilities,
}: {
  text: string
  names: Map<string, string>
  abilities: Ability[]
}) {
  const abilityById = new Map<string, Ability>(abilities.map((a) => [a.id, a]))
  return (
    <>
      {text.split(RECORD_TOKENS).map((part, i) => {
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
        const a = /^<#([A-Za-z0-9_]+)>$/.exec(part)
        if (a) {
          const ability = abilityById.get(a[1])
          return ability ? (
            <RecordAbilityChip key={i} ability={ability} text={`#${ability.name}`} />
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
    case 'ended':
      return 'fallen'
    default:
      return status
  }
}

function Run() {
  const navigate = useNavigate()
  const roomToken = getRoomToken()
  const { room, error: socketError } = useRoomSocket(roomToken)

  const selfPlayerId = roomToken ? (decodeRoomToken(roomToken)?.playerId ?? null) : null
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [gearOpen, setGearOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [composerBusy, setComposerBusy] = useState(false)
  const [playError, setPlayError] = useState<string | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const caretRef = useRef(0)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [abilityIndex, setAbilityIndex] = useState(0)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          ;(e.target as HTMLElement).blur()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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

  const handleEquipItem = useCallback(async (index: number) => {
    if (!roomToken) return
    setBusy(true)
    setActionError(null)
    try {
      await equipItem(roomToken, index)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'equip failed')
    } finally {
      setBusy(false)
    }
  }, [roomToken])

  const handleUseItem = useCallback(async (id: string) => {
    if (!roomToken) return
    setBusy(true)
    setActionError(null)
    try {
      await requestUseItem(roomToken, id)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'use failed')
    } finally {
      setBusy(false)
    }
  }, [roomToken])

  const handleUnequipItem = useCallback(async (slot: GearSlot) => {
    if (!roomToken) return
    setBusy(true)
    setActionError(null)
    try {
      await unequipItem(roomToken, slot)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'unequip failed')
    } finally {
      setBusy(false)
    }
  }, [roomToken])

  const handleSetActiveAbility = useCallback(async (id: string, slot: number) => {
    if (!roomToken) return
    setBusy(true)
    setActionError(null)
    try {
      await requestSetActiveAbility(roomToken, id, slot)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'assign failed')
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
    const abilityIdByName = new Map<string, string>(
      ((room?.players ?? []).find((p) => p.playerId === selfPlayerId)?.stats.abilities ?? []).map(
        (a) => [a.name, a.id],
      ),
    )
    for (const [name, id] of abilityIdByName) {
      const re = new RegExp(`#${escapeRegExp(name)}(?=\\s|$)`, 'g')
      text = text.replace(re, `<#${id}>`)
    }
    setComposerBusy(true)
    setPlayError(null)
    try {
      await sendAction(roomToken, 'player_play', text)
      setDraft('')
      resetComposer()
    } catch (err) {
      setPlayError(errorMessage(err))
    } finally {
      setComposerBusy(false)
    }
  }, [draft, room, roomToken, resetComposer, selfPlayerId])

  const handleVote = useCallback(
    async (optionId: string) => {
      if (!roomToken) return
      setPlayError(null)
      try {
        await sendVoteOption(roomToken, optionId)
      } catch (err) {
        setPlayError(errorMessage(err))
      }
    },
    [roomToken],
  )

  useEffect(() => {
    if (!roomToken) {
      setStage(2)
      navigate({ to: '/lobby' })
      return
    }
    if (socketError && isFatalRoomSocketError(socketError)) {
      clearRoomSession()
      setStage(2)
      navigate({ to: '/lobby' })
      return
    }
    if (room && room.status === 'lobby') {
      setStage(2)
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

      if (event.key === '/') {
        if (openPlayerId || mapOpen || inventoryOpen || gearOpen) return
        event.preventDefault()
        composerRef.current?.focus()
        return
      }

      if (event.key === 'm' || event.key === 'M') {
        if (openPlayerId || inventoryOpen || gearOpen) return
        event.preventDefault()
        setMapOpen((prev) => !prev)
        return
      }

      if (event.key === 'i' || event.key === 'I') {
        if (openPlayerId || mapOpen) return
        event.preventDefault()
        setGearOpen(false)
        setInventoryOpen((prev) => !prev)
        return
      }

      if (event.key === 'g' || event.key === 'G') {
        if (openPlayerId || mapOpen) return
        event.preventDefault()
        setInventoryOpen(false)
        setGearOpen((prev) => !prev)
        return
      }

      if (event.key === 'p' || event.key === 'P') {
        if (mapOpen || inventoryOpen || gearOpen) return
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
  }, [room, selfPlayerId, openPlayerId, mapOpen, inventoryOpen, gearOpen])

  const dmActive = composerBusy || room?.dungeonMasterState === 'active'
  const encounterActive = (room?.encounter?.phase ?? '') !== ''
  const runEnded = room?.status === 'end'

  const selfPlayer = room?.players.find((p) => p.playerId === selfPlayerId) ?? null
  const selfPublicId = selfPlayer?.playerPublicId ?? null
  const awayFromGrace = room !== null && room.currentRoom.type !== 'grace'
  const playerNameById = new Map<string, string>(
    (room?.players ?? []).map((p) => [p.playerPublicId, p.name]),
  )
  const lines = [
    OPENING_LINE,
    ...linesFromMessages(room?.message ?? [], playerNameById, selfPublicId, room?.players ?? []),
  ]

  const pendingMention = findPendingMention(draft, caretRef.current)
  const mentionQuery = (pendingMention?.query ?? '').toLowerCase()
  const mentionMembers =
    pendingMention === null
      ? []
      : (room?.players ?? []).filter(
          (p) => p.playerPublicId !== selfPublicId && p.name.toLowerCase().includes(mentionQuery),
        )

  const pendingAbility = findPendingAbility(draft, caretRef.current)
  const abilityRawQuery = (pendingAbility?.query ?? '').toLowerCase()
  const abilityQuery = abilityRawQuery.startsWith('a:') ? abilityRawQuery.slice(2) : abilityRawQuery
  const pickableAbilities =
    pendingAbility === null
      ? []
      : (selfPlayer?.stats.abilities ?? []).filter((a) =>
          a.name.toLowerCase().includes(abilityQuery),
        )

  const acceptAbility = (abilityId: string) => {
    const el = composerRef.current
    const m = findPendingAbility(draft, caretRef.current)
    if (!m || !el) return
    const ability = (selfPlayer?.stats.abilities ?? []).find((a) => a.id === abilityId)
    if (!ability) return
    const token = `#${ability.name} `
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
      {/* LEFT RAIL: Company manifest */}
      <aside className="descent__left" aria-label="Company manifest">
        <PartyManifest
          room={room}
          selfPlayerId={selfPlayerId}
          onSelect={openFile}
        />
      </aside>

      {/* CENTER RAIL: exegesis + field log + desk */}
      <section className="descent__center" aria-label="Field chronicle">
        {/* Field log */}
        <section className="panel" aria-label="Field log" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="corner-accent corner-accent--tl corner-accent--gold" />
          <div className="corner-accent corner-accent--tr corner-accent--gold" />
          <div className="corner-accent corner-accent--bl corner-accent--gold" />
          <div className="corner-accent corner-accent--br corner-accent--gold" />
          <div className="panel__head">
            <span>
              <span className="panel__dot" aria-hidden="true" />
              <span className="panel__title">Field log</span>
            </span>
            <span className="panel__sub">live · every word judged</span>
          </div>
          <div className="record-scroll" ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
                      ? line.isSelf ? '‹' : '›'
                      : line.speaker === 'officer' ? '✦'
                      : line.speaker === 'ruling' ? '§' : '·'}
                  </span>
                  <span className="record__text">
                    {line.speaker === 'player' && line.name && !line.isSelf && (
                      <span className="record__who">{line.name} › </span>
                    )}
                    <RecordText text={line.text} names={playerNameById} abilities={line.abilities ?? []} />
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
            <p className="composer__error" role="alert">{playError}</p>
          )}
          <div className="composer">
            <div className="composer__field">
              <span className="composer__glyph" aria-hidden="true">🜚</span>
              {mentionMembers.length > 0 && (
                <ul className="composer__pick" role="listbox" aria-label="Mention a member">
                  {mentionMembers.map((p, i) => (
                    <li key={p.playerPublicId} role="option" aria-selected={i === mentionIndex} className={`composer__pick-item${i === mentionIndex ? ' composer__pick-item--active' : ''}`} onMouseDown={(event) => { event.preventDefault(); acceptMention(p.playerPublicId); }} onMouseEnter={() => setMentionIndex(i)}>
                      @{p.name}
                    </li>
                  ))}
                </ul>
              )}
              {pickableAbilities.length > 0 && (
                <ul className="composer__pick" role="listbox" aria-label="Reference an ability">
                  {pickableAbilities.map((a, i) => (
                    <li key={a.id} role="option" aria-selected={i === abilityIndex} className={`composer__pick-item${i === abilityIndex ? ' composer__pick-item--active' : ''}`} onMouseDown={(event) => { event.preventDefault(); acceptAbility(a.id); }} onMouseEnter={() => setAbilityIndex(i)}>
                      <span className="composer__pick-name">#{a.name}</span>
                      <span className="composer__pick-target">{a.targeting.kind}/{a.targeting.scope}</span>
                    </li>
                  ))}
                </ul>
              )}
              <textarea
                ref={composerRef}
                className="composer__input"
                rows={1}
                value={draft}
                onChange={(event) => { caretRef.current = event.target.selectionStart; setMentionIndex(0); setAbilityIndex(0); setDraft(event.target.value); autoGrowComposer(); }}
                onKeyDown={(event) => {
                  if (mentionMembers.length > 0) {
                    if (event.key === 'ArrowDown') { event.preventDefault(); setMentionIndex((i) => (i + 1) % mentionMembers.length); return; }
                    if (event.key === 'ArrowUp') { event.preventDefault(); setMentionIndex((i) => (i - 1 + mentionMembers.length) % mentionMembers.length); return; }
                    if (event.key === 'Enter' && mentionMembers[mentionIndex]) { event.preventDefault(); acceptMention(mentionMembers[mentionIndex].playerPublicId); return; }
                    if (event.key === 'Escape') { event.preventDefault(); const m = findPendingMention(draft, caretRef.current); if (m) { const next = draft.slice(0, m.start); setDraft(next); caretRef.current = m.start; const el = composerRef.current; if (el) { el.focus(); el.setSelectionRange(m.start, m.start); autoGrowComposer(); } } return; }
                  }
                  if (pickableAbilities.length > 0) {
                    if (event.key === 'ArrowDown') { event.preventDefault(); setAbilityIndex((i) => (i + 1) % pickableAbilities.length); return; }
                    if (event.key === 'ArrowUp') { event.preventDefault(); setAbilityIndex((i) => (i - 1 + pickableAbilities.length) % pickableAbilities.length); return; }
                    if (event.key === 'Enter' && pickableAbilities[abilityIndex]) { event.preventDefault(); acceptAbility(pickableAbilities[abilityIndex].id); return; }
                    if (event.key === 'Escape') { event.preventDefault(); const m = findPendingAbility(draft, caretRef.current); if (m) { const next = draft.slice(0, m.start); setDraft(next); caretRef.current = m.start; const el = composerRef.current; if (el) { el.focus(); el.setSelectionRange(m.start, m.start); autoGrowComposer(); } } return; }
                  }
                  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handlePlay(); }
                  if (event.key === 'Escape') { event.preventDefault(); composerRef.current?.blur(); }
                }}
                placeholder={encounterActive ? 'The battle commands govern — use the fray.' : runEnded ? 'The descent has ended.' : 'Say what you do…'}
                disabled={dmActive || encounterActive || runEnded}
                aria-label="Your next action"
              />
            </div>
            <button
              type="button"
              className="btn btn--primary composer__send"
              onClick={() => void handlePlay()}
              disabled={dmActive || encounterActive || runEnded || !draft.trim()}
            >
              {encounterActive ? 'in battle' : dmActive ? 'judging…' : runEnded ? 'ended' : 'speak'}
            </button>
          </div>
        </section>
      </section>

      {/* RIGHT RAIL: Hostiles */}
      <aside className="descent__right" aria-label="Tactical overview">
        <RightRail
          room={room}
        />
      </aside>

      {(room?.encounter?.phase === 'combat') && (
        <CombatModal
          room={room}
          roomToken={roomToken}
          selfPublicId={selfPublicId}
          playerNameById={playerNameById}
        />
      )}

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

      {inventoryOpen && selfPlayer && (
        <InventoryModal
          player={selfPlayer}
          isSelf={true}
          onClose={() => setInventoryOpen(false)}
          onEquip={handleEquipItem}
          onUse={handleUseItem}
          busy={busy}
          actionError={actionError}
        />
      )}

      {gearOpen && selfPlayer && (
        <GearModal
          player={selfPlayer}
          isSelf={true}
          busy={busy}
          onClose={() => setGearOpen(false)}
          onUnequip={handleUnequipItem}
          actionError={actionError}
          onSetActive={handleSetActiveAbility}
          onOpenInventory={() => {
            setGearOpen(false)
            setInventoryOpen(true)
          }}
        />
      )}

      {room?.currentVote && (
        <VoteModal
          vote={room.currentVote}
          totalVoters={
            (room?.players ?? []).filter((p) => p.status !== 'disconnected' && p.status !== 'left')
              .length
          }
          playerNameById={playerNameById}
          selfPublicId={selfPublicId}
          onVote={handleVote}
        />
      )}
      {selfPlayer && selfPlayer.stats.skill_points > 0 && !runEnded && (
        <div className="runtoast" role="status" aria-live="polite">
          <div className="runtoast__head">
            <span className="runtoast__dot" aria-hidden="true" />
            <span className="runtoast__title">Unspent skill points</span>
            <span className="runtoast__amount">{selfPlayer.stats.skill_points}</span>
          </div>
          <p className="runtoast__note">
            {awayFromGrace ? 'return to grace' : 'open your file to spend them'}
          </p>
        </div>
      )}
    </div>
  )
}

interface PartyManifestProps {
  room: RoomData | null
  selfPlayerId: string | null
  onSelect: (playerId: string) => void
}

function PartyManifest({
  room,
  selfPlayerId,
  onSelect,
}: PartyManifestProps) {
  return (
    <>
      <div className="manifest__head">
        <div className="manifest__title">
          <span>🛡</span>
          <span>The Company</span>
        </div>
        <span className="manifest__count">{room ? `${room.totalPlayers} alive` : '—'}</span>
      </div>
      <div className="manifest__list">
        {room?.players.map((player) => {
          const isSelf = player.playerId === selfPlayerId
          const s = player.stats
          const hpPct = s.health.MaxHealth > 0
            ? Math.round((s.health.CurrentHealth / s.health.MaxHealth) * 100)
            : 0
          const isLead = player.playerPublicId === room.hostPublicId
          const barColor = hpPct <= 25 ? 'bg-crimson-glow' : hpPct < 100 ? 'bg-gold-brass' : 'bg-emerald-rune'
          return (
            <button
              key={player.playerId}
              type="button"
              className="manifest__delver"
              onClick={() => onSelect(player.playerId)}
              aria-label={`View ${player.name}'s file`}
            >
              <div className="manifest__delver-name">
                <span className="manifest__delver-name-text">{player.name}</span>
                <span className="manifest__delver-level">Lv.{s.level}</span>
              </div>
              <div className="manifest__delver-class">
                {ROOM_LABELS[player.stats.abilities?.[0]?.targeting?.kind ?? 'normal'] ?? 'Combatant'}
              </div>
              <div className="manifest__delver-bar">
                <span style={{ color: '#9d9280', textTransform: 'uppercase', fontSize: '0.5625rem' }}>Vitality</span>
                <span style={{ color: isSelf ? '#ece4d4' : '#9d9280', fontSize: '0.5625rem' }}>
                  {s.health.CurrentHealth}/{s.health.MaxHealth}
                </span>
              </div>
              <div className="manifest__bar-track">
                <span className={`manifest__bar-fill ${barColor}`} style={{ width: `${hpPct}%` }} />
              </div>
              <div className="manifest__delver-meta">
                <span>{statusLabel(player.status)}</span>
                {isLead && <span style={{ color: '#f2ca50' }}>lead</span>}
                {isSelf && <span style={{ color: '#f2ca50' }}>you</span>}
              </div>
            </button>
          )
        })}
        {!room && <div className="manifest__delver" style={{ color: 'var(--color-muted)' }}>awaiting the record…</div>}
      </div>
    </>
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

function abilityNeedsTarget(a: Ability): boolean {
  return (a.targeting.kind === 'enemy' || a.targeting.kind === 'ally') && a.targeting.scope === 'single'
}

function numberKeyIndex(key: string): number {
  if (key >= '1' && key <= '9') return key.charCodeAt(0) - 49
  if (key === '0') return 9
  return -1
}

function RightRail({
  room,
}: {
  room: RoomData | null
}) {
  const encounter = room?.encounter
  const enemies = encounter?.enemies ?? []

  return (
    <>
      {/* Chamber art */}
      <div className="chamberart">
        <svg className="chamberart__svg" viewBox="0 0 800 160" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient cx="50%" cy="50%" id="occultGlow" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#3b0764" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0c0b0f" stopOpacity="0" />
            </radialGradient>
            <pattern id="runeGrid" patternUnits="userSpaceOnUse" width="24" height="24">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#d4af37" strokeOpacity="0.25" strokeWidth="0.3" />
              <circle cx="12" cy="12" fill="#c084fc" fillOpacity="0.3" r="0.75" />
            </pattern>
          </defs>
          <rect fill="url(#runeGrid)" width="800" height="160" />
          <circle cx="400" cy="80" fill="url(#occultGlow)" r="75" />
          <circle cx="400" cy="80" fill="none" r="62" stroke="#d4af37" strokeOpacity="0.65" strokeWidth="1.2" />
          <circle cx="400" cy="80" fill="none" r="48" stroke="#c084fc" strokeDasharray="5 3" strokeOpacity="0.5" strokeWidth="0.8" />
          <polygon fill="none" points="400,28 448,104 352,104" stroke="#f2ca50" strokeOpacity="0.8" strokeWidth="1.2" />
          <polygon fill="none" points="400,132 448,56 352,56" stroke="#d4af37" strokeOpacity="0.6" strokeWidth="0.9" />
          <circle cx="400" cy="80" fill="#dc2626" fillOpacity="0.85" r="6">
            <animate attributeName="r" dur="2.8s" repeatCount="indefinite" values="5;8;5" />
          </circle>
          <line stroke="#d4af37" strokeDasharray="4 4" strokeOpacity="0.4" strokeWidth="0.8" x1="220" y1="80" x2="338" y2="80" />
          <line stroke="#d4af37" strokeDasharray="4 4" strokeOpacity="0.4" strokeWidth="0.8" x1="462" y1="80" x2="580" y2="80" />
          <text fill="#f2ca50" fontFamily="Cinzel" fontSize="10" opacity="0.65" x="250" y="75">✦ ☽ ☥</text>
          <text fill="#f2ca50" fontFamily="Cinzel" fontSize="10" opacity="0.65" x="520" y="75">☥ ☩ ☾</text>
        </svg>
        <div className="chamberart__overlay" />
        <div className="chamberart__badges">
          <span className="chamberart__badge">
            <span style={{ color: '#c084fc' }}>✧</span> Chamber {room ? (room.currentRoom.index + 1) : '—'} • {room ? room.currentRoom.type : ''}
          </span>
        </div>
        <div className="chamberart__caption">
          <div>
            <span className="chamberart__label">Locational Relic & Altar</span>
            <h2 className="chamberart__title">{room ? (ROOM_LABELS[room.currentRoom.type] ?? room.currentRoom.type) : ''}</h2>
          </div>
        </div>
      </div>

      {/* Hostiles deck */}
      <div className="hostiles">
        <div className="hostiles__head">
          <div className="hostiles__title">
            <span>⚔</span>
            <span>Hostiles</span>
          </div>
          <span className="hostiles__badge">{enemies.length} Engaged</span>
        </div>
        {enemies.map((foe) => {
          const pct = foe.maxHealth > 0 ? Math.round((foe.currentHealth / foe.maxHealth) * 100) : 0
          return (
            <div key={foe.id} className="hostile-card">
              <div className="hostile-card__name">
                <span className="hostile-card__name-text">{foe.name}</span>
                <span className="hostile-card__status">{foe.alive ? 'Active' : 'Down'}</span>
              </div>
              <div className="hostile-card__bar">
                <span style={{ color: '#9d9280', textTransform: 'uppercase', fontSize: '0.5625rem' }}>Vitality</span>
                <span style={{ color: '#dc2626', fontSize: '0.5625rem' }}>{foe.currentHealth}/{foe.maxHealth}</span>
              </div>
              <div className="manifest__bar-track">
                <span className="manifest__bar-fill bg-crimson-glow" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
        {enemies.length === 0 && (
          <div style={{ fontSize: '0.75rem', color: '#6e6656', padding: '0.5rem 0', fontFamily: '"EB Garamond", serif', fontStyle: 'italic' }}>
            No enemies found.
          </div>
        )}
      </div>
    </>
  )
}

function CombatModal({
  room,
  roomToken,
  selfPublicId,
  playerNameById,
}: {
  room: RoomData
  roomToken: string | null
  selfPublicId: string | null
  playerNameById: Map<string, string>
}) {
  const encounter = room.encounter
  const [pending, setPending] = useState<CombatAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const voteActive = encounter?.phase === 'vote' && (room.currentVote != null)
  const voteDeadlineAt = room.currentVote?.deadlineAt ?? 0

  useEffect(() => {
    if (!voteActive || voteDeadlineAt === 0) return
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [voteActive, voteDeadlineAt])

  const keyboardRef = useRef<((event: KeyboardEvent) => void) | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keyboardRef.current?.(event)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!encounter || (encounter.phase !== 'vote' && encounter.phase !== 'combat')) return null

  const isVote = encounter.phase === 'vote'

  const selfPlayer = room.players.find((p) => p.playerPublicId === selfPublicId) ?? null
  const isMyTurn =
    encounter.currentTurnKind === 'player' && encounter.currentTurnId === selfPublicId

  const myVote = selfPublicId !== null && room.currentVote ? room.currentVote.votes[selfPublicId] : undefined
  const voteRemainingMs = Math.max(0, voteDeadlineAt - now)
  const voteRemainingSec = Math.ceil(voteRemainingMs / 1000)
  const voteCounts: Record<string, number> = {}
  if (room.currentVote) {
    for (const opt of room.currentVote.options) voteCounts[opt.id] = 0
    for (const choice of Object.values(room.currentVote.votes)) {
      if (choice && voteCounts[choice] !== undefined) voteCounts[choice]++
    }
  }

  const activeAbilities: (Ability & { slot: number })[] = (
    selfPlayer?.stats.activeAbilities ?? []
  )
    .map((slot) => selfPlayer?.stats.abilities.find((a) => a.id === slot.id))
    .filter((a): a is Ability => !!a)
    .map((a, i) => ({ ...a, slot: i }))

  const enemies = encounter.enemies.filter((e) => e.alive)
  const allies = room.players.filter(
    (p) =>
      p.playerPublicId !== selfPublicId &&
      p.status !== 'disconnected' &&
      p.status !== 'left' &&
      p.stats.health.CurrentHealth > 0,
  )

  const partyAll = room.players.filter(
    (p) => p.status !== 'disconnected' && p.status !== 'left' && p.status !== 'ended',
  )
  const partyAlive = partyAll.filter((p) => p.stats.health.CurrentHealth > 0)

  const pendingAbility = pending && pending.type === 'ability' ? pending : null
  const needsTarget =
    pending?.type === 'attack' ||
    (pendingAbility !== null &&
      (() => {
        const ability = activeAbilities.find((a) => a.id === pendingAbility.abilityId)
        return ability ? abilityNeedsTarget(ability) : false
      })())

  const pendingTargetKind: 'enemy' | 'ally' | null = (() => {
    if (pending?.type === 'attack') return 'enemy'
    if (pendingAbility) {
      const ability = activeAbilities.find((a) => a.id === pendingAbility.abilityId)
      if (ability && abilityNeedsTarget(ability)) {
        return ability.targeting.kind === 'ally' ? 'ally' : 'enemy'
      }
    }
    return null
  })()

  const sendAction = async (action: CombatAction) => {
    if (!roomToken) return
    setBusy(true)
    setErr(null)
    try {
      await selectCombatAction(roomToken, action)
      setPending(action)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed to act')
    } finally {
      setBusy(false)
    }
  }

  const sendTarget = async (target: CombatTarget) => {
    if (!roomToken) return
    setBusy(true)
    setErr(null)
    try {
      await selectCombatTarget(roomToken, target)
      setPending(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed to target')
    } finally {
      setBusy(false)
    }
  }

  const pickEnemy = (id: string) => void sendTarget({ kind: 'enemy', id })
  const pickAlly = (id: string) => void sendTarget({ kind: 'ally', id })

  const sendVote = async (optionId: string) => {
    if (!roomToken) return
    setBusy(true)
    setErr(null)
    try {
      await sendVoteOption(roomToken, optionId)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed to vote')
    } finally {
      setBusy(false)
    }
  }

  const turnName = playerNameById.get(encounter.currentTurnId ?? '') ?? 'the next actor'

  const actionList: { label: string; title?: string; invoke: () => void }[] = [
    { label: 'attack', invoke: () => void sendAction({ type: 'attack' }) },
    ...activeAbilities.map((a) => ({
      label: a.name,
      title: a.flavor_text,
      invoke: () => void sendAction({ type: 'ability', abilityId: a.id }),
    })),
    { label: 'defend', invoke: () => void sendAction({ type: 'defend' }) },
  ]

  keyboardRef.current = (event: KeyboardEvent) => {
    const tag = (event.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (event.metaKey || event.ctrlKey || event.altKey) return

    if (isVote) {
      const options = room.currentVote?.options ?? []
      const idx = numberKeyIndex(event.key)
      if (idx >= 0 && idx < options.length) {
        event.preventDefault()
        void sendVote(options[idx].id)
      }
      return
    }

    if (!isMyTurn) return

    if (needsTarget) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setPending(null)
        return
      }
      const idx = numberKeyIndex(event.key)
      if (idx === -1) return
      if (pendingTargetKind === 'ally') {
        if (idx < allies.length) {
          event.preventDefault()
          pickAlly(allies[idx].playerPublicId)
        }
      } else if (idx < enemies.length) {
        event.preventDefault()
        pickEnemy(enemies[idx].id)
      }
      return
    }

    const idx = numberKeyIndex(event.key)
    if (idx >= 0 && idx < actionList.length) {
      event.preventDefault()
      actionList[idx].invoke()
    }
  }

  return (
    <div className="combatmodal__scrim">
      <div
        className="combatmodal"
        role="dialog"
        aria-modal="true"
        aria-label="Combat"
      >
        <header className="combatmodal__head">
          <span className="combatmodal__eyebrow">
            {isVote ? `the party decides · ${voteRemainingSec}s` : `combat · round ${encounter.round}`}
          </span>
          <h2 className="combatmodal__title">{isVote ? 'Foes Bar the Way' : 'The Fray'}</h2>
          <span className="combatmodal__turn">
            {isVote ? 'battle or ambush?' : isMyTurn ? 'your turn' : `awaiting ${turnName}`}
          </span>
        </header>

        <div className="combatmodal__body">
          {isVote ? (
            room.currentVote ? (
            <div className="combatmodal__votebody">
              <div className="combatmodal__voteheader">
                <span className="combatmodal__votedesc">{room.currentVote.description}</span>
                <div className="combatmodal__votetimer">
                  <span className="combatmodal__votetimer-num">{voteRemainingSec}</span>
                  <span className="combatmodal__votetimer-unit">s</span>
                </div>
              </div>
              <div className="combatmodal__voteropts">
                {room.currentVote.options.map((opt, i) => {
                  const count = voteCounts[opt.id] ?? 0
                  const maxVotes = Math.max(1, ...room.currentVote!.options.map((o) => voteCounts[o.id] ?? 0))
                  const barPct = maxVotes > 0 ? count / maxVotes : 0
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className="combatmodal__voteopt"
                      disabled={busy}
                      aria-pressed={myVote === opt.id}
                      onClick={() => void sendVote(opt.id)}
                    >
                      <div className="combatmodal__voteopt-bar" style={{ transform: `scaleX(${barPct})` }} />
                      <div className="combatmodal__voteopt-inner">
                        <span className="combatmodal__voteopt-key">{i + 1}</span>
                        <span className="combatmodal__voteopt-body">
                          <span className="combatmodal__voteopt-name">{opt.name}</span>
                          <span className="combatmodal__voteopt-desc">{opt.description}</span>
                        </span>
                        <span className="combatmodal__voteopt-count">{count}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className="combatmodal__votewait">
                {myVote !== undefined
                  ? `you chose ${myVote}`
                  : 'awaiting your voice'}
              </p>
            </div>
            ) : (
              <div className="combatmodal__votewait">gathering voices…</div>
            )
          ) : (
          <div className="combatgrid">
            <div className="combatgrid__actions">
              {isMyTurn && !needsTarget && (
                <div className="combatgrid__actionsbody">
                  {actionList.map((action, i) => (
                    <button
                      type="button"
                      key={`${i}-${action.label}`}
                      className="combatgrid__act"
                      disabled={busy}
                      title={action.title}
                      onClick={action.invoke}
                    >
                      <span className="combatgrid__actkey">{i + 1}</span>
                      <span className="combatgrid__actlabel">{action.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {isMyTurn && needsTarget && (
                <div className="combatgrid__actionsbody">
                  {pendingTargetKind === 'ally' &&
                    allies.map((p, i) => (
                      <button
                        type="button"
                        key={p.playerPublicId}
                        className="combatgrid__act combatgrid__act--target"
                        disabled={busy}
                        onClick={() => pickAlly(p.playerPublicId)}
                      >
                        <span className="combatgrid__actkey">{i + 1}</span>
                        <span className="combatgrid__actlabel">{p.name}</span>
                        <span className="combatgrid__acthp">{p.stats.health.CurrentHealth}/{p.stats.health.MaxHealth}</span>
                      </button>
                    ))}
                  {pendingTargetKind === 'enemy' && (
                    <p className="combatmodal__wait">select a foe above</p>
                  )}
                  <button
                    type="button"
                    className="combatgrid__act combatgrid__act--cancel"
                    onClick={() => setPending(null)}
                  >
                    <span className="combatgrid__actlabel">cancel</span>
                  </button>
                </div>
              )}

              {!isMyTurn && (
                <div className="combatgrid__actionsbody combatgrid__actionsbody--idle">
                  <p className="combatmodal__wait">awaiting {turnName}</p>
                </div>
              )}
            </div>

            <div className="combatgrid__center">
              <section className="combatarena__band combatarena__band--foe" aria-label="Foes">
                <div className="combatarena__bandlabel">
                  <span>foes</span>
                  <span className="combatarena__note">
                    {enemies.filter((e) => e.alive).length} standing
                  </span>
                </div>
                <ul className="combatarena__row">
                  {enemies.length === 0 ? (
                    <li className="combatarena__empty">None remain.</li>
                  ) : (
                    enemies.map((e) => {
                      const pct = e.maxHealth > 0 ? Math.round((e.currentHealth / e.maxHealth) * 100) : 0
                      const isActingEnemy =
                        encounter.currentTurnKind === 'enemy' && encounter.currentTurnId === e.id
                      const isTargetable = isMyTurn && needsTarget && pendingTargetKind === 'enemy' && e.alive
                      return (
                        <li
                          key={e.id}
                          className={`combatcard${isActingEnemy ? ' combatcard--acting' : ''}${
                            !e.alive ? ' combatcard--down' : ''
                          }${isTargetable ? ' combatcard--targetable' : ''}`}
                          onClick={isTargetable ? () => pickEnemy(e.id) : undefined}
                          role={isTargetable ? 'button' : undefined}
                          tabIndex={isTargetable ? 0 : undefined}
                          onKeyDown={isTargetable ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pickEnemy(e.id); } } : undefined}
                        >
                          <div className="combatcard__top">
                            <span className="combatcard__name">{e.name}</span>
                            <span className="combatcard__tier">T{e.threatLevel}</span>
                          </div>
                          <div className="combatcard__face" aria-hidden="true">
                            {e.alive ? '☠' : '✕'}
                          </div>
                          <div className="combatcard__hp">
                            <span
                              className={`combatcard__fill${
                                !e.alive ? ' combatcard__fill--down' : ''
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="combatcard__num">
                            {e.alive ? `${e.currentHealth}/${e.maxHealth}` : 'down'}
                          </span>
                        </li>
                      )
                    })
                  )}
                </ul>
              </section>

              <section className="combatarena__band combatarena__band--party" aria-label="Your party">
                <div className="combatarena__bandlabel">
                  <span>your party</span>
                  <span className="combatarena__note">
                    {partyAlive.length}/{partyAll.length} standing
                  </span>
                </div>
                <ul className="combatarena__row">
                  {partyAll.map((p) => {
                    const pct =
                      p.stats.health.MaxHealth > 0
                        ? Math.round((p.stats.health.CurrentHealth / p.stats.health.MaxHealth) * 100)
                        : 0
                    const isSelf = p.playerPublicId === selfPublicId
                    const isActingHero =
                      encounter.currentTurnKind === 'player' && encounter.currentTurnId === p.playerPublicId
                    return (
                      <li
                        key={p.playerPublicId}
                        className={`combatcard${isActingHero ? ' combatcard--acting' : ''}${
                          isSelf ? ' combatcard--self' : ''
                        }${p.stats.health.CurrentHealth <= 0 ? ' combatcard--down' : ''}`}
                      >
                        <div className="combatcard__top">
                          <span className="combatcard__name">{p.name}</span>
                          <span className="combatcard__tier">
                            Lv.{p.stats.level}
                            {isSelf ? ' · you' : ''}
                          </span>
                        </div>
                        <div className="combatcard__face" aria-hidden="true">
                          {p.stats.health.CurrentHealth > 0 ? '◆' : '✕'}
                        </div>
                        <div className="combatcard__hp">
                          <span
                            className={`combatcard__fill combatcard__fill--ally${
                              p.stats.health.CurrentHealth <= 0 ? ' combatcard__fill--down' : ''
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="combatcard__num">
                          {p.stats.health.CurrentHealth > 0
                            ? `${p.stats.health.CurrentHealth}/${p.stats.health.MaxHealth}`
                            : 'down'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>

            <div className="combatgrid__log">
              <ul className="combatgrid__loglist">
                {encounter.log.map((line, i) => (
                  <li className="combatgrid__logline" key={i}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          )}
        </div>

        {err && (
          <footer className="combatmodal__controls">
            <p className="composer__error" role="alert">
              {err}
            </p>
          </footer>
        )}
      </div>
    </div>
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
    north: { dx: 0, dy: -1 },
    south: { dx: 0, dy: 1 },
    west:  { dx: -1, dy: 0 },
    east:  { dx: 1, dy: 0 },
  }
  const dirs = ['north', 'south', 'east', 'west'] as const

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

function romanNumeral(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i] }
  }
  return result
}

interface Connector {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
}

function MapCanvas({ map, onSelectRoom }: { map: MapPublicJSON; onSelectRoom?: (idx: number) => void }) {
  const [hovered, setHovered] = useState<MapRoom | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, panX: 0, panY: 0 })
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 })

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setCanvasSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  const cellPct = 14
  const paddingPct = (100 - (spanX + 1) * cellPct) / 2
  const paddingYPct = (100 - (spanY + 1) * cellPct) / 2

  const roomPct = 7

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
    for (const dir of ['north', 'south', 'east', 'west'] as const) {
      const exit = room.exits[dir]
      if (!exit) continue
      const targetIdx = exit.targetRoomId
      if (!visibleIds.has(targetIdx)) continue
      const targetNode = nodeByIndex.get(targetIdx)
      if (!targetNode) continue
      const key = i < targetIdx ? `${i}-${targetIdx}` : `${targetIdx}-${i}`
      if (seenConnector.has(key)) continue
      seenConnector.add(key)

      const srcW = roomNode.isCurrentRoom ? roomPct * 1.3 : roomPct
      const tgtW = targetNode.isCurrentRoom ? roomPct * 1.3 : roomPct
      const cx1 = toLeft(roomNode.gx) + srcW / 2
      const cy1 = toTop(roomNode.gy) + srcW / 2
      const cx2 = toLeft(targetNode.gx) + tgtW / 2
      const cy2 = toTop(targetNode.gy) + tgtW / 2
      connectors.push({ key, x1: cx1, y1: cy1, x2: cx2, y2: cy2 })
    }
  }

  const currentRoom = nodes.find((n) => n.isCurrentRoom)

  useEffect(() => {
    if (!currentRoom || pan !== null) return
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cxPct = toCenterX(currentRoom.gx)
    const cyPct = toCenterY(currentRoom.gy)
    const targetPxX = (cxPct / 100) * rect.width
    const targetPxY = (cyPct / 100) * rect.height
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
    <div className="map__viewport"
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <svg className="map__svg-bg" width="100%" height="100%">
        <defs>
          <pattern id="celestialDots" patternUnits="userSpaceOnUse" width="16" height="16">
            <circle cx="2" cy="2" fill="#735c00" opacity="0.3" r="0.6" />
            <circle cx="10" cy="10" fill="#c084fc" opacity="0.25" r="0.4" />
          </pattern>
        </defs>
        <rect fill="url(#celestialDots)" width="100%" height="100%" />
      </svg>
      <div
        className="map__canvas map__canvas--large"
        style={{
          transform: pan
            ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            : undefined,
          transformOrigin: '0 0',
        }}
      >
        {/* Connectors layer */}
        {connectors.map((c) => {
          const ax = (c.x1 / 100) * canvasSize.w
          const ay = (c.y1 / 100) * canvasSize.h
          const bx = (c.x2 / 100) * canvasSize.w
          const by = (c.y2 / 100) * canvasSize.h
          const dx = bx - ax
          const dy = by - ay
          const len = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)
          return (
            <div
              key={c.key}
              className="map__connector"
              style={{
                left: `${ax}px`,
                top: `${ay}px`,
                width: `${len}px`,
                transformOrigin: '0 50%',
                transform: `rotate(${angle}deg)`,
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
              width: `${node.isCurrentRoom ? roomPct * 1.3 : roomPct}%`,
              aspectRatio: '1',
            }}
            onMouseEnter={() => setHovered(node)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(node)}
            onBlur={() => setHovered(null)}
            onClick={() => onSelectRoom?.(node.index)}
            aria-label={ROOM_LABELS[node.type] ?? node.type}
          >
            <span className="map__room-label">{node.isCurrentRoom ? `${romanNumeral(node.index + 1)} ✦` : romanNumeral(node.index + 1)}</span>
          </button>
        ))}
      </div>
      {/* Hover tooltip */}
      <div className="map__tooltip">
        {hovered ? (
          <span className="map__tooltip-text">{ROOM_LABELS[hovered.type] ?? hovered.type}</span>
        ) : (
          <span className="map__tooltip-text map__tooltip-text--idle">hover a chamber</span>
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

  const currentIdx = room.map ? room.map.rooms.findIndex((r) => r.isCurrentRoom) : -1
  const [selectedIdx, setSelectedIdx] = useState<number | null>(currentIdx >= 0 ? currentIdx : null)
  const selectedRoom = room.map && selectedIdx !== null ? room.map.rooms[selectedIdx] : null

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
        {/* Top bar */}
        <header className="mapmodal__header">
          <div className="mapmodal__header-left">
            <span className="mapmodal__sigil">
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', color: '#d4af37' }}>explore</span>
            </span>
            <div className="mapmodal__header-text">
              <span className="mapmodal__eyebrow">the descent</span>
              <h2 className="mapmodal__title">Celestial Cartography</h2>
            </div>
          </div>
          <div className="mapmodal__header-right">
            <span className="mapmodal__floor-badge">
              <span className="mapmodal__floor-label">Floor</span>
              <span className="mapmodal__floor-num">{romanNumeral(room.floor)}</span>
            </span>
            <span className="mapmodal__chamber-badge">
              Chamber {currentIdx >= 0 ? currentIdx + 1 : '—'} / {room.map?.rooms.length ?? '—'}
            </span>
            <button
              ref={closeRef}
              type="button"
              className="mapmodal__close"
              onClick={onClose}
              aria-label="Close map"
            >
              Close <span style={{ fontSize: '0.75rem' }}>✕</span>
            </button>
          </div>
        </header>

        {/* Main content: map + optional side panel */}
        <div className="mapmodal__content">
          {/* Map viewport */}
          <div className="mapmodal__maparea">
            {room.map && <MapCanvas map={room.map} onSelectRoom={setSelectedIdx} />}
            {/* Legend overlay at bottom of map */}
            <div className="mapmodal__legend">
              {LEGEND_TYPES.map((t) => (
                <span className="mapmodal__legend-item" key={t}>
                  <span className={`mapmodal__legend-dot map__room--${t}`} />
                  <span className="mapmodal__legend-label">{ROOM_LABELS[t]}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Side panel — room details */}
          {selectedRoom && selectedIdx !== null && (
            <aside className="mapmodal__side">
              <div className="mapmodal__side-head">
                <div className="mapmodal__side-title-row">
                  <span className={`mapmodal__side-type mapmodal__side-type--${selectedRoom.type}`}>
                    {ROOM_LABELS[selectedRoom.type] ?? selectedRoom.type}
                  </span>
                  <span className="mapmodal__side-idx">Chamber {selectedIdx + 1}</span>
                </div>
                <button type="button" className="mapmodal__side-close" onClick={() => setSelectedIdx(null)} aria-label="Close details">
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                </button>
              </div>

              <div className="mapmodal__side-body">
                {/* Stats */}
                <div className="mapmodal__side-row">
                  <span className="mapmodal__side-label">Difficulty</span>
                  <span className="mapmodal__side-val">{selectedRoom.baseDifficulty}</span>
                </div>
                <div className="mapmodal__side-row">
                  <span className="mapmodal__side-label">Depth Bonus</span>
                  <span className="mapmodal__side-val">+{selectedRoom.distanceBonus}</span>
                </div>

                {/* Exits */}
                {(() => {
                  const exits = (['north', 'south', 'east', 'west'] as const)
                    .filter((d) => selectedRoom.exits[d])
                    .map((d) => ({ dir: d, exit: selectedRoom.exits[d]! }))
                  if (exits.length === 0) return null
                  return (
                    <div className="mapmodal__side-section">
                      <span className="mapmodal__side-section-label">Exits</span>
                      <div className="mapmodal__side-exits">
                        {exits.map(({ dir, exit }) => (
                          <span key={dir} className={`mapmodal__side-exit${exit.unlocked ? '' : ' mapmodal__side-exit--locked'}`}>
                            <span className="mapmodal__side-exit-dir">{dir.slice(0, 1).toUpperCase()}</span>
                            {!exit.unlocked && <span className="material-symbols-outlined" style={{ fontSize: '0.625rem' }}>lock</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Enemies */}
                {(() => {
                  const alive = selectedRoom.enemies.filter((e) => e.alive)
                  if (alive.length === 0) return null
                  return (
                    <div className="mapmodal__side-section">
                      <span className="mapmodal__side-section-label">Hostiles</span>
                      <div className="mapmodal__side-enemies">
                        {alive.map((e) => (
                          <div key={e.id} className="mapmodal__side-enemy">
                            <div className="mapmodal__side-enemy-head">
                              <span className="mapmodal__side-enemy-name">{e.name}</span>
                              <span className="mapmodal__side-enemy-tier">T{e.threatLevel}</span>
                            </div>
                            <div className="mapmodal__side-hpbar">
                              <div className="mapmodal__side-hpbar-fill" style={{ width: `${e.maxHealth > 0 ? (e.currentHealth / e.maxHealth) * 100 : 0}%` }} />
                            </div>
                            <span className="mapmodal__side-enemy-hp">{e.currentHealth} / {e.maxHealth}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {selectedRoom.isCurrentRoom && (
                  <div className="mapmodal__side-current">
                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: '#f2ca50' }}>star</span>
                    You are here
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}

interface VoteModalProps {
  vote: VoteJSON
  totalVoters: number
  playerNameById: Map<string, string>
  selfPublicId: string | null
  onVote: (optionId: string) => void
}

function VoteModal({
  vote,
  totalVoters,
  playerNameById,
  selfPublicId,
  onVote,
}: VoteModalProps) {
  const voteRef = useRef<HTMLDivElement>(null)
  const firstButtonRef = useRef<HTMLButtonElement>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstButtonRef.current?.focus()

    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 250)
    return () => {
      window.clearInterval(id)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const myVote = selfPublicId !== null ? vote.votes[selfPublicId] : undefined
  const hasSpoken = myVote !== undefined
  const remainingMs = Math.max(0, vote.deadlineAt - now)
  const remainingSec = Math.ceil(remainingMs / 1000)
  const pct = totalVoters > 0 && vote.duration > 0 ? Math.min(100, (remainingMs / vote.duration) * 100) : 0
  const totalVotesCast = Object.keys(vote.votes).length

  const optionCounts: { id: string; name: string; description: string; count: number; voters: string[] }[] =
    vote.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      description: opt.description,
      count: Object.values(vote.votes).filter((v) => v === opt.id).length,
      voters: Object.entries(vote.votes)
        .filter(([, v]) => v === opt.id)
        .map(([id]) => playerNameById.get(id) ?? id),
    }))

  const maxCount = Math.max(1, ...optionCounts.map((o) => o.count))
  const unspoken = Math.max(0, totalVoters - totalVotesCast)

  return (
    <div className="mapmodal__scrim">
      <div
        className="votemodal"
        role="dialog"
        aria-modal="true"
        aria-label="Party vote"
        ref={voteRef}
      >
        <header className="votemodal__head">
          <div className="votemodal__head-left">
            <span className="votemodal__eyebrow">the descent</span>
            <h2 className="votemodal__title">{vote.name}</h2>
            <p className="votemodal__rule">{vote.description}</p>
          </div>
          <div className="votemodal__clock" aria-label={`${remainingSec} seconds remain`}>
            <span className="votemodal__clock-num">{remainingSec}</span>
            <span className="votemodal__clock-unit">s remain</span>
          </div>
          <div
            className="votemodal__rod"
            role="presentation"
            style={pct > 0 ? { width: `${pct}%` } : undefined}
          />
        </header>

        <div className="votemodal__body">
          <div className="votemodal__options">
            {optionCounts.map((opt, i) => {
              const barPct = maxCount > 0 ? opt.count / maxCount : 0
              return (
                <button
                  key={opt.id}
                  ref={i === 0 ? firstButtonRef : undefined}
                  type="button"
                  className={`votemodal__opt${myVote === opt.id ? ' votemodal__opt--chosen' : ''}`}
                  onClick={() => onVote(opt.id)}
                >
                  <div
                    className="votemodal__opt-bar"
                    style={{ transform: `scaleX(${barPct})` }}
                  />
                  <div className="votemodal__opt-inner">
                    <span className="votemodal__opt-badge">{i + 1}</span>
                    <span className="votemodal__opt-body">
                      <span className="votemodal__opt-name">{opt.name}</span>
                      <span className="votemodal__opt-desc">{opt.description}</span>
                    </span>
                    <span className="votemodal__opt-meta">
                      <span className="votemodal__opt-count">{opt.count}</span>
                      <span className="votemodal__opt-voters">
                        {opt.voters.join(', ')}
                      </span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="votemodal__foot">
          {hasSpoken && (
            <p className="votemodal__hint">
              you may change your voice while time holds
            </p>
          )}
          {unspoken > 0 && (
            <p className="votemodal__unspoken">
              {unspoken} silent
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

interface InventoryModalProps {
  player: PlayerPublic
  isSelf: boolean
  onClose: () => void
  onEquip: (index: number) => void
  onUse: (id: string) => void
  busy: boolean
  actionError: string | null
}

function InventoryModal({ player, isSelf, onClose, onEquip, onUse, busy, actionError }: InventoryModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const [tip, setTip] = useState<InventoryTip | null>(null)
  const [activePocket, setActivePocket] = useState<PocketId>('consumables')

  const stats = player.stats
  const temp = stats.temp_stat_modifiers
  const effectiveStats: Stats = {
    hp: stats.base_stats.hp + stats.stat_modifiers.hp + temp.hp,
    strength: stats.base_stats.strength + stats.stat_modifiers.strength + temp.strength,
    dexterity: stats.base_stats.dexterity + stats.stat_modifiers.dexterity + temp.dexterity,
    intelligence: stats.base_stats.intelligence + stats.stat_modifiers.intelligence + temp.intelligence,
    wisdom: stats.base_stats.wisdom + stats.stat_modifiers.wisdom + temp.wisdom,
    agility: stats.base_stats.agility + stats.stat_modifiers.agility + temp.agility,
  }
  const carried = stats.items ?? []
  const consumables = carried.filter((item) => item.type === 'consumable')
  const gear = carried.filter((item) => item.type === 'gear')
  const scrolls = carried.filter((item) => item.type === 'scroll')

  const pockets: { id: PocketId; label: string; count: number }[] = [
    { id: 'consumables', label: 'consumables', count: consumables.length },
    { id: 'gear', label: 'gear', count: gear.length },
    { id: 'scrolls', label: 'scrolls', count: scrolls.length },
  ]

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'i' || event.key === 'I') {
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
    <div className="filecard__scrim" onClick={onClose}>
      <div
        className="filecard"
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} — inventory`}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="filecard__tab filecard__tab--simple">
          <span className="filecard__tab-label">inventory</span>
          <button
            ref={closeRef}
            type="button"
            className="filecard__close"
            onClick={onClose}
            aria-label="Close inventory"
          >
            close ✕
          </button>
        </div>
        <div className="filecard__sheet" key={player.playerId}>
          <header className="filecard__head">
            <h2 className="filecard__name">{player.name}</h2>
            <div className="filecard__identity">
              <span className="filecard__gold">{stats.gold} gold</span>
            </div>
          </header>

          <div className="filecard__tabpanel bag" role="tabpanel">
            <aside className="bag__sidebar" role="tablist" aria-label="Inventory pockets">
              {pockets.map((pocket) => (
                <button
                  key={pocket.id}
                  type="button"
                  role="tab"
                  aria-selected={activePocket === pocket.id}
                  className={`bag__pocket${activePocket === pocket.id ? ' bag__pocket--active' : ''}`}
                  onClick={() => setActivePocket(pocket.id)}
                >
                  <BagIcon pocket={pocket.id} size={15} />
                  <span className="bag__pocket-label">{pocket.label}</span>
                  <span className="bag__pocket-count">×{pocket.count}</span>
                </button>
              ))}
            </aside>

            <div className="bag__main">
              <p className="filecard__inventory-hint">
                click an item to inspect it{isSelf ? ' · use / read / equip it' : ''}
              </p>
              {actionError && <p className="filecard__inventory-error">{actionError}</p>}

              {activePocket === 'consumables' &&
                (consumables.length > 0 ? (
                  <ul className="filecard__list">
                    {consumables.map((item, i) => (
                      <InventoryRow
                        key={`${item.id}-${i}`}
                        item={item}
                        busy={busy}
                        onHover={(hovered, rect) => setTip({ item: hovered, rect, met: meetsRequired(hovered.required_stats ?? {}, effectiveStats) })}
                        onLeave={() => setTip(null)}
                        action={
                          isSelf ? { label: 'use', onClick: () => onUse(item.id) } : null
                        }
                      />
                    ))}
                  </ul>
                ) : (
                  <span className="filecard__empty">nothing drinkable carried</span>
                ))}

              {activePocket === 'gear' &&
                (gear.length > 0 ? (
                  <ul className="filecard__list">
                    {gear.map((item, i) => {
                      const idx = stats.items ? stats.items.indexOf(item) : -1
                      const canEquip =
                        idx >= 0 &&
                        isSelf &&
                        item.type === 'gear' &&
                        !!item.slot &&
                        meetsRequired(item.required_stats ?? {}, effectiveStats)
                      const unmet =
                        item.type === 'gear' && item.required_stats
                          ? (Object.keys(item.required_stats) as (keyof Stats)[])
                              .filter(
                                (k) =>
                                  (item.required_stats![k] ?? 0) > 0 &&
                                  effectiveStats[k] < item.required_stats![k],
                              )
                              .map((k) => `${k} ${item.required_stats![k]}`)
                              .join(', ')
                          : null
                      return (
                        <InventoryRow
                          key={`${item.id}-${i}`}
                          item={item}
                          busy={busy}
                          gateNote={unmet ? `needs ${unmet}` : null}
                          onHover={(hovered, rect) => setTip({ item: hovered, rect, met: meetsRequired(hovered.required_stats ?? {}, effectiveStats) })}
                          onLeave={() => setTip(null)}
                          action={
                            isSelf
                              ? canEquip
                                ? { label: 'equip', onClick: () => onEquip(idx) }
                                : null
                              : null
                          }
                        />
                      )
                    })}
                  </ul>
                ) : (
                  <span className="filecard__empty">nothing equippable carried</span>
                ))}

              {activePocket === 'scrolls' &&
                (scrolls.length > 0 ? (
                  <ul className="filecard__list">
                    {scrolls.map((item, i) => (
                      <InventoryRow
                        key={`${item.id}-${i}`}
                        item={item}
                        busy={busy}
                        onHover={(hovered, rect) => setTip({ item: hovered, rect, met: meetsRequired(hovered.required_stats ?? {}, effectiveStats) })}
                        onLeave={() => setTip(null)}
                        action={
                          isSelf ? { label: 'read', onClick: () => onUse(item.id) } : null
                        }
                      />
                    ))}
                  </ul>
                ) : (
                  <span className="filecard__empty">nothing to read carried</span>
                ))}
            </div>
          </div>
        </div>
      </div>
      {tip && <InventoryTooltip tip={tip} />}
    </div>
  )
}

interface InventoryRowProps {
  item: RunItem
  busy: boolean
  action?: { label: string; onClick: () => void } | null
  gateNote?: string | null
  onHover: (item: RunItem, rect: DOMRect) => void
  onLeave: () => void
}

function InventoryRow({ item, busy, action, gateNote, onHover, onLeave }: InventoryRowProps) {
  return (
    <li
      className="filecard__item"
      onMouseEnter={(event) => onHover(item, event.currentTarget.getBoundingClientRect())}
      onMouseLeave={onLeave}
    >
      <div className="filecard__item-row">
        <span className="filecard__item-nav">
          <span className="filecard__item-name">{item.name}</span>
          <span className={`filecard__rarity filecard__rarity--${item.rarity.name}`}>
            {item.rarity.name}
          </span>
          {item.type === 'gear' && item.slot && (
            <span className="filecard__item-slot">{item.slot}</span>
          )}
        </span>
        {action && (
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
      {gateNote && <span className="filecard__item-gate">{gateNote}</span>}
    </li>
  )
}

interface InventoryTip {
  item: RunItem
  rect: DOMRect
  met: boolean
}

function InventoryTooltip({ tip }: { tip: InventoryTip }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { innerWidth, innerHeight } = window
    const gutter = 12
    const W = el.offsetWidth
    const H = el.offsetHeight
    let left = tip.rect.right + gutter
    if (left + W > innerWidth - gutter) left = tip.rect.left - gutter - W
    left = Math.max(gutter, left)
    let top = tip.rect.top
    if (top + H > innerHeight - gutter) top = innerHeight - gutter - H
    top = Math.max(gutter, top)
    setPos({ left, top })
  }, [tip])

  const { item } = tip
  const entries = item.stats ? Object.entries(item.stats).filter(([, v]) => v !== 0) : []
  const requiredEntries = item.required_stats
    ? Object.entries(item.required_stats).filter(([, v]) => v !== 0)
    : []

  return createPortal(
    <div
      ref={ref}
      className="filecard__tooltip filecard__tooltip--fixed"
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
    >
      <span className="filecard__tooltip-head">
        <span className="filecard__tooltip-name">{item.name}</span>
        <span className={`filecard__rarity filecard__rarity--${item.rarity.name}`}>
          {item.rarity.name}
        </span>
      </span>
      {item.description && <span className="filecard__tooltip-desc">{item.description}</span>}
      {item.type === 'scroll' && item.ability && (
        <span className="filecard__tooltip-teaches">
          <span className="filecard__tooltip-teaches-k">teaches</span>
          <span className="filecard__tooltip-teaches-v">
            {item.ability}
            {item.ability_description ? ` — ${item.ability_description}` : ''}
          </span>
        </span>
      )}
      {entries.length > 0 && (
        <span className="filecard__tooltip-block">
          <span className="filecard__tooltip-label">stats</span>
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
        </span>
      )}
      {requiredEntries.length > 0 && (
        <span className="filecard__tooltip-block">
          <span className="filecard__tooltip-label">requires</span>
          <span className={tip.met ? 'field__req field__req--met' : 'field__req field__req--req'}>
            {requiredEntries.map(([k, v]) => (
              <span className="field__req-chip" key={k}>
                <span className="field__req-k">{k}</span>
                <span className="field__req-v">{v}</span>
              </span>
            ))}
          </span>
        </span>
      )}
      {item.type === 'consumable' && item.buyPrice > 0 && (
        <span className="filecard__tooltip-price">shop value · {item.buyPrice} gold</span>
      )}
    </div>,
    document.body,
  )
}

function meetsRequired(required: Partial<Stats>, stats: Stats): boolean {
  const keys = Object.keys(required) as (keyof Stats)[]
  for (const key of keys) {
    const value = required[key] ?? 0
    if (value > 0 && stats[key] < value) return false
  }
  return true
}

function AbilityList({ abilities, emptyText = 'none mastered' }: { abilities: Ability[]; emptyText?: string }) {
  if (abilities.length === 0) {
    return <span className="filecard__empty">{emptyText}</span>
  }
  return (
    <ul className="filecard__ability-list">
      {abilities.map((ability) => {
        const reqEntries = Object.entries(ability.minimumStats ?? {}).filter(([, v]) => v !== 0)
        return (
          <li className="filecard__ability" key={ability.id}>
            <span className="filecard__ability-head">
              <span className="filecard__ability-name">{ability.name}</span>
              <span className="filecard__ability-target">
                {ability.targeting.kind}/{ability.targeting.scope}
              </span>
            </span>
            <span className="filecard__ability-flavor">{ability.flavor_text}</span>
            <span className="filecard__ability-desc">{ability.description}</span>
            {(ability.minimumLevel > 0 || reqEntries.length > 0) && (
              <span className="filecard__ability-req">
                requires lvl {ability.minimumLevel}
                {reqEntries.length > 0 &&
                  ` · ${reqEntries.map(([k, v]) => `${k} ${v}`).join(', ')}`}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const ACTIVE_SLOT_COUNT = 4

interface ActiveAbilityBarProps {
  abilities: Ability[]
  activeAbilities: { slot: number; id: string }[]
  busy: boolean
  onAssign: (id: string, slot: number) => void
}

function ActiveAbilityBar({ abilities, activeAbilities, busy, onAssign }: ActiveAbilityBarProps) {
  const [pickingSlot, setPickingSlot] = useState<number | null>(null)
  const slotRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const [pickerPos, setPickerPos] = useState<{ left: number; top: number; width: number } | null>(null)

  const pickingSlotRef = useRef<number | null>(null)
  pickingSlotRef.current = pickingSlot

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pickingSlotRef.current !== null) {
        setPickingSlot(null)
        setPickerPos(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const activeAbilitiesOnly = abilities.filter((a) => a.active)

  const assignedBySlot = new Map<number, Ability>()
  for (const entry of activeAbilities) {
    const ability = abilities.find((a) => a.id === entry.id)
    if (ability) assignedBySlot.set(entry.slot, ability)
  }

  const slots = Array.from({ length: ACTIVE_SLOT_COUNT }, (_, i) => {
    const ability = assignedBySlot.get(i)
    return { slot: i, ability }
  })

  const openPicker = (slot: number) => {
    if (pickingSlot === slot) {
      setPickingSlot(null)
      setPickerPos(null)
      return
    }
    const el = slotRefs.current[slot]
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gutter = 8
    const width = Math.max(rect.width, 224)
    const left = Math.max(gutter, Math.min(rect.left, window.innerWidth - width - gutter))
    let top = rect.bottom + 4
    if (top + 208 > window.innerHeight - gutter) top = Math.max(gutter, rect.top - 208 - 4)
    setPickerPos({ left, top, width })
    setPickingSlot(slot)
  }

  const choose = (slot: number, abilityId: string) => {
    setPickerPos(null)
    setPickingSlot(null)
    onAssign(abilityId, slot)
  }

  const picking = pickingSlot !== null && pickerPos !== null
    ? slots.find((s) => s.slot === pickingSlot) ?? null
    : null
  const pickerAbility = picking?.ability ?? null

  return (
    <section className="activebar">
      <div className="activebar__head">
        <span className="filecard__sub-heading">active abilities</span>
        <span className="activebar__sub">at your fingertips · {activeAbilities.length}/{ACTIVE_SLOT_COUNT} bound</span>
      </div>
      <div className="activebar__slots">
        {slots.map(({ slot, ability }) => {
          const open = pickingSlot === slot
          return (
            <div className="activebar__slot" key={slot}>
              <div className="activebar__cell-head">
                <span className="activebar__num">slot {slot + 1}</span>
                {ability && (
                  <button
                    type="button"
                    className="activebar__clear"
                    disabled={busy}
                    onClick={() => choose(slot, '')}
                    aria-label={`Unbind ${ability.name} from slot ${slot + 1}`}
                    title="unbind"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                ref={(node) => {
                  slotRefs.current[slot] = node
                }}
                type="button"
                className={`activebar__cell${ability ? ' activebar__cell--bound' : ''}${open ? ' activebar__cell--open' : ''}`}
                disabled={busy}
                onClick={() => openPicker(slot)}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={`Assign ability to slot ${slot + 1}`}
              >
                <span className="activebar__cell-name">
                  {ability ? ability.name : 'unbound'}
                </span>
                <span className="activebar__cell-target">
                  {ability ? `${ability.targeting.kind}/${ability.targeting.scope}` : '—'}
                </span>
              </button>
            </div>
          )
        })}
      </div>
      <p className="activebar__hint">
        bind your active abilities to these slots. each slot holds one ability.
      </p>

      {pickingSlot !== null && picking && pickerPos && createPortal(
        <ul
          className="activebar__pick"
          role="listbox"
          aria-label={`Pick ability for slot ${pickingSlot + 1}`}
          style={{ position: 'fixed', left: pickerPos.left, top: pickerPos.top, width: pickerPos.width }}
        >
          <li
            role="option"
            aria-selected={pickerAbility === undefined}
            className="activebar__pick-item activebar__pick-item--empty"
            onMouseDown={(event) => {
              event.preventDefault()
              if (pickerAbility) choose(pickingSlot, '')
            }}
          >
            clear this slot
          </li>
          {activeAbilitiesOnly.map((a) => {
            const boundElsewhere = [...assignedBySlot.entries()].some(
              ([otherSlot, assigned]) => otherSlot !== pickingSlot && assigned.id === a.id,
            )
            if (boundElsewhere) return null
            return (
              <li
                role="option"
                aria-selected={pickerAbility?.id === a.id}
                key={a.id}
                className={`activebar__pick-item${pickerAbility?.id === a.id ? ' activebar__pick-item--active' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(pickingSlot, a.id)
                }}
              >
                <span className="activebar__pick-name">{a.name}</span>
                <span className="activebar__pick-target">
                  {a.targeting.kind}/{a.targeting.scope}
                </span>
              </li>
            )
          })}
          {activeAbilitiesOnly.length === 0 && (
            <li className="activebar__pick-item activebar__pick-item--empty">
              no active abilities mastered yet
            </li>
          )}
        </ul>,
        document.body,
      )}
    </section>
  )
}

interface ActiveAbilityListProps {
  abilities: Ability[]
  activeAbilities: { slot: number; id: string }[]
}

function ActiveAbilityList({ abilities, activeAbilities }: ActiveAbilityListProps) {
  const byId = new Map<string, Ability>(abilities.map((a) => [a.id, a]))
  const assigned = activeAbilities
    .map(({ slot, id }) => ({ slot, ability: byId.get(id) }))
    .filter((entry): entry is { slot: number; ability: Ability } => entry.ability !== undefined)
    .sort((a, b) => a.slot - b.slot)

  return (
    <ul className="activebar__list">
      {assigned.map(({ slot, ability }) => (
        <li className="activebar__list-row" key={ability.id}>
          <span className="activebar__num">slot {slot + 1}</span>
          <span className="activebar__list-name">{ability.name}</span>
          <span className="activebar__cell-target">
            {ability.targeting.kind}/{ability.targeting.scope}
          </span>
        </li>
      ))}
      {assigned.length === 0 && (
        <li className="filecard__empty">no active abilities bound</li>
      )}
    </ul>
  )
}

interface GearSlotIconProps {
  slot: GearSlot
  size?: number
}

function GearSlotIcon({ slot, size = 18 }: GearSlotIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (slot) {
    case 'weapon':
      return (
        <svg {...common}>
          <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
          <line x1="13" y1="19" x2="19" y2="13" />
          <line x1="16" y1="16" x2="20" y2="20" />
          <line x1="19" y1="21" x2="21" y2="19" />
        </svg>
      )
    case 'head':
      return (
        <svg {...common}>
          <path d="M6 17V9.5a6 6 0 0 1 12 0V17" />
          <path d="M4.5 17h15" />
          <path d="M9.75 12.25h4.5" />
          <path d="M12 12.25v4.75" />
        </svg>
      )
    case 'chest':
      return (
        <svg {...common}>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="M12 9.5v5.5" />
        </svg>
      )
    case 'greaves':
      return (
        <svg {...common}>
          <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
          <path d="M14 20v-2.38c0-2.12 1.03-3.12 1-5.62.03-2.72 1.49-6 4.5-6C22.37 6 23 7.8 23 9.5c0 3.11-2 5.66-2 8.68V20a2 2 0 1 1-4 0Z" />
        </svg>
      )
  }
}

type PocketId = 'consumables' | 'gear' | 'scrolls'

interface BagIconProps {
  pocket: PocketId
  size?: number
}

function BagIcon({ pocket, size = 16 }: BagIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (pocket) {
    case 'consumables':
      return (
        <svg {...common}>
          <path d="M10 2v7.31a2 2 0 0 1-.29 1.06L4.7 17.48A2 2 0 0 0 6.4 21h11.2a2 2 0 0 0 1.7-3.52l-5.01-7.11A2 2 0 0 1 14 9.31V2" />
          <path d="M8.5 2h7" />
          <path d="M7 16h10" />
        </svg>
      )
    case 'gear':
      return (
        <svg {...common}>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
      )
    case 'scrolls':
      return (
        <svg {...common}>
          <path d="M19 17V5a2 2 0 0 0-2-2H4" />
          <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
        </svg>
      )
  }
}

interface GearModalProps {
  player: PlayerPublic
  isSelf: boolean
  busy: boolean
  onClose: () => void
  onUnequip: (slot: GearSlot) => void
  onSetActive: (id: string, slot: number) => void
  onOpenInventory: () => void
  actionError: string | null
}

function GearModal({
  player,
  isSelf,
  busy,
  onClose,
  onUnequip,
  onSetActive,
  onOpenInventory,
  actionError,
}: GearModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const [activeSection, setActiveSection] = useState<'gear' | 'active' | 'ability'>('gear')

  const stats = player.stats

  const FALLBACK_RARITY: Rarity = { name: 'common', rarityLevel: 1 }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'g' || event.key === 'G') {
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

  const slots: {
    slot: GearSlot
    label: string
    name: string
    description: string
    rarity: Rarity
    stats: Stats
  }[] = []
  if (stats.weapon_stats) {
    slots.push({
      slot: 'weapon',
      label: 'Weapon',
      name: stats.weapon_stats.weaponName,
      description: stats.weapon_stats.description,
      rarity: stats.weapon_stats.rarity ?? FALLBACK_RARITY,
      stats: stats.weapon_stats.stats,
    })
  }
  for (const { slot, label, piece } of [
    { slot: 'head', label: 'Head', piece: stats.armor_stats.head },
    { slot: 'chest', label: 'Chest', piece: stats.armor_stats.chest },
    { slot: 'greaves', label: 'Greaves', piece: stats.armor_stats.greaves },
  ] as const) {
    if (piece) {
      slots.push({
        slot,
        label,
        name: piece.armorName,
        description: piece.description,
        rarity: piece.rarity ?? FALLBACK_RARITY,
        stats: piece.stats,
      })
    }
  }

  const gearTotal: Stats = {
    hp: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    wisdom: 0,
    agility: 0,
  }
  for (const entry of slots) {
    const k = Object.keys(entry.stats) as (keyof Stats)[]
    for (const key of k) gearTotal[key] += entry.stats[key]
  }
  const gearBonusEntries = (Object.keys(gearTotal) as (keyof Stats)[]).filter(
    (k) => gearTotal[k] !== 0,
  )

  const emptySlots: string[] = []
  if (!stats.weapon_stats) emptySlots.push('weapon')
  for (const [key, piece] of [
    ['head', stats.armor_stats.head],
    ['chest', stats.armor_stats.chest],
    ['greaves', stats.armor_stats.greaves],
  ] as const) {
    if (!piece) emptySlots.push(key)
  }

  return (
    <div className="filecard__scrim" onClick={onClose}>
      <div
        className="filecard"
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} — gear and abilities`}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="filecard__tab filecard__tab--simple">
          <span className="filecard__tab-label">gear &amp; abilities</span>
          <button
            ref={closeRef}
            type="button"
            className="filecard__close"
            onClick={onClose}
            aria-label="Close gear"
          >
            close ✕
          </button>
        </div>
        <div className="filecard__sheet" key={player.playerId}>
          <header className="filecard__head">
            <h2 className="filecard__name">{player.name}</h2>
            <div className="filecard__identity">
              <span className="filecard__level">Lv. {stats.level}</span>
              <span className="filecard__sep">·</span>
              <span className="filecard__gold">{stats.gold} gold</span>
            </div>
          </header>

          <div className="filecard__secs" role="tablist" aria-label="Gear and abilities sections">
            {(
              [
                { id: 'gear', label: 'Gear' },
                { id: 'active', label: 'Active' },
                { id: 'ability', label: 'Abilities' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeSection === tab.id}
                className={`filecard__sec${activeSection === tab.id ? ' filecard__sec--active' : ''}`}
                onClick={() => setActiveSection(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="filecard__tabpanel" role="tabpanel">
            {activeSection === 'gear' && (() => {
              return (
                <>
                  {slots.length > 0 ? (
                    <ul className="filecard__gear">
                      {slots.map(({ slot, label, name, description, rarity, stats: pieceStats }) => {
                        const entries = Object.entries(pieceStats).filter(([, v]) => v !== 0)
                        return (
                          <li className="filecard__gear-row" key={label}>
                            <span className="filecard__gear-slot" title={label} aria-label={label}>
                              <GearSlotIcon slot={slot} />
                            </span>
                            <span className="filecard__gear-body">
                              <span className="filecard__gear-head">
                                <span className="filecard__gear-name">{name}</span>
                                <span className={`filecard__rarity filecard__rarity--${rarity.name}`}>
                                  {rarity.name}
                                </span>
                              </span>
                              <span className="filecard__gear-desc">{description}</span>
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
                              {isSelf && (
                                <button
                                  type="button"
                                  className="btn btn--ghost"
                                  disabled={busy}
                                  onClick={() => onUnequip(slot)}
                                >
                                  unequip
                                </button>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <span className="filecard__empty">nothing equipped</span>
                  )}

                  {emptySlots.length > 0 && (
                    <p className="filecard__gear-missing">
                      empty slots:{' '}
                      {emptySlots.map((slot) => (
                        <span className="filecard__gear-empty" key={slot} title={slot} aria-label={slot}>
                          <GearSlotIcon slot={slot as GearSlot} size={16} />
                        </span>
                      ))}
                      {isSelf && ' · equip gear from inventory to fill them'}
                    </p>
                  )}

                  {gearBonusEntries.length > 0 && (
                    <section className="filecard__group">
                      <h3 className="filecard__sub-heading">gear bonus</h3>
                      <span className="filecard__gear-stats">
                        {gearBonusEntries.map((k) => (
                          <span className="filecard__ws" key={k}>
                            <span className="filecard__ws-k">{k}</span>
                            <span className="filecard__ws-v filecard__ws-v--pos">
                              +{gearTotal[k]}
                            </span>
                          </span>
                        ))}
                      </span>
                    </section>
                  )}
                </>
              )
            })()}

            {activeSection === 'active' && (() => {
              return (
                <>
                  {isSelf ? (
                    <ActiveAbilityBar
                      abilities={stats.abilities}
                      activeAbilities={stats.activeAbilities ?? []}
                      busy={busy}
                      onAssign={onSetActive}
                    />
                  ) : (
                    <ActiveAbilityList
                      abilities={stats.abilities}
                      activeAbilities={stats.activeAbilities ?? []}
                    />
                  )}
                </>
              )
            })()}

            {activeSection === 'ability' && (() => {
              return (
                <>
                  <h3 className="filecard__sub-heading">
                    mastered abilities
                    {stats.abilities.length > 0 ? ` · ${stats.abilities.length}` : ''}
                  </h3>
                  <AbilityList abilities={stats.abilities} emptyText="none mastered — read scrolls from your inventory to learn abilities" />
                </>
              )
            })()}

            {isSelf && activeSection === 'gear' && (
              <p className="filecard__gear-foot">
                {actionError && <span className="filecard__inventory-error">{actionError}</span>}
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={onOpenInventory}
                >
                  manage inventory (I)
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
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
  const previous = players.length > 1 ? (index > 0 ? players[index - 1] : players[players.length - 1]) : players[0] ?? null
  const next = players.length > 1 ? (index < players.length - 1 ? players[index + 1] : players[0]) : players[0] ?? null

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

  const xpPct = stats.level > 0 ? Math.round((stats.experience / (stats.level * 100)) * 100) : 0

  const [activeTab, setActiveTab] = useState<'stats' | 'gear' | 'active' | 'ability'>('stats')

  const canModifyStats =
    player.playerId === selfPlayerId && currentRoomType === "grace"

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
                { id: 'active', label: 'Active' },
                { id: 'ability', label: 'Abilities' },
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
                    const buff = stats.temp_stat_modifiers[key]
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
                          {buff > 0 && (
                            <span className="filecard__mod filecard__mod--buff">+{buff} active</span>
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
                  <li className={`sheet__row sheet__row--meta${stats.skill_points > 0 ? ' sheet__row--unspent' : ''}`}>
                    <span className="sheet__row-k">Skill points</span>
                    <span className="sheet__row-v">
                      {stats.skill_points}
                      {stats.skill_points > 0 && (
                        <span className="sheet__unspent">
                          <span className="sheet__unspent-dot" aria-hidden="true" />
                          unspent
                        </span>
                      )}
                    </span>
                  </li>
                </ul>
              ) : (
                <dl className="filecard__stats">
                  {DOSSIER_FIELDS.map((field) => {
                    const base = stats.base_stats[field.key]
                    const mod = stats.stat_modifiers[field.key]
                    const buff = stats.temp_stat_modifiers[field.key]
                    const total = base + mod + buff
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
                          {buff > 0 && (
                            <span className="filecard__mod filecard__mod--buff">+{buff} active</span>
                          )}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              ))}

            {activeTab === 'gear' && (() => {
              const slots: { slot: GearSlot; label: string; name: string; stats: Stats }[] = []
              if (stats.weapon_stats) {
                slots.push({ slot: 'weapon', label: 'Weapon', name: stats.weapon_stats.weaponName, stats: stats.weapon_stats.stats })
              }
              for (const { slot, label, piece } of [
                { slot: 'head', label: 'Head', piece: stats.armor_stats.head },
                { slot: 'chest', label: 'Chest', piece: stats.armor_stats.chest },
                { slot: 'greaves', label: 'Greaves', piece: stats.armor_stats.greaves },
              ] as const) {
                if (piece) slots.push({ slot, label, name: piece.armorName, stats: piece.stats })
              }
              return slots.length > 0 ? (
                <ul className="filecard__gear">
                  {slots.map(({ slot, label, name, stats: pieceStats }) => {
                    const entries = Object.entries(pieceStats).filter(([, v]) => v !== 0)
                    return (
                      <li className="filecard__gear-row" key={label}>
                        <span className="filecard__gear-slot" title={label} aria-label={label}>
                          <GearSlotIcon slot={slot} />
                        </span>
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
              ) : (
                <span className="filecard__empty">nothing equipped</span>
              )
            })()}

            {activeTab === 'active' && (
              <ActiveAbilityList
                abilities={stats.abilities}
                activeAbilities={stats.activeAbilities ?? []}
              />
            )}

            {activeTab === 'ability' && <AbilityList abilities={stats.abilities} />}
          </div>

          <footer className="filecard__foot">
            {previous ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onSwitch(previous.playerId)}
              >
                <span className="filecard__nav-arrow">{'\u2039'}</span>
                <span className="filecard__nav-name">{previous.name}</span>
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button type="button" className="btn btn--ghost" onClick={() => onSwitch(next.playerId)}>
                <span className="filecard__nav-name">{next.name}</span>
                <span className="filecard__nav-arrow">{'\u203A'}</span>
              </button>
            ) : (
              <span />
            )}
          </footer>
        </div>
      </div>
    </div>
  )
}
