interface RoundelProps {
  label?: string
  className?: string
  size?: number
}

const BLOB =
  'M0 -46 C 22 -44, 44 -24, 45 -2 C 46 20, 28 43, 4 45 C -22 47, -45 30, -46 5 C -47 -20, -24 -47, 0 -46 Z'

export function Roundel({ label, className = '', size = 104 }: RoundelProps) {
  return (
    <span
      className={`roundel ${className}`.trim()}
      role="img"
      aria-label={label ? `Survey roundel: ${label}` : undefined}
    >
      <svg
        className="roundel__ring"
        viewBox="0 0 120 120"
        width={size}
        height={size}
        fill="none"
        aria-hidden="true"
      >
        <g transform="translate(60 60)" stroke="currentColor" strokeWidth="1">
          <path d={BLOB} transform="scale(1)" />
          <path d={BLOB} transform="scale(0.74)" opacity="0.85" />
          <path d={BLOB} transform="scale(0.5)" opacity="0.7" />
          <path d={BLOB} transform="scale(0.27)" opacity="0.55" />
        </g>
        <g stroke="currentColor" strokeWidth="1.5">
          <path d="M60 2v12M60 106v12M2 60h12M106 60h12" />
        </g>
        <circle cx="60" cy="60" r="3.5" fill="currentColor" stroke="none" />
      </svg>
      {label && <span className="roundel__label">{label}</span>}
    </span>
  )
}
