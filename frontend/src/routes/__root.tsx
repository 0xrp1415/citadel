import { Fragment, useEffect } from 'react'
import { Link, createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { STAGES, readStage, setStage, stageIndexForPath, stagePath } from '../stages'
import type { StageIndex } from '../stages'
import { getRoomToken } from '../roomSession'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  const { status, user } = useAuth()
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
    const hasRoom = !!getRoomToken()
    const effective = hasRoom && stored < 2 ? 2 : stored
    if (current !== effective) {
      setStage(effective as StageIndex)
      navigate({ to: stagePath(effective as StageIndex) })
    }
  }, [status, location.pathname, navigate])

  if (status === 'loading') {
    return (
      <div className="app">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="officer">Communing with the Nexus…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <Link className="header__brand" to={status === 'authenticated' ? '/chamber' : '/'} aria-label="Citadel">
            <div className="header__brand-text">
              <span className="header__citadel">CITADEL</span>
            </div>
          </Link>

          <nav className="header__nav" aria-label="Stages">
            {STAGES.map((stage, i) => {
              const state = i < activeIndex ? 'past' : i > activeIndex ? 'future' : 'active'
              return (
                <Fragment key={stage.path}>
                  {i > 0 && <span className="header__nav-divider" aria-hidden="true">◇</span>}
                  <Link
                    to={stagePath(i as StageIndex)}
                    className={`header__nav-link header__nav-link--${state}`}
                    aria-current={state === 'active' ? 'page' : undefined}
                  >
                    <span>{stage.label}</span>
                    {state === 'active' && <span className="header__nav-sub">// {stage.sublabel}</span>}
                  </Link>
                </Fragment>
              )
            })}
          </nav>

          <div className="header__right">
            {user && (
              <div className="header__user">
                <div className="header__user-info">
                  <span className="header__user-label">Cognomen Seal</span>
                  <span className="header__user-name">{user.name}</span>
                </div>
                <div className="header__avatar">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>person</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer__left">
          <span>© MMXXIV Citadel Scholomance • In Umbra Sapientia</span>
        </div>
        <div className="footer__right">
          <span>Celestial Seal Validated</span>
          <span className="material-symbols-outlined" style={{ color: '#8a702b', fontSize: '1rem' }}>fingerprint</span>
          <span className="footer__wards">Wards Active</span>
        </div>
      </footer>
    </div>
  )
}
