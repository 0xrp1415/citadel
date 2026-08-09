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
      <svg viewBox="0 0 16 16" width={small ? 10 : 14} height={small ? 10 : 14} fill="none">
        <path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" stroke="currentColor" strokeWidth="1" />
        <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      </svg>
      <i />
    </span>
  )
}
