'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/layout/Navbar'
import { 
  ArrowLeft, 
  Save, 
  AlertOctagon, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react'

interface AppConfig {
  minAndroidVersion: string
  minIosVersion: string
  androidUrl: string
  iosUrl: string
  maintenanceMode: boolean
}

export default function AppManagement() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  const [config, setConfig] = useState<AppConfig>({
    minAndroidVersion: '1.0.0',
    minIosVersion: '1.0.0',
    androidUrl: '',
    iosUrl: '',
    maintenanceMode: false
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
        setConfig(result.data)
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
      const response = await fetch('/api/settings/app-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      const result = await response.json()
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Configuration updated and synced to Firestore! ${result.firestoreSynced ? '(Firestore Synced)' : '(Firestore Sync Pending)'}` 
        })
        setConfig(result.data)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update app configuration' })
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
              <span>App Management</span>
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Control mobile app update flags and maintenance configurations
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
          
          {/* Section: Maintenance Mode */}
          <div className="card space-y-6">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                  <span>Maintenance Mode</span>
                </h3>
                <p className="text-sm text-gray-600 max-w-lg">
                  When enabled, mobile users will be blocked from accessing any API data or screens and shown a maintenance status page in real time.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input 
                  type="checkbox" 
                  checked={config.maintenanceMode} 
                  onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {config.maintenanceMode && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3 animate-in slide-in-from-top-2 duration-300">
                <AlertOctagon className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs text-rose-800 space-y-1">
                  <p className="font-bold uppercase tracking-wider">⚠️ Maintenance Mode is Active!</p>
                  <p>All mobile users are currently locked out of the app. Deactivate this switch once backend maintenance or deployments are completed to restore access.</p>
                </div>
              </div>
            )}
          </div>

          {/* Section: Version Thresholds & Links */}
          <div className="card space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">
              Force Update Specifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Android Configuration */}
              <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 font-bold text-gray-800">
                  <span className="text-xl">🤖</span>
                  <span>Android App Details</span>
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
                    className="input-field"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Play Store / Download URL
                  </label>
                  <div className="relative">
                    <input 
                      type="url" 
                      placeholder="https://play.google.com/..."
                      value={config.androidUrl} 
                      onChange={(e) => setConfig({ ...config, androidUrl: e.target.value })}
                      className="input-field pr-8"
                      required
                    />
                    {config.androidUrl && (
                      <a 
                        href={config.androidUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* iOS Configuration */}
              <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 font-bold text-gray-800">
                  <span className="text-xl">🍏</span>
                  <span>iOS App Details</span>
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
                    className="input-field"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    App Store URL
                  </label>
                  <div className="relative">
                    <input 
                      type="url" 
                      placeholder="https://apps.apple.com/..."
                      value={config.iosUrl} 
                      onChange={(e) => setConfig({ ...config, iosUrl: e.target.value })}
                      className="input-field pr-8"
                      required
                    />
                    {config.iosUrl && (
                      <a 
                        href={config.iosUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
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
              className="btn-secondary text-sm px-5 py-2.5"
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center space-x-2 text-sm px-6 py-2.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save & Sync Settings</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
