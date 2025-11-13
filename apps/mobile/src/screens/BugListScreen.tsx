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
import { Card, Text, FAB, ActivityIndicator, Searchbar, Chip, Surface } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@apollo/client/react'
import { GET_BUGS } from '../config/graphql-queries'
import { Bug } from '../types'
import { getBugDisplayId, getSeverityColor, getStatusColor } from '../utils/bugHelpers'
import { save, get, STORAGE_KEYS } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

interface BugFilters {
  searchQuery: string
  statusFilter: string
  typeFilter: string
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

  // GraphQL query for bugs
  const { data, loading, error, refetch } = useQuery(GET_BUGS, {
    fetchPolicy: 'cache-and-network',
  })

  const bugs = data?.bugs || []

  const loadSavedFilters = useCallback(async () => {
    try {
      const savedFilters = await get<BugFilters>(STORAGE_KEYS.BUG_FILTERS)
      if (savedFilters) {
        setSearchQuery(savedFilters.searchQuery || '')
        setStatusFilter(savedFilters.statusFilter || 'All')
        setTypeFilter(savedFilters.typeFilter || 'All')
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
      }
      await save(STORAGE_KEYS.BUG_FILTERS, filters)
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }, [searchQuery, statusFilter, typeFilter])

  const filterBugs = useCallback(() => {
    let filtered = bugs

    // Filter by type
    if (typeFilter !== 'All') {
      filtered = filtered.filter((bug) => {
        if (typeFilter === 'feature') {
          return bug.type === 'feature'
        } else if (typeFilter === 'testcase') {
          return bug.type === 'testcase' || !bug.type
        }
        return true
      })
    }

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter((bug) => bug.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (bug) =>
          bug.bugId.toLowerCase().includes(query) ||
          bug.title.toLowerCase().includes(query) ||
          bug.description.toLowerCase().includes(query)
      )
    }

    setFilteredBugs(filtered)
  }, [bugs, searchQuery, statusFilter, typeFilter])

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

  const renderBugItem = ({ item }: { item: any }) => {
    const displayId = getBugDisplayId(item.bugId, item.type)
    const assignedToName = item.assignedToUser?.name || item.assignedTo || 'Unassigned'
    const projectName = item.project?.projectName || ''

    return (
      <Card
        style={styles.bugCard}
        elevation={1}
        onPress={() => navigation.navigate('BugDetails' as never, { bugId: item.bugId } as never)}
      >
        <Card.Content>
          <View style={styles.bugHeader}>
            <View style={styles.bugIdContainer}>
              <Text style={styles.bugId}>{displayId}</Text>
              {item.type === 'feature' && (
                <Chip mode="flat" compact style={styles.featureChip} textStyle={styles.featureChipText}>
                  Feature
                </Chip>
              )}
            </View>
            <View style={styles.badges}>
              <Chip
                mode="flat"
                compact
                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
                textStyle={styles.chipText}
              >
                {item.status}
              </Chip>
              <Chip
                mode="flat"
                compact
                style={[styles.severityChip, { backgroundColor: getSeverityColor(item.severity) }]}
                textStyle={styles.chipText}
              >
                {item.severity}
              </Chip>
            </View>
          </View>
          <Text style={styles.bugTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {projectName && (
            <Text style={styles.projectName} numberOfLines={1}>
              📁 {projectName}
            </Text>
          )}
          <View style={styles.bugMeta}>
            <Text style={styles.metaText}>{item.category}</Text>
            <Text style={styles.metaText}>•</Text>
            <Text style={styles.metaText}>{item.platform}</Text>
            <Text style={styles.metaText}>•</Text>
            <Text style={styles.metaText}>👤 {assignedToName}</Text>
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
      {/* Search Bar */}
      <Surface style={styles.searchContainer} elevation={0}>
        <Searchbar
          placeholder="Search bugs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          iconColor={materialColors.primary}
          inputStyle={materialTypography.bodyMedium}
        />
      </Surface>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        <Text style={styles.filterLabel}>Type:</Text>
        {['All', 'feature', 'testcase'].map((type) => (
          <Chip
            key={type}
            mode={typeFilter === type ? 'flat' : 'outlined'}
            selected={typeFilter === type}
            onPress={() => setTypeFilter(type)}
            style={styles.filterChip}
            textStyle={styles.filterChipText}
            selectedColor={materialColors.surface}
          >
            {type === 'feature' ? 'Feature' : type === 'testcase' ? 'Test Case' : 'All'}
          </Chip>
        ))}
      </ScrollView>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        <Text style={styles.filterLabel}>Status:</Text>
        {['All', 'New', 'In Progress', 'Resolved', 'Closed', 'Reopened'].map((status) => (
          <Chip
            key={status}
            mode={statusFilter === status ? 'flat' : 'outlined'}
            selected={statusFilter === status}
            onPress={() => setStatusFilter(status)}
            style={styles.filterChip}
            textStyle={styles.filterChipText}
            selectedColor={materialColors.surface}
          >
            {status}
          </Chip>
        ))}
      </ScrollView>

      {/* Bug List */}
      <FlatList
        data={filteredBugs}
        renderItem={renderBugItem}
        keyExtractor={(item) => item.bugId}
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
              {searchQuery || statusFilter !== 'All' || typeFilter !== 'All'
                ? 'No bugs match your filters'
                : 'No bugs found'}
            </Text>
          </View>
        }
      />

      {/* Create Bug FAB */}
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
  searchBar: {
    backgroundColor: materialColors.surfaceVariant,
    borderRadius: 28,
  },
  filterRow: {
    flexGrow: 0,
    backgroundColor: materialColors.surface,
    paddingVertical: materialSpacing.xs,
  },
  filterRowContent: {
    paddingHorizontal: materialSpacing.md,
    alignItems: 'center',
  },
  filterLabel: {
    ...materialTypography.labelLarge,
    color: materialColors.text,
    marginRight: materialSpacing.sm,
  },
  filterChip: {
    marginRight: materialSpacing.xs,
    height: 32,
  },
  filterChipText: {
    ...materialTypography.labelMedium,
  },
  listContent: {
    padding: materialSpacing.md,
  },
  bugCard: {
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.md,
  },
  bugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: materialSpacing.sm,
  },
  bugIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: materialSpacing.xs,
    flex: 1,
  },
  bugId: {
    ...materialTypography.labelLarge,
    color: materialColors.primary,
    fontWeight: '600',
  },
  featureChip: {
    height: 24,
    backgroundColor: materialColors.success,
  },
  featureChipText: {
    ...materialTypography.labelSmall,
    color: materialColors.surface,
  },
  badges: {
    flexDirection: 'row',
    gap: materialSpacing.xs,
  },
  statusChip: {
    height: 24,
  },
  severityChip: {
    height: 24,
  },
  chipText: {
    ...materialTypography.labelSmall,
    color: materialColors.surface,
  },
  bugTitle: {
    ...materialTypography.titleMedium,
    color: materialColors.text,
    marginBottom: materialSpacing.xs,
  },
  projectName: {
    ...materialTypography.bodySmall,
    color: materialColors.primary,
    marginBottom: materialSpacing.xs,
  },
  bugMeta: {
    flexDirection: 'row',
    gap: materialSpacing.xs,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaText: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
  },
  emptyContainer: {
    padding: materialSpacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: materialColors.textTertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: materialSpacing.lg,
    bottom: materialSpacing.lg,
    backgroundColor: materialColors.primary,
  },
})

