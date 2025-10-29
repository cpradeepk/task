/**
 * Timer Service
 * 
 * Manages timer state in localStorage and provides helper functions
 * for starting, stopping, and managing timers across the application.
 */

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

/**
 * Start a timer for a task or bug
 * If another timer is running, it will be stopped first
 */
export async function startTimer(
  entityType: 'task' | 'bug',
  entityId: string,
  entityTitle: string
): Promise<void> {
  // Check if there's an active timer
  const existingTimer = getActiveTimer()
  
  if (existingTimer) {
    // Stop the existing timer first
    await stopTimer()
  }

  // Create new timer
  const now = Date.now()
  const newTimer: TimerData = {
    entityType,
    entityId,
    entityTitle,
    state: 'running',
    startTime: now,
    pausedTime: 0,
    totalTime: 0,
    sessions: [{
      startTime: now,
      duration: 0
    }]
  }

  // Save to localStorage
  localStorage.setItem('activeTimer', JSON.stringify(newTimer))

  // Log timer start to activity log
  try {
    await fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        entityId,
        actionType: 'timer_started',
        description: 'Timer started',
        isComment: false
      })
    })
  } catch (error) {
    console.error('Failed to log timer start:', error)
  }

  // Trigger storage event to notify FloatingTimer component
  window.dispatchEvent(new Event('storage'))
}

/**
 * Stop the active timer and sync to backend
 */
export async function stopTimer(): Promise<void> {
  const timer = getActiveTimer()
  if (!timer) return

  // Calculate final time
  let finalTime = timer.totalTime
  if (timer.state === 'running' && timer.startTime) {
    const elapsed = Date.now() - timer.startTime
    finalTime += elapsed
  }

  // Sync to backend
  try {
    await fetch('/api/time-tracking/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: timer.entityType,
        entityId: timer.entityId,
        state: 'stopped',
        totalTime: finalTime,
        sessions: timer.sessions
      })
    })
  } catch (error) {
    console.error('Failed to sync timer:', error)
  }

  // Log to activity log
  try {
    const hours = (finalTime / (1000 * 60 * 60)).toFixed(2)
    await fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: timer.entityType,
        entityId: timer.entityId,
        actionType: 'time_logged',
        description: `Logged ${hours} hours of work`,
        isComment: false
      })
    })
  } catch (error) {
    console.error('Failed to log time to activity log:', error)
  }

  // Clear from localStorage
  localStorage.removeItem('activeTimer')

  // Trigger storage event
  window.dispatchEvent(new Event('storage'))
}

/**
 * Get the currently active timer
 */
export function getActiveTimer(): TimerData | null {
  const savedTimer = localStorage.getItem('activeTimer')
  if (!savedTimer) return null

  try {
    return JSON.parse(savedTimer) as TimerData
  } catch (error) {
    console.error('Failed to parse timer data:', error)
    localStorage.removeItem('activeTimer')
    return null
  }
}

/**
 * Check if a timer is running for a specific entity
 */
export function isTimerRunning(entityType: 'task' | 'bug', entityId: string): boolean {
  const timer = getActiveTimer()
  return timer?.entityType === entityType && timer?.entityId === entityId && timer?.state === 'running'
}

/**
 * Get formatted time string (e.g., "2h 30m 15s")
 */
export function formatTime(ms: number): string {
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

/**
 * Convert milliseconds to hours (decimal)
 */
export function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60)
}

