/**
 * WFH List Screen
 * Displays list of WFH applications with filtering
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { getUserData } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

interface WFHApplication {
  id: string
  applicationId: string
  employeeId: string
  employeeName: string
  wfhType: string
  reason: string
  fromDate: string
  toDate: string
  workLocation: string
  availableFrom: string | null
  availableTo: string | null
  contactNumber: string
  status: string
  managerId: string | null
  approvedBy: string | null
  approvalDate: string | null
  approvalRemarks: string | null
  createdAt: string
  updatedAt: string
}

export default function WFHListScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [wfhApplications, setWFHApplications] = useState<WFHApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [currentUser, setCurrentUser] = useState<any>(null)

  const statuses = ['All', 'Pending', 'Approved', 'Rejected']

  const loadCurrentUser = useCallback(async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }, [])

  const fetchWFHApplications = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `http://localhost:3000/api/wfh/user/${currentUser.employeeId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const result = await response.json()
      if (result.success) {
        let filteredWFH = result.data
        if (selectedStatus !== 'All') {
          filteredWFH = filteredWFH.filter(
            (wfh: WFHApplication) => wfh.status === selectedStatus
          )
        }
        setWFHApplications(filteredWFH)
      }
    } catch (error) {
      console.error('Failed to fetch WFH applications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentUser, selectedStatus])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchWFHApplications()
  }, [fetchWFHApplications])

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

  useEffect(() => {
    loadCurrentUser()
  }, [loadCurrentUser])

  useEffect(() => {
    if (currentUser) {
      fetchWFHApplications()
    }
  }, [currentUser, fetchWFHApplications])

  const getStatusColor = (status: string) => {
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
  }

  const getWFHTypeColor = (type: string) => {
    switch (type) {
      case 'Full Day':
        return '#3B82F6'
      case 'Half Day':
        return '#8B5CF6'
      case 'Flexible Hours':
        return '#EC4899'
      default:
        return '#6B7280'
    }
  }

  const renderWFHItem = ({ item }: { item: WFHApplication }) => (
    <TouchableOpacity
      style={styles.wfhCard}
      onPress={() =>
        navigation.navigate('WFHDetails' as never, { wfhId: item.id } as never)
      }
    >
      <View style={styles.wfhHeader}>
        <View style={styles.typeContainer}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: getWFHTypeColor(item.wfhType) },
            ]}
          >
            <Text style={styles.typeText}>{item.wfhType}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.wfhId}>{item.applicationId}</Text>
      </View>

      <View style={styles.wfhBody}>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>📅</Text>
          <Text style={styles.dateText}>
            {formatDate(item.fromDate)} - {formatDate(item.toDate)}
          </Text>
          <Text style={styles.daysText}>
            ({calculateDays(item.fromDate, item.toDate)} day
            {calculateDays(item.fromDate, item.toDate) > 1 ? 's' : ''})
          </Text>
        </View>

        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.workLocation}
          </Text>
        </View>

        <Text style={styles.reasonText} numberOfLines={2}>
          {item.reason}
        </Text>

        <Text style={styles.appliedText}>
          Applied on {formatDate(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🏠</Text>
      <Text style={styles.emptyTitle}>No WFH Applications</Text>
      <Text style={styles.emptyDescription}>
        {selectedStatus === 'All'
          ? 'You have not applied for any WFH yet'
          : `No ${selectedStatus.toLowerCase()} WFH applications`}
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Status Filter */}
      <View style={styles.filterContainer}>
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
                styles.filterButtonText,
                selectedStatus === status && styles.filterButtonTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* WFH List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading WFH applications...</Text>
        </View>
      ) : (
        <FlatList
          data={wfhApplications}
          renderItem={renderWFHItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateWFH' as never)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: responsive.spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: responsive.spacing.xs,
  },
  filterButton: {
    flex: 1,
    paddingVertical: responsive.spacing.xs,
    paddingHorizontal: responsive.spacing.sm,
    borderRadius: responsive.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.card,
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
  listContent: {
    padding: responsive.spacing.md,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  wfhCard: {
    backgroundColor: colors.card,
    borderRadius: responsive.borderRadius.lg,
    padding: responsive.spacing.md,
    marginBottom: responsive.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  wfhHeader: {
    marginBottom: responsive.spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing.xs,
    gap: responsive.spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: responsive.spacing.sm,
    paddingVertical: responsive.spacing.xxs,
    borderRadius: responsive.borderRadius.full,
  },
  typeText: {
    fontSize: responsive.fontSize.xs,
    fontWeight: '600',
    color: colors.card,
  },
  statusBadge: {
    paddingHorizontal: responsive.spacing.sm,
    paddingVertical: responsive.spacing.xxs,
    borderRadius: responsive.borderRadius.full,
  },
  statusText: {
    fontSize: responsive.fontSize.xs,
    fontWeight: '600',
    color: colors.card,
  },
  wfhId: {
    fontSize: responsive.fontSize.xs,
    color: colors.textTertiary,
  },
  wfhBody: {
    gap: responsive.spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsive.spacing.xxs,
  },
  dateLabel: {
    fontSize: responsive.fontSize.sm,
  },
  dateText: {
    fontSize: responsive.fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  daysText: {
    fontSize: responsive.fontSize.xs,
    color: colors.textTertiary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsive.spacing.xxs,
  },
  locationLabel: {
    fontSize: responsive.fontSize.sm,
  },
  locationText: {
    fontSize: responsive.fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  reasonText: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  appliedText: {
    fontSize: responsive.fontSize.xs,
    color: colors.textTertiary,
    marginTop: responsive.spacing.xxs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsive.spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: responsive.spacing.md,
  },
  emptyTitle: {
    fontSize: responsive.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: responsive.spacing.xs,
  },
  emptyDescription: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: colors.card,
    fontWeight: '300',
  },
})


