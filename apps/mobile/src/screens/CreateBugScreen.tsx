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
import { TextInput, Button, Surface, Text, ActivityIndicator, SegmentedButtons } from 'react-native-paper'
import { SearchablePicker } from '../components/SearchablePicker'
import * as DocumentPicker from 'expo-document-picker'
import { createBug } from '../services/bugService'
import { getProjectHierarchy, ProjectHierarchy } from '../services/projectService'
import { getAllSettings, GroupedSettings } from '../services/settingsService'
import { getAllUsers, getCurrentUser, User } from '../services/userService'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialTypography, materialSpacing } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

interface CreateBugRouteParams {
  convertFrom?: string
  type?: string
  title?: string
  description?: string
  expectedBehavior?: string
  actualBehavior?: string
  serverLogs?: string
  frontendLogs?: string
  projectId?: string
  subprojectId?: string
  category?: string
  severity?: string
  platform?: string
  environment?: string
}

export default function CreateBugScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const routeParams = (route.params || {}) as CreateBugRouteParams
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
  const [priority, setPriority] = useState('Low') // Default matches web
  const [feature, setFeature] = useState('') // Related feature name (synced with web)
  const [tags, setTags] = useState('') // Comma-separated tags (synced with web)
  const [relatedBugs, setRelatedBugs] = useState('') // Related bug/task IDs (synced with web)

  // Detailed Fields
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')
  const [behaviour, setBehaviour] = useState('') // For feature type
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

  // Pre-fill form when navigating with conversion params (Test Case → Bug)
  useEffect(() => {
    if (!routeParams.convertFrom) return
    if (routeParams.type) setBugType(routeParams.type)
    if (routeParams.title) setTitle(routeParams.title)
    if (routeParams.description) setStepsToReproduce(routeParams.description)
    if (routeParams.expectedBehavior) setExpectedBehavior(routeParams.expectedBehavior)
    if (routeParams.actualBehavior) setActualBehavior(routeParams.actualBehavior)
    if (routeParams.serverLogs) setServerLogs(routeParams.serverLogs)
    if (routeParams.frontendLogs) setFrontendLogs(routeParams.frontendLogs)
    if (routeParams.projectId) setProjectId(routeParams.projectId)
    if (routeParams.subprojectId) setSubprojectId(routeParams.subprojectId)
    if (routeParams.category) setCategory(routeParams.category)
    if (routeParams.severity) setSeverity(routeParams.severity)
    if (routeParams.platform) setPlatform(routeParams.platform)
    if (routeParams.environment) setEnvironment(routeParams.environment)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams.convertFrom])

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
      setIsSubmitting(true)      // Construct detailed description
      let fullDescription = description.trim()
 
      if (bugType === 'feature') {
        if (stepsToReproduce.trim()) {
          fullDescription += `\n\n## Feature Description\n${stepsToReproduce.trim()}`
        }
      } else {
        if (stepsToReproduce.trim()) {
          fullDescription += `\n\n## Steps to Reproduce\n${stepsToReproduce.trim()}`
        }
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
        formData.append('priority', priority)
        if (feature.trim()) formData.append('feature', feature.trim())
        if (tags.trim()) formData.append('tags', tags.trim())
        if (relatedBugs.trim()) formData.append('relatedBugs', relatedBugs.trim())

        // Send separate fields
        const expectedVal = bugType === 'feature' ? behaviour.trim() : expectedBehavior.trim()
        if (expectedVal) formData.append('expectedBehavior', expectedVal)

        if (bugType !== 'feature') {
          if (actualBehavior.trim()) formData.append('actualBehavior', actualBehavior.trim())
          if (serverLogs.trim()) formData.append('serverLogs', serverLogs.trim())
          if (frontendLogs.trim()) formData.append('frontendLogs', frontendLogs.trim())
        }

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
          priority,
          category,
          platform,
          environment: environment || undefined,
          browserInfo: browser || undefined,
          deviceInfo: device || undefined,
          feature: feature.trim() || undefined,
          tags: tags.trim() || undefined,
          relatedBugs: relatedBugs.trim() || undefined,
          assignedTo: assignedTo || currentUser?.employeeId,
          reportedBy: currentUser?.employeeId || '',
          status: 'New',
          expectedBehavior: bugType === 'feature' ? (behaviour.trim() || undefined) : (expectedBehavior.trim() || undefined),
          actualBehavior: bugType === 'feature' ? undefined : (actualBehavior.trim() || undefined),
          serverLogs: bugType === 'feature' ? undefined : (serverLogs.trim() || undefined),
          frontendLogs: bugType === 'feature' ? undefined : (frontendLogs.trim() || undefined),
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
  }, [title, description, projectId, subprojectId, bugType, severity, priority, category, platform, environment, browser, device, feature, tags, relatedBugs, assignedTo, currentUser, navigation, attachedFile, stepsToReproduce, expectedBehavior, actualBehavior, serverLogs, frontendLogs, behaviour])

  // Helper to safely format picker items and avoid undefined properties causing native Picker crashes
  const getPickerItems = (items: any) => {
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => {
      if (typeof item === 'string') {
        return { id: `item-${index}`, label: item, value: item };
      }
      if (item && typeof item === 'object') {
        const val = item.value !== undefined ? item.value : (item.projectId || item.subprojectId || item.employeeId || item.settingValue || item.name || '');
        const label = item.label || item.projectName || item.subprojectName || item.name || val || '';
        const id = item.id !== undefined ? String(item.id) : (item.projectId || item.subprojectId || item.employeeId || `item-${index}`);
        return { id, label, value: val };
      }
      return { id: `item-${index}`, label: String(item), value: String(item) };
    });
  };

  const selectedProject = useMemo(() => projects.find((p) => p.projectId === projectId), [projects, projectId])
  const subprojects = useMemo(() => {
    const dynamicSubs = selectedProject?.subprojects || []
    return [...STATIC_SUBPROJECTS, ...dynamicSubs]
  }, [selectedProject])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          {/* Conversion banner */}
          {routeParams.convertFrom && (
            <View style={styles.convertBanner}>
              <Text style={styles.convertBannerText}>
                Converting test case {routeParams.convertFrom} to a bug. Fields
                have been pre-filled — review and submit.
              </Text>
            </View>
          )}

          {/* Project */}
          <SearchablePicker
            label="Project"
            placeholder="Select Project"
            selectedValue={projectId}
            onValueChange={(value) => {
              setProjectId(value)
              setSubprojectId('') // Reset subproject
            }}
            items={getPickerItems(projects)}
            required
          />

          {/* Subproject */}
          <SearchablePicker
            label="Subproject"
            placeholder="Select Subproject"
            selectedValue={subprojectId}
            onValueChange={setSubprojectId}
            items={getPickerItems(subprojects)}
            disabled={!projectId}
            required
          />

          {/* Bug Type */}
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontWeight: '500' }}>Bug Type</Text>
          <SegmentedButtons
            value={bugType}
            onValueChange={setBugType}
            buttons={[
              { value: 'bug', label: 'Bug' },
              { value: 'feature', label: 'Feature' },
              { value: 'testcase', label: 'Test Case' },
              { value: 'other', label: 'Other' },
            ]}
            style={{ marginBottom: 16 }}
          />

          {/* Feature (Title) */}
          <TextInput
            mode="outlined"
            label="Feature *"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter feature name"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
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
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            disabled={isOffline}
          />

          <Text style={styles.sectionHeader}>Reproduction & Behavior</Text>

          {/* Conditional rendering based on bug type */}
          {bugType === 'feature' ? (
            <>
              <TextInput
                mode="outlined"
                label="Feature Description *"
                value={stepsToReproduce}
                onChangeText={setStepsToReproduce}
                placeholder="Describe the feature in detail..."
                multiline
                numberOfLines={4}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                disabled={isOffline}
              />

              <TextInput
                mode="outlined"
                label="Behaviour"
                value={behaviour}
                onChangeText={setBehaviour}
                placeholder="Describe the expected behaviour of this feature..."
                multiline
                numberOfLines={3}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                disabled={isOffline}
              />
            </>
          ) : (
            <>
              <TextInput
                mode="outlined"
                label="Steps to Reproduce"
                value={stepsToReproduce}
                onChangeText={setStepsToReproduce}
                placeholder="1. Go to page... 2. Click button..."
                multiline
                numberOfLines={3}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
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
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
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
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
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
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
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
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                disabled={isOffline}
              />
            </>
          )}

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
                  <Text numberOfLines={1} style={{ color: colors.text }}>
                    {attachedFile.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                    {(attachedFile.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Assigned To */}
          <SearchablePicker
            label="Assign To"
            placeholder="Select User"
            selectedValue={assignedTo}
            onValueChange={setAssignedTo}
            items={users.map((user: any, index: number) => ({
              label: user.name || user.employeeId || '',
              value: user.employeeId || '',
            }))}
            disabled={isOffline}
          />

          {/* Criticality (from API settings, synced with web) */}
          <SearchablePicker
            label="Criticality"
            placeholder="Select Criticality"
            selectedValue={severity}
            onValueChange={setSeverity}
            items={getPickerItems(settings['severity'] || settings['Bug Severity'] || ['Critical', 'Major', 'Minor'])}
            required
          />

          {/* Category (from API settings, synced with web) */}
          <SearchablePicker
            label="Category"
            placeholder="Select Category"
            selectedValue={category}
            onValueChange={setCategory}
            items={getPickerItems(settings['category'] || settings['Bug Category'] || ['UI', 'API', 'Backend', 'Performance', 'Security', 'Database', 'Integration', 'Other'])}
            required
          />

          {/* Platform */}
          <SearchablePicker
            label="Platform"
            placeholder="Select Platform"
            selectedValue={platform}
            onValueChange={setPlatform}
            items={getPickerItems(settings['Bug Platform'] || settings['platform'] || [{ id: 'p1', value: 'Web' }, { id: 'p2', value: 'Mobile' }, { id: 'p3', value: 'Desktop' }, { id: 'p4', value: 'API' }])}
            required
          />

          {/* Environment */}
          <SearchablePicker
            label="Environment"
            placeholder="Select Environment"
            selectedValue={environment}
            onValueChange={setEnvironment}
            items={getPickerItems(settings['Bug Environment'] || settings['environment'] || [{ id: 'e1', value: 'Development' }, { id: 'e2', value: 'QA' }, { id: 'e3', value: 'Staging' }, { id: 'e4', value: 'Production' }])}
          />

          {/* Browser Info (synced with web) */}
          <TextInput
            mode="outlined"
            label="Browser (Optional)"
            value={browser}
            onChangeText={setBrowser}
            placeholder="e.g., Chrome 120, Safari 17"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            disabled={isOffline}
          />

          {/* Device Info (synced with web) */}
          <TextInput
            mode="outlined"
            label="Device (Optional)"
            value={device}
            onChangeText={setDevice}
            placeholder="e.g., iPhone 12, Windows 10"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            disabled={isOffline}
          />

          {/* Related Items (synced with web) */}
          <TextInput
            mode="outlined"
            label="Related Items (Optional)"
            value={relatedBugs}
            onChangeText={setRelatedBugs}
            placeholder="e.g., JSR-0001, BUG-0001 (comma-separated)"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            disabled={isOffline}
          />

          {/* Tags (synced with web) */}
          <TextInput
            mode="outlined"
            label="Tags (Optional)"
            value={tags}
            onChangeText={setTags}
            placeholder="urgent, login, payment, mobile"
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            disabled={isOffline}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={isSubmitting || isOffline}
            loading={isSubmitting}
            style={styles.submitButton}
            buttonColor={colors.primary}
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...materialTypography.bodyLarge,
    marginTop: materialSpacing.md,
    color: colors.textSecondary,
  },
  form: {
    padding: materialSpacing.md,
    gap: materialSpacing.md,
  },
  convertBanner: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: materialSpacing.sm,
    borderRadius: 6,
    marginBottom: materialSpacing.md,
  },
  convertBannerText: {
    ...materialTypography.bodySmall,
    color: colors.text,
  },
  field: {
    marginBottom: materialSpacing.md,
  },
  label: {
    ...materialTypography.labelLarge,
    color: colors.text,
    marginBottom: materialSpacing.xs,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.text,
  },
  submitButton: {
    marginTop: materialSpacing.md,
    marginBottom: materialSpacing.xl,
  },
  sectionHeader: {
    ...materialTypography.titleMedium,
    color: colors.primary,
    marginTop: materialSpacing.sm,
    marginBottom: materialSpacing.xs,
  },
})

