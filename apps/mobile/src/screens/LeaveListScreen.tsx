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

import React, { useState, useEffect } from 'react'
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
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
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
      fetchLeaves()
    }
  }, [currentUser, selectedStatus])

  const loadCurrentUser = async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }

  const fetchLeaves = async () => {
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
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchLeaves()
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

  const renderLeaveItem = ({ item }: { item: LeaveApplication }) => (
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
  )

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏖️</Text>
            <Text style={styles.emptyText}>No leave applications found</Text>
          </View>
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContent: {
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  leaveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: '#111827',
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
    color: '#9CA3AF',
  },
  leaveDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  daysText: {
    fontSize: 12,
    color: '#6B7280',
  },
  leaveReason: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  leaveDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
    color: '#9CA3AF',
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


