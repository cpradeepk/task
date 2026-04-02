/**
 * Bug List Screen
 * Displays all bugs with filters and search
 *
 * Features:
 * - GraphQL-based bug fetching
 * - FT-/DEV- prefix display
 * - Type filtering (feature vs testcase)
 * - Status filtering
 * - Search functionality
 * - Filter persistence with AsyncStorage
 * - Pull-to-refresh
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { Card, Text, FAB, ActivityIndicator, Searchbar, Chip, Surface, Portal, Modal, Divider, Button as PaperButton, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@apollo/client/react'
import { GET_BUGS, GET_PROJECTS, GET_USERS, GET_SETTINGS } from '../config/graphql-queries'
import { Project, Bug } from '../types'
import { getBugDisplayId, getSeverityColor, getStatusColor, getStatusTextColor } from '../utils/bugHelpers'
import { formatDateIST } from '../utils/datetime'
import { save, get, getUserData, STORAGE_KEYS } from '../utils/secureStorage'
import { FilterHeader, FilterSection, FilterSearch, FilterToggle } from '../components/FilterComponents'
import { ListSkeleton } from '../components/SkeletonLoaders'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useTabBarControl } from '../context/TabBarContext'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'

interface BugFilters {
  searchQuery: string
  statusFilter: string[]
  typeFilter: string[]
  projectId?: string
}

export default function BugListScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()

  const [filteredBugs, setFilteredBugs] = useState<Bug[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [subprojectId, setSubprojectId] = useState<string>('')
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [isFilterModalVisible, setFilterModalVisible] = useState(false)

  const { handleScroll } = useTabBarControl()
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: handleScroll
  })


  // const severityOptions = ['All', 'Critical', 'Major', 'Minor'] // using settings derived

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
  const statusSetting = settings.find((s: any) => s.key === 'bug_statuses')
  const statusOptions = statusSetting && Array.isArray(statusSetting.value) ? statusSetting.value : []
  const finalStatusOptions = statusOptions.length > 0 ? ['All', ...statusOptions] : ['All', 'New', 'In Progress', 'Resolved', 'Closed', 'ReOpened']

  const severitySetting = settings.find((s: any) => s.key === 'bug_severities')
  const severityOptions = severitySetting && Array.isArray(severitySetting.value) ? severitySetting.value : []
  const finalSeverityOptions = severityOptions.length > 0 ? ['All', ...severityOptions] : ['All', 'Critical', 'Major', 'Minor']

  const categorySetting = settings.find((s: any) => s.key === 'bug_categories')
  const categoryOptions = categorySetting && Array.isArray(categorySetting.value) ? categorySetting.value : []
  const finalCategoryOptions = categoryOptions.length > 0 ? ['All', ...categoryOptions] : ['All', 'UI', 'Functionality', 'Performance', 'Security', 'Other']

  const typeSetting = settings.find((s: any) => s.key === 'bug_types')
  const typeOptionsRaw = typeSetting && Array.isArray(typeSetting.value) ? typeSetting.value : ['bug', 'feature', 'testcase', 'other']
  const typeOptions = ['All', ...typeOptionsRaw]

  // Use REST API instead of GraphQL to avoid schema mismatch issues
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const fetchBugs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter.length > 0) statusFilter.forEach(s => params.append('status', s))
      if (severityFilter.length > 0) severityFilter.forEach(s => params.append('severity', s))
      if (categoryFilter.length > 0) categoryFilter.forEach(c => params.append('category', c))
      if (typeFilter.length > 0) typeFilter.forEach(t => params.append('type', t))
      if (projectId) params.append('projectId', projectId)
      if (subprojectId) params.append('subprojectId', subprojectId)
      if (assigneeFilter.length > 0) assigneeFilter.forEach(a => params.append('assignedTo', a))

      const response = await fetch(`https://task.amtariksha.com/api/bugs?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      if (result.success && result.data) {
        setBugs(Array.isArray(result.data) ? result.data : [])
      } else {
        setBugs([])
      }
    } catch (err) {
      console.error('Failed to fetch bugs:', err)
      setError(err)
      setBugs([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, severityFilter, categoryFilter, typeFilter, projectId, subprojectId, assigneeFilter])

  useEffect(() => {
    fetchBugs()
  }, [fetchBugs])

  const refetch = useCallback(() => {
    fetchBugs()
  }, [fetchBugs])

  const loadSavedFilters = useCallback(async () => {
    try {
      const savedFilters = await get<BugFilters>(STORAGE_KEYS.BUG_FILTERS)
      if (savedFilters) {
        setSearchQuery(savedFilters.searchQuery || '')
        setStatusFilter(savedFilters.statusFilter || [])
        setTypeFilter(savedFilters.typeFilter || [])
        setProjectId(savedFilters.projectId || '')
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
    }
  }, [])

  const saveFilters = useCallback(async () => {
    try {
      const filters: BugFilters = {
        searchQuery,
        statusFilter,
        typeFilter,
        projectId,
      }
      await save(STORAGE_KEYS.BUG_FILTERS, filters)
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }, [searchQuery, statusFilter, typeFilter, projectId])

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters()
  }, [loadSavedFilters])

  // Apply filters whenever bugs or filters change
  useEffect(() => {
    filterBugs()
  }, [bugs, searchQuery])

  const filterBugs = useCallback(() => {
    let filtered = bugs

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (bug: Bug) =>
          bug.title?.toLowerCase().includes(query) ||
          bug.bugId?.toLowerCase().includes(query) ||
          bug.description?.toLowerCase().includes(query)
      )
    }

    setFilteredBugs(filtered)
  }, [bugs, searchQuery])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter([])
    setTypeFilter([])
    setSeverityFilter([])
    setCategoryFilter([])
    setProjectId('')
    setSubprojectId('')
    setAssigneeFilter([])
  }

  const handleRefresh = useCallback(async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh bugs:', error)
    }
  }, [refetch])

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters()
  }, [loadSavedFilters])

  // Filter bugs when filters or data change
  useEffect(() => {
    filterBugs()
  }, [filterBugs])

  // Save filters when they change
  useEffect(() => {
    saveFilters()
  }, [saveFilters])

  const renderBug = ({ item }: { item: Bug }) => {
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

    const displayId = getBugDisplayId(item.bugId, item.type)

    return (
      <Card style={styles.card} elevation={1} onPress={() => (navigation as any).navigate('BugDetails', { bugId: item.bugId })}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text style={styles.bugId}>{displayId}</Text>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={[styles.statusText, { color: getStatusTextColor(item.status) }]}
              compact
            >
              {item.status}
            </Chip>
          </View>

          <Text style={styles.bugTitle} numberOfLines={1}>{item.title}</Text>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="folder-outline" size={14} color={materialColors.textSecondary} />
            <Text style={styles.projectName}>{projectDisplay}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={{ ...materialTypography.bodySmall, color: materialColors.textSecondary }}>
              {item.severity} • {formatDateIST(item.createdAt)} • {item.assignedToUser?.name || item.assignedTo || 'Unassigned'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    )
  }

  if (loading && bugs.length === 0) {
    return <ListSkeleton count={6} />
  }

  if (error) {
    return (
      <Surface style={styles.errorContainer} elevation={0}>
        <Text style={styles.errorText}>Failed to load bugs</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </Surface>
    )
  }

  // Load Current User for "My Bugs"
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [expandedSection, setExpandedSection] = useState<string>('')

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getUserData()
        setCurrentUser(userData)
      } catch (e) {
        console.error("Failed to load user", e)
      }
    }
    loadUser()
  }, [])

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={filteredBugs}
        renderItem={renderBug}
        keyExtractor={item => item.bugId}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={materialColors.primary}
            colors={[materialColors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || statusFilter.length > 0 || typeFilter.length > 0 || projectId !== ''
                ? 'No bugs match your filters'
                : 'No bugs found'}
            </Text>
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
        onPress={() => navigation.navigate('CreateBug' as never)}
        color="#FFFFFF"
        size="medium"
        disabled={isOffline}
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

            <Divider style={styles.divider} />

            {/* 3. My Bugs Toggle */}
            <FilterToggle
              label="👤 My Bugs"
              value={(assigneeFilter.includes('me') || (currentUser?.employeeId && assigneeFilter.includes(currentUser.employeeId)))}
              onValueChange={(val) => {
                const myId = currentUser?.employeeId || 'me';
                if (val) {
                  // Add me
                  setAssigneeFilter(prev => [...prev, myId])
                } else {
                  // Remove me
                  setAssigneeFilter(prev => prev.filter(id => id !== myId && id !== 'me'))
                }
              }}
            />

            <Divider style={styles.divider} />

            {/* 4. Search Input */}
            <FilterSearch value={searchQuery} onChangeText={setSearchQuery} placeholder="Search bugs..." />

            {/* 5. Type */}
            <FilterSection
              title="All Types"
              count={typeFilter.length}
              expanded={expandedSection === 'type'}
              onPress={() => setExpandedSection(expandedSection === 'type' ? '' : 'type')}
            >
              <View style={styles.chipRow}>
                {typeOptions.filter(t => t !== 'All').map(t => (
                  <Chip
                    key={t}
                    selected={typeFilter.includes(t)}
                    onPress={() => {
                      if (typeFilter.includes(t)) setTypeFilter(prev => prev.filter(i => i !== t))
                      else setTypeFilter(prev => [...prev, t])
                    }}
                    style={styles.filterChip}
                    showSelectedOverlay
                    selectedColor={materialColors.primary}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Chip>
                ))}
              </View>
            </FilterSection>

            {/* 6. Status */}
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

            {/* 7. Severity */}
            <FilterSection
              title="All Severity"
              count={severityFilter.length}
              expanded={expandedSection === 'severity'}
              onPress={() => setExpandedSection(expandedSection === 'severity' ? '' : 'severity')}
            >
              <View style={styles.chipRow}>
                {severityOptions.map((s: string) => (
                  <Chip
                    key={s}
                    selected={severityFilter.includes(s)}
                    onPress={() => {
                      if (severityFilter.includes(s)) setSeverityFilter(prev => prev.filter(i => i !== s))
                      else setSeverityFilter(prev => [...prev, s])
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

            {/* 8. Category */}
            <FilterSection
              title="All Categories"
              count={categoryFilter.length}
              expanded={expandedSection === 'category'}
              onPress={() => setExpandedSection(expandedSection === 'category' ? '' : 'category')}
            >
              <View style={styles.chipRow}>
                {categoryOptions.map((c: string) => (
                  <Chip
                    key={c}
                    selected={categoryFilter.includes(c)}
                    onPress={() => {
                      if (categoryFilter.includes(c)) setCategoryFilter(prev => prev.filter(i => i !== c))
                      else setCategoryFilter(prev => [...prev, c])
                    }}
                    style={styles.filterChip}
                    showSelectedOverlay
                    selectedColor={materialColors.primary}
                  >
                    {c}
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

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBug' as never)}
        color="#FFFFFF"
        size="medium"
        disabled={isOffline}
      />
    </View>
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
    color: materialColors.textSecondary,
    marginTop: materialSpacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: materialColors.background,
    padding: materialSpacing.xl,
  },
  errorText: {
    ...materialTypography.headlineSmall,
    color: materialColors.error,
    marginBottom: materialSpacing.sm,
    textAlign: 'center',
  },
  errorSubtext: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    padding: materialSpacing.md,
    backgroundColor: materialColors.surface,
  },
  searchRow: {
    padding: materialSpacing.md,
    backgroundColor: materialColors.surface,
    elevation: 2,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: materialColors.background,
    borderWidth: 1,
    borderColor: materialColors.outline,
  },
  searchInput: {
    minHeight: 0,
  },
  listContent: {
    padding: materialSpacing.md,
    paddingBottom: 80,
  },
  card: {
    marginBottom: materialSpacing.md,
    backgroundColor: materialColors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bugId: {
    ...materialTypography.labelLarge,
    color: materialColors.primary,
    fontWeight: 'bold',
  },
  statusChip: {
    alignItems: 'center',
    borderRadius: 12,
  },
  statusText: {
    ...materialTypography.labelSmall,
    fontWeight: '600',
  },
  bugTitle: {
    ...materialTypography.titleMedium,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectName: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
    marginLeft: 4,
  },
  modalContent: {
    backgroundColor: 'white',
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
  },
  sectionTitle: {
    ...materialTypography.titleMedium,
    marginTop: 10,
    marginBottom: 5,
  },
  divider: {
    marginVertical: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginBottom: 4,
  },
  applyButton: {
    flex: 1,
  },
  clearButton: {
    flex: 1,
    borderColor: materialColors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20
  },
  emptyContainer: {
    padding: materialSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: materialColors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 100,
    backgroundColor: materialColors.primary,
  },
  filterFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 180,
    backgroundColor: materialColors.secondary,
  },
})
