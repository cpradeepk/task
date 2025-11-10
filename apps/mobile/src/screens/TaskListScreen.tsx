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
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useQuery } from '@apollo/client'
import { GET_TASKS } from '../config/graphql-queries'
import { Task } from '../../packages/shared/types'
import { getUserData, save, get, STORAGE_KEYS } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

interface TaskFilters {
  searchQuery: string
  statusFilter: string
}

export default function TaskListScreen({ navigation }: any) {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const statusOptions = ['All', 'Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop']

  // GraphQL query for tasks
  const { data, loading, error, refetch } = useQuery(GET_TASKS, {
    fetchPolicy: 'cache-and-network',
  })

  const tasks = data?.tasks || []

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
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (task) =>
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

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.taskCard}
      onPress={() => handleTaskPress(item)}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskId}>{item.taskId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.taskName} numberOfLines={1}>
        {item.name || 'Untitled Task'}
      </Text>

      <Text style={styles.taskDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.taskMeta}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
        <Text style={styles.taskDate}>
          Due: {new Date(item.endDate).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.assignedTo}>
        👤 {getAssigneeNames(item.assignedTo)}
      </Text>
    </TouchableOpacity>
  )

  if (loading && !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load tasks</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
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
        {statusOptions.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === status && styles.filterButtonTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
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
            tintColor={colors.primary}
            colors={[colors.primary]}
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: responsive.spacing.sm,
    fontSize: responsive.fontSize.md,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: responsive.fontSize.md,
    color: colors.error,
    marginBottom: responsive.spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: responsive.spacing.lg,
    paddingVertical: responsive.spacing.sm,
    borderRadius: responsive.borderRadius.md,
  },
  retryButtonText: {
    color: colors.card,
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
  },
  searchContainer: {
    padding: responsive.spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    paddingHorizontal: responsive.spacing.sm,
    fontSize: responsive.fontSize.md,
    backgroundColor: colors.background,
    color: colors.text,
  },
  filterContainer: {
    backgroundColor: colors.card,
    paddingVertical: responsive.spacing.sm,
    paddingHorizontal: responsive.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  filterContentContainer: {
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginRight: responsive.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: responsive.spacing.sm,
    paddingVertical: responsive.spacing.xs,
    marginRight: responsive.spacing.xs,
    borderRadius: responsive.borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.card,
    fontWeight: '600',
  },
  listContent: {
    padding: responsive.spacing.md,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: responsive.borderRadius.lg,
    padding: responsive.spacing.md,
    marginBottom: responsive.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.spacing.xs,
  },
  taskId: {
    fontSize: responsive.fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: responsive.spacing.xs,
    paddingVertical: responsive.spacing.xxs,
    borderRadius: responsive.borderRadius.lg,
  },
  statusText: {
    fontSize: responsive.fontSize.xs - 1,
    color: colors.card,
    fontWeight: '600',
  },
  taskName: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: responsive.spacing.xxs,
  },
  taskDescription: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: responsive.spacing.sm,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: responsive.spacing.xs,
    paddingVertical: responsive.spacing.xxs,
    borderRadius: responsive.borderRadius.md,
  },
  priorityText: {
    fontSize: responsive.fontSize.xs - 1,
    color: colors.card,
    fontWeight: '500',
  },
  taskDate: {
    fontSize: responsive.fontSize.xs,
    color: colors.textSecondary,
  },
  assignedTo: {
    fontSize: responsive.fontSize.xs,
    color: colors.textSecondary,
    marginTop: responsive.spacing.xxs,
  },
  emptyContainer: {
    padding: responsive.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: responsive.fontSize.md,
    color: colors.textTertiary,
  },
  fab: {
    position: 'absolute',
    right: responsive.spacing.lg,
    bottom: responsive.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: colors.card,
    fontWeight: '300',
  },
})

