import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-[var(--radius-card)] shadow-card ${className}`}
      {...props}
    />
  )
}
