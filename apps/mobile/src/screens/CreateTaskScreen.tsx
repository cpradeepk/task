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
import * as DocumentPicker from 'expo-document-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createTask } from '../services/taskService'
import { getAllUsers } from '../services/userService'
import { getUserData } from '../utils/secureStorage'
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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectType, setSelectType] = useState('Normal')
  const [recursiveType, setRecursiveType] = useState('Weekly') // Default if recursive
  const [department, setDepartment] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('Open')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [projectId, setProjectId] = useState('')
  const [subprojectId, setSubprojectId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [support, setSupport] = useState<string[]>([]) // Support team members
  const [attachedFile, setAttachedFile] = useState<any>(null)

  const STATIC_PROJECTS = [
    { projectId: 'dsn', projectName: 'dsn' },
    { projectId: 'amtariksha', projectName: 'amtariksha' },
    { projectId: 'task management', projectName: 'task management' },
    { projectId: 'swarg', projectName: 'swarg' },
    { projectId: 'other', projectName: 'other' }
  ]
  const STATIC_SUBPROJECTS = [
    { projectId: 'testing', projectName: 'testing' },
    { projectId: 'development', projectName: 'development' },
    { projectId: 'reporting', projectName: 'reporting' }
  ]

  const [users, setUsers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>(STATIC_PROJECTS)
  const [subprojects, setSubprojects] = useState<any[]>(STATIC_SUBPROJECTS)
  const [settings, setSettings] = useState<any>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadInitialData = useCallback(async () => {
    try {
      // Get current user
      const user = await getUserData()
      if (user) {
        setCurrentUser(user)
        setAssignedTo(user.employeeId)
        setDepartment(user.department || '') // Default department from user
      }

      // Load users
      const usersResponse = await getAllUsers()
      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data)
      }

      // Load projects
      const projectsResponse = await get('/api/projects?type=main')
      if (projectsResponse.success && projectsResponse.data) {
        // Merge with static, avoiding duplicates
        const newProjects = [...STATIC_PROJECTS]
        projectsResponse.data.forEach((p: any) => {
          if (!newProjects.find(sp => sp.projectId === p.projectId)) {
            newProjects.push(p)
          }
        })
        setProjects(newProjects)
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
      let newSubprojects = [...STATIC_SUBPROJECTS]
      if (response.success && response.data) {
        newSubprojects = [...newSubprojects, ...response.data] // Add backend ones
      }
      setSubprojects(newSubprojects)
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
      setSubprojects(STATIC_SUBPROJECTS)
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
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter task name')
      return
    }

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

      // Prepare payload
      let payload: any

      if (attachedFile) {
        // Use FormData for file upload
        const formData = new FormData()
        formData.append('name', name.trim())
        formData.append('selectType', selectType)
        if (selectType === 'Recursive') {
          formData.append('recursiveType', recursiveType)
        }
        formData.append('department', department)
        formData.append('description', description.trim())
        // Fix: assignedTo must be JSON string of array for FormData parsing on backend, 
        // OR just append multiple keys if backend supports it. 
        // Based on "is_array" error, backend likely expects an array directly in JSON.
        // For FormData, we usually send JSON as a string field or individual fields.
        // Let's assume standard FormData handling:
        formData.append('assignedTo', JSON.stringify([assignedTo]))
        formData.append('assignedBy', currentUser?.employeeId || '')
        formData.append('startDate', startDate)
        formData.append('endDate', endDate)
        formData.append('priority', priority)
        formData.append('estimatedHours', String(estimatedHoursDecimal))
        if (projectId) formData.append('projectId', projectId)
        if (subprojectId) formData.append('subprojectId', subprojectId)
        formData.append('status', status)

        // Append file
        formData.append('attachments', {
          uri: attachedFile.uri,
          name: attachedFile.name,
          type: attachedFile.mimeType || 'application/octet-stream',
        } as any)

        payload = formData
      } else {
        // Use JSON
        payload = {
          taskId: '',
          name: name.trim(),
          selectType: selectType as 'Normal' | 'Recursive',
          recursiveType: selectType === 'Recursive' ? recursiveType as any : undefined,
          department: department.trim(),
          description: description.trim(),
          assignedTo: [assignedTo], // Fix: Send as Array
          assignedBy: currentUser?.employeeId || '',
          support: support.length > 0 ? support : undefined, // Add support team
          startDate,
          endDate,
          priority,
          estimatedHours: estimatedHoursDecimal,
          projectId: projectId || undefined,
          subprojectId: subprojectId || undefined,
          status: status || 'Open',
        }
      }

      const response = await createTask(payload)

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
  const departments = ['Management', 'Marketing', 'Sales', 'Operations', 'Accounts', 'HR', 'Research']
  const recursionFrequencies = ['Daily', 'Weekly', 'Monthly', 'Annually']

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })

      if (result.assets && result.assets.length > 0) {
        setAttachedFile(result.assets[0])
      }
    } catch (err) {
      console.warn(err)
    }
  }

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
          {/* Task Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Task Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectType}
                onValueChange={setSelectType}
                style={styles.picker}
              >
                <Picker.Item label="Normal Task" value="Normal" />
                <Picker.Item label="Recurring Task" value="Recursive" />
              </Picker>
            </View>
          </View>

          {/* Recursion Type (only if Recursive) */}
          {selectType === 'Recursive' && (
            <View style={styles.field}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={recursiveType}
                  onValueChange={setRecursiveType}
                  style={styles.picker}
                >
                  {recursionFrequencies.map((freq) => (
                    <Picker.Item key={freq} label={freq} value={freq} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {/* Department */}
          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={department}
                onValueChange={setDepartment}
                style={styles.picker}
              >
                <Picker.Item label="Select Department" value="" />
                {departments.map((dept) => (
                  <Picker.Item key={dept} label={dept} value={dept} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Task Name */}
          <TextInput
            mode="outlined"
            label="Task Name *"
            placeholder="Enter task name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            outlineColor={materialColors.border}
            activeOutlineColor={materialColors.primary}
            disabled={isOffline}
          />

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
                {projects.map((project: any) => (
                  <Picker.Item
                    key={project.projectId}
                    label={project.projectName}
                    value={project.projectId}
                  />
                ))}
              </Picker>
            </View>
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
                  {subprojects.map((subproject: any) => (
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
                {taskPriorities.map((p: any) => (
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
                {taskStatuses.map((s: any) => (
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
                {users.map((user: any) => (
                  <Picker.Item
                    key={user.employeeId}
                    label={user.name}
                    value={user.employeeId}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Support Team */}
          <View style={styles.field}>
            <Text style={styles.label}>Support Team (Optional)</Text>
            <Text style={styles.helpText}>
              Select support team members who will assist with this task
            </Text>
            {users.filter(u => u.employeeId !== assignedTo).map((user: any) => (
              <View key={user.employeeId} style={styles.checkboxRow}>
                <Button
                  mode={support.includes(user.employeeId) ? 'contained' : 'outlined'}
                  onPress={() => {
                    if (support.includes(user.employeeId)) {
                      setSupport(support.filter(id => id !== user.employeeId))
                    } else {
                      setSupport([...support, user.employeeId])
                    }
                  }}
                  compact
                  style={styles.checkboxButton}
                  labelStyle={styles.checkboxLabel}
                >
                  {user.name}
                </Button>
              </View>
            ))}
            {support.length > 0 && (
              <Text style={styles.selectedText}>
                Selected: {support.map(id => users.find(u => u.employeeId === id)?.name).join(', ')}
              </Text>
            )}
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

          {/* File Attachment */}
          <View style={styles.field}>
            <Text style={styles.label}>Attachment</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Button
                mode="outlined"
                onPress={handleFilePick}
                icon="paperclip"
              >
                {attachedFile ? 'Change File' : 'Attach File'}
              </Button>
              {attachedFile && (
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: materialColors.text }}>
                    {attachedFile.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: materialColors.textSecondary }}>
                    {(attachedFile.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
              )}
            </View>
          </View>

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
  checkboxRow: {
    marginBottom: materialSpacing.xs,
  },
  checkboxButton: {
    justifyContent: 'flex-start',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  selectedText: {
    ...materialTypography.bodySmall,
    color: materialColors.primary,
    marginTop: materialSpacing.sm,
    fontWeight: '600',
  },
})

