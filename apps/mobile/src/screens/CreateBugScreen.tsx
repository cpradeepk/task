/**
 * Create Bug Screen
 * Create new bugs with all required fields
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { createBug } from '../services/bugService'
import { getProjectHierarchy, ProjectHierarchy } from '../services/projectService'
import { getAllSettings, GroupedSettings } from '../services/settingsService'
import { getAllUsers, getCurrentUser, User } from '../services/userService'
import { useNavigation } from '@react-navigation/native'

export default function CreateBugScreen() {
  const navigation = useNavigation()
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [subprojectId, setSubprojectId] = useState('')
  const [severity, setSeverity] = useState('')
  const [category, setCategory] = useState('')
  const [platform, setPlatform] = useState('')
  const [environment, setEnvironment] = useState('')
  const [browser, setBrowser] = useState('')
  const [device, setDevice] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  
  // Data state
  const [projects, setProjects] = useState<ProjectHierarchy[]>([])
  const [settings, setSettings] = useState<GroupedSettings>({})
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [user, projectsRes, settingsRes, usersRes] = await Promise.all([
        getCurrentUser(),
        getProjectHierarchy(),
        getAllSettings(true, true),
        getAllUsers(),
      ])

      setCurrentUser(user)
      
      if (projectsRes.success && projectsRes.data) {
        setProjects(projectsRes.data)
      }

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data as GroupedSettings)
      }

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      Alert.alert('Error', 'Failed to load form data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Feature is required')
      return
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Description is required')
      return
    }
    if (!projectId) {
      Alert.alert('Validation Error', 'Project is required')
      return
    }
    if (!subprojectId) {
      Alert.alert('Validation Error', 'Subproject is required')
      return
    }
    if (!severity) {
      Alert.alert('Validation Error', 'Criticality is required')
      return
    }
    if (!category) {
      Alert.alert('Validation Error', 'Category is required')
      return
    }
    if (!platform) {
      Alert.alert('Validation Error', 'Platform is required')
      return
    }

    try {
      setIsSubmitting(true)
      
      const bugData = {
        title: title.trim(),
        description: description.trim(),
        projectId,
        subprojectId,
        severity,
        category,
        platform,
        environment: environment || undefined,
        browser: browser || undefined,
        device: device || undefined,
        assignedTo: assignedTo || currentUser?.employeeId,
        reportedBy: currentUser?.employeeId || '',
        status: 'New',
      }

      const response = await createBug(bugData)

      if (response.success) {
        Alert.alert('Success', 'Bug created successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ])
      } else {
        Alert.alert('Error', response.error || 'Failed to create bug')
      }
    } catch (error) {
      console.error('Failed to create bug:', error)
      Alert.alert('Error', 'Failed to create bug')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedProject = projects.find((p) => p.projectId === projectId)
  const subprojects = selectedProject?.subprojects || []

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Project */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Project <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={projectId}
              onValueChange={(value) => {
                setProjectId(value)
                setSubprojectId('') // Reset subproject
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
        <View style={styles.field}>
          <Text style={styles.label}>
            Subproject <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={subprojectId}
              onValueChange={setSubprojectId}
              style={styles.picker}
              enabled={!!projectId}
            >
              <Picker.Item label="Select Subproject" value="" />
              {subprojects.map((subproject) => (
                <Picker.Item
                  key={subproject.subprojectId}
                  label={subproject.subprojectName}
                  value={subproject.subprojectId}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Feature (Title) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Feature <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter feature name"
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the bug in detail"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Criticality (Severity) */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Criticality <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={severity}
              onValueChange={setSeverity}
              style={styles.picker}
            >
              <Picker.Item label="Select Criticality" value="" />
              {(settings['Bug Severity'] || []).map((setting) => (
                <Picker.Item
                  key={setting.id}
                  label={setting.value}
                  value={setting.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={styles.picker}
            >
              <Picker.Item label="Select Category" value="" />
              {(settings['Bug Category'] || []).map((setting) => (
                <Picker.Item
                  key={setting.id}
                  label={setting.value}
                  value={setting.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Platform */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Platform <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={platform}
              onValueChange={setPlatform}
              style={styles.picker}
            >
              <Picker.Item label="Select Platform" value="" />
              {(settings['Bug Platform'] || []).map((setting) => (
                <Picker.Item
                  key={setting.id}
                  label={setting.value}
                  value={setting.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Environment */}
        <View style={styles.field}>
          <Text style={styles.label}>Environment</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={environment}
              onValueChange={setEnvironment}
              style={styles.picker}
            >
              <Picker.Item label="Select Environment" value="" />
              {(settings['Bug Environment'] || []).map((setting) => (
                <Picker.Item
                  key={setting.id}
                  label={setting.value}
                  value={setting.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Bug'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
})

