import type { ReactNode } from 'react'
import { OfficerLine } from './OfficerLine'
import { Fleuron } from './Fleuron'
import { Roundel } from './Roundel'

interface PageHeadProps {
  kicker: string
  title: string
  wordmark?: boolean
  waypoint?: boolean
  roundel?: string
  officer?: string
  children?: ReactNode
}

export function PageHead({
  kicker,
  title,
  wordmark = false,
  waypoint = false,
  roundel,
  officer,
  children,
}: PageHeadProps) {
  return (
    <header className="pagehead">
      <p className={`kicker${waypoint ? ' kicker--waypoint' : ''}`}>{kicker}</p>
      {wordmark ? (
        <>
          <Fleuron className="pagehead__fleurons" small />
          <h1 className="wordmark">{title}</h1>
          <Fleuron className="pagehead__fleurons" small />
          {roundel && <Roundel label={roundel} className="pagehead__roundel" />}
        </>
      ) : (
        <h1 className="title">{title}</h1>
      )}
      {officer && <OfficerLine text={officer} />}
      {children}
    </header>
  )
}
