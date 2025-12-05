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
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { Card, Text, Chip, FAB, ActivityIndicator, Searchbar } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { getUserData } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

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
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()
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
        `https://task.amtariksha.com/api/leaves/user/${currentUser.employeeId}`,
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

  const renderLeaveItem = useCallback(
    ({ item }: { item: LeaveApplication }) => (
      <Card
        style={styles.leaveCard}
        elevation={1}
        onPress={() =>
          navigation.navigate('LeaveDetails' as never as never, { leaveId: item.id } as never)
        }
      >
        <Card.Content>
          <View style={styles.leaveHeader}>
            <View style={styles.leaveTypeContainer}>
              <Text style={styles.leaveType}>{item.leaveType}</Text>
              <Chip
                mode="flat"
                compact
                style={{ backgroundColor: getStatusColor(item.status) }}
                textStyle={styles.statusText}
              >
                {item.status}
              </Chip>
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
        </Card.Content>
      </Card>
    ),
    [styles, navigation, getStatusColor, formatDate, calculateDays]
  )

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={materialColors.primary} />
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
          <Chip
            key={status}
            mode={selectedStatus === status ? 'flat' : 'outlined'}
            selected={selectedStatus === status}
            onPress={() => setSelectedStatus(status)}
            style={styles.filterButton}
            selectedColor={materialColors.surface}
          >
            {status}
          </Chip>
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
            <ActivityIndicator size="small" color={materialColors.primary} style={{ padding: materialSpacing.md }} />
          ) : null
        }
      />

      {/* Create Leave FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateLeave' as never)}
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
  centered: {
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
  filterContainer: {
    backgroundColor: materialColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: materialColors.outline,
    paddingVertical: materialSpacing.sm,
  },
  filterContent: {
    paddingHorizontal: materialSpacing.md,
    gap: materialSpacing.sm,
  },
  filterButton: {
    marginRight: materialSpacing.sm,
  },
  filterButtonActive: {
    backgroundColor: materialColors.primary,
  },
  filterText: {
    ...materialTypography.labelMedium,
  },
  filterTextActive: {
    color: materialColors.surface,
  },
  listContent: {
    padding: materialSpacing.md,
  },
  leaveCard: {
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.md,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: materialSpacing.sm,
  },
  leaveTypeContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: materialSpacing.sm,
  },
  leaveType: {
    ...materialTypography.titleMedium,
    color: materialColors.text,
  },
  statusBadge: {
    paddingHorizontal: materialSpacing.sm,
    paddingVertical: materialSpacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...materialTypography.labelSmall,
    color: materialColors.surface,
  },
  leaveId: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
  },
  leaveDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: materialSpacing.sm,
  },
  dateText: {
    ...materialTypography.bodyMedium,
    color: materialColors.text,
  },
  daysText: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
  },
  leaveReason: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
    marginBottom: materialSpacing.sm,
  },
  leaveDate: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
  },
  emptyContainer: {
    padding: materialSpacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: materialSpacing.md,
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: materialColors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: materialSpacing.md,
    bottom: materialSpacing.md,
  },
})


