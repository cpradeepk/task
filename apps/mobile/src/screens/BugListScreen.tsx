/**
 * Bug List Screen
 * Displays all bugs with filters and search
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
} from 'react-native'
import { getAllBugs, Bug } from '../services/bugService'
import { useNavigation } from '@react-navigation/native'

export default function BugListScreen() {
  const navigation = useNavigation()
  const [bugs, setBugs] = useState<Bug[]>([])
  const [filteredBugs, setFilteredBugs] = useState<Bug[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  useEffect(() => {
    loadBugs()
  }, [])

  useEffect(() => {
    filterBugs()
  }, [bugs, searchQuery, statusFilter])

  const loadBugs = async () => {
    try {
      setIsLoading(true)
      const response = await getAllBugs()
      if (response.success && response.data) {
        setBugs(response.data)
      }
    } catch (error) {
      console.error('Failed to load bugs:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const filterBugs = () => {
    let filtered = bugs

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

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadBugs()
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return '#EF4444'
      case 'Major':
        return '#F97316'
      case 'Minor':
        return '#EAB308'
      default:
        return '#6B7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return '#3B82F6'
      case 'In Progress':
        return '#EAB308'
      case 'Resolved':
        return '#10B981'
      case 'Closed':
        return '#6B7280'
      case 'Reopened':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  const renderBugItem = ({ item }: { item: Bug }) => (
    <TouchableOpacity
      style={styles.bugCard}
      onPress={() => navigation.navigate('BugDetails' as never, { bugId: item.bugId } as never)}
    >
      <View style={styles.bugHeader}>
        <Text style={styles.bugId}>{item.bugId}</Text>
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading bugs...</Text>
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

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        {['All', 'New', 'In Progress', 'Resolved', 'Closed'].map((status) => (
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
      </View>

      {/* Bug List */}
      <FlatList
        data={filteredBugs}
        renderItem={renderBugItem}
        keyExtractor={(item) => item.bugId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bugs found</Text>
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
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  bugId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
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

