import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-6 bg-white border-[1.5px] border-dashed border-border rounded-lg ${className}`}>
      <Icon className="mx-auto mb-3.5 h-12 w-12 text-stone-300" strokeWidth={1.5} />
      <h3 className="text-lg font-bold tracking-[-0.015em] text-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted max-w-[320px] mx-auto mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
