import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native'
import { Card, Text, Button, ActivityIndicator, IconButton, Portal, Dialog, TextInput, Chip } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import DateTimePicker from '@react-native-community/datetimepicker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getUserData } from '../utils/secureStorage'
import { materialSpacing, materialTypography, materialColors } from '../config/materialTheme'
import { useResponsive } from '../hooks/useResponsive'
import { formatDateIST } from '../utils/datetime'
import { get, put } from '../services/apiClient'

interface Task {
  id: string
  taskId: string
  name: string
  description: string
  status: string
  priority: string
  assignedTo: string | string[]
  support?: string[]
  dailyHours?: string
  estimatedHours: number
  actualHours?: number
  remarks?: string
  difficulties?: string
  updatedAt: string
  endDate: string
}

export default function YourWorkScreen() {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Date Selection State
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1) // default to yesterday
    return d
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Modal / Update State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [statusInput, setStatusInput] = useState('')
  const [additionalHours, setAdditionalHours] = useState('')
  const [newRemarks, setNewRemarks] = useState('')
  const [newDifficulties, setNewDifficulties] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const formattedSelectedDate = selectedDate.toISOString().split('T')[0]

  // Daily hours helper functions
  const parseDailyHours = (dailyHoursString?: string): Record<string, number> => {
    if (!dailyHoursString) return {}
    try {
      return JSON.parse(dailyHoursString)
    } catch {
      return {}
    }
  }

  const getHoursForDate = (date: string, dailyHoursString?: string): number => {
    const dailyHours = parseDailyHours(dailyHoursString)
    return dailyHours[date] || 0
  }

  const loadData = useCallback(async () => {
    try {
      const user = await getUserData()
      if (!user) return
      setCurrentUser(user)

      setLoading(true)
      setError(null)

      // Fetch user's tasks
      const result = await get(`/api/tasks/user/${user.employeeId}`)
      if (result.success && result.data) {
        setTasks(result.data || [])
      } else {
        setError('Failed to load tasks')
      }

      // Fetch settings status options
      const settingsResult = await get('/api/settings?grouped=true&activeOnly=true')
      if (settingsResult.success && settingsResult.data) {
        setStatusOptions(settingsResult.data.task_status || [])
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load your work details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  // Filter tasks worked on selected date
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const hours = getHoursForDate(formattedSelectedDate, task.dailyHours)
      return hours > 0
    })
  }, [tasks, formattedSelectedDate])

  const totalHoursWorked = useMemo(() => {
    return filteredTasks.reduce((sum, task) => {
      return sum + getHoursForDate(formattedSelectedDate, task.dailyHours)
    }, 0)
  }, [filteredTasks, formattedSelectedDate])

  const completedTasksCount = useMemo(() => {
    return filteredTasks.filter(task => {
      const completedDate = new Date(task.updatedAt).toISOString().split('T')[0]
      return task.status === 'Done' && completedDate === formattedSelectedDate
    }).length
  }, [filteredTasks, formattedSelectedDate])

  // Open Update Modal
  const openUpdateModal = (task: Task) => {
    setSelectedTask(task)
    setStatusInput(task.status)
    setAdditionalHours('')
    setNewRemarks('')
    setNewDifficulties('')
  }

  const handleUpdateSubmit = async () => {
    if (!selectedTask) return

    const hoursToAdd = additionalHours ? parseFloat(additionalHours) : 0
    if (additionalHours && (isNaN(hoursToAdd) || hoursToAdd < 0)) {
      Alert.alert('Validation Error', 'Please enter a valid positive number for hours')
      return
    }

    try {
      setIsUpdating(true)

      // 1. Calculate daily hours
      const dailyHours = parseDailyHours(selectedTask.dailyHours)
      const currentHoursOnDate = dailyHours[formattedSelectedDate] || 0
      dailyHours[formattedSelectedDate] = currentHoursOnDate + hoursToAdd
      const updatedDailyHoursString = JSON.stringify(dailyHours)

      // Calculate total actual hours
      const totalHours = Object.values(dailyHours).reduce((sum, h) => sum + h, 0)

      // 2. Prepare timestamped remarks & difficulties
      const currentDateString = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      let finalRemarks = selectedTask.remarks || ''
      if (newRemarks.trim()) {
        const remarkEntry = `[${currentDateString}] ${newRemarks.trim()}`
        finalRemarks = finalRemarks ? `${finalRemarks}\n\n${remarkEntry}` : remarkEntry
      }

      let finalDifficulties = selectedTask.difficulties || ''
      if (newDifficulties.trim()) {
        const difficultyEntry = `[${currentDateString}] ${newDifficulties.trim()}`
        finalDifficulties = finalDifficulties ? `${finalDifficulties}\n\n${difficultyEntry}` : difficultyEntry
      }

      // 3. Make PUT request
      const response = await put(`/api/tasks/${selectedTask.id}`, {
        status: statusInput,
        remarks: finalRemarks || undefined,
        actualHours: totalHours,
        dailyHours: updatedDailyHoursString,
        difficulties: finalDifficulties || undefined
      })

      if (response.success) {
        Alert.alert('Success', 'Task updated successfully')
        setSelectedTask(null)
        loadData()
      } else {
        Alert.alert('Error', response.error || 'Failed to update task')
      }
    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'An error occurred during update')
    } finally {
      setIsUpdating(false)
    }
  }

  const renderTaskItem = ({ item, index }: { item: Task; index: number }) => {
    const hours = getHoursForDate(formattedSelectedDate, item.dailyHours)
    const isOwner = !item.support || !item.support.includes(currentUser?.employeeId)

    return (
      <Card style={styles.taskCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.indexText}>#{index + 1}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Chip textStyle={styles.chipText} style={styles.taskIdChip} compact>{item.taskId}</Chip>
              {isOwner ? (
                <Chip icon="crown" textStyle={styles.chipText} style={styles.ownerChip} compact>Owner</Chip>
              ) : (
                <Chip icon="heart" textStyle={styles.chipText} style={styles.supportChip} compact>Support</Chip>
              )}
            </View>
          </View>

          <Text style={styles.taskTitle}>{item.name}</Text>
          <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hours Worked:</Text>
            <Text style={styles.infoVal}>{hours.toFixed(1)} hrs</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date:</Text>
            <Text style={styles.infoVal}>{formatDateIST(item.endDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoVal, { fontWeight: 'bold', color: item.status === 'Done' ? colors.success : colors.primary }]}>{item.status}</Text>
          </View>

          {item.remarks ? (
            <View style={styles.logBox}>
              <Text style={styles.logTitle}>Remarks:</Text>
              <Text style={styles.logText} numberOfLines={2}>{item.remarks}</Text>
            </View>
          ) : null}

          {item.difficulties ? (
            <View style={[styles.logBox, { backgroundColor: colors.errorLight }]}>
              <Text style={[styles.logTitle, { color: colors.error }]}>Difficulties:</Text>
              <Text style={styles.logText} numberOfLines={2}>{item.difficulties}</Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            icon="square-edit-outline"
            style={styles.editBtn}
            onPress={() => openUpdateModal(item)}
            buttonColor={colors.primary}
            textColor="white"
          >
            Update
          </Button>
        </Card.Content>
      </Card>
    )
  }

  return (
    <View style={styles.container}>
      {/* Date Selector */}
      <Card style={styles.dateCard} elevation={1}>
        <Card.Content style={styles.dateCardContent}>
          <View>
            <Text style={styles.dateTitle}>Work Date</Text>
            <Text style={styles.dateValue}>{selectedDate.toDateString()}</Text>
          </View>
          <IconButton
            icon="calendar"
            mode="contained"
            containerColor={colors.primary}
            iconColor="white"
            onPress={() => setShowDatePicker(true)}
          />
        </Card.Content>
      </Card>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false)
            if (date) setSelectedDate(date)
          }}
        />
      )}

      {loading && tasks.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadData} style={{ marginTop: 10 }}>Retry</Button>
        </View>
      ) : (
        <>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.primaryLight }]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={colors.primary} />
              <Text style={styles.summaryLabel}>Total Hours</Text>
              <Text style={styles.summaryValue}>{totalHoursWorked.toFixed(1)}h</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.successLight }]}>
              <MaterialCommunityIcons name="check-circle-outline" size={24} color={colors.success} />
              <Text style={styles.summaryLabel}>Completed</Text>
              <Text style={styles.summaryValue}>{completedTasksCount}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.infoLight }]}>
              <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.info} />
              <Text style={styles.summaryLabel}>Active Tasks</Text>
              <Text style={styles.summaryValue}>{filteredTasks.length}</Text>
            </View>
          </View>

          <FlatList
            data={filteredTasks}
            renderItem={renderTaskItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No work logged for this date</Text>
              </View>
            }
          />
        </>
      )}

      {/* Task Update Modal */}
      <Portal>
        <Dialog visible={!!selectedTask} onDismiss={() => setSelectedTask(null)} style={styles.dialog}>
          <Dialog.Title>Update Task Status</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {selectedTask && (
                <View style={{ gap: 12 }}>
                  <Text style={styles.modalTaskName}>{selectedTask.name}</Text>
                  <Text style={styles.modalTaskId}>ID: {selectedTask.taskId}</Text>

                  {/* Status Selection */}
                  <Text style={styles.label}>Status *</Text>
                  <View style={styles.pickerContainer}>
                    <TextInput
                      mode="outlined"
                      value={statusInput}
                      onChangeText={setStatusInput}
                      placeholder="e.g. In Progress, Done"
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                    />
                  </View>

                  {/* Daily Hours Display */}
                  <View style={styles.hoursLog}>
                    <Text style={styles.logText}>Hours already logged on this date: <Text style={{ fontWeight: 'bold' }}>{getHoursForDate(formattedSelectedDate, selectedTask.dailyHours)}h</Text></Text>
                  </View>

                  {/* Add Hours */}
                  <TextInput
                    mode="outlined"
                    label="Add Hours"
                    value={additionalHours}
                    onChangeText={setAdditionalHours}
                    keyboardType="numeric"
                    placeholder="e.g. 2.5"
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />

                  {/* Current Remarks */}
                  {selectedTask.remarks ? (
                    <View style={styles.currentLogContainer}>
                      <Text style={styles.currentLogLabel}>Current Remarks:</Text>
                      <Text style={styles.currentLogVal}>{selectedTask.remarks}</Text>
                    </View>
                  ) : null}

                  {/* Add Remarks */}
                  <TextInput
                    mode="outlined"
                    label="Add New Remarks"
                    value={newRemarks}
                    onChangeText={setNewRemarks}
                    multiline
                    numberOfLines={3}
                    placeholder="Progress comments..."
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />

                  {/* Current Difficulties */}
                  {selectedTask.difficulties ? (
                    <View style={styles.currentLogContainer}>
                      <Text style={[styles.currentLogLabel, { color: colors.error }]}>Current Difficulties:</Text>
                      <Text style={styles.currentLogVal}>{selectedTask.difficulties}</Text>
                    </View>
                  ) : null}

                  {/* Add Difficulties */}
                  <TextInput
                    mode="outlined"
                    label="Add New Difficulties (Optional)"
                    value={newDifficulties}
                    onChangeText={setNewDifficulties}
                    multiline
                    numberOfLines={2}
                    placeholder="Blockers or challenges..."
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                </View>
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectedTask(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleUpdateSubmit} loading={isUpdating} disabled={isUpdating} buttonColor={colors.primary} textColor="white">Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dateCard: {
    margin: materialSpacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  dateCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: materialSpacing.sm,
  },
  dateTitle: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
  },
  dateValue: {
    ...materialTypography.titleLarge,
    fontWeight: 'bold',
    color: colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: materialSpacing.xl,
  },
  errorText: {
    ...materialTypography.bodyLarge,
    color: colors.error,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: materialSpacing.md,
    marginBottom: materialSpacing.md,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: materialSpacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
  },
  summaryLabel: {
    ...materialTypography.labelSmall,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryValue: {
    ...materialTypography.titleMedium,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: materialSpacing.md,
    paddingBottom: materialSpacing.xl,
  },
  taskCard: {
    marginBottom: materialSpacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: materialSpacing.sm,
  },
  indexText: {
    ...materialTypography.titleMedium,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  chipText: {
    fontSize: 10,
    color: colors.text,
  },
  taskIdChip: {
    backgroundColor: colors.surfaceVariant,
  },
  ownerChip: {
    backgroundColor: colors.primaryLight,
  },
  supportChip: {
    backgroundColor: colors.infoLight,
  },
  taskTitle: {
    ...materialTypography.titleMedium,
    fontWeight: 'bold',
    color: colors.text,
  },
  taskDesc: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: materialSpacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    ...materialTypography.bodyMedium,
    color: colors.textSecondary,
  },
  infoVal: {
    ...materialTypography.bodyMedium,
    color: colors.text,
  },
  logBox: {
    backgroundColor: colors.surfaceVariant,
    padding: materialSpacing.sm,
    borderRadius: 8,
    marginTop: materialSpacing.sm,
  },
  logTitle: {
    ...materialTypography.labelSmall,
    fontWeight: 'bold',
    color: colors.text,
  },
  logText: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    marginTop: materialSpacing.md,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: materialSpacing.xxl,
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: colors.textSecondary,
    marginTop: materialSpacing.md,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  modalTaskName: {
    ...materialTypography.titleMedium,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalTaskId: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
  },
  label: {
    ...materialTypography.labelLarge,
    color: colors.text,
  },
  pickerContainer: {
    marginBottom: 4,
  },
  hoursLog: {
    backgroundColor: colors.surfaceVariant,
    padding: 10,
    borderRadius: 8,
  },
  currentLogContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    borderRadius: 8,
  },
  currentLogLabel: {
    ...materialTypography.labelSmall,
    fontWeight: 'bold',
    color: colors.text,
  },
  currentLogVal: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
})
