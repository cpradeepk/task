'use client'

import { useState } from 'react'
import { Upload, Download, Users, AlertTriangle, CheckCircle, FileText } from 'lucide-react'

import { User } from '@/lib/types'

interface ImportStats {
  total: number
  successful: number
  failed: number
  errors: string[]
}

export default function UserImport() {
  const [isImporting, setIsImporting] = useState(false)
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [csvData, setCsvData] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sample CSV format for users
  const sampleCsvData = `Employee_ID,Name,Email,Phone,Department,Role,Password,Manager_Email,Telegram_Token,Is_Today_Task,Warning_Count
EL-0001,John Doe,john@eassy.life,+91-9876543210,Technology,employee,password123,manager@eassy.life,,false,0
EL-0002,Jane Smith,jane@eassy.life,+91-9876543211,Marketing,employee,password456,manager@eassy.life,,true,0
EL-0003,Manager User,manager@eassy.life,+91-9876543212,Technology,top_management,manager123,,,false,0`

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-import-sample.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const parseCsvData = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const users = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const user: any = {}
      
      headers.forEach((header, index) => {
        user[header] = values[index] || ''
      })
      
      users.push(user)
    }

    return users
  }

  const transformCsvUser = (csvUser: any): Omit<User, 'createdAt' | 'updatedAt'> => {
    return {
      employeeId: csvUser.Employee_ID || '',
      name: csvUser.Name || '',
      email: csvUser.Email || '',
      phone: csvUser.Phone || '',
      telegramToken: csvUser.Telegram_Token || undefined,
      department: csvUser.Department || '',
      managerEmail: csvUser.Manager_Email || undefined,
      managerId: undefined, // Will be resolved after import
      isTodayTask: csvUser.Is_Today_Task?.toLowerCase() === 'true',
      warningCount: parseInt(csvUser.Warning_Count || '0'),
      role: csvUser.Role?.toLowerCase() || 'employee',
      password: csvUser.Password || '',
      status: 'active'
    }
  }

  const validateUser = (user: Omit<User, 'createdAt' | 'updatedAt'>): string[] => {
    const errors: string[] = []
    
    if (!user.employeeId) errors.push('Employee ID is required')
    if (!user.name) errors.push('Name is required')
    if (!user.email) errors.push('Email is required')
    if (!user.phone) errors.push('Phone is required')
    if (!user.department) errors.push('Department is required')
    if (!user.password) errors.push('Password is required')
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (user.email && !emailRegex.test(user.email)) {
      errors.push('Invalid email format')
    }
    
    // Validate role
    const validRoles = ['admin', 'top_management', 'management', 'employee']
    if (!validRoles.includes(user.role)) {
      errors.push('Invalid role (must be: admin, top_management, management, or employee)')
    }

    return errors
  }

  const handleImport = async () => {
    if (!csvData.trim()) {
      setMessage({ type: 'error', text: 'Please paste CSV data before importing' })
      return
    }

    setIsImporting(true)
    setMessage(null)
    setImportStats(null)

    try {
      // Parse CSV data
      const csvUsers = parseCsvData(csvData)
      if (csvUsers.length === 0) {
        setMessage({ type: 'error', text: 'No valid user data found in CSV' })
        return
      }

      const stats: ImportStats = {
        total: csvUsers.length,
        successful: 0,
        failed: 0,
        errors: []
      }

      // Process each user
      for (let i = 0; i < csvUsers.length; i++) {
        const csvUser = csvUsers[i]
        
        try {
          // Transform and validate user
          const user = transformCsvUser(csvUser)
          const validationErrors = validateUser(user)
          
          if (validationErrors.length > 0) {
            stats.failed++
            stats.errors.push(`Row ${i + 2}: ${validationErrors.join(', ')}`)
            continue
          }

          // Add user to system via API
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(user)
          })

          if (!response.ok) {
            throw new Error('Failed to add user')
          }
          stats.successful++
          
        } catch (error) {
          stats.failed++
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          stats.errors.push(`Row ${i + 2} (${csvUser.Employee_ID || 'Unknown ID'}): ${errorMsg}`)
        }
      }

      setImportStats(stats)
      
      if (stats.successful > 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully imported ${stats.successful} out of ${stats.total} users` 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: 'No users were imported successfully. Check the errors below.' 
        })
      }

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvData(text)
    }
    reader.readAsText(file)
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center space-x-2">
        <Users className="h-5 w-5" />
        <span>User Import</span>
      </h3>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 mb-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Sample CSV Download */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">CSV Format</h4>
        <p className="text-sm text-blue-700 mb-3">
          Download the sample CSV file to see the required format for user import.
        </p>
        <button
          onClick={downloadSampleCsv}
          className="btn-secondary flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* File Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Upload CSV File
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-secondary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-black hover:file:bg-primary-600"
        />
      </div>

      {/* CSV Data Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Or Paste CSV Data
        </label>
        <textarea
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          placeholder="Paste your CSV data here..."
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={isImporting || !csvData.trim()}
        className="btn-primary flex items-center space-x-2 disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />
        <span>{isImporting ? 'Importing...' : 'Import Users'}</span>
      </button>

      {/* Import Statistics */}
      {importStats && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-secondary-900 mb-3">Import Results</h4>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{importStats.total}</div>
              <div className="text-sm text-secondary-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{importStats.successful}</div>
              <div className="text-sm text-secondary-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{importStats.failed}</div>
              <div className="text-sm text-secondary-600">Failed</div>
            </div>
          </div>

          {importStats.errors.length > 0 && (
            <div>
              <h5 className="font-medium text-red-900 mb-2">Errors:</h5>
              <div className="max-h-32 overflow-y-auto">
                {importStats.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 mb-1">
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
