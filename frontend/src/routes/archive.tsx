import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import type { RunSummary, RunSummaryPlayer, RarityName } from '../rooms'
import { STARTER_KITS, returnToLobby } from '../rooms'
import { useRoomSocket } from '../useRoomSocket'
import { clearRoomSession, decodeRoomToken, getRoomToken } from '../roomSession'
import { setStage } from '../stages'

const RARITY_COLORS: Record<RarityName, string> = {
  common: '#cfc4b0',
  uncommon: '#6ee7b7',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#f2ca50',
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  strength: 'STR',
  dexterity: 'DEX',
  intelligence: 'INT',
  wisdom: 'WIS',
  agility: 'AGI',
}

function kitName(kit: string) {
  return STARTER_KITS.find((k) => k.id === kit)?.name ?? kit
}

function kitIcon(kit: string) {
  return STARTER_KITS.find((k) => k.id === kit)?.icon ?? 'game-icons:boots'
}

function StatRow({ label, base, mod }: { label: string; base: number; mod: number }) {
  const total = base + mod
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.625rem', color: '#9d9280', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', color: mod > 0 ? '#6ee7b7' : mod < 0 ? '#f87171' : '#ece4d4' }}>
        {total}{mod !== 0 && <span style={{ fontSize: '0.5625rem', marginLeft: '0.25rem', color: '#9d9280' }}>({base}{mod > 0 ? '+' : ''}{mod})</span>}
      </span>
    </div>
  )
}

function GearSlot({ name, rarity, description }: { name: string; rarity: RarityName; description: string }) {
  return (
    <div style={{ padding: '0.375rem 0.5rem', background: 'rgba(212,175,55,0.05)', border: `1px solid ${RARITY_COLORS[rarity]}22`, borderRadius: '0.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: '"Cinzel", serif', fontSize: '0.6875rem', color: RARITY_COLORS[rarity] }}>{name}</span>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', color: '#9d9280', textTransform: 'uppercase' }}>{rarity}</span>
      </div>
      {description && <p style={{ fontFamily: '"EB Garamond", serif', fontSize: '0.625rem', color: '#9d9280', margin: '0.125rem 0 0', lineHeight: 1.3 }}>{description}</p>}
    </div>
  )
}

function PlayerDetail({ player }: { player: RunSummaryPlayer }) {
  const activeIds = new Set(player.activeAbilities.map((a) => a.id))
  const hpPct = player.health.MaxHealth > 0 ? player.health.CurrentHealth / player.health.MaxHealth : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
        <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'rgba(59,7,100,0.4)', border: '1px solid rgba(192,132,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon icon={kitIcon(player.kit)} style={{ fontSize: '1.5rem', color: '#c084fc' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontFamily: '"Cinzel", serif', fontSize: '1.25rem', fontWeight: 700, color: '#ece4d4' }}>{player.name}</span>
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: '#c084fc' }}>Lv.{player.level}</span>
          </div>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.625rem', color: '#9d9280' }}>{kitName(player.kit)}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: '#c084fc' }}>{player.xp} xp</span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: '#d4af37' }}>{player.gold}g</span>
        </div>
      </div>

      {/* HP Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.625rem', color: '#9d9280', textTransform: 'uppercase' }}>health</span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: hpPct > 0.5 ? '#6ee7b7' : hpPct > 0.25 ? '#f2ca50' : '#f87171' }}>
            {player.health.CurrentHealth}/{player.health.MaxHealth}
          </span>
        </div>
        <div style={{ height: '0.5rem', background: 'rgba(29,24,43,1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${hpPct * 100}%`, background: hpPct > 0.5 ? '#6ee7b7' : hpPct > 0.25 ? '#f2ca50' : '#f87171', borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', padding: '0.75rem', background: 'rgba(24,21,32,0.6)', borderRadius: '0.375rem', border: '1px solid rgba(212,175,55,0.08)' }}>
        {Object.entries(STAT_LABELS).map(([key, label]) => (
          <StatRow key={key} label={label} base={player.base_stats[key] ?? 0} mod={player.stat_modifiers[key] ?? 0} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Gear */}
        <div>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.625rem', color: '#8a702b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>gear</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.375rem' }}>
            {player.weapon && (
              <GearSlot name={player.weapon.weaponName} rarity={player.weapon.rarity.name} description={player.weapon.description} />
            )}
            {player.armor.head && (
              <GearSlot name={player.armor.head.armorName} rarity={player.armor.head.rarity.name} description={player.armor.head.description} />
            )}
            {player.armor.chest && (
              <GearSlot name={player.armor.chest.armorName} rarity={player.armor.chest.rarity.name} description={player.armor.chest.description} />
            )}
            {player.armor.greaves && (
              <GearSlot name={player.armor.greaves.armorName} rarity={player.armor.greaves.rarity.name} description={player.armor.greaves.description} />
            )}
            {!player.weapon && !player.armor.head && !player.armor.chest && !player.armor.greaves && (
              <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '0.75rem', color: '#6e6656', fontStyle: 'italic' }}>no gear equipped</span>
            )}
          </div>
        </div>

        {/* Abilities */}
        <div>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.625rem', color: '#8a702b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>abilities</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.375rem' }}>
            {player.abilities.filter((a) => activeIds.has(a.id)).map((a) => (
              <div key={a.id} style={{ padding: '0.375rem 0.5rem', background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.15)', borderRadius: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: '"Cinzel", serif', fontSize: '0.75rem', color: '#c084fc' }}>{a.name}</span>
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', color: '#9d9280', textTransform: 'uppercase' }}>{a.targeting.kind}</span>
                </div>
                <p style={{ fontFamily: '"EB Garamond", serif', fontSize: '0.6875rem', color: '#9d9280', margin: '0.125rem 0 0', lineHeight: 1.3 }}>{a.description}</p>
              </div>
            ))}
            {player.abilities.filter((a) => activeIds.has(a.id)).length === 0 && (
              <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '0.75rem', color: '#6e6656', fontStyle: 'italic' }}>no abilities</span>
            )}
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.625rem', color: '#8a702b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>inventory</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
          {player.inventory.map((item, i) => (
            <div key={`${item.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: 'rgba(212,175,55,0.05)', border: `1px solid ${RARITY_COLORS[item.rarity.name]}22`, borderRadius: '0.25rem' }}>
              <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '0.6875rem', color: RARITY_COLORS[item.rarity.name] }}>{item.name}</span>
              {item.count > 1 && <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', color: '#9d9280' }}>x{item.count}</span>}
            </div>
          ))}
          {player.inventory.length === 0 && (
            <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '0.75rem', color: '#6e6656', fontStyle: 'italic' }}>empty</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ArchivePage() {
  const [selectedPlayer, setSelectedPlayer] = useState(0)
  const [busy, setBusy] = useState(false)
  const [cachedRun, setCachedRun] = useState<RunSummary | null>(null)
  const navigate = useNavigate()
  const roomToken = getRoomToken()
  const { room } = useRoomSocket(roomToken)

  const selfPlayerId = roomToken ? (decodeRoomToken(roomToken)?.playerId ?? null) : null
  const run = room?.runSummary ?? cachedRun
  const acceptedIds = room?.acceptedPlayerIds ?? []
  const hasAccepted = selfPlayerId !== null && acceptedIds.includes(selfPlayerId)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('citadel.archive')
      if (!raw) return
      const all: (RunSummary & { date: number })[] = JSON.parse(raw)
      if (all.length > 0) setCachedRun(all[all.length - 1])
    } catch {}
  }, [])

  useEffect(() => {
    if (room?.status !== 'lobby') return
    setStage(2)
    navigate({ to: '/lobby' })
  }, [room?.status, navigate])

  useEffect(() => {
    if (!run) return
    try {
      const key = 'citadel.archive'
      const existing: (RunSummary & { date: number })[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      const alreadySaved = existing.some((s) => s.floor === run.floor && s.totalXP === run.totalXP && s.roomsExplored === run.roomsExplored)
      if (!alreadySaved) {
        existing.push({ ...run, date: Date.now() } as RunSummary & { date: number })
        localStorage.setItem(key, JSON.stringify(existing.slice(-20)))
      }
    } catch {}
  }, [run])

  const player = run?.players[selectedPlayer] ?? null

  const handleAccept = async () => {
    if (!roomToken || hasAccepted) return
    setBusy(true)
    try {
      await returnToLobby(roomToken)
    } catch {}
    setBusy(false)
  }

  return (
    <div className="archive">
      <header className="archive__head">
        <div>
          <span className="archive__eyebrow">tactical archive</span>
          <h1 className="archive__title">Expedition Folio</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {run && (
            <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.625rem', color: '#9d9280' }}>
              {acceptedIds.length}/{room?.players.length ?? 0} ready
            </span>
          )}
          {roomToken && run && (
            <button
              type="button"
              onClick={handleAccept}
              disabled={busy || hasAccepted}
              className={`bento-btn${hasAccepted ? ' bento-btn--ghost' : ' bento-btn--primary'}`}
              style={{ fontSize: '0.625rem' }}
            >
              {hasAccepted ? 'accepted' : 'accept'}
            </button>
          )}
          {!roomToken && (
            <button type="button" onClick={() => { clearRoomSession(); setStage(1); navigate({ to: '/chamber' }) }} className="bento-btn bento-btn--ghost" style={{ fontSize: '0.625rem' }}>
              return to gate
            </button>
          )}
        </div>
      </header>

      {!run ? (
        <div className="archive__empty">
          <span style={{ fontFamily: '"Cinzel", serif', fontSize: '1rem', color: '#6e6656' }}>No expedition recorded yet.</span>
          <p style={{ fontFamily: '"EB Garamond", serif', fontSize: '0.875rem', color: '#9d9280', marginTop: '0.5rem' }}>Complete a descent to see your folio here.</p>
        </div>
      ) : (
        <>
          {/* Run stats strip */}
          <div className="archive__status-strip">
            <div className="archive__status-left">
              <span className="archive__status-label">Floor</span>
              <span className="archive__status-value" style={{ color: '#c084fc' }}>{run.floor}</span>
            </div>
            <div className="archive__status-left">
              <span className="archive__status-label">Rooms</span>
              <span className="archive__status-value">{run.roomsExplored}</span>
            </div>
            <div className="archive__status-left">
              <span className="archive__status-label">Enemies</span>
              <span className="archive__status-value">{run.enemiesDefeated}</span>
            </div>
            <div className="archive__status-left">
              <span className="archive__status-label">XP</span>
              <span className="archive__status-value" style={{ color: '#f2ca50' }}>{run.totalXP}</span>
            </div>
            <div className="archive__status-left">
              <span className="archive__status-label">Gold</span>
              <span className="archive__status-value" style={{ color: '#d4af37' }}>{run.totalGold}</span>
            </div>
            <div className="archive__status-left">
              <span className="archive__status-label">Items</span>
              <span className="archive__status-value">{run.itemsFound}</span>
            </div>
          </div>

          {/* Player tabs */}
          <div className="archive__tabs">
            {run.players.map((p, i) => (
              <button
                key={p.name}
                type="button"
                className={`archive__tab${i === selectedPlayer ? ' archive__tab--active' : ''}`}
                onClick={() => setSelectedPlayer(i)}
              >
                <Icon icon={kitIcon(p.kit)} style={{ fontSize: '0.75rem' }} />
                <span>{p.name}</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', color: '#c084fc' }}>Lv.{p.level}</span>
              </button>
            ))}
          </div>

          {/* Full player detail */}
          {player && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '1rem', background: 'rgba(22,18,32,0.5)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: '0.5rem' }}>
              <PlayerDetail player={player} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export const Route = createFileRoute('/archive')({
  component: ArchivePage,
})
