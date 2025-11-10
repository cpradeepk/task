/**
 * Bug Details Screen
 * View bug details, comments, subtasks, timer, log hours
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import {
  getBugById,
  getBugComments,
  addBugComment,
  updateBug,
  Bug,
  BugComment,
} from '../services/bugService'
import { getCurrentUser, User } from '../services/userService'
import { useRoute, useNavigation } from '@react-navigation/native'
import BugSubtasks from '../components/BugSubtasks'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

export default function BugDetailsScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const { bugId } = route.params as { bugId: string }

  const [bug, setBug] = useState<Bug | null>(null)
  const [comments, setComments] = useState<BugComment[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const user = await getCurrentUser()
      setCurrentUser(user)

      const [bugResponse, commentsResponse] = await Promise.all([
        getBugById(bugId),
        getBugComments(bugId),
      ])

      if (bugResponse.success && bugResponse.data) {
        setBug(bugResponse.data)
      }

      if (commentsResponse.success && commentsResponse.data) {
        setComments(commentsResponse.data)
      }
    } catch (error) {
      console.error('Failed to load bug details:', error)
      Alert.alert('Error', 'Failed to load bug details')
    } finally {
      setIsLoading(false)
    }
  }, [bugId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !currentUser) return

    try {
      setIsSubmittingComment(true)
      const response = await addBugComment(
        bugId,
        newComment.trim(),
        currentUser.employeeId
      )

      if (response.success) {
        setNewComment('')
        // Reload comments
        const commentsResponse = await getBugComments(bugId)
        if (commentsResponse.success && commentsResponse.data) {
          setComments(commentsResponse.data)
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to add comment')
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      Alert.alert('Error', 'Failed to add comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }, [newComment, currentUser, bugId, loadData])

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!bug) return

    try {
      const response = await updateBug(bugId, { status: newStatus })
      if (response.success && response.data) {
        setBug(response.data)
        Alert.alert('Success', 'Status updated successfully')
      } else {
        Alert.alert('Error', response.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      Alert.alert('Error', 'Failed to update status')
    }
  }, [bug, bugId])

  const getSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'Critical':
        return colors.error
      case 'Major':
        return '#F97316'
      case 'Minor':
        return colors.warning
      default:
        return colors.textSecondary
    }
  }, [colors])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'New':
        return colors.primary
      case 'In Progress':
        return colors.warning
      case 'Resolved':
        return colors.success
      case 'Closed':
        return colors.textSecondary
      case 'Reopened':
        return colors.error
      default:
        return colors.textSecondary
    }
  }, [colors])

  const formatTime = useCallback((milliseconds?: number): string => {
    if (!milliseconds) return '00:00:00'
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading bug details...</Text>
      </View>
    )
  }

  if (!bug) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Bug not found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.bugId}>{bug.bugId}</Text>
          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                { backgroundColor: getStatusColor(bug.status) },
              ]}
            >
              <Text style={styles.badgeText}>{bug.status}</Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: getSeverityColor(bug.severity) },
              ]}
            >
              <Text style={styles.badgeText}>{bug.severity}</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{bug.title}</Text>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{bug.description}</Text>
        </View>

        {/* Bug Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bug Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{bug.category}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>{bug.platform}</Text>
            </View>
            {bug.environment && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Environment</Text>
                <Text style={styles.infoValue}>{bug.environment}</Text>
              </View>
            )}
            {bug.browser && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Browser</Text>
                <Text style={styles.infoValue}>{bug.browser}</Text>
              </View>
            )}
            {bug.device && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Device</Text>
                <Text style={styles.infoValue}>{bug.device}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Time Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Tracking</Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Timer</Text>
              <Text style={styles.timeValue}>
                {formatTime(bug.timerTotalTime)}
              </Text>
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Logged Hours</Text>
              <Text style={styles.timeValue}>
                {bug.actualHours?.toFixed(2) || '0.00'} hrs
              </Text>
            </View>
          </View>
        </View>

        {/* Subtasks */}
        <View style={styles.section}>
          <BugSubtasks bugId={bugId} editable={true} />
        </View>

        {/* Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Comments ({comments.length})
          </Text>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <Text style={styles.commentUser}>{comment.userId}</Text>
              <Text style={styles.commentText}>{comment.comment}</Text>
              <Text style={styles.commentDate}>
                {new Date(comment.createdAt).toLocaleString()}
              </Text>
            </View>
          ))}

          {/* Add Comment */}
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.commentButton,
                (!newComment.trim() || isSubmittingComment) &&
                  styles.commentButtonDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || isSubmittingComment}
            >
              <Text style={styles.commentButtonText}>
                {isSubmittingComment ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Status Change Buttons */}
      <View style={styles.actionBar}>
        {bug.status !== 'In Progress' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EAB308' }]}
            onPress={() => handleStatusChange('In Progress')}
          >
            <Text style={styles.actionButtonText}>Start Progress</Text>
          </TouchableOpacity>
        )}
        {bug.status !== 'Resolved' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleStatusChange('Resolved')}
          >
            <Text style={styles.actionButtonText}>Mark Resolved</Text>
          </TouchableOpacity>
        )}
      </View>
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
  errorText: {
    fontSize: responsive.fontSize.md,
    color: colors.error,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsive.spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bugId: {
    fontSize: responsive.fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  badges: {
    flexDirection: 'row',
    gap: responsive.spacing.xs,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: responsive.borderRadius.lg,
  },
  badgeText: {
    fontSize: responsive.fontSize.xs,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  title: {
    fontSize: responsive.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    padding: responsive.spacing.md,
    backgroundColor: colors.card,
  },
  section: {
    marginTop: responsive.spacing.xs,
    padding: responsive.spacing.md,
    backgroundColor: colors.card,
  },
  sectionTitle: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: responsive.spacing.sm,
  },
  description: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  infoGrid: {
    gap: responsive.spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: responsive.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: responsive.fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: responsive.spacing.md,
  },
  timeItem: {
    flex: 1,
    padding: responsive.spacing.sm,
    backgroundColor: colors.background,
    borderRadius: responsive.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeLabel: {
    fontSize: responsive.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: responsive.spacing.xxs,
  },
  timeValue: {
    fontSize: responsive.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  comment: {
    padding: responsive.spacing.sm,
    backgroundColor: colors.background,
    borderRadius: responsive.borderRadius.md,
    marginBottom: responsive.spacing.xs,
  },
  commentUser: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: responsive.spacing.xxs,
  },
  commentText: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: responsive.spacing.xxs,
  },
  commentDate: {
    fontSize: responsive.fontSize.xs,
    color: colors.textTertiary,
  },
  addCommentContainer: {
    marginTop: responsive.spacing.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.sm,
    fontSize: responsive.fontSize.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: responsive.spacing.xs,
    color: colors.text,
    backgroundColor: colors.card,
  },
  commentButton: {
    backgroundColor: colors.primary,
    padding: responsive.spacing.sm,
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
  },
  commentButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    padding: responsive.spacing.sm,
    gap: responsive.spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    padding: responsive.spacing.md,
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
  },
})

