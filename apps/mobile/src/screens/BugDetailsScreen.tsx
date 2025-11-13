/**
 * Bug Details Screen
 * View bug details, comments, subtasks, timer, log hours
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import { Card, Text, Surface, Button, TextInput, ActivityIndicator, Chip, Divider } from 'react-native-paper'
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
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function BugDetailsScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()

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

  const formatTime = useCallback((milliseconds?: number | string): string => {
    if (!milliseconds) return '00:00:00'
    const ms = typeof milliseconds === 'string' ? Number(milliseconds) : milliseconds
    if (isNaN(ms)) return '00:00:00'
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={materialColors.primary} />
        <Text style={styles.loadingText}>Loading bug details...</Text>
      </View>
    )
  }

  if (!bug) {
    return (
      <Surface style={styles.errorContainer} elevation={0}>
        <Text style={styles.errorText}>Bug not found</Text>
      </Surface>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header Card */}
        <Card style={styles.headerCard} elevation={1}>
          <Card.Content>
            <View style={styles.header}>
              <Text style={styles.bugId}>{bug.bugId}</Text>
              <View style={styles.badges}>
                <Chip
                  mode="flat"
                  compact
                  style={[styles.statusChip, { backgroundColor: getStatusColor(bug.status) }]}
                  textStyle={styles.chipText}
                >
                  {bug.status}
                </Chip>
                <Chip
                  mode="flat"
                  compact
                  style={[styles.severityChip, { backgroundColor: getSeverityColor(bug.severity) }]}
                  textStyle={styles.chipText}
                >
                  {bug.severity}
                </Chip>
              </View>
            </View>
            <Text style={styles.title}>{bug.title}</Text>
          </Card.Content>
        </Card>

        {/* Description Card */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Description</Text>
            <Divider style={styles.divider} />
            <Text style={styles.description}>{bug.description}</Text>
          </Card.Content>
        </Card>

        {/* Bug Information Card */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Bug Information</Text>
            <Divider style={styles.divider} />
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
          </Card.Content>
        </Card>

        {/* Time Tracking Card */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Time Tracking</Text>
            <Divider style={styles.divider} />
            <View style={styles.timeContainer}>
              <Surface style={styles.timeItem} elevation={0}>
                <Text style={styles.timeLabel}>Timer</Text>
                <Text style={styles.timeValue}>
                  {formatTime(bug.timerTotalTime)}
                </Text>
              </Surface>
              <Surface style={styles.timeItem} elevation={0}>
                <Text style={styles.timeLabel}>Logged Hours</Text>
                <Text style={styles.timeValue}>
                  {bug.actualHours ? Number(bug.actualHours).toFixed(2) : '0.00'} hrs
                </Text>
              </Surface>
            </View>
          </Card.Content>
        </Card>

        {/* Subtasks Card */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <BugSubtasks bugId={bugId} editable={true} />
          </Card.Content>
        </Card>

        {/* Comments Card */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              Comments ({comments.length})
            </Text>
            <Divider style={styles.divider} />
            {comments.map((comment) => (
              <Surface key={comment.id} style={styles.comment} elevation={0}>
                <Text style={styles.commentUser}>{comment.userId}</Text>
                <Text style={styles.commentText}>{comment.comment}</Text>
                <Text style={styles.commentDate}>
                  {new Date(comment.createdAt).toLocaleString()}
                </Text>
              </Surface>
            ))}

            {/* Add Comment */}
            <View style={styles.addCommentContainer}>
              <TextInput
                mode="outlined"
                placeholder="Add a comment..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
                numberOfLines={3}
                style={styles.commentInput}
                outlineColor={materialColors.outline}
                activeOutlineColor={materialColors.primary}
                disabled={isOffline}
              />
              <Button
                mode="contained"
                onPress={handleAddComment}
                disabled={!newComment.trim() || isSubmittingComment || isOffline}
                loading={isSubmittingComment}
                style={styles.commentButton}
                buttonColor={materialColors.primary}
              >
                {isSubmittingComment ? 'Posting...' : 'Post Comment'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Status Change Buttons */}
      <Surface style={styles.actionBar} elevation={3}>
        {bug.status !== 'In Progress' && (
          <Button
            mode="contained"
            onPress={() => handleStatusChange('In Progress')}
            style={styles.actionButton}
            buttonColor={materialColors.warning}
            disabled={isOffline}
          >
            Start Progress
          </Button>
        )}
        {bug.status !== 'Resolved' && (
          <Button
            mode="contained"
            onPress={() => handleStatusChange('Resolved')}
            style={styles.actionButton}
            buttonColor={materialColors.success}
            disabled={isOffline}
          >
            Mark Resolved
          </Button>
        )}
      </Surface>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: materialColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: materialColors.background,
  },
  loadingText: {
    ...materialTypography.bodyLarge,
    color: materialColors.textSecondary,
    marginTop: materialSpacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: materialColors.background,
    padding: materialSpacing.xl,
  },
  errorText: {
    ...materialTypography.headlineSmall,
    color: materialColors.error,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: materialSpacing.md,
  },
  headerCard: {
    marginBottom: materialSpacing.md,
    backgroundColor: materialColors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: materialSpacing.sm,
  },
  bugId: {
    ...materialTypography.headlineMedium,
    color: materialColors.primary,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    gap: materialSpacing.xs,
  },
  statusChip: {
    height: 28,
  },
  severityChip: {
    height: 28,
  },
  chipText: {
    ...materialTypography.labelMedium,
    color: materialColors.surface,
  },
  title: {
    ...materialTypography.titleLarge,
    color: materialColors.text,
    marginTop: materialSpacing.xs,
  },
  sectionCard: {
    marginBottom: materialSpacing.md,
    backgroundColor: materialColors.surface,
  },
  sectionTitle: {
    ...materialTypography.titleMedium,
    color: materialColors.text,
    marginBottom: materialSpacing.xs,
  },
  divider: {
    marginBottom: materialSpacing.md,
    backgroundColor: materialColors.outline,
  },
  description: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
    lineHeight: 22,
  },
  infoGrid: {
    gap: materialSpacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: materialSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: materialColors.outline,
  },
  infoLabel: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
  },
  infoValue: {
    ...materialTypography.bodyMedium,
    color: materialColors.text,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: materialSpacing.md,
  },
  timeItem: {
    flex: 1,
    padding: materialSpacing.md,
    backgroundColor: materialColors.surfaceVariant,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeLabel: {
    ...materialTypography.labelMedium,
    color: materialColors.textSecondary,
    marginBottom: materialSpacing.xs,
  },
  timeValue: {
    ...materialTypography.headlineSmall,
    color: materialColors.text,
    fontWeight: '700',
  },
  comment: {
    padding: materialSpacing.md,
    backgroundColor: materialColors.surfaceVariant,
    borderRadius: 12,
    marginBottom: materialSpacing.sm,
  },
  commentUser: {
    ...materialTypography.labelLarge,
    color: materialColors.text,
    fontWeight: '600',
    marginBottom: materialSpacing.xs,
  },
  commentText: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
    marginBottom: materialSpacing.xs,
  },
  commentDate: {
    ...materialTypography.labelSmall,
    color: materialColors.textTertiary,
  },
  addCommentContainer: {
    marginTop: materialSpacing.md,
    gap: materialSpacing.sm,
  },
  commentInput: {
    backgroundColor: materialColors.surface,
  },
  commentButton: {
    marginTop: materialSpacing.xs,
  },
  actionBar: {
    flexDirection: 'row',
    padding: materialSpacing.md,
    gap: materialSpacing.sm,
    backgroundColor: materialColors.surface,
    borderTopWidth: 1,
    borderTopColor: materialColors.outline,
  },
  actionButton: {
    flex: 1,
  },
})

