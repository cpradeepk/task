'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser } from '@/lib/auth'
import { Settings, AlertCircle } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import SettingsEditor from '@/components/admin/SettingsEditor'

export default function AdminSettingsPage() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const currentUser = getCurrentUser()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    // Check if user is logged in
    if (!currentUser) {
      router.push('/')
      return
    }

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    setIsLoading(false)
  }, [currentUser, router, isHydrated])

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner size="lg" message="Loading settings..." />
        </div>
      </div>
    )
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Access Denied</p>
              <p className="text-sm">You must be an administrator to access this page.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Settings Management</h1>
          </div>
          <p className="text-gray-600">
            Manage application settings including dropdown options, system configurations, and default values.
          </p>
        </div>

        {/* Settings Editor Component */}
        <SettingsEditor />
      </div>
    </div>
  )
}

