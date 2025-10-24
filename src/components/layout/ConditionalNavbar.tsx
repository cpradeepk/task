'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { User } from '@/lib/types'
import Navbar from './Navbar'

export default function ConditionalNavbar() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isClient, setIsClient] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsClient(true)
    setCurrentUser(getCurrentUser())
  }, [])

  // Don't render navbar if not on client
  if (!isClient) {
    return null
  }

  // Don't render navbar on login page or if no user is logged in
  if (pathname === '/' || !currentUser) {
    return null
  }

  return <Navbar />
}
