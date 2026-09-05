import { useEffect, useState } from 'react'

const DISCONNECT_TIMEOUT_MS = 60_000

export function DisconnectCountdown({ disconnectedAt }: { disconnectedAt: number }) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((DISCONNECT_TIMEOUT_MS - (Date.now() - disconnectedAt)) / 1000)),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((DISCONNECT_TIMEOUT_MS - (Date.now() - disconnectedAt)) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [disconnectedAt])

  return (
    <span className="delver__countdown">
      {secondsLeft > 0 ? `${secondsLeft}s` : 'expiring…'}
    </span>
  )
}
