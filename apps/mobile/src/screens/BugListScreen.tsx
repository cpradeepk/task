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
import { GET_BUGS, GET_PROJECTS } from '../config/graphql-queries'
import { Bug } from '../types'
import { getBugDisplayId, getSeverityColor, getStatusColor } from '../utils/bugHelpers'
import { formatDateIST } from '../utils/datetime'
import { save, get, STORAGE_KEYS } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useTabBarControl } from '../context/TabBarContext'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'

interface BugFilters {
  searchQuery: string
  statusFilter: string
  typeFilter: string
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
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [severityFilter, setSeverityFilter] = useState<string>('All')
  const [projectId, setProjectId] = useState<string>('')
  const [isFilterModalVisible, setFilterModalVisible] = useState(false)

  const { handleScroll } = useTabBarControl()
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: handleScroll
  })

  const statusOptions = ['All', 'Open', 'In Progress', 'Resolved', 'Closed', 'ReOpened']
  const typeOptions = ['All', 'feature', 'testcase', 'UI', 'Functionality'] // Add more as needed
  const severityOptions = ['All', 'Critical', 'Major', 'Minor']

  // GraphQL query for projects
  const { data: projectsData } = useQuery(GET_PROJECTS)
  const projects = (projectsData as any)?.projects || []

  // GraphQL query for bugs
  const { data, loading, error, refetch } = useQuery(GET_BUGS, {
    fetchPolicy: 'cache-and-network',
    variables: {
      search: searchQuery || undefined,
      status: statusFilter === 'All' ? undefined : statusFilter,
      severity: severityFilter === 'All' ? undefined : severityFilter,
      projectId: projectId || undefined,
      limit: 20, // Example limit
      offset: 0, // Example offset
    },
  })

  const bugs = (data as any)?.bugs || []

  const loadSavedFilters = useCallback(async () => {
    try {
      const savedFilters = await get<BugFilters>(STORAGE_KEYS.BUG_FILTERS)
      if (savedFilters) {
        setSearchQuery(savedFilters.searchQuery || '')
        setStatusFilter(savedFilters.statusFilter || 'All')
        setTypeFilter(savedFilters.typeFilter || 'All')
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

  const filterBugs = useCallback(() => {
    let filtered = bugs

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (bug: Bug) =>
          bug.title.toLowerCase().includes(query) ||
          bug.bugId.toLowerCase().includes(query)
      )
    }

    if (typeFilter !== 'All') {
      filtered = filtered.filter((bug: Bug) => bug.type === typeFilter)
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter((bug: Bug) => bug.status === statusFilter)
    }

    if (projectId) {
      filtered = filtered.filter((bug: Bug) => bug.project?.projectId === projectId)
    }

    setFilteredBugs(filtered)
  }, [bugs, searchQuery, statusFilter, typeFilter, projectId])

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
    let projectDisplay = item.project?.projectName || ''
    if (item.project?.projectId && projects.length > 0) {
      const proj = projects.find((p: any) => p.projectId === item.project?.projectId)
      if (proj && proj.parentProjectId) {
        const parent = projects.find((p: any) => p.projectId === proj.parentProjectId)
        if (parent) {
          projectDisplay = `${parent.projectName} / ${proj.projectName}`
        }
      }
    }

    const displayId = getBugDisplayId(item.bugId, item.type)

    return (
      <Card style={styles.card} elevation={1} onPress={() => navigation.navigate('BugDetails' as never, { bugId: item.bugId } as never)}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text style={styles.bugId}>{displayId}</Text>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
              textStyle={{ color: '#fff', fontSize: 10 }}
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

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={materialColors.primary} />
        <Text style={styles.loadingText}>Loading bugs...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <Surface style={styles.errorContainer} elevation={0}>
        <Text style={styles.errorText}>Failed to load bugs</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </Surface>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search bugs..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={materialColors.primary}
          right={() => (
            <IconButton
              icon="filter-variant"
              iconColor={materialColors.primary}
              onPress={() => setFilterModalVisible(true)}
            />
          )}
        />
      </View>

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
              {searchQuery || statusFilter !== 'All' || typeFilter !== 'All' || projectId !== ''
                ? 'No bugs match your filters'
                : 'No bugs found'}
            </Text>
          </View>
        }
      />

      {/* FILTER MODAL */}
      <Portal>
        <Modal visible={isFilterModalVisible} onDismiss={() => setFilterModalVisible(false)} contentContainerStyle={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.filterScroll}>
            <Text style={styles.filterTitle}>Filter Bugs</Text>
            <Divider style={styles.divider} />

            {/* Status Sections */}
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.chipRow}>
              {statusOptions.map(s => (
                <Chip
                  key={s}
                  selected={statusFilter === s}
                  onPress={() => setStatusFilter(s)}
                  style={styles.filterChip}
                  showSelectedOverlay
                  selectedColor={materialColors.primary}
                  textStyle={statusFilter === s ? { color: '#ffffff' } : {}}
                >
                  {s}
                </Chip>
              ))}
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Type</Text>
            <View style={styles.chipRow}>
              {typeOptions.map(t => (
                <Chip
                  key={t}
                  selected={typeFilter === t}
                  onPress={() => setTypeFilter(t)}
                  style={styles.filterChip}
                  showSelectedOverlay
                  selectedColor={materialColors.primary}
                  textStyle={typeFilter === t ? { color: '#ffffff' } : {}}
                >
                  {t === 'feature' ? 'Feature' : t === 'testcase' ? 'Test Case' : t}
                </Chip>
              ))}
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Project</Text>
            <View style={styles.chipRow}>
              <Chip
                selected={projectId === ''}
                onPress={() => setProjectId('')}
                style={styles.filterChip}
                showSelectedOverlay
                selectedColor={materialColors.primary}
                textStyle={projectId === '' ? { color: '#ffffff' } : {}}
              >
                All
              </Chip>
              {projects.map((p: any) => (
                <Chip
                  key={p.projectId}
                  selected={projectId === p.projectId}
                  onPress={() => setProjectId(p.projectId)}
                  style={styles.filterChip}
                  showSelectedOverlay
                  selectedColor={materialColors.primary}
                  textStyle={projectId === p.projectId ? { color: '#ffffff' } : {}}
                >
                  {p.projectName}
                </Chip>
              ))}
            </View>

            <PaperButton mode="contained" onPress={() => setFilterModalVisible(false)} style={styles.applyButton}>
              Done
            </PaperButton>
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
    height: 24,
    alignItems: 'center',
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
    marginTop: 20,
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
    bottom: 0,
    backgroundColor: materialColors.primary,
  },
})
