/**
 * Task List Screen
 * Displays all tasks with filters and search
 *
 * Features:
 * - GraphQL-based task fetching
 * - Multiple assignee support
 * - Status filtering
 * - Filter persistence with AsyncStorage
 * - Pull-to-refresh
 * - Timer display
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { Card, Text, FAB, ActivityIndicator, Searchbar, Chip, Button as PaperButton, IconButton, Modal, Portal, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useQuery } from '@apollo/client/react'
import { GET_TASKS, GET_PROJECTS, GET_USERS, GET_SETTINGS } from '../config/graphql-queries'
import { FilterHeader, FilterSection, FilterSearch } from '../components/FilterComponents'
import { Task, Project } from '../types'
import { formatDateIST } from '../utils/datetime'
import { getUserData, save, get, STORAGE_KEYS } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useTabBarControl } from '../context/TabBarContext'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'

interface TaskFilters {
  searchQuery: string
  statusFilter: string[]
  priorityFilter: string[]
  assigneeFilter: string[]
}

export default function TaskListScreen({ navigation }: any) {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()

  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [expandedSection, setExpandedSection] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [subprojectId, setSubprojectId] = useState<string>('')
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]) // Will be updated to ['me'] or [currentUser.employeeId] on load


  const [isFilterModalVisible, setFilterModalVisible] = useState(false)

  const { handleScroll } = useTabBarControl()
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: handleScroll
  })

  // ... (Queries remain same) ...
  // Removed hardcoded statusOptions, using settings derived options in render
  // const statusOptions = ['All', 'Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop']

  const STATIC_PROJECTS: Project[] = [
    { projectId: 'dsn', projectName: 'dsn' },
    { projectId: 'amtariksha', projectName: 'amtariksha' },
    { projectId: 'task management', projectName: 'task management' },
    { projectId: 'swarg', projectName: 'swarg' },
    { projectId: 'other', projectName: 'other' }
  ]

  // GraphQL query for projects
  const { data: projectsData } = useQuery(GET_PROJECTS)

  const projects = useMemo(() => {
    const fetchedProjects = (projectsData as any)?.projects || []
    const newProjects = [...STATIC_PROJECTS]
    fetchedProjects.forEach((p: any) => {
      if (!newProjects.find(sp => sp.projectId === p.projectId)) {
        newProjects.push(p)
      }
    })
    return newProjects
  }, [projectsData])

  // Get current project's subprojects
  const currentProject = projects.find((p: any) => p.projectId === projectId)
  const subprojects = projects.filter((p: any) => p.parentProjectId === projectId)

  // GraphQL query for users
  const { data: usersData } = useQuery(GET_USERS)
  const users = (usersData as any)?.users || []

  // GraphQL query for settings
  const { data: settingsData } = useQuery(GET_SETTINGS, { variables: { activeOnly: true } })
  const settings = (settingsData as any)?.settings || []

  // Derive options from settings or defaults
  const statusSetting = settings.find((s: any) => s.key === 'task_statuses')
  const statusOptions = statusSetting && Array.isArray(statusSetting.value) ? statusSetting.value : []
  const finalStatusOptions = statusOptions.length > 0 ? ['All', ...statusOptions] : ['All', 'Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop']

  const prioritySetting = settings.find((s: any) => s.key === 'task_priorities')
  const priorityOptions = prioritySetting && Array.isArray(prioritySetting.value) ? prioritySetting.value : []
  const finalPriorityOptions = priorityOptions.length > 0 ? ['All', ...priorityOptions] : ['All', 'High', 'Medium', 'Low', 'U&I', 'NU&I', 'U&NI', 'NU&NI']

  // REST API Implementation
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true)
      setError(null)

      // Dynamically import apiRequest to avoid circular dependency issues if any
      const { apiRequest } = require('../services/apiClient')

      const params = new URLSearchParams()
      params.append('limit', '1000')

      if (statusFilter.length > 0) params.append('status', statusFilter.join(','))
      if (priorityFilter.length > 0) params.append('priority', priorityFilter.join(','))
      if (projectId) params.append('projectId', projectId)
      if (subprojectId) params.append('subprojectId', subprojectId)
      if (assigneeFilter.length > 0) {
        // Handle 'Me' filter if we use that convention
        const filters = [...assigneeFilter]
        // If filters has 'me' and we have user ID, replace 'me' with ID? 
        // Or backend handles 'me'? Backend usually expects IDs.
        // Let's assume we pass what we have, but if 'me' is used, we might need to resolve it.
        // Web logic resolves 'me' to ID.
        // Let's resolve 'me' to currentUser.employeeId here if present
        if (filters.includes('me') && currentUser?.employeeId) {
          const index = filters.indexOf('me')
          filters[index] = currentUser.employeeId
        }
        params.append('assignedTo', filters.join(','))
      }

      console.log('Fetching tasks with params:', params.toString())
      const response = await apiRequest(`/api/tasks?${params.toString()}`, { method: 'GET' })
      console.log('Tasks API Response success:', response?.success, 'Count:', Array.isArray(response) ? response.length : response?.data?.length)

      if (response && response.error) {
        console.error('API Error:', response.error)
        setError(response.error)
        // Alert.alert('Error', response.error) // Optional: show alert
        return
      }

      if (response && (response.data || Array.isArray(response))) {
        const tasksData = Array.isArray(response) ? response : (response.data || [])
        setTasks(Array.isArray(tasksData) ? tasksData : [])
      } else {
        console.warn('REST Fetch returned unexpected structure', response)
        setTasks([])
      }

    } catch (err) {
      console.error('Fetch tasks error:', err)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, priorityFilter, projectId, subprojectId, assigneeFilter, refreshing])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Client-side filtering (Search + Subtasks)
  useEffect(() => {
    let filtered = tasks

    // Search Filter
    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        (task.name && task.name.toLowerCase().includes(lower)) ||
        (task.taskId && task.taskId.toLowerCase().includes(lower)) ||
        (task.description && task.description.toLowerCase().includes(lower))
      )
    }

    // Subtask Filter - Hide tasks that are subtasks
    filtered = filtered.filter(task => !task.parentTaskId)

    setFilteredTasks(filtered)
  }, [tasks, searchQuery])



  const loadCurrentUser = useCallback(async () => {
    try {
      const userData = await getUserData()
      setCurrentUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }, [])

  const loadSavedFilters = useCallback(async () => {
    try {
      const savedFilters = await get<TaskFilters>(STORAGE_KEYS.TASK_FILTERS)
      if (savedFilters) {
        setSearchQuery(savedFilters.searchQuery || '')
        setStatusFilter(savedFilters.statusFilter || [])
        setPriorityFilter(savedFilters.priorityFilter || [])
        setAssigneeFilter(savedFilters.assigneeFilter || [])
      } else {
        // Default to "My Tasks" if no filters saved, matching Web App behavior
        // We need currentUser to be loaded first
        if (currentUser?.employeeId) {
          setAssigneeFilter([currentUser.employeeId])
        }
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
    }
  }, [currentUser])

  const saveFilters = useCallback(async () => {
    try {
      const filters: TaskFilters = {
        searchQuery,
        statusFilter,
        priorityFilter,
        assigneeFilter
      }
      await save(STORAGE_KEYS.TASK_FILTERS, filters)
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }, [searchQuery, statusFilter, priorityFilter, assigneeFilter])

  // Initialization
  useEffect(() => {
    loadCurrentUser()
    loadSavedFilters()
  }, [loadCurrentUser, loadSavedFilters])
  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTasks()
    }, [fetchTasks])
  )



  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter([])
    setPriorityFilter([])
    setProjectId('')
    setSubprojectId('')
    setAssigneeFilter([])
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchTasks()
  }, [fetchTasks])

  // ... (refresh logic same)

  const handleTaskPress = useCallback((task: Task) => {
    navigation.navigate('TaskDetails', { taskId: task.taskId })
  }, [navigation])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Yet to Start': return colors.textSecondary
      case 'In Progress': return colors.primary
      case 'Done': return colors.success
      case 'Delayed': return colors.error
      case 'Hold': return colors.warning
      case 'Cancel': return colors.textTertiary
      case 'ReOpened': return '#8B5CF6'
      case 'Stop': return '#DC2626'
      default: return colors.textSecondary
    }
  }, [colors])

  const getStatusTextColor = useCallback((status: string) => {
    switch (status) {
      case 'In Progress':
      case 'Hold':
        return '#000000'
      default:
        return '#FFFFFF'
    }
  }, [])

  const getPriorityColor = useCallback((priority: string) => {
    if (priority === 'U&I') return colors.error
    if (priority === 'NU&I') return colors.warning
    if (priority === 'U&NI') return colors.primary
    if (priority === 'NU&NI') return colors.textSecondary
    return colors.textSecondary
  }, [colors])

  const getAssigneeNames = useCallback((assignedTo: string | string[]): string => {
    if (!assignedTo) return 'Unassigned'

    // Helper to resolve name from ID
    const resolveName = (id: string) => {
      if (id === 'me') return 'My Tasks'
      const user = users.find((u: any) => u.employeeId === id)
      return user ? user.name : id
    }

    if (Array.isArray(assignedTo)) {
      if (assignedTo.length === 0) return 'Unassigned'
      if (assignedTo.length === 1) return resolveName(assignedTo[0])
      if (assignedTo.length === 2) return `${resolveName(assignedTo[0])}, ${resolveName(assignedTo[1])}`
      return `${resolveName(assignedTo[0])}, ${resolveName(assignedTo[1])} +${assignedTo.length - 2} more`
    }
    // If single string
    return resolveName(assignedTo)
  }, [users])

  const renderTask = ({ item }: { item: any }) => {
    // Derive project hierarchy from the projects list
    let projectDisplay = ''
    if (item.projectId) {
      const proj = projects.find((p: any) => p.projectId === item.projectId)
      if (proj) {
        projectDisplay = proj.projectName
        if (proj.parentProjectId) {
          const parent = projects.find((p: any) => p.projectId === proj.parentProjectId)
          if (parent) {
            projectDisplay = `${parent.projectName} / ${proj.projectName}`
          }
        }
      } else {
        projectDisplay = item.projectId // Fallback to ID if not found
      }
    }

    // const subProjectName = item.subproject?.subProjectName ? ` / ${item.subproject.subProjectName}` : '' // Removed invalid field usage
    // For REST, we might not have assignedToUsers populated, so fallback to getAssigneeNames lookup
    // The REST API might return assignedToUsers if backend is updated, but if not we rely on manual resolution
    const assigneeNames = (item.assignedToUsers && item.assignedToUsers.length > 0)
      ? item.assignedToUsers.map((u: any) => u.name).join(', ')
      : getAssigneeNames(item.assignedTo)

    return (
      <Card style={styles.taskCard} elevation={1} onPress={() => handleTaskPress(item)}>
        <Card.Content>
          <View style={styles.taskHeader}>
            <Text style={styles.taskId}>{item.taskId}</Text>
            <Chip style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]} textStyle={[styles.statusText, { color: getStatusTextColor(item.status) }]} compact>
              {item.status}
            </Chip>
          </View>
          <Text style={styles.taskName} numberOfLines={1}>{item.name || 'Untitled Task'}</Text>
          {projectDisplay ? <Text style={styles.projectName} numberOfLines={1}>📁 {projectDisplay}</Text> : null}
          <Text style={styles.taskDescription} numberOfLines={2}>{item.description}</Text>
          <View style={styles.taskMeta}>
            <Chip style={[styles.priorityChip, { backgroundColor: getPriorityColor(item.priority) }]} textStyle={styles.priorityText} compact>
              {item.priority}
            </Chip>
            <Text style={styles.taskDate}>Due: {formatDateIST(item.endDate)}</Text>
          </View>
          <Text style={styles.assignedTo}>👤 {assigneeNames}</Text>
        </Card.Content>
      </Card>
    )
  }

  // Loading/Error views
  if (loading && !tasks.length) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={materialColors.primary} /><Text style={styles.loadingText}>Loading tasks...</Text></View>
  if (error && !tasks.length) return <View style={styles.centerContainer}><Text style={styles.errorText}>Failed to load tasks</Text><PaperButton mode="contained" onPress={onRefresh}>Retry</PaperButton></View>

  // Look up Project Name for display
  const selectedProjectName = projects.find((p: any) => p.projectId === projectId)?.projectName || 'All Projects';

  return (
    <View style={styles.container}>
      {/* Task List */}
      <Animated.FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.taskId}
        renderItem={renderTask}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={materialColors.primary} colors={[materialColors.primary]} />}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{searchQuery || statusFilter.length > 0 ? 'No tasks match your filters' : 'No tasks found'}</Text>
          </View>
        }
      />

      <FAB
        icon="filter-variant"
        style={styles.filterFab}
        onPress={() => setFilterModalVisible(true)}
        color={materialColors.surface}
        size="small"
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask')}
        disabled={isOffline}
        color="#FFFFFF"
        size="medium"
      />

      {/* FILTER MODAL */}
      <Portal>
        <Modal visible={isFilterModalVisible} onDismiss={() => setFilterModalVisible(false)} contentContainerStyle={styles.modalContent}>
          <FilterHeader title="Filters" onClose={() => setFilterModalVisible(false)} />

          <ScrollView contentContainerStyle={styles.filterScroll}>

            {/* 1. Projects */}
            <FilterSection
              title="All Projects"
              label={projects.find((p: any) => p.projectId === projectId)?.projectName || "All Projects"}
              expanded={expandedSection === 'project'}
              onPress={() => setExpandedSection(expandedSection === 'project' ? '' : 'project')}
            >
              <View style={styles.chipRow}>
                <Chip
                  selected={projectId === ''}
                  onPress={() => { setProjectId(''); setSubprojectId(''); setExpandedSection(''); }}
                  style={styles.filterChip}
                  showSelectedOverlay
                  selectedColor={materialColors.primary}
                >
                  All Projects
                </Chip>
                {projects.filter((p: any) => !p.parentProjectId).map((p: any) => (
                  <Chip
                    key={p.projectId}
                    selected={projectId === p.projectId}
                    onPress={() => { setProjectId(p.projectId); setSubprojectId(''); setExpandedSection(''); }}
                    style={styles.filterChip}
                    showSelectedOverlay
                    selectedColor={materialColors.primary}
                  >
                    {p.projectName}
                  </Chip>
                ))}
              </View>
            </FilterSection>

            {/* 2. Subprojects */}
            <FilterSection
              title="All Subprojects"
              label={subprojectId ? subprojects.find(p => p.projectId === subprojectId)?.projectName : "All Subprojects"}
              expanded={expandedSection === 'subproject'}
              onPress={() => setExpandedSection(expandedSection === 'subproject' ? '' : 'subproject')}
            >
              {projectId === '' ? (
                <Text style={{ padding: 16, color: materialColors.textSecondary }}>Select a project first</Text>
              ) : subprojects.length === 0 ? (
                <Text style={{ padding: 16, color: materialColors.textSecondary }}>No subprojects found</Text>
              ) : (
                <View style={styles.chipRow}>
                  <Chip
                    selected={subprojectId === ''}
                    onPress={() => { setSubprojectId(''); setExpandedSection(''); }}
                    style={styles.filterChip}
                    showSelectedOverlay
                    selectedColor={materialColors.primary}
                  >
                    All Subprojects
                  </Chip>
                  {subprojects.map((p: any) => (
                    <Chip
                      key={p.projectId}
                      selected={subprojectId === p.projectId}
                      onPress={() => { setSubprojectId(p.projectId); setExpandedSection(''); }}
                      style={styles.filterChip}
                      showSelectedOverlay
                      selectedColor={materialColors.primary}
                    >
                      {p.projectName}
                    </Chip>
                  ))}
                </View>
              )}
            </FilterSection>

            {/* 3. Assign To */}
            <FilterSection
              title="Assign To"
              count={assigneeFilter.length}
              expanded={expandedSection === 'assignee'}
              onPress={() => setExpandedSection(expandedSection === 'assignee' ? '' : 'assignee')}
            >
              <View style={styles.chipRow}>
                <Chip
                  selected={assigneeFilter.includes('me') || (currentUser?.employeeId && assigneeFilter.includes(currentUser.employeeId))}
                  onPress={() => {
                    const myId = currentUser?.employeeId;
                    if (!myId) {
                      // Fallback if no user loaded
                      if (assigneeFilter.includes('me')) setAssigneeFilter(prev => prev.filter(id => id !== 'me'));
                      else setAssigneeFilter(prev => [...prev, 'me']);
                      return;
                    }
                    if (assigneeFilter.includes(myId)) setAssigneeFilter(prev => prev.filter(id => id !== myId));
                    else setAssigneeFilter(prev => [...prev, myId]);
                  }}
                  style={styles.filterChip}
                  showSelectedOverlay
                  selectedColor={materialColors.primary}
                >
                  My Tasks
                </Chip>
                {users.map((u: any) => (
                  <Chip
                    key={u.employeeId}
                    selected={assigneeFilter.includes(u.employeeId)}
                    onPress={() => {
                      if (assigneeFilter.includes(u.employeeId)) setAssigneeFilter(prev => prev.filter(i => i !== u.employeeId))
                      else setAssigneeFilter(prev => [...prev, u.employeeId])
                    }}
                    style={styles.filterChip}
                    showSelectedOverlay
                    selectedColor={materialColors.primary}
                  >
                    {u.name}
                  </Chip>
                ))}
              </View>
            </FilterSection>

            {/* 4. Search Input (Moved HERE as per instructions) */}
            <FilterSearch value={searchQuery} onChangeText={setSearchQuery} placeholder="Search tasks..." />

            {/* 5. Status */}
            <FilterSection
              title="All Status"
              count={statusFilter.length}
              expanded={expandedSection === 'status'}
              onPress={() => setExpandedSection(expandedSection === 'status' ? '' : 'status')}
            >
              <View style={styles.chipRow}>
                {statusOptions.map((s: string) => (
                  <Chip
                    key={s}
                    selected={statusFilter.includes(s)}
                    onPress={() => {
                      if (statusFilter.includes(s)) setStatusFilter(prev => prev.filter(i => i !== s))
                      else setStatusFilter(prev => [...prev, s])
                    }}
                    style={styles.filterChip}
                    showSelectedOverlay
                    selectedColor={materialColors.primary}
                  >
                    {s}
                  </Chip>
                ))}
              </View>
            </FilterSection>

            {/* 6. Priority */}
            <FilterSection
              title="All Priority"
              count={priorityFilter.length}
              expanded={expandedSection === 'priority'}
              onPress={() => setExpandedSection(expandedSection === 'priority' ? '' : 'priority')}
            >
              <View style={styles.chipRow}>
                {priorityOptions.map((p: string) => (
                  <Chip
                    key={p}
                    selected={priorityFilter.includes(p)}
                    onPress={() => {
                      if (priorityFilter.includes(p)) setPriorityFilter(prev => prev.filter(i => i !== p))
                      else setPriorityFilter(prev => [...prev, p])
                    }}
                    style={styles.filterChip}
                    showSelectedOverlay
                    selectedColor={materialColors.primary}
                  >
                    {p}
                  </Chip>
                ))}
              </View>
            </FilterSection>

            <Divider style={styles.divider} />

            <View style={styles.buttonRow}>
              <PaperButton mode="outlined" onPress={clearFilters} style={styles.clearButton}>
                Clear Filters
              </PaperButton>
              <PaperButton mode="contained" onPress={() => setFilterModalVisible(false)} style={styles.applyButton}>
                Done
              </PaperButton>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
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
  retryButton: {
    borderRadius: 8,
  },
  searchContainer: {
    padding: materialSpacing.md,
    backgroundColor: colors.surface,
    elevation: materialElevation.level1,
  },
  searchBar: {
    backgroundColor: colors.surfaceVariant,
    elevation: 0,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    paddingVertical: materialSpacing.md,
    paddingHorizontal: materialSpacing.md,
    elevation: materialElevation.level1,
    minHeight: 60,
  },
  filterFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 180, // Above + FAB
    backgroundColor: materialColors.secondary,
  },
  filterLabel: {
    ...materialTypography.labelLarge,
    color: colors.text,
    marginRight: materialSpacing.sm,
  },
  filterChip: {
    marginRight: materialSpacing.xs,
    backgroundColor: colors.surfaceVariant,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...materialTypography.labelSmall,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: materialSpacing.md,
    paddingVertical: materialSpacing.sm,
    backgroundColor: colors.surface,
  },
  dropdownButton: {
    flex: 1,
    borderColor: materialColors.outline,
    borderBottomColor: materialColors.outline,
    backgroundColor: colors.surface,
  },
  dropdownLabel: {
    ...materialTypography.labelLarge,
    color: colors.primary,
  },
  listContent: {
    padding: materialSpacing.md,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: materialSpacing.xs,
  },
  taskId: {
    ...materialTypography.labelMedium,
    color: colors.textSecondary,
  },
  statusChip: {
    // height: 24,
  },
  statusText: {
    ...materialTypography.labelSmall,
    color: colors.surface,
  },
  taskName: {
    ...materialTypography.titleMedium,
    color: colors.text,
    marginBottom: materialSpacing.xs,
  },
  projectName: {
    ...materialTypography.bodySmall,
    color: colors.primary,
    marginBottom: materialSpacing.xs,
  },
  taskDescription: {
    ...materialTypography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: materialSpacing.sm,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: materialSpacing.xs,
  },
  priorityChip: {
    // height: 24,
  },
  priorityText: {
    ...materialTypography.labelSmall,
    color: colors.surface,
  },
  taskDate: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
  },
  assignedTo: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
    marginTop: materialSpacing.xs,
  },
  emptyContainer: {
    padding: materialSpacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: materialSpacing.lg,
    bottom: 100,
    backgroundColor: colors.primary,
  },
  modalContent: {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  filterScroll: {
    padding: 20,
  },
  filterTitle: {
    ...materialTypography.titleLarge,
    marginBottom: 10,
    textAlign: 'center',
    color: colors.text,
  },
  sectionTitle: {
    ...materialTypography.titleMedium,
    marginTop: 10,
    marginBottom: 5,
    color: colors.text,
  },
  divider: {
    marginVertical: 10,
    backgroundColor: colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  clearButton: {
    flex: 1,
    borderColor: colors.primary,
    borderWidth: 1,
  },
})
