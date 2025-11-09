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

import React, { useState, useEffect, useCallback } from 'react'
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

interface TaskFilters {
  searchQuery: string
  statusFilter: string
}

export default function TaskListScreen({ navigation }: any) {
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

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  useEffect(() => {
    loadCurrentUser()
    loadSavedFilters()
  }, [])

  useEffect(() => {
    filterTasks()
  }, [tasks, searchQuery, statusFilter])

  useEffect(() => {
    saveFilters()
  }, [searchQuery, statusFilter])

  const loadCurrentUser = async () => {
    try {
      const userData = await getUserData()
      setCurrentUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const loadSavedFilters = async () => {
    try {
      const savedFilters = await get<TaskFilters>(STORAGE_KEYS.TASK_FILTERS)
      if (savedFilters) {
        setSearchQuery(savedFilters.searchQuery || '')
        setStatusFilter(savedFilters.statusFilter || 'All')
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
    }
  }

  const saveFilters = async () => {
    try {
      const filters: TaskFilters = {
        searchQuery,
        statusFilter,
      }
      await save(STORAGE_KEYS.TASK_FILTERS, filters)
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }

  const filterTasks = () => {
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
  }

  const onRefresh = async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh tasks:', error)
    }
  }

  const handleTaskPress = (task: Task) => {
    navigation.navigate('TaskDetails', { taskId: task.taskId })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Yet to Start':
        return '#6B7280'
      case 'In Progress':
        return '#3B82F6'
      case 'Done':
        return '#10B981'
      case 'Delayed':
        return '#EF4444'
      case 'Hold':
        return '#F59E0B'
      case 'Cancel':
        return '#9CA3AF'
      case 'ReOpened':
        return '#8B5CF6'
      case 'Stop':
        return '#DC2626'
      default:
        return '#6B7280'
    }
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'U&I') return '#EF4444' // Urgent & Important - Red
    if (priority === 'NU&I') return '#F59E0B' // Not Urgent & Important - Orange
    if (priority === 'U&NI') return '#3B82F6' // Urgent & Not Important - Blue
    if (priority === 'NU&NI') return '#6B7280' // Not Urgent & Not Important - Gray
    return '#6B7280'
  }

  const getAssigneeNames = (assignedTo: string | string[]): string => {
    if (!assignedTo) return 'Unassigned'

    if (Array.isArray(assignedTo)) {
      if (assignedTo.length === 0) return 'Unassigned'
      if (assignedTo.length === 1) return assignedTo[0]
      if (assignedTo.length === 2) return assignedTo.join(', ')
      return `${assignedTo[0]}, ${assignedTo[1]} +${assignedTo.length - 2} more`
    }

    return assignedTo
  }

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
        <ActivityIndicator size="large" color="#3B82F6" />
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
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
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
        contentContainerStyle={styles.listContent}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContentContainer: {
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  taskId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  taskDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  assignedTo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
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
    color: '#fff',
    fontWeight: '300',
  },
})

