import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createTask } from '../services/taskService'
import { getAllUsers } from '../services/userService'
import { get } from '../services/apiClient'

export default function CreateTaskScreen({ navigation }: any) {
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

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (projectId) {
      loadSubprojects(projectId)
    } else {
      setSubprojects([])
      setSubprojectId('')
    }
  }, [projectId])

  const loadInitialData = async () => {
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
  }

  const loadSubprojects = async (parentId: string) => {
    try {
      const response = await get(`/api/projects?parentId=${parentId}`)
      if (response.success && response.data) {
        setSubprojects(response.data)
      }
    } catch (error) {
      console.error('Failed to load subprojects:', error)
    }
  }

  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/
    const match = time.match(timeRegex)
    
    if (!match) return false
    
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const seconds = parseInt(match[3], 10)
    
    return minutes < 60 && seconds < 60
  }

  const convertTimeToHours = (time: string): number => {
    const [hours, minutes, seconds] = time.split(':').map(Number)
    return hours + (minutes / 60) + (seconds / 3600)
  }

  const handleSubmit = async () => {
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
  }

  const taskStatuses = settings.task_statuses || ['Open', 'In Progress', 'Delayed', 'On Hold', 'ReOpened', 'Cancelled', 'Completed']
  const taskPriorities = settings.task_priorities || ['U&I (Urgent & Important)', 'NU&I (Not Urgent & Important)', 'NI&U (Not Important & Urgent)', 'NU&NI (Not Urgent & Not Important)']

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter task description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Project */}
        <View style={styles.field}>
          <Text style={styles.label}>Project</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={projectId}
              onValueChange={(value) => {
                setProjectId(value)
                setSubprojectId('')
              }}
              style={styles.picker}
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
        </View>

        {/* Subproject */}
        {projectId && subprojects.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Subproject</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={subprojectId}
                onValueChange={setSubprojectId}
                style={styles.picker}
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
        <View style={styles.field}>
          <Text style={styles.label}>
            Start Date <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
          />
        </View>

        {/* End Date */}
        <View style={styles.field}>
          <Text style={styles.label}>
            End Date <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>

        {/* Estimated Hours */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Estimated Hours (hh:mm:ss) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="02:30:00"
            value={estimatedHours}
            onChangeText={setEstimatedHours}
          />
          <Text style={styles.helpText}>
            Enter time in hh:mm:ss format (e.g., 02:30:00 for 2.5 hours)
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
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
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
})

