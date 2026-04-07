import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-[var(--radius-card)] shadow-card ${className}`}
      {...props}
    />
  )
}
