/**
 * Task List Screen
 * Displays all tasks with filters and search
 *
 * Features:
 * - GraphQL-based task fetching
 * - Multiple assignee support
 * - Status filtering
 * - Filter persistence with AsyncStorage
 * - Pull-to-refresh
 * - Timer display
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { Card, Text, FAB, ActivityIndicator, Searchbar, Chip, Button } from 'react-native-paper'
import { useFocusEffect } from '@react-navigation/native'
import { useQuery } from '@apollo/client/react'
import { GET_TASKS } from '../config/graphql-queries'
import { Task } from '../types'
import { getUserData, save, get, STORAGE_KEYS } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

interface TaskFilters {
  searchQuery: string
  statusFilter: string
}

export default function TaskListScreen({ navigation }: any) {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()

  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const statusOptions = ['All', 'Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop']

  // GraphQL query for tasks
  const { data, loading, error, refetch } = useQuery(GET_TASKS, {
    fetchPolicy: 'cache-and-network',
  })

  const tasks = (data as any)?.tasks || []

  const loadCurrentUser = useCallback(async () => {
    try {
      const userData = await getUserData()
      setCurrentUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }, [])

  const loadSavedFilters = useCallback(async () => {
    try {
      const savedFilters = await get<TaskFilters>(STORAGE_KEYS.TASK_FILTERS)
      if (savedFilters) {
        setSearchQuery(savedFilters.searchQuery || '')
        setStatusFilter(savedFilters.statusFilter || 'All')
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
    }
  }, [])

  const saveFilters = useCallback(async () => {
    try {
      const filters: TaskFilters = {
        searchQuery,
        statusFilter,
      }
      await save(STORAGE_KEYS.TASK_FILTERS, filters)
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }, [searchQuery, statusFilter])

  const filterTasks = useCallback(() => {
    let filtered = tasks

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter((task: any) => task.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (task: any) =>
          task.taskId.toLowerCase().includes(query) ||
          task.name?.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
      )
    }

    setFilteredTasks(filtered)
  }, [tasks, searchQuery, statusFilter])

  const onRefresh = useCallback(async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh tasks:', error)
    }
  }, [refetch])

  const handleTaskPress = useCallback((task: Task) => {
    navigation.navigate('TaskDetails', { taskId: task.taskId })
  }, [navigation])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Yet to Start':
        return colors.textSecondary
      case 'In Progress':
        return colors.primary
      case 'Done':
        return colors.success
      case 'Delayed':
        return colors.error
      case 'Hold':
        return colors.warning
      case 'Cancel':
        return colors.textTertiary
      case 'ReOpened':
        return '#8B5CF6'
      case 'Stop':
        return '#DC2626'
      default:
        return colors.textSecondary
    }
  }, [colors])

  const getPriorityColor = useCallback((priority: string) => {
    if (priority === 'U&I') return colors.error // Urgent & Important - Red
    if (priority === 'NU&I') return colors.warning // Not Urgent & Important - Orange
    if (priority === 'U&NI') return colors.primary // Urgent & Not Important - Blue
    if (priority === 'NU&NI') return colors.textSecondary // Not Urgent & Not Important - Gray
    return colors.textSecondary
  }, [colors])

  const getAssigneeNames = useCallback((assignedTo: string | string[]): string => {
    if (!assignedTo) return 'Unassigned'

    if (Array.isArray(assignedTo)) {
      if (assignedTo.length === 0) return 'Unassigned'
      if (assignedTo.length === 1) return assignedTo[0]
      if (assignedTo.length === 2) return assignedTo.join(', ')
      return `${assignedTo[0]}, ${assignedTo[1]} +${assignedTo.length - 2} more`
    }

    return assignedTo
  }, [])

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  useEffect(() => {
    loadCurrentUser()
    loadSavedFilters()
  }, [loadCurrentUser, loadSavedFilters])

  useEffect(() => {
    filterTasks()
  }, [filterTasks])

  useEffect(() => {
    saveFilters()
  }, [saveFilters])

  const renderTask = ({ item }: { item: any }) => {
    const projectName = item.project?.projectName || ''
    const assigneeNames = item.assignedToUsers?.map((u: any) => u.name).join(', ') ||
      getAssigneeNames(item.assignedTo)

    return (
      <Card
        style={styles.taskCard}
        elevation={1}
        onPress={() => handleTaskPress(item)}
      >
        <Card.Content>
          <View style={styles.taskHeader}>
            <Text style={styles.taskId}>{item.taskId}</Text>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={styles.statusText}
              compact
            >
              {item.status}
            </Chip>
          </View>

          <Text style={styles.taskName} numberOfLines={1}>
            {item.name || 'Untitled Task'}
          </Text>

          {projectName && (
            <Text style={styles.projectName} numberOfLines={1}>
              📁 {projectName}
            </Text>
          )}

          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.taskMeta}>
            <Chip
              style={[styles.priorityChip, { backgroundColor: getPriorityColor(item.priority) }]}
              textStyle={styles.priorityText}
              compact
            >
              {item.priority}
            </Chip>
            <Text style={styles.taskDate}>
              Due: {new Date(item.endDate).toLocaleDateString()}
            </Text>
          </View>

          <Text style={styles.assignedTo}>
            👤 {assigneeNames}
          </Text>
          <View style={styles.taskMeta}>
            <Text style={styles.taskDate}>
              📅 {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.taskDate}>
              🔄 {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </Card.Content>
      </Card>
    )
  }

  if (loading && !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={materialColors.primary} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load tasks</Text>
        <Button
          mode="contained"
          onPress={onRefresh}
          style={styles.retryButton}
          disabled={isOffline}
        >
          Retry
        </Button>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search tasks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          iconColor={materialColors.primary}
          placeholderTextColor={materialColors.textSecondary}
        />
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContentContainer}
      >
        <Text style={styles.filterLabel}>Status:</Text>
        {statusOptions.map((status: any) => (
          <Chip
            key={status}
            selected={statusFilter === status}
            onPress={() => setStatusFilter(status)}
            style={[
              styles.filterChip,
              statusFilter === status && styles.filterChipActive,
            ]}
            textStyle={[
              styles.filterChipText,
              statusFilter === status && styles.filterChipTextActive,
            ]}
            compact
          >
            {status}
          </Chip>
        ))}
      </ScrollView>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.taskId}
        renderItem={renderTask}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={materialColors.primary}
            colors={[materialColors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter !== 'All'
                ? 'No tasks match your filters'
                : 'No tasks found'}
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask')}
        disabled={isOffline}
        color="#FFFFFF"
        size="medium"
      />
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: materialColors.background,
  },
  centerContainer: {
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
  errorText: {
    ...materialTypography.bodyLarge,
    color: materialColors.error,
    marginBottom: materialSpacing.md,
  },
  retryButton: {
    borderRadius: 8,
  },
  searchContainer: {
    padding: materialSpacing.md,
    backgroundColor: materialColors.surface,
    elevation: materialElevation.level1,
  },
  searchBar: {
    backgroundColor: materialColors.surfaceVariant,
    elevation: 0,
  },
  filterContainer: {
    backgroundColor: materialColors.surface,
    paddingVertical: materialSpacing.md,
    paddingHorizontal: materialSpacing.md,
    elevation: materialElevation.level1,
    minHeight: 60,
  },
  filterContentContainer: {
    alignItems: 'center',
    paddingVertical: materialSpacing.xs,
  },
  filterLabel: {
    ...materialTypography.labelLarge,
    color: materialColors.text,
    marginRight: materialSpacing.sm,
  },
  filterChip: {
    marginRight: materialSpacing.xs,
    backgroundColor: materialColors.surfaceVariant,
  },
  filterChipActive: {
    backgroundColor: materialColors.primary,
  },
  filterChipText: {
    ...materialTypography.labelSmall,
    color: materialColors.textSecondary,
  },
  filterChipTextActive: {
    color: materialColors.surface,
  },
  listContent: {
    padding: materialSpacing.md,
  },
  taskCard: {
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: materialSpacing.xs,
  },
  taskId: {
    ...materialTypography.labelMedium,
    color: materialColors.textSecondary,
  },
  statusChip: {
    // height: 24, // Removed fixed height to prevent clipping
  },
  statusText: {
    ...materialTypography.labelSmall,
    color: materialColors.surface,
  },
  taskName: {
    ...materialTypography.titleMedium,
    color: materialColors.text,
    marginBottom: materialSpacing.xs,
  },
  projectName: {
    ...materialTypography.bodySmall,
    color: materialColors.primary,
    marginBottom: materialSpacing.xs,
  },
  taskDescription: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
    marginBottom: materialSpacing.sm,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: materialSpacing.xs,
  },
  priorityChip: {
    // height: 24, // Removed fixed height to prevent clipping
  },
  priorityText: {
    ...materialTypography.labelSmall,
    color: materialColors.surface,
  },
  taskDate: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
  },
  assignedTo: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
    marginTop: materialSpacing.xs,
  },
  emptyContainer: {
    padding: materialSpacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: materialColors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: materialSpacing.lg,
    bottom: materialSpacing.xl, // Increased bottom margin
    backgroundColor: materialColors.primary,
  },
})

