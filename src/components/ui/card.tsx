import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ className = '', interactive = false, ...props }: CardProps) {
  const hover = interactive
    ? 'transition-all duration-base ease-out hover:shadow-e3 hover:-translate-y-px hover:border-stone-300'
    : ''
  return (
    <div
      className={`bg-surface border-[1.5px] border-border rounded-lg shadow-e1 ${hover} ${className}`}
      {...props}
    />
  )
}
