'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { executeQuery, executeMutation } from '@/lib/graphql-client'

interface Notification {
  notificationId: string
  title: string
  message?: string
  linkUrl?: string
  isRead: boolean
  createdAt: string
  actor: {
    name: string
    employeeId: string
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const currentUser = getCurrentUser()

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!currentUser) return

    try {
      const query = `
        query GetUnreadCount($userId: String!) {
          unreadNotificationCount(userId: $userId)
        }
      `
      const data = await executeQuery(query, { userId: currentUser.employeeId })
      if (data && typeof data.unreadNotificationCount !== 'undefined') {
        setUnreadCount(data.unreadNotificationCount || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
      // Don't update count on error to avoid showing stale data
    }
  }

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      const query = `
        query GetNotifications($userId: String!, $limit: Int!) {
          feedNotifications(userId: $userId, limit: $limit) {
            notificationId
            title
            message
            linkUrl
            isRead
            createdAt
            actor {
              name
              employeeId
            }
          }
        }
      `
      const data = await executeQuery(query, {
        userId: currentUser.employeeId,
        limit: 10
      })
      if (data && data.feedNotifications) {
        setNotifications(data.feedNotifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Don't update notifications on error
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const mutation = `
        mutation MarkAsRead($notificationId: ID!) {
          markNotificationAsRead(notificationId: $notificationId) {
            notificationId
          }
        }
      `
      await executeMutation(mutation, { notificationId })

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.notificationId === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    if (!currentUser) return

    try {
      const mutation = `
        mutation MarkAllAsRead($userId: String!) {
          markAllNotificationsAsRead(userId: $userId)
        }
      `
      await executeMutation(mutation, { userId: currentUser.employeeId })

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.notificationId)
    }
    
    if (notification.linkUrl) {
      router.push(notification.linkUrl)
    }
    
    setIsOpen(false)
  }

  // Fetch unread count on mount and set up polling
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60000) // Poll every 60 seconds
    return () => clearInterval(interval)
  }, [currentUser])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!currentUser) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-black transition-colors rounded-md hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-[100000] max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary-dark font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 text-center">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.notificationId}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Unread Indicator */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5"></div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2">
              <button
                onClick={() => {
                  router.push('/notifications')
                  setIsOpen(false)
                }}
                className="text-xs text-primary hover:text-primary-dark font-medium w-full text-center"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

