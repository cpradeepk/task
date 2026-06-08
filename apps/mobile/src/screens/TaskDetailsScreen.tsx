import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native'
import { Card, Text, Button, ActivityIndicator, TextInput as PaperTextInput, Chip, IconButton, List, Divider } from 'react-native-paper'
import { SearchablePicker } from '../components/SearchablePicker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getTaskById, updateTask, deleteTask, Task } from '../services/taskService'
import { get } from '../services/apiClient'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { formatDateTimeIST, formatDateIST } from '../utils/datetime'
import UnifiedTimeline from '../components/UnifiedTimeline'
import TaskChecklistManager from '../components/TaskChecklistManager'
import RelatedItemsManager from '../components/RelatedItemsManager'

export default function TaskDetailsScreen({ route, navigation }: any) {
  const { taskId } = route.params
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    timeline: false,
    assignment: false,
    hours: false,
    remarks: false,
    project: false,
    activity: false,
    checklists: false,
    relatedItems: false,
  })

  // Edit form state
  const [editedStatus, setEditedStatus] = useState('')
  const [editedPriority, setEditedPriority] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedRemarks, setEditedRemarks] = useState('')

  const [settings, setSettings] = useState<any>({})
  const [currentUser, setCurrentUser] = useState<any>(null)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

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
        const err = (response.error || '').toLowerCase()
        if (err.includes('forbidden') || err.includes('no access') || err.includes('403')) {
          Alert.alert(
            'No Access',
            "You don't have access to this item. It may belong to a project you're not assigned to.",
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          )
        } else {
          Alert.alert('Error', response.error || 'Failed to load task')
          navigation.goBack()
        }
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

  // Add edit button to header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        !isEditing ? (
          <IconButton
            icon="pencil"
            size={24}
            iconColor={colors.primary}
            onPress={() => setIsEditing(true)}
            disabled={isOffline}
          />
        ) : null
      ),
    })
  }, [navigation, isEditing, isOffline])

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
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    )
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Task not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header Card */}
        <Card style={styles.headerCard} elevation={2}>
          <Card.Content>
            <View style={styles.header}>
              <Text style={styles.taskId}>{task.taskId}</Text>
              <View style={styles.headerActions}>
                {!isEditing && (
                  <>
                    <IconButton
                      icon="pencil"
                      size={20}
                      iconColor={colors.primary}
                      onPress={() => setIsEditing(true)}
                      disabled={isOffline}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor={colors.error}
                      onPress={handleDelete}
                      disabled={isOffline}
                    />
                  </>
                )}
              </View>
            </View>

            {/* Status and Priority Chips */}
            <View style={styles.badges}>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(task.status) }]}
                textStyle={styles.chipText}
              >
                {task.status}
              </Chip>
              <Chip
                style={[styles.priorityChip, { backgroundColor: getPriorityColor(task.priority) }]}
                textStyle={styles.chipText}
              >
                {task.priority}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Description Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Description"
            expanded={expandedSections.description}
            onPress={() => toggleSection('description')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <Card.Content>
              {isEditing ? (
                <PaperTextInput
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  multiline
                  numberOfLines={4}
                  mode="outlined"
                  disabled={isOffline}
                  style={styles.textInput}
                />
              ) : (
                <Text style={styles.sectionContent}>{task.description}</Text>
              )}
            </Card.Content>
          </List.Accordion>
        </Card>

        {/* Status (Edit Mode) */}
        {isEditing && (
          <Card style={styles.sectionCard} elevation={1}>
            <Card.Content>
              <SearchablePicker
                label="Status"
                selectedValue={editedStatus}
                onValueChange={setEditedStatus}
                items={taskStatuses.map((s: any) => ({ label: s, value: s }))}
                disabled={isOffline}
              />
            </Card.Content>
          </Card>
        )}

        {/* Priority (Edit Mode) */}
        {isEditing && (
          <Card style={styles.sectionCard} elevation={1}>
            <Card.Content>
              <SearchablePicker
                label="Priority"
                selectedValue={editedPriority}
                onValueChange={setEditedPriority}
                items={taskPriorities.map((p: any) => ({ label: p, value: p }))}
                disabled={isOffline}
              />
            </Card.Content>
          </Card>
        )}

        {/* Timeline Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Timeline"
            expanded={expandedSections.timeline}
            onPress={() => toggleSection('timeline')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <Card.Content>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start:</Text>
                <Text style={styles.dateText}>
                  {formatDateIST(task.startDate)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End:</Text>
                <Text style={styles.dateText}>
                  {formatDateIST(task.endDate)}
                </Text>
              </View>
            </Card.Content>
          </List.Accordion>
        </Card>

        {/* Assignment Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Assignment"
            expanded={expandedSections.assignment}
            onPress={() => toggleSection('assignment')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <Card.Content>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned To:</Text>
                <Text style={styles.infoValue}>{task.assignedTo}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned By:</Text>
                <Text style={styles.infoValue}>{task.assignedBy}</Text>
              </View>
            </Card.Content>
          </List.Accordion>
        </Card>

        {/* Hours Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Hours"
            expanded={expandedSections.hours}
            onPress={() => toggleSection('hours')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <Card.Content>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estimated:</Text>
                <Text style={styles.infoValue}>{task.estimatedHours || 0} hrs</Text>
              </View>
              {task.actualHours !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Actual:</Text>
                  <Text style={styles.infoValue}>{task.actualHours} hrs</Text>
                </View>
              )}
            </Card.Content>
          </List.Accordion>
        </Card>

        {/* Remarks Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Remarks"
            expanded={expandedSections.remarks}
            onPress={() => toggleSection('remarks')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <Card.Content>
              {isEditing ? (
                <PaperTextInput
                  value={editedRemarks}
                  onChangeText={setEditedRemarks}
                  multiline
                  numberOfLines={3}
                  placeholder="Add remarks..."
                  mode="outlined"
                  disabled={isOffline}
                  style={styles.textInput}
                />
              ) : (
                <Text style={styles.sectionContent}>
                  {task.remarks || 'No remarks'}
                </Text>
              )}
            </Card.Content>
          </List.Accordion>
        </Card>

        {/* Project Info Section */}
        {(task.projectId || task.subprojectId) && (
          <Card style={styles.sectionCard} elevation={1}>
            <List.Accordion
              title="Project"
              expanded={expandedSections.project}
              onPress={() => toggleSection('project')}
              titleStyle={styles.accordionTitle}
              style={styles.accordion}
            >
              <Card.Content>
                {task.projectId && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Project:</Text>
                    <Text style={styles.infoValue}>{task.projectId}</Text>
                  </View>
                )}
                {task.subprojectId && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Subproject:</Text>
                    <Text style={styles.infoValue}>{task.subprojectId}</Text>
                  </View>
                )}
              </Card.Content>
            </List.Accordion>
          </Card>
        )}

        {/* Metadata Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Metadata"
            expanded={expandedSections.project}
            onPress={() => toggleSection('project')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <Card.Content>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>{formatDateTimeIST(task.createdAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Updated:</Text>
                <Text style={styles.infoValue}>{formatDateTimeIST(task.updatedAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Creator:</Text>
                <Text style={styles.infoValue}>{task.assignedBy}</Text>
              </View>
            </Card.Content>
          </List.Accordion>
        </Card>

        {/* Activity & Comments Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Activity & Comments"
            expanded={expandedSections.activity}
            onPress={() => toggleSection('activity')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <View style={styles.timelineContainer}>
              <UnifiedTimeline
                entityType="task"
                entityId={taskId}
                showCommentInput={true}
              />
            </View>
          </List.Accordion>
        </Card>

        {/* Checklists Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Checklists"
            expanded={expandedSections.checklists}
            onPress={() => toggleSection('checklists')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <View style={styles.checklistContainer}>
              <TaskChecklistManager
                taskId={taskId}
                canEdit={!isOffline}
              />
            </View>
          </List.Accordion>
        </Card>

        {/* Related Items Section */}
        <Card style={styles.sectionCard} elevation={1}>
          <List.Accordion
            title="Related Items"
            expanded={expandedSections.relatedItems}
            onPress={() => toggleSection('relatedItems')}
            titleStyle={styles.accordionTitle}
            style={styles.accordion}
          >
            <View style={styles.relatedItemsContainer}>
              <RelatedItemsManager
                itemId={taskId}
                itemType="task"
                onItemPress={(item) => {
                  if (item.type === 'task') {
                    navigation.push('TaskDetails', { taskId: item.id })
                  } else {
                    navigation.push('BugDetails', { bugId: item.id })
                  }
                }}
              />
            </View>
          </List.Accordion>
        </Card>

        {/* Edit Mode Actions */}
        {isEditing && (
          <View style={styles.editActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setIsEditing(false)
                setEditedStatus(task.status)
                setEditedPriority(task.priority)
                setEditedDescription(task.description)
                setEditedRemarks(task.remarks || '')
              }}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving || isOffline}
              style={styles.saveButton}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: materialSpacing.lg,
  },
  loadingText: {
    ...materialTypography.bodyLarge,
    color: colors.textSecondary,
    marginTop: materialSpacing.md,
  },
  errorText: {
    ...materialTypography.bodyLarge,
    color: colors.error,
    marginBottom: materialSpacing.md,
  },
  backButton: {
    borderRadius: 8,
  },
  content: {
    padding: materialSpacing.md,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskId: {
    ...materialTypography.headlineMedium,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
  },
  badges: {
    flexDirection: 'row',
    gap: materialSpacing.xs,
    marginTop: materialSpacing.md,
  },
  statusChip: {
    marginRight: materialSpacing.xs,
  },
  priorityChip: {
  },
  chipText: {
    ...materialTypography.labelSmall,
    color: colors.surface,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.sm,
  },
  accordion: {
    backgroundColor: colors.surface,
  },
  accordionTitle: {
    ...materialTypography.titleMedium,
    color: colors.text,
  },
  sectionTitle: {
    ...materialTypography.titleSmall,
    color: colors.textSecondary,
    marginBottom: materialSpacing.sm,
    textTransform: 'uppercase',
  },
  sectionContent: {
    ...materialTypography.bodyMedium,
    color: colors.text,
    lineHeight: 22,
  },
  textInput: {
    backgroundColor: colors.surface,
  },
  pickerContainer: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: materialSpacing.xs,
  },
  picker: {
    height: 50,
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: materialSpacing.sm,
  },
  infoLabel: {
    ...materialTypography.bodyMedium,
    color: colors.textSecondary,
    width: 120,
  },
  infoValue: {
    ...materialTypography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  dateText: {
    ...materialTypography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: materialSpacing.sm,
    marginTop: materialSpacing.lg,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
  },
  timelineContainer: {
    minHeight: 200,
    maxHeight: 500,
  },
  checklistContainer: {
    minHeight: 150,
    maxHeight: 400,
  },
  relatedItemsContainer: {
    minHeight: 150,
    maxHeight: 400,
  },
})

