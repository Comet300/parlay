import type { HTMLAttributes } from 'react'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

export function Skeleton({ className = '', style, ...props }: SkeletonProps) {
  return (
    <div
      className={`rounded-[var(--r)] ${className}`}
      style={{
        background:
          'linear-gradient(90deg, var(--border-light) 0%, var(--bg) 50%, var(--border-light) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shim 1.4s linear infinite',
        ...style,
      }}
      {...props}
    />
  )
}
