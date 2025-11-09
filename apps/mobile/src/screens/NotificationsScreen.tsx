/**
 * Notifications Screen
 * Displays list of notifications with mark as read functionality
 * 
 * Features:
 * - List of notifications (mentions, comments, reactions, etc.)
 * - Mark as read on tap
 * - Mark all as read button
 * - Pull-to-refresh
 * - Navigate to related content
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery, useMutation } from '@apollo/client'
import {
  GET_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from '../config/graphql-queries'

interface Notification {
  id: string
  type: string
  message: string
  relatedId: string | null
  relatedType: string | null
  isRead: boolean
  createdAt: string
  createdBy: string
}

export default function NotificationsScreen() {
  const navigation = useNavigation()

  // GraphQL queries and mutations
  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    fetchPolicy: 'cache-and-network',
  })

  const [markAsRead] = useMutation(MARK_NOTIFICATION_READ)
  const [markAllAsRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ)

  const notifications = data?.notifications || []

  const handleRefresh = async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
    }
  }

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await markAsRead({
          variables: { notificationId: notification.id },
        })
        refetch()
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }

    // Navigate to related content
    if (notification.relatedType === 'feed_post' && notification.relatedId) {
      navigation.navigate('FeedPostDetails' as never, { postId: notification.relatedId } as never)
    } else if (notification.relatedType === 'task' && notification.relatedId) {
      navigation.navigate('TaskDetails' as never, { taskId: notification.relatedId } as never)
    } else if (notification.relatedType === 'bug' && notification.relatedId) {
      navigation.navigate('BugDetails' as never, { bugId: notification.relatedId } as never)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      refetch()
      Alert.alert('Success', 'All notifications marked as read')
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '👤'
      case 'comment':
        return '💬'
      case 'reaction':
        return '❤️'
      case 'post_approved':
        return '✅'
      case 'post_rejected':
        return '❌'
      case 'reply':
        return '↩️'
      default:
        return '🔔'
    }
  }

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.isRead && styles.notificationCardUnread,
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.iconText}>{getNotificationIcon(item.type)}</Text>
      </View>
      <View style={styles.notificationContent}>
        <Text
          style={[
            styles.notificationMessage,
            !item.isRead && styles.notificationMessageUnread,
          ]}
        >
          {item.message}
        </Text>
        <Text style={styles.notificationDate}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header with Mark All as Read */}
      {notifications.length > 0 && notifications.some((n: Notification) => !n.isRead) && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllButtonText}>Mark All as Read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  markAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  notificationCardUnread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 4,
  },
  notificationMessageUnread: {
    fontWeight: '600',
    color: '#111827',
  },
  notificationDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
})


