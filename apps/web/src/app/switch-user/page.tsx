'use client'

import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth'

export default function SwitchUserPage() {
  const router = useRouter()

  const switchToTopManagement = async () => {
    // Clear old window cache before logging in
    if (typeof window !== 'undefined') {
      delete (window as any).__DASHBOARD_DATA
    }

    const success = await login('AM-0001', 'password123')
    if (success) {
      alert('✅ Switched to Top Management!')
      router.push('/reports')
    } else {
      alert('❌ Failed to login as Top Management (AM-0001). Check credentials/server.')
    }
  }

  const switchToEmployee = async () => {
    // Clear old window cache before logging in
    if (typeof window !== 'undefined') {
      delete (window as any).__DASHBOARD_DATA
    }

    const success = await login('AM-0002', 'password456')
    if (success) {
      alert('✅ Switched to Employee!')
      router.push('/dashboard')
    } else {
      alert('❌ Failed to login as Employee (AM-0002). Check credentials/server.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🔄 User Switcher (Development Only)</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800">
          This page allows you to switch between different user roles for testing the Reports access.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={switchToTopManagement}
          className="w-full bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition-colors"
        >
          🏢 Switch to Top Management (Vikas Mahesh)
          <div className="text-sm opacity-90 mt-1">
            Role: top_management • Can access Reports
          </div>
        </button>

        <button
          onClick={switchToEmployee}
          className="w-full bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
        >
          👤 Switch to Employee (Shubham Pawar)
          <div className="text-sm opacity-90 mt-1">
            Role: employee • Cannot access Reports
          </div>
        </button>

        <button
          onClick={() => router.push('/reports')}
          className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
        >
          📊 Test Reports Access
          <div className="text-sm opacity-90 mt-1">
            Go to Reports page to test access
          </div>
        </button>
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">📋 Testing Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>Click "Switch to Top Management" to login as Vikas Mahesh</li>
          <li>Click "Test Reports Access" - should work without redirect</li>
          <li>Click "Switch to Employee" to login as Shubham Pawar</li>
          <li>Click "Test Reports Access" - should redirect to dashboard</li>
        </ol>
      </div>
    </div>
  )
}
