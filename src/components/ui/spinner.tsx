interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-primary-subtle ${className}`}
      style={{
        width: size,
        height: size,
        borderWidth: 2.5,
        borderTopColor: 'var(--primary)',
        animationDuration: '0.7s',
      }}
      role="status"
      aria-label="Loading"
    />
  )
}
