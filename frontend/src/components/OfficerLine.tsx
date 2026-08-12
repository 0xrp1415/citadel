import { useEffect, useState } from 'react'

interface OfficerLineProps {
  text: string
  speed?: number
  startDelay?: number
  className?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function OfficerLine({
  text,
  speed = 26,
  startDelay = 350,
  className = '',
}: OfficerLineProps) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? text : ''))
  const typing = shown.length < text.length

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(text)
      return
    }
    let i = 0
    setShown('')
    const timer = window.setTimeout(() => {
      const interval = window.setInterval(() => {
        i += 1
        setShown(text.slice(0, i))
        if (i >= text.length) {
          window.clearInterval(interval)
        }
      }, speed)
    }, startDelay)
    return () => window.clearTimeout(timer)
  }, [text, speed, startDelay])

  return (
    <p className={`officer ${className}`.trim()}>
      <span className="officer__mark" aria-hidden="true">
        {'\u2192 '}
      </span>
      {shown}
      {typing && <span className="caret" aria-hidden="true" />}
    </p>
  )
}
