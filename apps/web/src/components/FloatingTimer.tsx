'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, X, Minimize2, Maximize2, Clock } from 'lucide-react'

interface TimerSession {
  startTime: number
  endTime?: number
  duration: number
}

interface TimerData {
  entityType: 'task' | 'bug'
  entityId: string
  entityTitle: string
  state: 'stopped' | 'running' | 'paused'
  startTime: number | null
  pausedTime: number
  totalTime: number
  sessions: TimerSession[]
}

interface FloatingTimerProps {
  onClose?: () => void
}

export default function FloatingTimer({ onClose }: FloatingTimerProps) {
  const [timerData, setTimerData] = useState<TimerData | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const dragRef = useRef({ startX: 0, startY: 0 })
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load timer data from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem('activeTimer')
    if (savedTimer) {
      try {
        const data = JSON.parse(savedTimer) as TimerData
        setTimerData(data)
        
        // Calculate current time if timer is running
        if (data.state === 'running' && data.startTime) {
          const elapsed = Date.now() - data.startTime
          setCurrentTime(data.totalTime + elapsed)
        } else {
          setCurrentTime(data.totalTime)
        }
      } catch (error) {
        console.error('Failed to load timer data:', error)
        localStorage.removeItem('activeTimer')
      }
    }
  }, [])

  // Update current time every second when running
  useEffect(() => {
    if (timerData?.state === 'running' && timerData.startTime) {
      tickIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - timerData.startTime!
        setCurrentTime(timerData.totalTime + elapsed)
      }, 1000)

      return () => {
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current)
        }
      }
    }
  }, [timerData?.state, timerData?.startTime, timerData?.totalTime])

  // Sync to backend every 5 minutes when running
  useEffect(() => {
    if (timerData?.state === 'running') {
      syncIntervalRef.current = setInterval(() => {
        syncToBackend()
      }, 5 * 60 * 1000) // 5 minutes

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current)
        }
      }
    }
  }, [timerData?.state])

  // Save to localStorage whenever timer data changes
  useEffect(() => {
    if (timerData) {
      localStorage.setItem('activeTimer', JSON.stringify(timerData))
    } else {
      localStorage.removeItem('activeTimer')
    }
  }, [timerData])

  const syncToBackend = async () => {
    if (!timerData) return

    try {
      const response = await fetch('/api/time-tracking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: timerData.entityType,
          entityId: timerData.entityId,
          state: timerData.state,
          totalTime: currentTime,
          sessions: timerData.sessions
        })
      })

      if (!response.ok) {
        console.error('Failed to sync timer to backend')
      }
    } catch (error) {
      console.error('Error syncing timer:', error)
    }
  }

  const handleStart = () => {
    if (!timerData) return

    const now = Date.now()
    const newSession: TimerSession = {
      startTime: now,
      duration: 0
    }

    setTimerData({
      ...timerData,
      state: 'running',
      startTime: now,
      sessions: [...timerData.sessions, newSession]
    })
  }

  const handlePause = () => {
    if (!timerData || !timerData.startTime) return

    const now = Date.now()
    const elapsed = now - timerData.startTime
    const newTotalTime = timerData.totalTime + elapsed

    // Update last session
    const sessions = [...timerData.sessions]
    if (sessions.length > 0) {
      sessions[sessions.length - 1] = {
        ...sessions[sessions.length - 1],
        endTime: now,
        duration: elapsed
      }
    }

    setTimerData({
      ...timerData,
      state: 'paused',
      startTime: null,
      totalTime: newTotalTime,
      sessions
    })
    setCurrentTime(newTotalTime)

    // Sync to backend immediately on pause
    syncToBackend()
  }

  const handleStop = async () => {
    if (!timerData) return

    // Pause first to calculate final time
    if (timerData.state === 'running') {
      handlePause()
    }

    // Sync final state to backend
    await syncToBackend()

    // Log to activity log
    try {
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: timerData.entityType,
          entityId: timerData.entityId,
          actionType: 'time_logged',
          description: `Logged ${formatTime(currentTime)} of work`,
          isComment: false
        })
      })
    } catch (error) {
      console.error('Failed to log time to activity log:', error)
    }

    // Clear timer
    setTimerData(null)
    setCurrentTime(0)
    
    if (onClose) {
      onClose()
    }
  }

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  if (!timerData) return null

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-blue-500"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '200px' : '320px',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-t-lg cursor-grab active:cursor-grabbing flex items-center justify-between"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span className="font-semibold text-sm">Timer</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-blue-700 rounded p-1 transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </button>
          <button
            onClick={handleStop}
            className="hover:bg-blue-700 rounded p-1 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4">
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">
              {timerData.entityType === 'task' ? 'Task' : 'Bug'}
            </div>
            <div className="font-medium text-sm text-gray-900 truncate">
              {timerData.entityTitle}
            </div>
          </div>

          <div className="text-center mb-4">
            <div className="text-3xl font-mono font-bold text-gray-900">
              {formatTime(currentTime)}
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2">
            {timerData.state === 'running' ? (
              <button
                onClick={handlePause}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
              >
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <Play className="h-4 w-4" />
                <span>Start</span>
              </button>
            )}
            <button
              onClick={handleStop}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <Square className="h-4 w-4" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}

      {/* Minimized view */}
      {isMinimized && (
        <div className="p-2 text-center">
          <div className="text-lg font-mono font-bold text-gray-900">
            {formatTime(currentTime)}
          </div>
        </div>
      )}
    </div>
  )
}

