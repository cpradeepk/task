import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
  subtitle?: string
  onClick?: () => void
  isActive?: boolean
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
  onClick,
  isActive = false
}: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-primary-50 text-black border-primary-200',
    green: 'bg-primary text-black border-primary-600',
    yellow: 'bg-primary-200 text-black border-primary-400',
    red: 'bg-gray-200 text-black border-gray-400',
    purple: 'bg-primary-100 text-black border-primary-300',
    gray: 'bg-gray-100 text-black border-gray-300'
  }

  const iconColorClasses = {
    blue: 'text-primary',
    green: 'text-black',
    yellow: 'text-black',
    red: 'text-black',
    purple: 'text-black',
    gray: 'text-black'
  }

  const baseClasses = onClick
    ? "card cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 transform"
    : "card"

  const activeClasses = isActive
    ? "ring-2 ring-primary ring-opacity-50 bg-primary-50"
    : ""

  return (
    <div
      className={`${baseClasses} ${activeClasses}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-black mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className={`h-6 w-6 ${iconColorClasses[color]}`} />
        </div>
      </div>
    </div>
  )
}
