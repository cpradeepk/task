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
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@apollo/client'
import { GET_BUGS } from '../config/graphql-queries'
import { Bug } from '../types'
import { getBugDisplayId, getSeverityColor, getStatusColor } from '../utils/bugHelpers'
import { save, get, STORAGE_KEYS } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

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

  const renderBugItem = ({ item }: { item: Bug }) => {
    const displayId = getBugDisplayId(item.bugId, item.type)

    return (
      <TouchableOpacity
        style={styles.bugCard}
        onPress={() => navigation.navigate('BugDetails' as never, { bugId: item.bugId } as never)}
      >
        <View style={styles.bugHeader}>
          <View style={styles.bugIdContainer}>
            <Text style={styles.bugId}>{displayId}</Text>
            {item.type === 'feature' && (
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>Feature</Text>
              </View>
            )}
          </View>
          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: getSeverityColor(item.severity) },
              ]}
            >
              <Text style={styles.badgeText}>{item.severity}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.bugTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.bugMeta}>
          <Text style={styles.metaText}>{item.category}</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>{item.platform}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading bugs...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load bugs</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search bugs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Type Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Type:</Text>
        {['All', 'feature', 'testcase'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              typeFilter === type && styles.filterButtonActive,
            ]}
            onPress={() => setTypeFilter(type)}
          >
            <Text
              style={[
                styles.filterButtonText,
                typeFilter === type && styles.filterButtonTextActive,
              ]}
            >
              {type === 'feature' ? 'Feature' : type === 'testcase' ? 'Test Case' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContentContainer}
      >
        <Text style={styles.filterLabel}>Status:</Text>
        {['All', 'New', 'In Progress', 'Resolved', 'Closed', 'Reopened'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === status && styles.filterButtonTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
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
            tintColor={colors.primary}
            colors={[colors.primary]}
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

      {/* Create Bug Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateBug' as never)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: responsive.spacing.sm,
    fontSize: responsive.fontSize.md,
    color: colors.textSecondary,
  },
  searchContainer: {
    padding: responsive.spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    paddingHorizontal: responsive.spacing.sm,
    fontSize: responsive.fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.spacing.sm,
    paddingHorizontal: responsive.spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  filterContentContainer: {
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginRight: responsive.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: responsive.spacing.sm,
    paddingVertical: responsive.spacing.xs,
    borderRadius: responsive.borderRadius.full,
    marginRight: responsive.spacing.xs,
    backgroundColor: colors.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.card,
    fontWeight: '600',
  },
  listContent: {
    padding: responsive.spacing.md,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  bugCard: {
    backgroundColor: colors.card,
    borderRadius: responsive.borderRadius.lg,
    padding: responsive.spacing.md,
    marginBottom: responsive.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsive.spacing.xs,
  },
  bugIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsive.spacing.xs,
  },
  bugId: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  featureBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: responsive.spacing.xs,
    paddingVertical: 2,
    borderRadius: responsive.borderRadius.md,
  },
  featureBadgeText: {
    fontSize: responsive.fontSize.xs - 2,
    color: colors.card,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: responsive.spacing.xs,
  },
  badge: {
    paddingHorizontal: responsive.spacing.xs,
    paddingVertical: responsive.spacing.xxs,
    borderRadius: responsive.borderRadius.lg,
  },
  badgeText: {
    fontSize: responsive.fontSize.xs - 1,
    color: colors.card,
    fontWeight: '600',
  },
  bugTitle: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: responsive.spacing.xs,
  },
  bugMeta: {
    flexDirection: 'row',
    gap: responsive.spacing.xs,
  },
  metaText: {
    fontSize: responsive.fontSize.xs,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: responsive.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: responsive.fontSize.md,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: responsive.fontSize.md,
    color: colors.error,
    marginBottom: responsive.spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: responsive.spacing.lg,
    paddingVertical: responsive.spacing.sm,
    borderRadius: responsive.borderRadius.md,
  },
  retryButtonText: {
    color: colors.card,
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: responsive.spacing.lg,
    bottom: responsive.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: colors.card,
    fontWeight: '300',
  },
})

