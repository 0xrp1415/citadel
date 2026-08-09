interface SealProps {
  label: string
}

const RING_LABEL = 'THE CITADEL · OFFICE OF RECORDS · THE CITADEL ·'

export function Seal({ label }: SealProps) {
  return (
    <span className="seal" role="img" aria-label={`Seal: ${label}`}>
      <svg className="seal__ring" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <circle cx="60" cy="60" r="58" stroke="currentColor" strokeWidth="1.5" />
        <circle
          cx="60"
          cy="60"
          r="51"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="1.5 3.5"
        />
        <circle cx="60" cy="60" r="45" stroke="currentColor" strokeWidth="0.5" opacity="0.55" />
        <path
          id="seal-rim"
          d="M60 60 m-34 0 a34 34 0 1 1 68 0 a34 34 0 1 1 -68 0"
        />
        <text
          fontSize="6.1"
          letterSpacing="0.6"
          style={{ fontFamily: 'Special Elite, monospace' }}
        >
          <textPath href="#seal-rim" textLength="213">
            {RING_LABEL}
          </textPath>
        </text>
      </svg>
      <span className="seal__stamp">{label}</span>
    </span>
  )
}
