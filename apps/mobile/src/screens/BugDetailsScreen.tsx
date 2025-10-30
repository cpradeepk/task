/**
 * Bug Details Screen
 * View bug details, comments, subtasks, timer, log hours
 */

import React, { useState, useEffect } from 'react'
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

export default function BugDetailsScreen() {
  const route = useRoute()
  const navigation = useNavigation()
  const { bugId } = route.params as { bugId: string }

  const [bug, setBug] = useState<Bug | null>(null)
  const [comments, setComments] = useState<BugComment[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  useEffect(() => {
    loadData()
  }, [bugId])

  const loadData = async () => {
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
  }

  const handleAddComment = async () => {
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
  }

  const handleStatusChange = async (newStatus: string) => {
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
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return '#EF4444'
      case 'Major':
        return '#F97316'
      case 'Minor':
        return '#EAB308'
      default:
        return '#6B7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return '#3B82F6'
      case 'In Progress':
        return '#EAB308'
      case 'Resolved':
        return '#10B981'
      case 'Closed':
        return '#6B7280'
      case 'Reopened':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  const formatTime = (milliseconds?: number): string => {
    if (!milliseconds) return '00:00:00'
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bugId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  section: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  timeItem: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  comment: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  addCommentContainer: {
    marginTop: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  commentButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  commentButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  commentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})

