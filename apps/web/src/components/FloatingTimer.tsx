'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square } from 'lucide-react'

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
        credentials: 'include',
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

    // Log to activity log with hh:mm:ss format
    try {
      const timeFormatted = formatTime(currentTime) // Already in hh:mm:ss format
      await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entityType: timerData.entityType,
          entityId: timerData.entityId,
          actionType: 'time_logged',
          description: `Logged ${timeFormatted} (timer entry)`,
          isComment: false
        })
      })
    } catch (error) {
      console.error('Failed to log time to activity log:', error)
    }

    // Clear timer from localStorage
    localStorage.removeItem('activeTimer')

    // Clear timer state
    setTimerData(null)
    setCurrentTime(0)

    // Close the floating timer widget
    if (onClose) {
      onClose()
    }
  }

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    // Always show HH:MM:SS format
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  if (!timerData) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-3 py-2"
      style={{ minWidth: '180px', maxWidth: '280px' }}
    >
      {/* Task Name */}
      <div className="mb-1.5 text-xs font-medium text-gray-700 truncate" title={timerData.entityTitle}>
        {timerData.entityTitle}
      </div>

      {/* Timer Display */}
      <div className="flex items-center justify-between space-x-2">
        <div className="text-sm font-mono font-semibold text-gray-900">
          {formatTime(currentTime)}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-1">
          {timerData.state === 'running' ? (
            <button
              onClick={handlePause}
              className="w-7 h-7 flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-colors"
              title="Pause"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="w-7 h-7 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
              title="Start"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleStop}
            className="w-7 h-7 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            title="Stop"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

