import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { Fleuron } from '../components/Fleuron'
import { setStage } from '../stages'

export const Route = createFileRoute('/lobby')({
  component: Lobby,
})

const SLOTS = [1, 2, 3, 4]

function Lobby() {
  const { user } = useAuth()

  return (
    <LedgerFrame wide>
      <PageHead
        kicker="staging grounds · pre-descent processing"
        title="The Staging Grounds"
        officer="Your file is open. Await your party."
      />

      <div className="grounds">
        <section className="panel grounds__roll" aria-label="Party roll">
          <div className="panel__head">
            <span className="panel__title">Party roll</span>
            <span className="panel__sub">party size · 4</span>
          </div>
          <ol className="roll">
            {SLOTS.map((slot) => {
              const isYou = slot === 1
              return (
                <li key={slot} className={isYou ? 'roll__row roll__row--you' : 'roll__row'}>
                  <span className="roll__no">{String(slot).padStart(2, '0')}</span>
                  <span className="roll__name">
                    {isYou ? (user?.name ?? 'Unnamed prisoner') : '— awaiting entry —'}
                  </span>
                  {isYou && <span className="roll__tag">you</span>}
                </li>
              )
            })}
          </ol>
          <Fleuron small className="grounds__fleuron" />
          <p className="grounds__note">
            The party roll awaits. Share your code with the condemned you will descend beside.
          </p>
        </section>

        <section className="panel grounds__expedition" aria-label="The expedition">
          <div className="panel__head">
            <span className="panel__title">The expedition</span>
            <span className="panel__sub">record nº · pending</span>
          </div>
          <dl className="idline">
            <div className="idline__row">
              <dt className="idline__k">Invite code</dt>
              <dd className="idline__v idline__v--code">····</dd>
            </div>
            <div className="idline__row">
              <dt className="idline__k">Condition</dt>
              <dd className="idline__v">Awaiting party</dd>
            </div>
          </dl>
          <p className="grounds__note">The code is issued when the expedition is recorded.</p>
          <div className="intake__actions intake__actions--stacked grounds__actions">
            <Link to="/run" className="btn btn--primary" onClick={() => setStage(2)}>
              Open the gate
            </Link>
            <Link to="/" className="btn btn--ghost" onClick={() => setStage(0)}>
              Return to the gate
            </Link>
          </div>
        </section>
      </div>
    </LedgerFrame>
  )
}
