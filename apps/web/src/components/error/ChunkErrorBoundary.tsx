'use client'

import React, { Component, ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error
    const isChunkError = error.name === 'ChunkLoadError' || 
                        error.message.includes('Loading chunk') ||
                        error.message.includes('Loading CSS chunk')
    
    return { 
      hasError: true, 
      error: isChunkError ? error : undefined 
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ChunkErrorBoundary caught an error:', error, errorInfo)
    
    // Check if it's a chunk loading error
    const isChunkError = error.name === 'ChunkLoadError' || 
                        error.message.includes('Loading chunk') ||
                        error.message.includes('Loading CSS chunk')
    
    if (isChunkError) {
      this.setState({
        hasError: true,
        error,
        errorInfo
      })
    }
  }

  handleReload = () => {
    // Clear cache and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <RefreshCw className="h-6 w-6 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              Application Update Required
            </h1>
            
            <p className="text-sm text-gray-600 mb-6">
              The application has been updated. Please refresh the page to load the latest version.
            </p>
            
            <button
              onClick={this.handleReload}
              className="w-full bg-primary hover:bg-primary-600 text-black font-medium py-2 px-4 rounded-lg transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Application</span>
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              This usually happens after deployments or updates.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ChunkErrorBoundary
