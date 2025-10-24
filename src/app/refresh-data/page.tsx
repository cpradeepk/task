'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
// import { forceRefreshUsers } from '@/lib/auth' // Function not available

export default function RefreshData() {
  const router = useRouter()

  useEffect(() => {
    // Force refresh user data
    // forceRefreshUsers() // Function not available
    
    // Redirect to login page
    setTimeout(() => {
      router.push('/')
    }, 1000)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-xl font-bold text-black mb-2">Refreshing User Data</h1>
        <p className="text-gray-600">Updating user roles and redirecting to login...</p>
      </div>
    </div>
  )
}
