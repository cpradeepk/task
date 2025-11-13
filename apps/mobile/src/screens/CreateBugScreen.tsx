/**
 * Create Bug Screen
 * Create new bugs with all required fields
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { TextInput, Button, Surface, Text, ActivityIndicator } from 'react-native-paper'
import { Picker } from '@react-native-picker/picker'
import { createBug } from '../services/bugService'
import { getProjectHierarchy, ProjectHierarchy } from '../services/projectService'
import { getAllSettings, GroupedSettings } from '../services/settingsService'
import { getAllUsers, getCurrentUser, User } from '../services/userService'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function CreateBugScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()

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

  const loadData = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmit = useCallback(async () => {
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
  }, [title, description, projectId, subprojectId, severity, category, platform, environment, browser, device, assignedTo, currentUser, navigation])

  const selectedProject = useMemo(() => projects.find((p) => p.projectId === projectId), [projects, projectId])
  const subprojects = useMemo(() => selectedProject?.subprojects || [], [selectedProject])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={materialColors.primary} />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    )
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
        <TextInput
          mode="outlined"
          label="Feature *"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter feature name"
          style={styles.input}
          outlineColor={materialColors.outline}
          activeOutlineColor={materialColors.primary}
          disabled={isOffline}
        />

        {/* Description */}
        <TextInput
          mode="outlined"
          label="Description *"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the bug in detail"
          multiline
          numberOfLines={4}
          style={styles.input}
          outlineColor={materialColors.outline}
          activeOutlineColor={materialColors.primary}
          disabled={isOffline}
        />

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
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={isSubmitting || isOffline}
          loading={isSubmitting}
          style={styles.submitButton}
          buttonColor={materialColors.primary}
        >
          {isSubmitting ? 'Creating...' : 'Create Bug'}
        </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: materialColors.background,
  },
  loadingText: {
    ...materialTypography.bodyLarge,
    marginTop: materialSpacing.md,
    color: materialColors.textSecondary,
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
    borderWidth: 1,
    borderColor: materialColors.outline,
    borderRadius: 4,
    backgroundColor: materialColors.surface,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: materialColors.text,
  },
  submitButton: {
    marginTop: materialSpacing.md,
    marginBottom: materialSpacing.xl,
  },
})

