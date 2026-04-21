interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={`h-1 w-full rounded-pill bg-stone-200 overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary rounded-pill transition-all duration-base"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
