import type { ReactNode } from 'react'
import { OfficerLine } from './OfficerLine'
import { Fleuron } from './Fleuron'

interface PageHeadProps {
  kicker: string
  title: string
  wordmark?: boolean
  officer?: string
  children?: ReactNode
}

export function PageHead({
  kicker,
  title,
  wordmark = false,
  officer,
  children,
}: PageHeadProps) {
  return (
    <header className="pagehead">
      <p className="kicker">{kicker}</p>
      {wordmark ? (
        <>
          <Fleuron className="pagehead__fleurons" small />
          <h1 className="wordmark">{title}</h1>
          <Fleuron className="pagehead__fleurons" small />
        </>
      ) : (
        <h1 className="title">{title}</h1>
      )}
      {officer && <OfficerLine text={officer} />}
      {children}
    </header>
  )
}
