import type { ReactNode } from 'react'

interface LedgerFrameProps {
  wide?: boolean
  className?: string
  children: ReactNode
}

export function LedgerFrame({ wide = false, className = '', children }: LedgerFrameProps) {
  return (
    <div className={`ledger${wide ? ' ledger--wide' : ''} ${className}`.trim()}>
      <span className="corner corner--tl" aria-hidden="true" />
      <span className="corner corner--tr" aria-hidden="true" />
      <span className="corner corner--bl" aria-hidden="true" />
      <span className="corner corner--br" aria-hidden="true" />
      {children}
    </div>
  )
}
