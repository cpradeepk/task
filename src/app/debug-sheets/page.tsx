'use client'

import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface DebugResult {
  success: boolean
  error?: string
  debug: {
    environment: any
    configuration?: any
    sheetsAvailable?: boolean
    connectionTest?: any
    usersTest?: any
  }
}

export default function DebugSheetsPage() {
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runDebug = async () => {
    setIsLoading(true)
    setDebugResult(null)

    try {
      const response = await fetch('/api/debug/sheets')
      const result = await response.json()
      setDebugResult(result)
    } catch (error) {
      setDebugResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: { environment: {} }
      })
    } finally {
      setIsLoading(false)
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Google Sheets Debug</h1>
          <p className="text-gray-600 mt-1">Diagnose Google Sheets connection issues</p>
        </div>

        <div className="mb-6">
          <button
            onClick={runDebug}
            disabled={isLoading}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Running Debug...' : 'Run Debug Test'}</span>
          </button>
        </div>

        {debugResult && (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                {getStatusIcon(debugResult.success)}
                <h2 className="text-xl font-semibold text-black">
                  Overall Status: {debugResult.success ? 'SUCCESS' : 'FAILED'}
                </h2>
              </div>
              {debugResult.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Error:</p>
                  <p className="text-red-700">{debugResult.error}</p>
                </div>
              )}
            </div>

            {/* Environment Variables */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Environment Variables</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(debugResult.debug.environment).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-700">{key}:</span>
                    <div className="flex items-center space-x-2">
                      {typeof value === 'boolean' ? (
                        getStatusIcon(value)
                      ) : (
                        <span className="text-gray-900 font-mono text-sm">
                          {String(value).length > 50 ? `${String(value).substring(0, 50)}...` : String(value)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration */}
            {debugResult.debug.configuration && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-black mb-4">Configuration</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-700">Spreadsheet ID:</span>
                    <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {debugResult.debug.configuration.spreadsheetId}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-700">Sheet Names:</span>
                    <div className="ml-2 mt-1">
                      {Object.entries(debugResult.debug.configuration.sheets).map(([key, value]) => (
                        <span key={key} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2 mb-1">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Test */}
            {debugResult.debug.connectionTest && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  {getStatusIcon(debugResult.debug.connectionTest.success)}
                  <h3 className="text-lg font-semibold text-black">Connection Test</h3>
                </div>
                {debugResult.debug.connectionTest.success ? (
                  <div>
                    <p className="text-green-700">✅ Successfully connected to Google Sheets</p>
                    <p className="text-gray-600">Sheet Title: {debugResult.debug.connectionTest.title}</p>
                    <div className="mt-2">
                      <span className="text-gray-700">Available Sheets:</span>
                      <div className="ml-2 mt-1">
                        {debugResult.debug.connectionTest.sheets?.map((sheet: string, index: number) => (
                          <span key={index} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2 mb-1">
                            {sheet}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">❌ Connection failed</p>
                    <p className="text-red-700">{debugResult.debug.connectionTest.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Users Test */}
            {debugResult.debug.usersTest && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  {getStatusIcon(debugResult.debug.usersTest.success)}
                  <h3 className="text-lg font-semibold text-black">Users Data Test</h3>
                </div>
                {debugResult.debug.usersTest.success ? (
                  <div>
                    <p className="text-green-700">✅ Successfully retrieved user data</p>
                    <p className="text-gray-600">User Count: {debugResult.debug.usersTest.userCount}</p>
                    {debugResult.debug.usersTest.users && debugResult.debug.usersTest.users.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Sample Users:</h4>
                        <div className="space-y-2">
                          {debugResult.debug.usersTest.users.map((user: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-3 rounded border">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="font-medium">ID:</span> {user.employeeId}</div>
                                <div><span className="font-medium">Name:</span> {user.name}</div>
                                <div><span className="font-medium">Email:</span> {user.email}</div>
                                <div><span className="font-medium">Role:</span> {user.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">❌ Failed to retrieve users</p>
                    <p className="text-red-700">{debugResult.debug.usersTest.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Troubleshooting Steps</h3>
              <ol className="text-blue-800 space-y-2">
                <li>1. Ensure all environment variables are set correctly</li>
                <li>2. Verify the Google Sheet is shared with: web-jsr@task-management-449805.iam.gserviceaccount.com</li>
                <li>3. Check that the Google Sheet has the required tabs: UserDetails, JSR, Leave_Applications, WFH_Applications</li>
                <li>4. Verify the Google Sheets API is enabled in your Google Cloud Project</li>
                <li>5. Ensure the service account has the correct permissions</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
