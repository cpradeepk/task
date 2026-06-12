/**
 * Notification Bell Component
 * Displays notification icon with unread count badge
 * 
 * Features:
 * - Unread count badge
 * - Auto-refresh every 60 seconds
 * - Navigate to notifications screen on press
 */

import React, { useEffect, useState } from 'react'
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@apollo/client/react'
import { GET_UNREAD_COUNT, GET_NOTIFICATIONS } from '../config/graphql-queries'
import { getUserData } from '../utils/secureStorage'
import { useToast } from '../contexts/ToastContext'

export default function NotificationBell() {
  const navigation = useNavigation<any>()
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [shownNotifications, setShownNotifications] = useState<Record<string, boolean>>({})
  const { showToast } = useToast()

  useEffect(() => {
    getUserData().then(user => {
      if (user) {
        setCurrentUser(user)
      }
    })
  }, [])

  const { data, error } = useQuery<any, any>(GET_UNREAD_COUNT, {
    variables: { userId: currentUser?.employeeId },
    skip: !currentUser?.employeeId,
    fetchPolicy: 'network-only',
    pollInterval: 10000, // Poll every 10 seconds for quick testing
  })

  // Poll for latest notifications list to detect new unread notifications
  const { data: notificationsData } = useQuery<any, any>(GET_NOTIFICATIONS, {
    variables: { userId: currentUser?.employeeId, limit: 10 },
    skip: !currentUser?.employeeId,
    fetchPolicy: 'network-only',
    pollInterval: 10000, // Poll every 10 seconds for quick testing
  })

  useEffect(() => {
    console.log('[NotificationBell] currentUser:', currentUser?.employeeId)
    if (error) {
      console.error('[NotificationBell] error:', error)
    }
    if (data) {
      console.log('[NotificationBell] data:', data)
    }
  }, [currentUser, data, error])

  useEffect(() => {
    if (data?.unreadNotificationCount !== undefined) {
      setUnreadCount(data.unreadNotificationCount)
    }
  }, [data])

  // In-app notifications banner logic
  useEffect(() => {
    if (notificationsData?.feedNotifications) {
      const items = notificationsData.feedNotifications
      const updatedShown = { ...shownNotifications }
      let hasNew = false
      const isFirstLoad = Object.keys(shownNotifications).length === 0
      const now = Date.now()

      items.forEach((item: any) => {
        if (!updatedShown[item.notificationId]) {
          updatedShown[item.notificationId] = true
          
          // Conditions for showing banner:
          // 1. It must be unread (item.isRead === false)
          // 2. Either it's a new poll item (not isFirstLoad) OR it was created in the last 5 minutes (recent)
          const isRecent = now - parseInt(item.createdAt, 10) < 300000
          const shouldShowBanner = !item.isRead && (!isFirstLoad || isRecent)

          if (shouldShowBanner) {
            // Show premium in-app toast notification banner
            showToast(`🔔 ${item.title}: ${item.message || ''}`, 'info')
            hasNew = true
          }
        }
      })

      if (isFirstLoad || hasNew) {
        setShownNotifications(updatedShown)
      }
    }
  }, [notificationsData, shownNotifications, showToast])

  const handlePress = () => {
    navigation.navigate('Notifications' as never)
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Text style={styles.bellIcon}>🔔</Text>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginRight: 16,
    padding: 8,
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
})

