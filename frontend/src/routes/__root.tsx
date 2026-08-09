import { Fragment, useEffect } from 'react'
import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { LedgerFrame } from '../components/LedgerFrame'
import { PageHead } from '../components/PageHead'
import { STAGES, readStage, setStage, stageIndexForPath, stagePath } from '../stages'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  const { status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const activeIndex = stageIndexForPath(location.pathname) ?? 0

  useEffect(() => {
    if (status === 'loading') return

    const current = stageIndexForPath(location.pathname)
    if (current === null) {
      navigate({ to: '/' })
      return
    }

    if (status === 'anonymous') {
      setStage(0)
      if (current !== 0) {
        navigate({ to: '/' })
      }
      return
    }

    const stored = readStage()
    if (current !== stored) {
      navigate({ to: stagePath(stored) })
    }
  }, [status, location.pathname, navigate])

  if (status === 'loading') {
    return (
      <div className="app">
        <main className="page">
          <LedgerFrame>
            <PageHead
              kicker="records of the citadel · office of the descent"
              title="The Citadel"
              wordmark
              officer="Opening the record…"
            />
          </LedgerFrame>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <main className="page">
        <Outlet />
      </main>
      <footer className="recordbar">
        <div className="recordbar__inner">
          {STAGES.map((stage, i) => {
            const state = i < activeIndex ? 'past' : i > activeIndex ? 'future' : 'active'
            return (
              <Fragment key={stage.path}>
                {i > 0 && (
                  <span className="recordbar__sep" aria-hidden="true">
                    ·
                  </span>
                )}
                <span
                  className={`recordbar__stage recordbar__stage--${state}`}
                  aria-current={state === 'active' ? 'step' : undefined}
                >
                  {stage.label}
                </span>
              </Fragment>
            )
          })}
        </div>
      </footer>
    </div>
  )
}
