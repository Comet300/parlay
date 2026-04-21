interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, disabled, className = '' }: ToggleProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none text-sm text-text ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative h-5 w-9 rounded-pill transition-colors duration-fast"
        style={{ background: checked ? 'var(--primary)' : 'var(--stone-300)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-fast ease-out"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
      {label && <span>{label}</span>}
    </label>
  )
}
