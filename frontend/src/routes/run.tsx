import { createFileRoute, Link } from '@tanstack/react-router'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { setStage } from '../stages'

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

function Run() {
  return (
    <LedgerFrame wide>
      <PageHead
        kicker="the descent · continuous record"
        title="The Descent"
        officer="Descent begins. It will be recorded."
      />

      <section className="panel" aria-label="Running record">
        <div className="panel__head">
          <span className="panel__title">Record of descent</span>
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

      <div className="intake__actions">
        <Link to="/lobby" className="btn btn--ghost" onClick={() => setStage(1)}>
          Return to staging
        </Link>
      </div>
    </LedgerFrame>
  )
}
