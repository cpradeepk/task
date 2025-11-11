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

import React, { useState, useCallback, useMemo } from 'react'
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
import { useQuery, useMutation } from '@apollo/client/react'
import {
  GET_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from '../config/graphql-queries'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

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
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  // GraphQL queries and mutations
  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    fetchPolicy: 'cache-and-network',
  })

  const [markAsRead] = useMutation(MARK_NOTIFICATION_READ)
  const [markAllAsRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ)

  const notifications = data?.notifications || []

  const handleRefresh = useCallback(async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
    }
  }, [refetch])

  const handleNotificationPress = useCallback(async (notification: Notification) => {
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
  }, [markAsRead, refetch, navigation])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead()
      refetch()
      Alert.alert('Success', 'All notifications marked as read')
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read')
    }
  }, [markAllAsRead, refetch])

  const getNotificationIcon = useCallback((type: string) => {
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
  }, [])

  const renderNotification = useCallback(({ item }: { item: Notification }) => (
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
  ), [styles, handleNotificationPress, getNotificationIcon])

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
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

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: responsive.spacing.sm,
    fontSize: responsive.fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.card,
    padding: responsive.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-end',
  },
  markAllButton: {
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: responsive.borderRadius.md,
  },
  markAllButtonText: {
    color: colors.card,
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    padding: responsive.spacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: responsive.borderRadius.lg,
    padding: responsive.spacing.md,
    marginBottom: responsive.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  notificationCardUnread: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsive.spacing.sm,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: responsive.fontSize.md,
    color: colors.text,
    marginBottom: responsive.spacing.xxs,
  },
  notificationMessageUnread: {
    fontWeight: '600',
    color: colors.text,
  },
  notificationDate: {
    fontSize: responsive.fontSize.xs,
    color: colors.textTertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: responsive.spacing.xs,
  },
  emptyContainer: {
    padding: responsive.spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: responsive.spacing.md,
  },
  emptyText: {
    fontSize: responsive.fontSize.md,
    color: colors.textTertiary,
    textAlign: 'center',
  },
})


