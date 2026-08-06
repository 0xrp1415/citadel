import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  return (
    <>
      <Outlet />
      <nav className="fixed bottom-0 left-0 w-full border-t border-zinc-800 bg-zinc-950/90 px-4 py-2 text-sm text-zinc-500">
        <Link to="/" className="hover:text-zinc-300">
          Home
        </Link>
        <span className="mx-2">·</span>
        <Link to="/lobby" className="hover:text-zinc-300">
          Staging
        </Link>
        <span className="mx-2">·</span>
        <Link to="/run" className="hover:text-zinc-300">
          Run
        </Link>
      </nav>
    </>
  )
}
