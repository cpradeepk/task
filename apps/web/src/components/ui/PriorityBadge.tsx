import { getPriorityColor } from '@/lib/data'

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export default function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const priorityLabels = {
    'U&I': 'Urgent & Important',
    'NU&I': 'Not Urgent & Important',
    'NI&U': 'Not Important & Urgent',
    'NU&NI': 'Not Urgent & Not Important'
  }

  return (
    <span 
      className={`priority-badge ${getPriorityColor(priority)} ${className}`}
      title={priorityLabels[priority as keyof typeof priorityLabels] || priority}
    >
      {priority}
    </span>
  )
}
