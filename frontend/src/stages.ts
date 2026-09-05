export const STAGES = [
  { path: '/', label: 'The Gate', sublabel: 'Inscription' },
  { path: '/chamber', label: 'Chamber Nexus', sublabel: 'Matchmaking' },
  { path: '/lobby', label: 'Staging Grounds', sublabel: 'Cadre Lobby' },
  { path: '/run', label: 'The Descent', sublabel: 'Live Run' },
] as const

export type StageIndex = 0 | 1 | 2 | 3

const STAGE_KEY = 'citadel.stage'

export function readStage(): StageIndex {
  const raw = sessionStorage.getItem(STAGE_KEY)
  const n = raw === null ? 0 : Number(raw)
  return n === 0 || n === 1 || n === 2 || n === 3 ? n : 0
}

export function setStage(index: StageIndex): void {
  sessionStorage.setItem(STAGE_KEY, String(index))
}

export function stageIndexForPath(pathname: string): StageIndex | null {
  const i = STAGES.findIndex((s) => s.path === pathname)
  return i === -1 ? null : (i as StageIndex)
}

export function stagePath(index: StageIndex): string {
  return STAGES[index].path
}
