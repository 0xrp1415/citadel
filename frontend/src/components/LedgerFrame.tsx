import type { ReactNode } from 'react'

interface LedgerFrameProps {
  wide?: boolean
  xwide?: boolean
  className?: string
  children: ReactNode
}

export function LedgerFrame({ wide = false, xwide = false, className = '', children }: LedgerFrameProps) {
  const sizeClass = xwide ? ' ledger--xwide' : wide ? ' ledger--wide' : ''
  return (
    <div className={`ledger${sizeClass} ${className}`.trim()}>
      {children}
    </div>
  )
}
