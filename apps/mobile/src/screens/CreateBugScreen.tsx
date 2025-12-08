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
import * as DocumentPicker from 'expo-document-picker'
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
  const [bugType, setBugType] = useState('bug') // Default
  const [severity, setSeverity] = useState('')
  const [category, setCategory] = useState('')
  const [platform, setPlatform] = useState('')
  const [environment, setEnvironment] = useState('')
  const [browser, setBrowser] = useState('')
  const [device, setDevice] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  // Detailed Fields
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')
  const [serverLogs, setServerLogs] = useState('')
  const [frontendLogs, setFrontendLogs] = useState('')

  const [attachedFile, setAttachedFile] = useState<any>(null)

  // Data state
  const STATIC_PROJECTS = [
    { projectId: 'dsn', projectName: 'dsn', subprojects: [] },
    { projectId: 'amtariksha', projectName: 'amtariksha', subprojects: [] },
    { projectId: 'task management', projectName: 'task management', subprojects: [] },
    { projectId: 'swarg', projectName: 'swarg', subprojects: [] },
    { projectId: 'other', projectName: 'other', subprojects: [] }
  ]
  const STATIC_SUBPROJECTS = [
    { subprojectId: 'testing', subprojectName: 'testing' },
    { subprojectId: 'development', subprojectName: 'development' },
    { subprojectId: 'reporting', subprojectName: 'reporting' }
  ]

  // Data state
  const [projects, setProjects] = useState<ProjectHierarchy[]>(STATIC_PROJECTS)
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
        // Merge static and dynamic projects
        const newProjects = [...STATIC_PROJECTS]
        projectsRes.data.forEach((p: any) => {
          if (!newProjects.find(sp => sp.projectId === p.projectId)) {
            newProjects.push(p)
          }
        })
        setProjects(newProjects)
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

      // Construct detailed description
      let fullDescription = description.trim()

      if (stepsToReproduce.trim()) {
        fullDescription += `\n\n## Steps to Reproduce\n${stepsToReproduce.trim()}`
      }
      if (expectedBehavior.trim()) {
        fullDescription += `\n\n## Expected Behavior\n${expectedBehavior.trim()}`
      }
      if (actualBehavior.trim()) {
        fullDescription += `\n\n## Actual Behavior\n${actualBehavior.trim()}`
      }
      if (serverLogs.trim()) {
        fullDescription += `\n\n## Server Logs\n\`\`\`\n${serverLogs.trim()}\n\`\`\``
      }
      if (frontendLogs.trim()) {
        fullDescription += `\n\n## Frontend Logs\n\`\`\`\n${frontendLogs.trim()}\n\`\`\``
      }

      let payload: any

      if (attachedFile) {
        const formData = new FormData()
        formData.append('title', title.trim())
        formData.append('description', fullDescription)
        formData.append('projectId', projectId)
        if (subprojectId) formData.append('subprojectId', subprojectId)
        formData.append('type', bugType)
        formData.append('severity', severity)
        formData.append('category', category)
        formData.append('platform', platform)
        if (environment) formData.append('environment', environment)
        if (browser) formData.append('browser', browser)
        if (device) formData.append('device', device)
        formData.append('assignedTo', assignedTo || currentUser?.employeeId || '')
        formData.append('reportedBy', currentUser?.employeeId || '')
        formData.append('status', 'New')

        formData.append('attachments', {
          uri: attachedFile.uri,
          name: attachedFile.name,
          type: attachedFile.mimeType || 'application/octet-stream',
        } as any)

        payload = formData
      } else {
        payload = {
          title: title.trim(),
          description: fullDescription,
          projectId,
          subprojectId,
          type: bugType,
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
      }

      const response = await createBug(payload)

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
  }, [title, description, projectId, subprojectId, bugType, severity, category, platform, environment, browser, device, assignedTo, currentUser, navigation, attachedFile, stepsToReproduce, expectedBehavior, actualBehavior, serverLogs, frontendLogs])

  const selectedProject = useMemo(() => projects.find((p) => p.projectId === projectId), [projects, projectId])
  const subprojects = useMemo(() => {
    const dynamicSubs = selectedProject?.subprojects || []
    return [...STATIC_SUBPROJECTS, ...dynamicSubs]
  }, [selectedProject])

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
                {/* Prioritize standard subprojects if they exist in data, else show all */}
                {subprojects.map((subproject: any) => (
                  <Picker.Item
                    key={subproject.subprojectId}
                    label={subproject.subprojectName}
                    value={subproject.subprojectId}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Bug Type */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Bug Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={bugType}
                onValueChange={setBugType}
                style={styles.picker}
              >
                <Picker.Item label="Bug" value="bug" />
                <Picker.Item label="Feature" value="feature" />
                <Picker.Item label="Test Case" value="testcase" />
                <Picker.Item label="Others" value="other" />
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

          {/* Description & Reproduction Steps */}
          <TextInput
            mode="outlined"
            label="Summary *"
            value={description}
            onChangeText={setDescription}
            placeholder="Brief summary of the bug"
            multiline
            numberOfLines={2}
            style={styles.input}
            outlineColor={materialColors.outline}
            activeOutlineColor={materialColors.primary}
            disabled={isOffline}
          />

          <Text style={styles.sectionHeader}>Reproduction & Behavior</Text>

          <TextInput
            mode="outlined"
            label="Steps to Reproduce"
            value={stepsToReproduce}
            onChangeText={setStepsToReproduce}
            placeholder="1. Go to page... 2. Click button..."
            multiline
            numberOfLines={3}
            style={styles.input}
            disabled={isOffline}
          />

          <TextInput
            mode="outlined"
            label="Expected Behavior"
            value={expectedBehavior}
            onChangeText={setExpectedBehavior}
            placeholder="What should happen?"
            multiline
            numberOfLines={2}
            style={styles.input}
            disabled={isOffline}
          />

          <TextInput
            mode="outlined"
            label="Actual Behavior"
            value={actualBehavior}
            onChangeText={setActualBehavior}
            placeholder="What actually happened?"
            multiline
            numberOfLines={2}
            style={styles.input}
            disabled={isOffline}
          />

          <TextInput
            mode="outlined"
            label="Server Logs"
            value={serverLogs}
            onChangeText={setServerLogs}
            placeholder="Paste server logs here..."
            multiline
            numberOfLines={2}
            style={styles.input}
            disabled={isOffline}
          />

          <TextInput
            mode="outlined"
            label="Frontend Logs"
            value={frontendLogs}
            onChangeText={setFrontendLogs}
            placeholder="Paste console/network logs here..."
            multiline
            numberOfLines={2}
            style={styles.input}
            disabled={isOffline}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Attachment</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Button
                mode="outlined"
                onPress={handleFilePick}
                icon="paperclip"
                disabled={isOffline}
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

          {/* Assigned To */}
          <View style={styles.field}>
            <Text style={styles.label}>Assign To</Text>
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
                {(settings['Bug Severity'] || [{ id: 'def1', value: 'Critical' }, { id: 'def2', value: 'High' }, { id: 'def3', value: 'Medium' }, { id: 'def4', value: 'Low' }]).map((setting: any) => (
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
                {(settings['Bug Category'] || [{ id: 'c1', value: 'UI' }, { id: 'c2', value: 'Functionality' }, { id: 'c3', value: 'Performance' }, { id: 'c4', value: 'Security' }, { id: 'c5', value: 'Other' }]).map((setting: any) => (
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
                {(settings['Bug Platform'] || [{ id: 'p1', value: 'Web' }, { id: 'p2', value: 'Mobile' }, { id: 'p3', value: 'Desktop' }, { id: 'p4', value: 'API' }]).map((setting: any) => (
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
                {(settings['Bug Environment'] || [{ id: 'e1', value: 'Development' }, { id: 'e2', value: 'QA' }, { id: 'e3', value: 'Staging' }, { id: 'e4', value: 'Production' }]).map((setting: any) => (
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
  sectionHeader: {
    ...materialTypography.titleMedium,
    color: materialColors.primary,
    marginTop: materialSpacing.sm,
    marginBottom: materialSpacing.xs,
  },
})

