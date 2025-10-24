'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { login, initializeUsers } from '@/lib/auth'
import LoadingButton from '@/components/ui/LoadingButton'
import { useLoading } from '@/contexts/LoadingContext'
import { Eye, EyeOff, User, Lock } from 'lucide-react'

export default function LoginForm() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { showGlobalLoading, hideGlobalLoading } = useLoading()

  // Initialize users on component mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeUsers()
      } catch (error) {
        console.error('Failed to initialize users:', error)
      }
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    showGlobalLoading('Signing in...')

    try {
      const success = await login(employeeId, password)

      if (success) {
        router.push('/dashboard')
      } else {
        setError('Invalid Employee ID or Password')
      }
    } catch {
      setError('An error occurred during login')
    } finally {
      setIsLoading(false)
      hideGlobalLoading()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 gradient-bg">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16">
            <Image
              src="/images/logos/eassylife.png"
              alt="EassyLife Logo"
              width={90}
              height={90}
              className="object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-black">
            EassyLife Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Job Status Report Management System
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 glass-effect border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-gray-100 border border-gray-300 text-black px-4 py-3 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-black mb-2">
                Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="input-field pl-10"
                  placeholder="e.g., EL-0001 or admin-001 (case-insensitive)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <LoadingButton
              type="submit"
              isLoading={isLoading}
              loadingText="Signing in..."
              variant="primary"
              className="w-full"
            >
              Sign in
            </LoadingButton>
          </form>

          {/* Login Information */}
          {/* <div className="mt-8 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="text-sm font-medium text-black mb-3">Authentication:</h3>
            <div className="text-xs text-black space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">User Credentials:</span>
                <span>From Google Sheets</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Admin Access:</span>
                <span>admin-001 / 1234</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Database:</span>
                <span>Google Sheets</span>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </div>
  )
}
