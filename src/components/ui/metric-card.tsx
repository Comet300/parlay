import { Card } from './card'

interface MetricCardProps {
  value: string | number
  label: string
  className?: string
}

export function MetricCard({ value, label, className = '' }: MetricCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="text-[32px] font-extrabold tracking-[-0.032em] text-text leading-none">{value}</div>
      <div className="mt-2 text-xs font-medium text-text-muted">{label}</div>
    </Card>
  )
}
