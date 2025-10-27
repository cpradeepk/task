import { getStatusColor } from '@/lib/data'

interface StatusBadgeProps {
  status: string
  className?: string
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${getStatusColor(status)} ${className}`}>
      {status}
    </span>
  )
}
