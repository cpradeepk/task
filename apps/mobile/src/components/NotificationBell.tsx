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
import { GET_UNREAD_COUNT } from '../config/graphql-queries'

export default function NotificationBell() {
  const navigation = useNavigation()
  const [unreadCount, setUnreadCount] = useState(0)

  // Query unread count with polling
  const { data, refetch } = useQuery(GET_UNREAD_COUNT, {
    fetchPolicy: 'network-only',
    pollInterval: 60000, // Poll every 60 seconds
  })

  useEffect(() => {
    if (data?.unreadNotificationCount !== undefined) {
      setUnreadCount(data.unreadNotificationCount)
    }
  }, [data])

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

