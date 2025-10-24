'use client'

import { useState } from 'react'
import { sheetsTestSuite } from '@/lib/sheets/test'
import { Play, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

export default function TestSheetsPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [performanceResults, setPerformanceResults] = useState<any>(null)
  const [consistencyResult, setConsistencyResult] = useState<boolean | null>(null)

  const runTests = async () => {
    setIsRunning(true)
    setTestResults(null)
    setPerformanceResults(null)
    setConsistencyResult(null)

    try {
      // Run main test suite
      const results = await sheetsTestSuite.runAllTests()
      setTestResults(results)

      // Run performance tests
      const perfResults = await sheetsTestSuite.testPerformance()
      setPerformanceResults(perfResults)

      // Run consistency test
      const consistency = await sheetsTestSuite.testDataConsistency()
      setConsistencyResult(consistency)

    } catch (error) {
      console.error('Test execution failed:', error)
      setTestResults({
        success: false,
        results: {},
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getTestIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  const formatTestName = (testName: string) => {
    return testName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Google Sheets Integration Test</h1>
          <p className="text-gray-600 mt-1">Test the Google Sheets integration functionality</p>
        </div>

        {/* Test Controls */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-black">Test Suite</h2>
              <p className="text-sm text-gray-600">Run comprehensive tests for Google Sheets integration</p>
            </div>
            <button
              onClick={runTests}
              disabled={isRunning}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Run Tests</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Main Test Results */}
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                {getTestIcon(testResults.success)}
                <h3 className="text-lg font-semibold text-black">
                  Test Results {testResults.success ? '(PASSED)' : '(FAILED)'}
                </h3>
              </div>
              
              <div className="space-y-2">
                {Object.entries(testResults.results).map(([testName, passed]) => (
                  <div key={testName} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{formatTestName(testName)}</span>
                    {getTestIcon(passed as boolean)}
                  </div>
                ))}
              </div>

              {testResults.errors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-800">Errors</span>
                  </div>
                  <ul className="text-xs text-red-700 space-y-1">
                    {testResults.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Performance Results */}
            {performanceResults && (
              <div className="card">
                <h3 className="text-lg font-semibold text-black mb-4">Performance Results</h3>
                <div className="space-y-2">
                  {Object.entries(performanceResults).map(([operation, time]) => (
                    <div key={operation} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{formatTestName(operation)}</span>
                      <span className={`text-sm font-mono ${
                        (time as number) < 1000 ? 'text-green-600' : 
                        (time as number) < 3000 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(time as number).toFixed(2)}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data Consistency */}
        {consistencyResult !== null && (
          <div className="card mb-6">
            <div className="flex items-center space-x-2">
              {getTestIcon(consistencyResult)}
              <h3 className="text-lg font-semibold text-black">
                Data Consistency {consistencyResult ? '(PASSED)' : '(FAILED)'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {consistencyResult 
                ? 'Data is consistent across multiple requests'
                : 'Data inconsistency detected - check for race conditions or caching issues'
              }
            </p>
          </div>
        )}

        {/* Test Information */}
        <div className="card">
          <h3 className="text-lg font-semibold text-black mb-4">Test Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tests Included:</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Basic connectivity</li>
                <li>• User operations (CRUD)</li>
                <li>• Task operations (CRUD)</li>
                <li>• Leave application operations</li>
                <li>• WFH application operations</li>
                <li>• Error handling</li>
                <li>• Data consistency</li>
                <li>• Performance benchmarks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">What&apos;s Tested:</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Google Sheets API connectivity</li>
                <li>• Data transformation accuracy</li>
                <li>• Authentication flows</li>
                <li>• Error handling robustness</li>
                <li>• Response time performance</li>
                <li>• Data integrity</li>
                <li>• Admin user handling</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Create a Google Cloud Project and enable Google Sheets API</li>
            <li>2. Create a Service Account and download the JSON credentials</li>
            <li>3. Add the credentials to your .env.local file</li>
            <li>4. Share your Google Sheet with the service account email</li>
            <li>5. Run the tests to verify the integration</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
