/**
 * Leave List Screen
 * Displays list of leave applications with filtering
 * 
 * Features:
 * - List of leave applications (own + team's if manager)
 * - Filter by status (All, Pending, Approved, Rejected)
 * - Pull-to-refresh
 * - Create leave button (FAB)
 * - Navigate to details
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { getUserData } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

interface LeaveApplication {
  id: string
  applicationId: string
  employeeId: string
  employeeName: string
  leaveType: string
  reason: string
  fromDate: string
  toDate: string
  isHalfDay: boolean
  status: string
  approvedBy: string | null
  approvalDate: string | null
  createdAt: string
}

export default function LeaveListScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const statuses = useMemo(() => ['All', 'Pending', 'Approved', 'Rejected'], [])

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchLeaves()
    }
  }, [currentUser, selectedStatus])

  const loadCurrentUser = useCallback(async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }, [])

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `http://localhost:3000/api/leaves/user/${currentUser.employeeId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const result = await response.json()
      if (result.success) {
        let filteredLeaves = result.data
        if (selectedStatus !== 'All') {
          filteredLeaves = filteredLeaves.filter(
            (leave: LeaveApplication) => leave.status === selectedStatus
          )
        }
        setLeaves(filteredLeaves)
      }
    } catch (error) {
      console.error('Failed to fetch leaves:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentUser, selectedStatus])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    setPage(1)
    fetchLeaves()
  }, [fetchLeaves])

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }, [loading, hasMore])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Pending':
        return '#F59E0B'
      case 'Approved':
        return '#10B981'
      case 'Rejected':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }, [])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [])

  const calculateDays = useCallback((fromDate: string, toDate: string) => {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const diffTime = Math.abs(to.getTime() - from.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }, [])

  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const renderLeaveItem = useCallback(
    ({ item }: { item: LeaveApplication }) => (
      <TouchableOpacity
        style={styles.leaveCard}
        onPress={() =>
          navigation.navigate('LeaveDetails' as never, { leaveId: item.id } as never)
        }
      >
        <View style={styles.leaveHeader}>
          <View style={styles.leaveTypeContainer}>
            <Text style={styles.leaveType}>{item.leaveType}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.leaveId}>{item.applicationId}</Text>
        </View>

        <View style={styles.leaveDates}>
          <Text style={styles.dateText}>
            {formatDate(item.fromDate)} - {formatDate(item.toDate)}
          </Text>
          <Text style={styles.daysText}>
            {calculateDays(item.fromDate, item.toDate)} day(s)
          </Text>
        </View>

        <Text style={styles.leaveReason} numberOfLines={2}>
          {item.reason}
        </Text>

        <Text style={styles.leaveDate}>
          Applied: {formatDate(item.createdAt)}
        </Text>
      </TouchableOpacity>
    ),
    [styles, navigation, getStatusColor, formatDate, calculateDays]
  )

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading leaves...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {statuses.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              selectedStatus === status && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === status && styles.filterTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Leave List */}
      <FlatList
        data={leaves}
        renderItem={renderLeaveItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏖️</Text>
            <Text style={styles.emptyText}>No leave applications found</Text>
          </View>
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 16 }} />
          ) : null
        }
      />

      {/* Create Leave FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateLeave' as never)}
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
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  filterContainer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    padding: responsive.containerPadding,
    gap: responsive.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: responsive.containerPadding,
  },
  leaveCard: {
    backgroundColor: colors.card,
    borderRadius: responsive.isTablet ? 16 : 12,
    padding: responsive.cardPadding,
    marginBottom: responsive.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leaveTypeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leaveId: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  leaveDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  daysText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  leaveReason: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  leaveDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
    color: '#FFFFFF',
    fontWeight: '300',
  },
})


