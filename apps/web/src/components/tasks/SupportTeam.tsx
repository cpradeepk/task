'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { getUserNameByEmployeeId } from '@/lib/auth'

interface SupportTeamProps {
  supportIds: string[] | null | undefined
  className?: string
  showIcon?: boolean
}

/**
 * Component to display support team members
 * Shows comma-separated list of support team member names
 */
export default function SupportTeam({ 
  supportIds, 
  className = '', 
  showIcon = true
}: SupportTeamProps) {
  const [supportNames, setSupportNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSupportNames = async () => {
      setIsLoading(true)
      
      if (!supportIds || supportIds.length === 0) {
        setSupportNames([])
        setIsLoading(false)
        return
      }
      
      // Fetch all support team member names
      const names = await Promise.all(
        supportIds.map(id => getUserNameByEmployeeId(id))
      )
      
      setSupportNames(names)
      setIsLoading(false)
    }

    loadSupportNames()
  }, [supportIds])

  if (isLoading) {
    return null
  }

  if (supportNames.length === 0) {
    return null
  }

  return (
    <span className={className}>
      {showIcon && <Users className="h-4 w-4 inline mr-1" />}
      {supportNames.join(', ')}
    </span>
  )
}

