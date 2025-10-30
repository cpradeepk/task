/**
 * Bug Subtasks Component
 * Display and manage bug subtasks
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import {
  getBugSubtasks,
  createBugSubtask,
  updateBugSubtask,
  deleteBugSubtask,
  BugSubTask,
} from '../services/bugService'
import { getCurrentUser } from '../services/userService'

interface BugSubtasksProps {
  bugId: string
  editable?: boolean
}

export default function BugSubtasks({ bugId, editable = false }: BugSubtasksProps) {
  const [subtasks, setSubtasks] = useState<BugSubTask[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, notStarted: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadSubtasks()
  }, [bugId])

  const loadSubtasks = async () => {
    try {
      setIsLoading(true)
      const response = await getBugSubtasks(bugId)
      if (response.success && response.data) {
        setSubtasks(response.data.data || [])
        setStats(response.data.stats || { total: 0, completed: 0, inProgress: 0, notStarted: 0 })
      }
    } catch (error) {
      console.error('Failed to load subtasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskDescription.trim()) return

    try {
      setIsAdding(true)
      const user = await getCurrentUser()
      if (!user) {
        Alert.alert('Error', 'User not found')
        return
      }

      const response = await createBugSubtask({
        parentBugId: bugId,
        description: newSubtaskDescription.trim(),
        assignedTo: user.employeeId,
        status: 'Not Started',
        isCompleted: false,
        createdBy: user.employeeId,
      })

      if (response.success) {
        setNewSubtaskDescription('')
        await loadSubtasks()
      } else {
        Alert.alert('Error', response.error || 'Failed to add subtask')
      }
    } catch (error) {
      console.error('Failed to add subtask:', error)
      Alert.alert('Error', 'Failed to add subtask')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleComplete = async (subtask: BugSubTask) => {
    try {
      const newIsCompleted = !subtask.isCompleted
      const newStatus = newIsCompleted ? 'Completed' : 'Not Started'

      const response = await updateBugSubtask(subtask.id, {
        isCompleted: newIsCompleted,
        status: newStatus,
      })

      if (response.success) {
        await loadSubtasks()
      } else {
        Alert.alert('Error', response.error || 'Failed to update subtask')
      }
    } catch (error) {
      console.error('Failed to toggle subtask:', error)
      Alert.alert('Error', 'Failed to update subtask')
    }
  }

  const handleDeleteSubtask = async (subtaskId: number) => {
    Alert.alert(
      'Delete Subtask',
      'Are you sure you want to delete this subtask?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await getCurrentUser()
              if (!user) return

              const response = await deleteBugSubtask(subtaskId, user.employeeId)
              if (response.success) {
                await loadSubtasks()
              } else {
                Alert.alert('Error', response.error || 'Failed to delete subtask')
              }
            } catch (error) {
              console.error('Failed to delete subtask:', error)
              Alert.alert('Error', 'Failed to delete subtask')
            }
          },
        },
      ]
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#10B981'
      case 'In Progress':
        return '#EAB308'
      default:
        return '#6B7280'
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subtasks</Text>
        {stats.total > 0 && (
          <Text style={styles.stats}>
            {stats.completed} of {stats.total} completed
          </Text>
        )}
      </View>

      {subtasks.length === 0 && !editable && (
        <Text style={styles.emptyText}>No subtasks yet</Text>
      )}

      {subtasks.map((subtask) => (
        <View key={subtask.id} style={styles.subtaskItem}>
          <TouchableOpacity
            onPress={() => editable && handleToggleComplete(subtask)}
            style={styles.checkbox}
            disabled={!editable}
          >
            <View
              style={[
                styles.checkboxInner,
                subtask.isCompleted && styles.checkboxChecked,
              ]}
            >
              {subtask.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>

          <View style={styles.subtaskContent}>
            <Text
              style={[
                styles.subtaskDescription,
                subtask.isCompleted && styles.subtaskDescriptionCompleted,
              ]}
            >
              {subtask.description}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(subtask.status) },
              ]}
            >
              <Text style={styles.statusText}>{subtask.status}</Text>
            </View>
          </View>

          {editable && (
            <TouchableOpacity
              onPress={() => handleDeleteSubtask(subtask.id)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {editable && (
        <View style={styles.addContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a subtask..."
            value={newSubtaskDescription}
            onChangeText={setNewSubtaskDescription}
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              (!newSubtaskDescription.trim() || isAdding) && styles.addButtonDisabled,
            ]}
            onPress={handleAddSubtask}
            disabled={!newSubtaskDescription.trim() || isAdding}
          >
            <Text style={styles.addButtonText}>
              {isAdding ? '...' : '+'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  stats: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  subtaskDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
    color: '#EF4444',
    fontWeight: '300',
  },
  addContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  addButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
})

