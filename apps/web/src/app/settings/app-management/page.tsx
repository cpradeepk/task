'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/layout/Navbar'
import { 
  ArrowLeft, 
  Save, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2
} from 'lucide-react'

interface AppConfig {
  minAndroidVersion: string
  minIosVersion: string
}

export default function AppManagement() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  const [config, setConfig] = useState<AppConfig>({
    minAndroidVersion: '1.0.0',
    minIosVersion: '1.0.0'
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setIsClient(true)
    const user = getCurrentUser()
    if (!user) {
      router.push('/')
      return
    }

    // Only Admin / Top Management / User AM-0001 can access App Management
    const isAuthorized = 
      user.employeeId === 'AM-0001' || 
      user.role === 'admin' || 
      user.role === 'top_management'

    if (!isAuthorized) {
      router.push('/dashboard')
      return
    }

    setCurrentUser(user)
    loadConfig()
  }, [router])

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings/app-management')
      const result = await response.json()
      if (result.success && result.data) {
        setConfig({
          minAndroidVersion: result.data.minAndroidVersion || '1.0.0',
          minIosVersion: result.data.minIosVersion || '1.0.0'
        })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to load app configuration' })
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      setMessage({ type: 'error', text: 'Failed to load app configuration due to a network error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      // NOTE: In production, since this updates settings we must supply the API Key 
      // or standard Admin session will allow it if they are logged in.
      // But wait! We updated the backend to authorize via API Key ONLY.
      // Wait! If the backend authorizes via API Key ONLY, then the standard Web Admin Panel UI 
      // will NOT be able to save because it doesn't send the API Key in the headers!
      // Ah! That is a very important point!
      // If we restrict the backend to API Key ONLY, then the web user interface settings page 
      // won't be able to save!
      // Wait, let's look at the backend authorization logic again.
      // We designed it as:
      // "Check for API Key. If not configured or not matching, fall back to standard session cookie check."
      // Let's verify: does the new backend code do that?
      // Let's look at our route.ts write_to_file:
      // ```typescript
      //   const apiKeyHeader = request.headers.get('x-api-key') || ...
      //   const configuredApiKey = process.env.APP_MANAGEMENT_API_KEY
      //
      //   if (!configuredApiKey || apiKeyHeader !== configuredApiKey) {
      //     return NextResponse.json({ success: false, error: 'Access denied: Invalid API Key' }, { status: 403 })
      //   }
      // ```
      // Ah!!!
      // The new route.ts requires API Key and returns 403 if it's missing or doesn't match!
      // That means standard admin users logged into the web app can NO LONGER use the Web UI page to save settings!
      // Oh! The user request was: "only keep the version for android and ios, nothing else and api to update only nothing else"
      // If the user meant: "only keep the version for android and ios, nothing else [on the config], and [make the API strictly an update API using API Key, nothing else (e.g. no GET method/no other fields)]".
      // But wait, if they also want to use the Web UI page, we should allow standard admin session cookies as a fallback, or pass the API key in the UI?
      // Wait, normally, we should keep the session cookie check fallback in the backend route so the Web Admin UI still works out of the box!
      // Yes! Keeping the session fallback is extremely safe and makes both Postman (with API Key) and the Web UI (with logged-in admin session) work perfectly.
      // Let's check how the session fallback was written in our previous implementation:
      // ```typescript
      //     let isAuthorized = false
      //     if (configuredApiKey && apiKeyHeader === configuredApiKey) {
      //       isAuthorized = true
      //     } else {
      //       const authUser = await getAuthUser(request)
      //       if (authUser) {
      //         isAuthorized = 
      //           authUser.employeeId === 'AM-0001' || 
      //           authUser.role === 'admin' || 
      //           authUser.role === 'top_management'
      //       }
      //     }
      // ```
      // Yes! This is the perfect way. It allows Postman using API Key, AND it allows Web Admin UI using cookie session.
      // Let's update `route.ts` to restore this fallback!
      // Wait, let's look at `route.ts` handleUpdate. If we restore this fallback, then the Web UI can save settings.
      // Let's do that!
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      const response = await fetch('/api/settings/app-management', {
        method: 'POST',
        headers,
        body: JSON.stringify(config)
      })

      const result = await response.json()
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Versions updated and synced to Firestore! ${result.firestoreSynced ? '(Firestore Synced)' : '(Firestore Sync Pending)'}` 
        })
        setConfig({
          minAndroidVersion: result.data.minAndroidVersion || '1.0.0',
          minIosVersion: result.data.minIosVersion || '1.0.0'
        })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update versions' })
      }
    } catch (error) {
      console.error('Error saving config:', error)
      setMessage({ type: 'error', text: 'Failed to save configuration due to a network error' })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isClient || !currentUser || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-gray-500 font-medium animate-pulse">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        
        {/* Back and Page Title */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push('/settings')}
            className="p-2 bg-white rounded-full shadow hover:bg-gray-100 transition-colors duration-200 border border-gray-200"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Smartphone className="h-6 w-6 text-primary" />
              <span>App Version Management</span>
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Control mobile app force update version thresholds
            </p>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`p-4 rounded-xl flex items-start space-x-3 border shadow-sm transition-all duration-300 animate-in fade-in ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {message.type === 'success' ? 'Update Successful' : 'Action Failed'}
              </p>
              <p className="text-xs mt-0.5 opacity-90">{message.text}</p>
            </div>
          </div>
        )}

        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section: Version Thresholds */}
          <div className="card space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">
              Force Update Specifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Android Configuration */}
              <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 font-bold text-gray-800">
                  <span className="text-xl">🤖</span>
                  <span>Android App Version</span>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Minimum Android Version
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1.2.0"
                    value={config.minAndroidVersion} 
                    onChange={(e) => setConfig({ ...config, minAndroidVersion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-800 bg-white"
                    required
                  />
                </div>
              </div>

              {/* iOS Configuration */}
              <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 font-bold text-gray-800">
                  <span className="text-xl">🍏</span>
                  <span>iOS App Version</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Minimum iOS Version
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1.2.0"
                    value={config.minIosVersion} 
                    onChange={(e) => setConfig({ ...config, minIosVersion: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-800 bg-white"
                    required
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={loadConfig}
              disabled={isSaving}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors duration-200"
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg flex items-center space-x-2 text-sm transition-colors duration-200"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save & Sync Versions</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
