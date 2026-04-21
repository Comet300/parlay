import type { HTMLAttributes } from 'react'

const variantStyles = {
  default: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success-strong',
  warning: 'bg-warning-subtle text-warning-strong',
  danger: 'bg-error-subtle text-error-strong',
  accent: 'bg-accent-subtle text-accent-strong',
} as const

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-[10px] font-bold tracking-[0.05em] uppercase ${variantStyles[variant]} ${className}`}
      {...props}
    />
  )
}
