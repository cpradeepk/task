/**
 * UnifiedTimeline Component for Mobile
 * Displays activity logs, comments, and prompts for tasks and bugs
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
    View,
    ScrollView,
    StyleSheet,
    Alert,
    TouchableOpacity,
    RefreshControl,
} from 'react-native'
import { Text, TextInput, Button, Chip, ActivityIndicator, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getUserData } from '../utils/secureStorage'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { formatDateTimeIST } from '../utils/datetime'

interface ActivityLog {
    id: number
    entityType: string
    entityId: string
    actionType: string
    description: string
    isComment: boolean
    userName?: string
    createdAt: string
    attachments?: string
}

interface UnifiedTimelineProps {
    entityType: 'task' | 'bug' | 'leave' | 'wfh'
    entityId: string
    showCommentInput?: boolean
}

export default function UnifiedTimeline({
    entityType,
    entityId,
    showCommentInput = true,
}: UnifiedTimelineProps) {
    const [activities, setActivities] = useState<ActivityLog[]>([])
    const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Filter states
    const [showActivity, setShowActivity] = useState(false)
    const [showComments, setShowComments] = useState(true)
    const [showPrompts, setShowPrompts] = useState(false)

    useEffect(() => {
        loadCurrentUser()
        fetchActivities()
    }, [])

    useEffect(() => {
        applyFilters()
    }, [activities, showActivity, showComments, showPrompts])

    const loadCurrentUser = async () => {
        const user = await getUserData()
        setCurrentUser(user)
    }

    const fetchActivities = async () => {
        try {
            const response = await fetch(
                `https://task.amtariksha.com/api/activity-log?entityType=${entityType}&entityId=${entityId}&sortOrder=desc`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            )

            const data = await response.json()
            if (data.success) {
                setActivities(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    const applyFilters = () => {
        let filtered = activities

        // If no filters are active, show all
        if (!showActivity && !showComments && !showPrompts) {
            setFilteredActivities(filtered)
            return
        }

        // Apply active filters
        filtered = activities.filter((activity) => {
            if (showActivity && !activity.isComment && activity.actionType !== 'prompt') return true
            if (showComments && activity.isComment && activity.actionType !== 'prompt') return true
            if (showPrompts && activity.actionType === 'prompt') return true
            return false
        })

        setFilteredActivities(filtered)
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchActivities()
    }

    const handleSubmitComment = async () => {
        if (!commentText.trim()) return

        setIsSubmitting(true)
        try {
            const response = await fetch('https://task.amtariksha.com/api/activity-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityType,
                    entityId,
                    actionType: 'comment',
                    description: commentText.trim(),
                    isComment: true,
                }),
            })

            const data = await response.json()
            if (data.success) {
                setCommentText('')
                await fetchActivities()
            } else {
                Alert.alert('Error', data.error || 'Failed to add comment')
            }
        } catch (error) {
            console.error('Failed to add comment:', error)
            Alert.alert('Error', 'Failed to add comment')
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleFilter = (filter: 'activity' | 'comments' | 'prompts') => {
        if (filter === 'activity') {
            setShowActivity(!showActivity)
        } else if (filter === 'comments') {
            setShowComments(!showComments)
        } else if (filter === 'prompts') {
            setShowPrompts(!showPrompts)
        }
    }

    const getActivityIcon = (actionType: string): string => {
        const icons: Record<string, string> = {
            comment: 'comment-text',
            status_change: 'sync',
            field_update: 'pencil',
            assignment_change: 'account-group',
            time_logged: 'clock',
            timer_started: 'play',
            timer_stopped: 'stop',
            timer_paused: 'pause',
            created: 'star',
            deleted: 'delete',
            priority_change: 'target',
            estimated_hours_change: 'chart-bar',
            prompt: 'robot',
        }
        return icons[actionType] || 'information'
    }

    const formatRelativeTime = (timestamp: string): string => {
        const now = new Date()
        const then = new Date(timestamp)
        const diffMs = now.getTime() - then.getTime()
        const diffSecs = Math.floor(diffMs / 1000)
        const diffMins = Math.floor(diffSecs / 60)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffSecs < 60) return 'just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`

        return formatDateTimeIST(timestamp)
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={materialColors.primary} />
                <Text style={styles.loadingText}>Loading timeline...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {/* Filter Chips */}
            <View style={styles.filterContainer}>
                <Chip
                    selected={showActivity}
                    onPress={() => toggleFilter('activity')}
                    style={styles.filterChip}
                    selectedColor={materialColors.primary}
                >
                    Activity
                </Chip>
                <Chip
                    selected={showComments}
                    onPress={() => toggleFilter('comments')}
                    style={styles.filterChip}
                    selectedColor={materialColors.primary}
                >
                    Comments
                </Chip>
                <Chip
                    selected={showPrompts}
                    onPress={() => toggleFilter('prompts')}
                    style={styles.filterChip}
                    selectedColor={materialColors.primary}
                >
                    Prompts
                </Chip>
            </View>

            {/* Comment Input */}
            {showCommentInput && (
                <View style={styles.commentInputContainer}>
                    <TextInput
                        mode="outlined"
                        label="Add a comment"
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        numberOfLines={3}
                        style={styles.commentInput}
                        outlineColor={materialColors.outline}
                        activeOutlineColor={materialColors.primary}
                    />
                    <Button
                        mode="contained"
                        onPress={handleSubmitComment}
                        disabled={isSubmitting || !commentText.trim()}
                        loading={isSubmitting}
                        style={styles.submitButton}
                        buttonColor={materialColors.primary}
                    >
                        Post Comment
                    </Button>
                </View>
            )}

            {/* Timeline */}
            <ScrollView
                style={styles.timeline}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[materialColors.primary]}
                        tintColor={materialColors.primary}
                    />
                }
            >
                {filteredActivities.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {activities.length === 0
                                ? 'No activity yet. Be the first to comment!'
                                : 'No activities match the current filter.'}
                        </Text>
                    </View>
                ) : (
                    filteredActivities.map((activity, index) => (
                        <View key={activity.id}>
                            <View
                                style={[
                                    styles.activityItem,
                                    activity.isComment ? styles.commentItem : styles.systemItem,
                                ]}
                            >
                                <View style={styles.activityHeader}>
                                    <MaterialCommunityIcons
                                        name={getActivityIcon(activity.actionType) as any}
                                        size={24}
                                        color={activity.isComment ? materialColors.primary : materialColors.textSecondary}
                                        style={styles.activityIcon}
                                    />
                                    <View style={styles.activityHeaderText}>
                                        <Text style={styles.userName}>
                                            {activity.userName || 'Unknown User'}
                                        </Text>
                                        <Text style={styles.timestamp}>
                                            {formatRelativeTime(activity.createdAt)}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.activityDescription}>{activity.description}</Text>
                            </View>
                            {index < filteredActivities.length - 1 && <Divider style={styles.divider} />}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: materialColors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: materialSpacing.xl,
    },
    loadingText: {
        ...materialTypography.bodyMedium,
        color: materialColors.textSecondary,
        marginTop: materialSpacing.md,
    },
    filterContainer: {
        flexDirection: 'row',
        padding: materialSpacing.md,
        gap: materialSpacing.sm,
        backgroundColor: materialColors.surface,
    },
    filterChip: {
        marginRight: materialSpacing.xs,
    },
    commentInputContainer: {
        padding: materialSpacing.md,
        backgroundColor: materialColors.surface,
        borderBottomWidth: 1,
        borderBottomColor: materialColors.outline,
    },
    commentInput: {
        backgroundColor: materialColors.surface,
        marginBottom: materialSpacing.sm,
    },
    submitButton: {
        alignSelf: 'flex-end',
    },
    timeline: {
        flex: 1,
    },
    emptyContainer: {
        padding: materialSpacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...materialTypography.bodyMedium,
        color: materialColors.textSecondary,
        textAlign: 'center',
    },
    activityItem: {
        padding: materialSpacing.md,
    },
    commentItem: {
        backgroundColor: materialColors.surface,
    },
    systemItem: {
        backgroundColor: materialColors.background,
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: materialSpacing.sm,
    },
    activityIcon: {
        marginRight: materialSpacing.sm,
    },
    activityHeaderText: {
        flex: 1,
    },
    userName: {
        ...materialTypography.labelLarge,
        fontWeight: '600',
        color: materialColors.text,
    },
    timestamp: {
        ...materialTypography.bodySmall,
        color: materialColors.textSecondary,
    },
    activityDescription: {
        ...materialTypography.bodyMedium,
        color: materialColors.text,
        marginLeft: 36, // Align with text, accounting for icon width
    },
    divider: {
        marginVertical: materialSpacing.xs,
    },
})
