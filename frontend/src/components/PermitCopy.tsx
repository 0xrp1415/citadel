import { useState } from 'react'

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

interface PermitCopyProps {
  code: string
  label?: string
  className?: string
}

export function PermitCopy({ code, label, className = '' }: PermitCopyProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await copyText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      className={`permit-copy${className ? ` ${className}` : ''}`}
      onClick={handleCopy}
      title={`Copy permit ${code}`}
    >
      {label && <span className="permit-copy__label">{label}</span>}
      <span className="permit-copy__code">{code}</span>
      <span
        className={`permit-copy__hint${copied ? ' permit-copy__hint--ok' : ''}`}
        aria-live="polite"
      >
        {copied ? 'copied' : 'copy'}
      </span>
    </button>
  )
}
