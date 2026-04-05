import { Card } from './card'

interface MetricCardProps {
  value: string | number
  label: string
  className?: string
}

export function MetricCard({ value, label, className = '' }: MetricCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="text-3xl font-bold text-text">{value}</div>
      <div className="mt-1 text-sm text-text-muted">{label}</div>
    </Card>
  )
}
