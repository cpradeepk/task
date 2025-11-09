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

import React, { useState, useEffect } from 'react'
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
import { Bug } from '../../packages/shared/types'
import { getBugDisplayId, getSeverityColor, getStatusColor } from '../utils/bugHelpers'
import { save, get, STORAGE_KEYS } from '../utils/secureStorage'

interface BugFilters {
  searchQuery: string
  statusFilter: string
  typeFilter: string
}

export default function BugListScreen() {
  const navigation = useNavigation()
  const [filteredBugs, setFilteredBugs] = useState<Bug[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<string>('All')

  // GraphQL query for bugs
  const { data, loading, error, refetch } = useQuery(GET_BUGS, {
    fetchPolicy: 'cache-and-network',
  })

  const bugs = data?.bugs || []

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters()
  }, [])

  // Filter bugs when filters or data change
  useEffect(() => {
    filterBugs()
  }, [bugs, searchQuery, statusFilter, typeFilter])

  // Save filters when they change
  useEffect(() => {
    saveFilters()
  }, [searchQuery, statusFilter, typeFilter])

  const loadSavedFilters = async () => {
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
  }

  const saveFilters = async () => {
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
  }

  const filterBugs = () => {
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
  }

  const handleRefresh = async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh bugs:', error)
    }
  }

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
        <ActivityIndicator size="large" color="#3B82F6" />
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
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContentContainer: {
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  bugCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bugIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bugId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  featureBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featureBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  bugMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
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
    color: '#FFFFFF',
    fontWeight: '300',
  },
})

