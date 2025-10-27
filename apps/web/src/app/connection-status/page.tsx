'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

export default function ConnectionStatusPage() {
  const [connectionStatus, setConnectionStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [isCreatingTabs, setIsCreatingTabs] = useState(false)
  const [tabCreationResult, setTabCreationResult] = useState<any>(null)

  useEffect(() => {
    checkEnvironmentVariables()
  }, [])

  const checkEnvironmentVariables = () => {
    // Check if environment variables are set (client-side check)
    const envVars = {
      GOOGLE_PROJECT_ID: process.env.NEXT_PUBLIC_GOOGLE_PROJECT_ID || 'Not set',
      GOOGLE_CLIENT_EMAIL: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_EMAIL || 'Not set (server-side only)',
      GOOGLE_PRIVATE_KEY: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY ? 'Set (hidden)' : 'Not set (server-side only)'
    }
    
    setEnvStatus(envVars)
  }

  const testConnection = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sheets/init')
      const result = await response.json()
      setConnectionStatus(result)
    } catch (error) {
      setConnectionStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createTabs = async () => {
    setIsCreatingTabs(true)
    try {
      const response = await fetch('/api/sheets/create-tabs', { method: 'POST' })
      const result = await response.json()
      setTabCreationResult(result)
    } catch (error) {
      setTabCreationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsCreatingTabs(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Google Sheets Connection Status</h1>
          <p className="text-gray-600 mt-1">Check your Google Sheets integration setup</p>
        </div>

        {/* Environment Variables Status */}
        <div className="card mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-black">Environment Variables</h3>
          </div>
          
          {envStatus && (
            <div className="space-y-2">
              {Object.entries(envStatus).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-mono text-gray-700">{key}</span>
                  <span className={`text-sm ${
                    value === 'Not set' || value === 'Not set (server-side only)' 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {value as string}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Most environment variables are server-side only for security. 
              The actual values are not visible in the browser.
            </p>
          </div>
        </div>

        {/* Connection Test */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-black">Google Sheets Connection Test</h3>
              <p className="text-sm text-gray-600">Test the actual connection to Google Sheets API</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={testConnection}
                disabled={isLoading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              <button
                onClick={createTabs}
                disabled={isCreatingTabs || !connectionStatus?.success}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isCreatingTabs ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Create Tabs</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {connectionStatus && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(connectionStatus.success)}
                <span className="font-medium">
                  Connection {connectionStatus.success ? 'Successful' : 'Failed'}
                </span>
              </div>

              {connectionStatus.success && connectionStatus.title && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Sheet Title:</strong> {connectionStatus.title}
                  </p>
                  {connectionStatus.sheets && (
                    <div className="mt-2">
                      <p className="text-sm text-green-800 font-medium">Available Sheets:</p>
                      <ul className="text-sm text-green-700 mt-1">
                        {connectionStatus.sheets.map((sheet: string, index: number) => (
                          <li key={index}>• {sheet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!connectionStatus.success && connectionStatus.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {connectionStatus.error}
                  </p>
                </div>
              )}

              {connectionStatus.migrationPerformed && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>Migration Status:</strong> {connectionStatus.migrationResult?.success ? 'Completed' : 'Failed'}
                  </p>
                  {connectionStatus.migrationResult?.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-blue-800 font-medium">Migration Errors:</p>
                      <ul className="text-sm text-blue-700 mt-1">
                        {connectionStatus.migrationResult.errors.map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab Creation Result */}
          {tabCreationResult && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-2">
                {getStatusIcon(tabCreationResult.success)}
                <span className="font-medium">
                  Tab Creation {tabCreationResult.success ? 'Successful' : 'Failed'}
                </span>
              </div>

              {tabCreationResult.success && tabCreationResult.sheetsCreated && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Tabs Created:</strong> {tabCreationResult.sheetsCreated.join(', ')}
                  </p>
                </div>
              )}

              {!tabCreationResult.success && tabCreationResult.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {tabCreationResult.error}
                  </p>
                </div>
              )}

              {tabCreationResult.errors && tabCreationResult.errors.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mt-2">
                  <p className="text-sm text-yellow-800 font-medium">Warnings:</p>
                  <ul className="text-sm text-yellow-700 mt-1">
                    {tabCreationResult.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">Setup Instructions</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create Google Cloud Project</h4>
                <p className="text-sm text-gray-600">Go to Google Cloud Console and create a new project</p>
                <a 
                  href="https://console.cloud.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-sm text-orange-600 hover:text-orange-700 mt-1"
                >
                  <span>Open Google Cloud Console</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Enable Google Sheets API</h4>
                <p className="text-sm text-gray-600">Enable the Google Sheets API for your project</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create Service Account</h4>
                <p className="text-sm text-gray-600">Create a service account and download the JSON credentials</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Update Environment Variables</h4>
                <p className="text-sm text-gray-600">Add the credentials to your .env.local file</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                5
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Share Google Sheet</h4>
                <p className="text-sm text-gray-600">Share your Google Sheet with the service account email</p>
                <a
                  href="https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-sm text-orange-600 hover:text-orange-700 mt-1"
                >
                  <span>Open Target Google Sheet</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card">
          <h3 className="text-lg font-semibold text-black mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="/test-sheets" 
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">Comprehensive Tests</h4>
              <p className="text-sm text-gray-600">Run full integration test suite</p>
            </a>
            <a 
              href="/dashboard" 
              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h4 className="font-medium text-gray-900">Dashboard</h4>
              <p className="text-sm text-gray-600">Go to main application</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
