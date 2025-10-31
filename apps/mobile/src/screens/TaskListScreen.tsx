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
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getAllTasks, Task } from '../services/taskService'
import { useFocusEffect } from '@react-navigation/native'

export default function TaskListScreen({ navigation }: any) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('All')

  const statusOptions = ['All', 'Open', 'In Progress', 'Delayed', 'On Hold', 'Completed', 'Cancelled']

  useFocusEffect(
    useCallback(() => {
      loadTasks()
    }, [])
  )

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    filterTasks()
  }, [tasks, selectedStatus])

  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user')
      if (userStr) {
        setCurrentUser(JSON.parse(userStr))
      }
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await getAllTasks()
      
      if (response.success && response.data) {
        setTasks(response.data)
      } else {
        Alert.alert('Error', response.error || 'Failed to load tasks')
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
      Alert.alert('Error', 'Failed to load tasks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterTasks = () => {
    if (selectedStatus === 'All') {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter(task => task.status === selectedStatus))
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadTasks()
  }

  const handleTaskPress = (task: Task) => {
    navigation.navigate('TaskDetails', { taskId: task.taskId })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return '#3b82f6'
      case 'In Progress':
        return '#f59e0b'
      case 'Completed':
        return '#10b981'
      case 'Delayed':
        return '#ef4444'
      case 'On Hold':
        return '#6b7280'
      case 'Cancelled':
        return '#9ca3af'
      default:
        return '#6b7280'
    }
  }

  const getPriorityColor = (priority: string) => {
    if (priority.includes('IU&I')) return '#ef4444' // Important & Urgent - Red
    if (priority.includes('IU&NI')) return '#f59e0b' // Important & Not Urgent - Orange
    if (priority.includes('NU&I')) return '#3b82f6' // Not Urgent & Important - Blue
    return '#6b7280' // Not Urgent & Not Important - Gray
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
      
      <Text style={styles.taskDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.taskMeta}>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
        <Text style={styles.taskDate}>
          {new Date(item.endDate).toLocaleDateString()}
        </Text>
      </View>

      {item.assignedTo && (
        <Text style={styles.assignedTo}>
          Assigned to: {item.assignedTo}
        </Text>
      )}
    </TouchableOpacity>
  )

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        data={statusOptions}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedStatus === item && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedStatus(item)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedStatus === item && styles.filterButtonTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {renderStatusFilter()}
      
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.taskId}
        renderItem={renderTask}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks found</Text>
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
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
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
  taskDescription: {
    fontSize: 15,
    color: '#1f2937',
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

