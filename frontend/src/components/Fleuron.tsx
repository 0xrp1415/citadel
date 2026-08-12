interface FleuronProps {
  className?: string
  small?: boolean
}

export function Fleuron({ className = '', small = false }: FleuronProps) {
  return (
    <span
      className={`fleuron${small ? ' fleuron--small' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <i />
      <svg viewBox="0 0 16 16" width={small ? 12 : 14} height={small ? 12 : 14} fill="none">
        <path
          d="M8 2 C12 6, 13 10, 8 14 C3 10, 4 6, 8 2 Z"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle cx="8" cy="8" r="1.3" fill="currentColor" />
      </svg>
      <i />
    </span>
  )
}
