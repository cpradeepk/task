import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

export default function TaskDetailsScreen({ route, navigation }: any) {
  const { taskId } = route.params
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

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

  const loadCurrentUser = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem('user')
      if (userStr) {
        setCurrentUser(JSON.parse(userStr))
      }
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }, [])

  const loadSettings = useCallback(async () => {
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
  }, [])

  const loadTaskDetails = useCallback(async () => {
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
  }, [taskId, navigation])

  useEffect(() => {
    loadTaskDetails()
    loadSettings()
    loadCurrentUser()
  }, [loadTaskDetails, loadSettings, loadCurrentUser])

  const handleSave = useCallback(async () => {
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
  }, [task, editedStatus, editedPriority, editedDescription, editedRemarks, taskId, loadTaskDetails])

  const handleDelete = useCallback(() => {
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
  }, [taskId, navigation])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Open':
        return colors.primary
      case 'In Progress':
        return colors.warning
      case 'Completed':
        return colors.success
      case 'Delayed':
        return colors.error
      case 'On Hold':
        return colors.textSecondary
      case 'Cancelled':
        return colors.textTertiary
      default:
        return colors.textSecondary
    }
  }, [colors])

  const getPriorityColor = useCallback((priority: string) => {
    if (priority.includes('IU&I')) return colors.error
    if (priority.includes('IU&NI')) return colors.warning
    if (priority.includes('NU&I')) return colors.primary
    return colors.textSecondary
  }, [colors])

  const taskStatuses = useMemo(() =>
    settings.task_statuses || ['Open', 'In Progress', 'Delayed', 'On Hold', 'ReOpened', 'Cancelled', 'Completed'],
    [settings.task_statuses]
  )

  const taskPriorities = useMemo(() =>
    settings.task_priorities || ['U&I (Urgent & Important)', 'NU&I (Not Urgent & Important)', 'NI&U (Not Important & Urgent)', 'NU&NI (Not Urgent & Not Important)'],
    [settings.task_priorities]
  )

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: responsive.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.spacing.md,
  },
  taskId: {
    fontSize: responsive.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: responsive.spacing.xs,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.xs,
    borderRadius: responsive.borderRadius.md,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.error,
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.xs,
    borderRadius: responsive.borderRadius.md,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: responsive.spacing.xs,
    marginBottom: responsive.spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: responsive.spacing.sm,
    paddingVertical: 6,
    borderRadius: responsive.borderRadius.full,
  },
  priorityBadge: {
    paddingHorizontal: responsive.spacing.sm,
    paddingVertical: 6,
    borderRadius: responsive.borderRadius.full,
  },
  badgeText: {
    color: '#fff',
    fontSize: responsive.fontSize.xs,
    fontWeight: '600',
  },
  section: {
    marginBottom: responsive.spacing.lg,
  },
  sectionTitle: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: responsive.spacing.xs,
    textTransform: 'uppercase',
  },
  sectionContent: {
    fontSize: responsive.fontSize.sm,
    color: colors.text,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.sm,
    fontSize: responsive.fontSize.sm,
    color: colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: responsive.spacing.xs,
  },
  dateLabel: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    width: 60,
  },
  dateValue: {
    fontSize: responsive.fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  errorText: {
    fontSize: responsive.fontSize.md,
    color: colors.textTertiary,
  },
  editActions: {
    flexDirection: 'row',
    gap: responsive.spacing.sm,
    marginTop: responsive.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.border,
    padding: responsive.spacing.md,
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: responsive.spacing.md,
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.primaryLight,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
  },
})

