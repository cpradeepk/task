import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getTaskById, updateTask, deleteTask, Task } from '../services/taskService'
import { get } from '../services/apiClient'

export default function TaskDetailsScreen({ route, navigation }: any) {
  const { taskId } = route.params
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Edit form state
  const [editedStatus, setEditedStatus] = useState('')
  const [editedPriority, setEditedPriority] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedRemarks, setEditedRemarks] = useState('')
  
  const [settings, setSettings] = useState<any>({})
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadTaskDetails()
    loadSettings()
    loadCurrentUser()
  }, [taskId])

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

  const loadSettings = async () => {
    try {
      const response = await get('/api/settings')
      if (response.success && response.data) {
        const settingsMap: any = {}
        response.data.forEach((setting: any) => {
          settingsMap[setting.key] = setting.value
        })
        setSettings(settingsMap)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadTaskDetails = async () => {
    try {
      setLoading(true)
      const response = await getTaskById(taskId)
      
      if (response.success && response.data) {
        setTask(response.data)
        setEditedStatus(response.data.status)
        setEditedPriority(response.data.priority)
        setEditedDescription(response.data.description)
        setEditedRemarks(response.data.remarks || '')
      } else {
        Alert.alert('Error', response.error || 'Failed to load task')
        navigation.goBack()
      }
    } catch (error) {
      console.error('Failed to load task:', error)
      Alert.alert('Error', 'Failed to load task')
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!task) return

    try {
      setIsSaving(true)
      
      const updates: Partial<Task> = {
        status: editedStatus,
        priority: editedPriority,
        description: editedDescription,
        remarks: editedRemarks,
      }

      const response = await updateTask(taskId, updates)

      if (response.success) {
        Alert.alert('Success', 'Task updated successfully')
        setIsEditing(false)
        loadTaskDetails()
      } else {
        Alert.alert('Error', response.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      Alert.alert('Error', 'Failed to update task')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteTask(taskId)
              if (response.success) {
                Alert.alert('Success', 'Task deleted successfully')
                navigation.goBack()
              } else {
                Alert.alert('Error', response.error || 'Failed to delete task')
              }
            } catch (error) {
              console.error('Failed to delete task:', error)
              Alert.alert('Error', 'Failed to delete task')
            }
          },
        },
      ]
    )
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
    if (priority.includes('IU&I')) return '#ef4444'
    if (priority.includes('IU&NI')) return '#f59e0b'
    if (priority.includes('NU&I')) return '#3b82f6'
    return '#6b7280'
  }

  const taskStatuses = settings.task_statuses || ['Open', 'In Progress', 'Delayed', 'On Hold', 'ReOpened', 'Cancelled', 'Completed']
  const taskPriorities = settings.task_priorities || ['IU&I (Important & Urgent)', 'IU&NI (Important & Not Urgent)', 'NU&I (Not Urgent & Important)', 'NU&NI (Not Urgent & Not Important)']

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.taskId}>{task.taskId}</Text>
          <View style={styles.headerActions}>
            {!isEditing && (
              <>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Status and Priority */}
        <View style={styles.badges}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
            <Text style={styles.badgeText}>{task.status}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
            <Text style={styles.badgeText}>{task.priority}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.sectionContent}>{task.description}</Text>
          )}
        </View>

        {/* Status (Edit Mode) */}
        {isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={editedStatus}
                onValueChange={setEditedStatus}
                style={styles.picker}
              >
                {taskStatuses.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Priority (Edit Mode) */}
        {isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Priority</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={editedPriority}
                onValueChange={setEditedPriority}
                style={styles.picker}
              >
                {taskPriorities.map((p) => (
                  <Picker.Item key={p} label={p} value={p} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Start:</Text>
            <Text style={styles.dateValue}>
              {new Date(task.startDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>End:</Text>
            <Text style={styles.dateValue}>
              {new Date(task.endDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Assignment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assignment</Text>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Assigned To:</Text>
            <Text style={styles.dateValue}>{task.assignedTo}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Assigned By:</Text>
            <Text style={styles.dateValue}>{task.assignedBy}</Text>
          </View>
        </View>

        {/* Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hours</Text>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Estimated:</Text>
            <Text style={styles.dateValue}>{task.estimatedHours || 0} hrs</Text>
          </View>
          {task.actualHours !== undefined && (
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>Actual:</Text>
              <Text style={styles.dateValue}>{task.actualHours} hrs</Text>
            </View>
          )}
        </View>

        {/* Remarks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remarks</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editedRemarks}
              onChangeText={setEditedRemarks}
              multiline
              numberOfLines={3}
              placeholder="Add remarks..."
            />
          ) : (
            <Text style={styles.sectionContent}>
              {task.remarks || 'No remarks'}
            </Text>
          )}
        </View>

        {/* Project Info */}
        {(task.projectId || task.subprojectId) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project</Text>
            {task.projectId && (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Project:</Text>
                <Text style={styles.dateValue}>{task.projectId}</Text>
              </View>
            )}
            {task.subprojectId && (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Subproject:</Text>
                <Text style={styles.dateValue}>{task.subprojectId}</Text>
              </View>
            )}
          </View>
        )}

        {/* Edit Mode Actions */}
        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditing(false)
                setEditedStatus(task.status)
                setEditedPriority(task.priority)
                setEditedDescription(task.description)
                setEditedRemarks(task.remarks || '')
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
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
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 60,
  },
  dateValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

