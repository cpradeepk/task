import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { TextInput, Button, Surface, Text, ActivityIndicator } from 'react-native-paper'
import { Picker } from '@react-native-picker/picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createTask } from '../services/taskService'
import { getAllUsers } from '../services/userService'
import { get } from '../services/apiClient'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function CreateTaskScreen({ navigation }: any) {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('Open')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [projectId, setProjectId] = useState('')
  const [subprojectId, setSubprojectId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [subprojects, setSubprojects] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadInitialData = useCallback(async () => {
    try {
      // Get current user
      const userStr = await AsyncStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUser(user)
        setAssignedTo(user.employeeId)
      }

      // Load users
      const usersResponse = await getAllUsers()
      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data)
      }

      // Load projects
      const projectsResponse = await get('/api/projects?type=main')
      if (projectsResponse.success && projectsResponse.data) {
        setProjects(projectsResponse.data)
      }

      // Load settings
      const settingsResponse = await get('/api/settings')
      if (settingsResponse.success && settingsResponse.data) {
        const settingsMap: any = {}
        settingsResponse.data.forEach((setting: any) => {
          settingsMap[setting.key] = setting.value
        })
        setSettings(settingsMap)
      }

      // Set default dates
      const today = new Date().toISOString().split('T')[0]
      setStartDate(today)
      setEndDate(today)
    } catch (error) {
      console.error('Failed to load initial data:', error)
      Alert.alert('Error', 'Failed to load data')
    }
  }, [])

  const loadSubprojects = useCallback(async (parentId: string) => {
    try {
      const response = await get(`/api/projects?parentId=${parentId}`)
      if (response.success && response.data) {
        setSubprojects(response.data)
      }
    } catch (error) {
      console.error('Failed to load subprojects:', error)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    if (projectId) {
      loadSubprojects(projectId)
    } else {
      setSubprojects([])
      setSubprojectId('')
    }
  }, [projectId, loadSubprojects])

  const validateTimeFormat = useCallback((time: string): boolean => {
    const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/
    const match = time.match(timeRegex)

    if (!match) return false

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const seconds = parseInt(match[3], 10)

    return minutes < 60 && seconds < 60
  }, [])

  const convertTimeToHours = useCallback((time: string): number => {
    const [hours, minutes, seconds] = time.split(':').map(Number)
    return hours + (minutes / 60) + (seconds / 3600)
  }, [])

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter task description')
      return
    }

    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please select start and end dates')
      return
    }

    if (!priority) {
      Alert.alert('Error', 'Please select priority')
      return
    }

    if (!estimatedHours.trim()) {
      Alert.alert('Error', 'Please enter estimated hours')
      return
    }

    if (!validateTimeFormat(estimatedHours)) {
      Alert.alert('Error', 'Please enter estimated hours in hh:mm:ss format (e.g., 02:30:00)')
      return
    }

    if (!assignedTo) {
      Alert.alert('Error', 'Please select assignee')
      return
    }

    try {
      setIsSubmitting(true)

      const estimatedHoursDecimal = convertTimeToHours(estimatedHours)

      const taskData = {
        selectType: 'Normal' as const,
        description: description.trim(),
        assignedTo,
        assignedBy: currentUser?.employeeId || '',
        startDate,
        endDate,
        priority,
        estimatedHours: estimatedHoursDecimal,
        projectId: projectId || undefined,
        subprojectId: subprojectId || undefined,
        status: status || 'Open',
      }

      const response = await createTask(taskData)

      if (response.success) {
        Alert.alert('Success', 'Task created successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ])
      } else {
        Alert.alert('Error', response.error || 'Failed to create task')
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      Alert.alert('Error', 'Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }, [description, startDate, endDate, priority, estimatedHours, assignedTo, currentUser, projectId, subprojectId, status, convertTimeToHours, validateTimeFormat, navigation])

  const taskStatuses = useMemo(() => settings.task_statuses || ['Open', 'In Progress', 'Delayed', 'On Hold', 'ReOpened', 'Cancelled', 'Completed'], [settings])
  const taskPriorities = useMemo(() => settings.task_priorities || ['U&I (Urgent & Important)', 'NU&I (Not Urgent & Important)', 'NI&U (Not Important & Urgent)', 'NU&NI (Not Urgent & Not Important)'], [settings])

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.form} elevation={0}>
          {/* Description */}
          <TextInput
            mode="outlined"
            label="Description *"
            placeholder="Enter task description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.input}
            outlineColor={materialColors.border}
            activeOutlineColor={materialColors.primary}
            disabled={isOffline}
          />

          {/* Project */}
          <View style={styles.field}>
            <Text style={styles.label}>Project</Text>
            {projects.length === 0 ? (
              <Text style={styles.helpText}>Loading projects...</Text>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={projectId}
                  onValueChange={(value) => {
                    console.log('Project selected:', value)
                    setProjectId(value)
                    setSubprojectId('')
                  }}
                  style={styles.picker}
                  dropdownIconColor={materialColors.text}
                  enabled={!isOffline}
                >
                  <Picker.Item label="Select Project" value="" />
                  {projects.map((project) => (
                    <Picker.Item
                      key={project.projectId}
                      label={project.projectName}
                      value={project.projectId}
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Subproject */}
          {projectId && subprojects.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>Subproject</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={subprojectId}
                  onValueChange={(value) => {
                    console.log('Subproject selected:', value)
                    setSubprojectId(value)
                  }}
                  style={styles.picker}
                  dropdownIconColor={materialColors.text}
                  enabled={!isOffline}
                >
                  <Picker.Item label="Select Subproject" value="" />
                  {subprojects.map((subproject) => (
                    <Picker.Item
                      key={subproject.projectId}
                      label={subproject.projectName}
                      value={subproject.projectId}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {/* Priority */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Priority <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={priority}
                onValueChange={setPriority}
                style={styles.picker}
              >
                <Picker.Item label="Select Priority" value="" />
                {taskPriorities.map((p) => (
                  <Picker.Item key={p} label={p} value={p} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Status */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Status <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={status}
                onValueChange={setStatus}
                style={styles.picker}
              >
                {taskStatuses.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Assigned To */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Assigned To <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={assignedTo}
                onValueChange={setAssignedTo}
                style={styles.picker}
              >
                <Picker.Item label="Select User" value="" />
                {users.map((user) => (
                  <Picker.Item
                    key={user.employeeId}
                    label={user.name}
                    value={user.employeeId}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Start Date */}
          <TextInput
            mode="outlined"
            label="Start Date *"
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
            style={styles.input}
            outlineColor={materialColors.border}
            activeOutlineColor={materialColors.primary}
            disabled={isOffline}
          />

          {/* End Date */}
          <TextInput
            mode="outlined"
            label="End Date *"
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
            style={styles.input}
            outlineColor={materialColors.border}
            activeOutlineColor={materialColors.primary}
            disabled={isOffline}
          />

          {/* Estimated Hours */}
          <TextInput
            mode="outlined"
            label="Estimated Hours (hh:mm:ss) *"
            placeholder="02:30:00"
            value={estimatedHours}
            onChangeText={setEstimatedHours}
            style={styles.input}
            outlineColor={materialColors.border}
            activeOutlineColor={materialColors.primary}
            disabled={isOffline}
          />
          <Text style={styles.helpText}>
            Enter time in hh:mm:ss format (e.g., 02:30:00 for 2.5 hours)
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              textColor={colors.textSecondary}
              disabled={isSubmitting || isOffline}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={isSubmitting || isOffline}
              loading={isSubmitting}
              style={styles.submitButton}
              buttonColor={materialColors.primary}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: materialColors.background,
  },
  form: {
    padding: materialSpacing.md,
    gap: materialSpacing.md,
  },
  field: {
    marginBottom: materialSpacing.md,
  },
  label: {
    ...materialTypography.labelLarge,
    color: materialColors.text,
    marginBottom: materialSpacing.xs,
  },
  required: {
    color: materialColors.error,
  },
  input: {
    backgroundColor: materialColors.surface,
  },
  pickerContainer: {
    backgroundColor: materialColors.surface,
    borderWidth: 1,
    borderColor: materialColors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: materialColors.text,
  },

  helpText: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
    marginTop: materialSpacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: materialSpacing.md,
    marginTop: materialSpacing.md,
  },
  cancelButton: {
    flex: 1,
    borderColor: materialColors.border,
  },
  submitButton: {
    flex: 1,
    marginTop: 0,
  },
})

