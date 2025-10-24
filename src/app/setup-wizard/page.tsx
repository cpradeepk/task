'use client'

import { useState } from 'react'
import { CheckCircle, Circle, ExternalLink, Copy, Download, ArrowRight, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

export default function SetupWizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const steps = [
    {
      id: 1,
      title: 'Create Google Cloud Project',
      description: 'Set up a new Google Cloud project for the EassyLife system'
    },
    {
      id: 2,
      title: 'Enable Google Sheets API',
      description: 'Enable the Google Sheets API for your project'
    },
    {
      id: 3,
      title: 'Create Service Account',
      description: 'Create a service account and download credentials'
    },
    {
      id: 4,
      title: 'Configure Environment Variables',
      description: 'Add credentials to your .env.local file'
    },
    {
      id: 5,
      title: 'Share Google Sheet',
      description: 'Grant access to your Google Sheet'
    },
    {
      id: 6,
      title: 'Test Connection',
      description: 'Verify the integration is working'
    }
  ]

  const markStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black">Create Google Cloud Project</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                First, you need to create a Google Cloud project to use the Google Sheets API.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Go to the Google Cloud Console</li>
                <li>Click &quot;Select a project&quot; at the top</li>
                <li>Click &quot;New Project&quot;</li>
                <li>Enter project name: &quot;EassyLife Task Management&quot;</li>
                <li>Click &quot;Create&quot;</li>
              </ol>
              <a 
                href="https://console.cloud.google.com/projectcreate" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <span>Open Google Cloud Console</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black">Enable Google Sheets API</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                Enable the Google Sheets API for your project.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>In the Google Cloud Console, go to &quot;APIs &amp; Services&quot; → &quot;Library&quot;</li>
                <li>Search for &quot;Google Sheets API&quot;</li>
                <li>Click on &quot;Google Sheets API&quot;</li>
                <li>Click &quot;Enable&quot;</li>
                <li>Wait for the API to be enabled</li>
              </ol>
              <a 
                href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <span>Enable Google Sheets API</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black">Create Service Account</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                Create a service account to authenticate with Google Sheets.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Go to &quot;APIs &amp; Services&quot; → &quot;Credentials&quot;</li>
                <li>Click &quot;Create Credentials&quot; → &quot;Service Account&quot;</li>
                <li>Enter service account name: &quot;eassylife-sheets-service&quot;</li>
                <li>Click &quot;Create and Continue&quot;</li>
                <li>Skip role assignment (click &quot;Continue&quot;)</li>
                <li>Click &quot;Done&quot;</li>
                <li>Click on the created service account</li>
                <li>Go to &quot;Keys&quot; tab</li>
                <li>Click &quot;Add Key&quot; → &quot;Create new key&quot;</li>
                <li>Select &quot;JSON&quot; and click &quot;Create&quot;</li>
                <li>Download the JSON file</li>
              </ol>
              <a 
                href="https://console.cloud.google.com/iam-admin/serviceaccounts" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <span>Create Service Account</span>
                <ExternalLink className="h-4 w-4" />
              </a>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Save the service account email address - you&apos;ll need it in step 5!
                </p>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black">Configure Environment Variables</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                Add the service account credentials to your .env.local file.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Open the downloaded JSON file</li>
                <li>Copy the values to your .env.local file</li>
                <li>Replace the placeholder values with actual credentials</li>
                <li>Save the file</li>
                <li>Restart your development server</li>
              </ol>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Example .env.local:</span>
                  <button
                    onClick={() => copyToClipboard(`GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour-Private-Key-Here\\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com`)}
                    className="text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="text-xs text-gray-600 overflow-x-auto">
{`GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour-Private-Key-Here\\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com`}
                </pre>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800">
                  <strong>Security Note:</strong> Never commit the .env.local file to version control!
                </p>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black">Share Google Sheet</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                Grant your service account access to the Google Sheet.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Open the target Google Sheet</li>
                <li>Click the &quot;Share&quot; button</li>
                <li>Enter your service account email address</li>
                <li>Set permission to &quot;Editor&quot;</li>
                <li>Uncheck &quot;Notify people&quot;</li>
                <li>Click &quot;Share&quot;</li>
              </ol>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Target Google Sheet:</span>
                  <button
                    onClick={() => copyToClipboard('https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit')}
                    className="text-sm text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy URL</span>
                  </button>
                </div>
                <p className="text-xs text-gray-600 break-all">
                  https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit
                </p>
              </div>

              <a
                href="https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit"
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <span>Open Google Sheet</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black">Test Connection</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                Test your Google Sheets integration to make sure everything is working.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Go to the Connection Status page</li>
                <li>Click &quot;Test Connection&quot;</li>
                <li>Verify the connection is successful</li>
                <li>Check that the sheet tabs are created</li>
                <li>Run the comprehensive test suite</li>
              </ol>
              
              <div className="flex space-x-3">
                <a 
                  href="/connection-status" 
                  className="inline-flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <span>Test Connection</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a 
                  href="/test-sheets" 
                  className="inline-flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span>Run Full Tests</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  <strong>Success!</strong> Once the connection test passes, your Google Sheets integration is ready!
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Google Sheets Setup Wizard</h1>
          <p className="text-gray-600 mt-1">Follow these steps to set up Google Sheets integration</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      completedSteps.includes(step.id)
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </button>
                  <span className="text-xs text-gray-600 mt-1 text-center max-w-20">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-12 h-px bg-gray-300 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={() => markStepComplete(currentStep)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Mark Complete
            </button>
            
            <button
              onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
              disabled={currentStep === steps.length}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Completion Status */}
        {completedSteps.length === steps.length && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">Setup Complete!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your Google Sheets integration is now configured. You can start using the EassyLife system with cloud-based data storage.
            </p>
            <a 
              href="/dashboard" 
              className="inline-flex items-center space-x-2 mt-3 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
