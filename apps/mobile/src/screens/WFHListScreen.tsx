/**
 * WFH List Screen
 * Displays list of WFH applications with filtering
 */

import React, { useState, useEffect } from 'react'
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
  const [wfhApplications, setWFHApplications] = useState<WFHApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [currentUser, setCurrentUser] = useState<any>(null)

  const statuses = ['All', 'Pending', 'Approved', 'Rejected']

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchWFHApplications()
    }
  }, [currentUser, selectedStatus])

  const loadCurrentUser = async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }

  const fetchWFHApplications = async () => {
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
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchWFHApplications()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const calculateDays = (fromDate: string, toDate: string) => {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const diffTime = Math.abs(to.getTime() - from.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

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
          <ActivityIndicator size="large" color="#3B82F6" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
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
  listContent: {
    padding: 16,
  },
  wfhCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  wfhHeader: {
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  wfhId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  wfhBody: {
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateLabel: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  daysText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationLabel: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  reasonText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  appliedText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
})


