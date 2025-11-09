/**
 * Leave Details Screen
 * Displays full leave application details with approve/reject actions
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
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
  emergencyContact: string | null
  status: string
  managerId: string | null
  approvedBy: string | null
  approvalDate: string | null
  approvalRemarks: string | null
  createdAt: string
  updatedAt: string
}

export default function LeaveDetailsScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { leaveId } = route.params as { leaveId: string }

  const [leave, setLeave] = useState<LeaveApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [remarks, setRemarks] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchLeaveDetails()
    }
  }, [currentUser])

  const loadCurrentUser = async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }

  const fetchLeaveDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:3000/api/leaves/${leaveId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()
      if (result.success) {
        setLeave(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch leave details:', error)
      Alert.alert('Error', 'Failed to load leave details')
    } finally {
      setLoading(false)
    }
  }

  const canApprove = () => {
    if (!currentUser || !leave) return false
    const approverRoles = ['top_management', 'management', 'amtarikshian']
    return (
      approverRoles.includes(currentUser.role) &&
      leave.status === 'Pending' &&
      leave.employeeId !== currentUser.employeeId
    )
  }

  const canDelete = () => {
    if (!currentUser || !leave) return false
    return leave.employeeId === currentUser.employeeId && leave.status === 'Pending'
  }

  const handleApprove = async () => {
    Alert.alert(
      'Approve Leave',
      'Are you sure you want to approve this leave application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setActionLoading(true)
              const response = await fetch(
                `http://localhost:3000/api/leaves/${leaveId}/approve`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    approverId: currentUser.employeeId,
                    remarks: remarks || null,
                  }),
                }
              )

              const result = await response.json()
              if (result.success) {
                Alert.alert('Success', 'Leave application approved')
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to approve leave')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to approve leave')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleReject = async () => {
    if (!remarks.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection')
      return
    }

    Alert.alert(
      'Reject Leave',
      'Are you sure you want to reject this leave application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true)
              const response = await fetch(
                `http://localhost:3000/api/leaves/${leaveId}/reject`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    approverId: currentUser.employeeId,
                    reason: remarks,
                  }),
                }
              )

              const result = await response.json()
              if (result.success) {
                Alert.alert('Success', 'Leave application rejected')
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to reject leave')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reject leave')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleDelete = async () => {
    Alert.alert(
      'Delete Leave',
      'Are you sure you want to delete this leave application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true)
              const response = await fetch(`http://localhost:3000/api/leaves/${leaveId}`, {
                method: 'DELETE',
              })

              const result = await response.json()
              if (result.success) {
                Alert.alert('Success', 'Leave application deleted')
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to delete leave')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete leave')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    )
  }

  if (!leave) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Leave application not found</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.leaveType}>{leave.leaveType}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(leave.status) }]}>
            <Text style={styles.statusText}>{leave.status}</Text>
          </View>
        </View>
        <Text style={styles.applicationId}>{leave.applicationId}</Text>
      </View>

      {/* Employee Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{leave.employeeName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Employee ID:</Text>
          <Text style={styles.infoValue}>{leave.employeeId}</Text>
        </View>
      </View>

      {/* Leave Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>From:</Text>
          <Text style={styles.infoValue}>{formatDate(leave.fromDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>To:</Text>
          <Text style={styles.infoValue}>{formatDate(leave.toDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duration:</Text>
          <Text style={styles.infoValue}>
            {calculateDays(leave.fromDate, leave.toDate)} day(s)
            {leave.isHalfDay && ' (Half Day)'}
          </Text>
        </View>
        {leave.emergencyContact && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Emergency Contact:</Text>
            <Text style={styles.infoValue}>{leave.emergencyContact}</Text>
          </View>
        )}
      </View>

      {/* Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reason</Text>
        <Text style={styles.reasonText}>{leave.reason}</Text>
      </View>

      {/* Approval Info */}
      {(leave.approvedBy || leave.approvalRemarks) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Approval Information</Text>
          {leave.approvedBy && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {leave.status === 'Approved' ? 'Approved By:' : 'Rejected By:'}
              </Text>
              <Text style={styles.infoValue}>{leave.approvedBy}</Text>
            </View>
          )}
          {leave.approvalDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{formatDate(leave.approvalDate)}</Text>
            </View>
          )}
          {leave.approvalRemarks && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remarks:</Text>
              <Text style={styles.infoValue}>{leave.approvalRemarks}</Text>
            </View>
          )}
        </View>
      )}

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Application Created</Text>
            <Text style={styles.timelineDate}>{formatDate(leave.createdAt)}</Text>
          </View>
        </View>
        {leave.approvalDate && (
          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: getStatusColor(leave.status) },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>
                {leave.status === 'Approved' ? 'Approved' : 'Rejected'}
              </Text>
              <Text style={styles.timelineDate}>{formatDate(leave.approvalDate)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {canApprove() && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Remarks (Optional)</Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="Add remarks..."
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={3}
          />
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>
                {actionLoading ? 'Processing...' : 'Reject'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
              disabled={actionLoading}
            >
              <Text style={styles.actionButtonText}>
                {actionLoading ? 'Processing...' : 'Approve'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {canDelete() && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>
              {actionLoading ? 'Deleting...' : 'Delete Application'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveType: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  applicationId: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})


