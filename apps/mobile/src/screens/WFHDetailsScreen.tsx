/**
 * WFH Details Screen
 * Displays full WFH application details with approve/reject actions
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

export default function WFHDetailsScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { wfhId } = route.params as { wfhId: string }

  const [wfh, setWFH] = useState<WFHApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [remarks, setRemarks] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchWFHDetails()
    }
  }, [currentUser])

  const loadCurrentUser = async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }

  const fetchWFHDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`http://localhost:3000/api/wfh/${wfhId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()
      if (result.success) {
        setWFH(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch WFH details:', error)
      Alert.alert('Error', 'Failed to load WFH details')
    } finally {
      setLoading(false)
    }
  }

  const canApprove = () => {
    if (!currentUser || !wfh) return false
    const approverRoles = ['top_management', 'management', 'amtarikshian']
    return (
      approverRoles.includes(currentUser.role) &&
      wfh.status === 'Pending' &&
      wfh.employeeId !== currentUser.employeeId
    )
  }

  const canDelete = () => {
    if (!currentUser || !wfh) return false
    return wfh.employeeId === currentUser.employeeId && wfh.status === 'Pending'
  }

  const handleApprove = async () => {
    Alert.alert(
      'Approve WFH',
      'Are you sure you want to approve this WFH application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setActionLoading(true)
              const response = await fetch(
                `http://localhost:3000/api/wfh/${wfhId}/approve`,
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
                Alert.alert('Success', 'WFH application approved')
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to approve WFH')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to approve WFH')
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
      'Reject WFH',
      'Are you sure you want to reject this WFH application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true)
              const response = await fetch(
                `http://localhost:3000/api/wfh/${wfhId}/reject`,
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
                Alert.alert('Success', 'WFH application rejected')
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to reject WFH')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reject WFH')
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
      'Delete WFH',
      'Are you sure you want to delete this WFH application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true)
              const response = await fetch(`http://localhost:3000/api/wfh/${wfhId}`, {
                method: 'DELETE',
              })

              const result = await response.json()
              if (result.success) {
                Alert.alert('Success', 'WFH application deleted')
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to delete WFH')
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete WFH')
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

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A'
    return timeString
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    )
  }

  if (!wfh) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>WFH application not found</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: getWFHTypeColor(wfh.wfhType) },
            ]}
          >
            <Text style={styles.typeText}>{wfh.wfhType}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(wfh.status) },
            ]}
          >
            <Text style={styles.statusText}>{wfh.status}</Text>
          </View>
        </View>
        <Text style={styles.applicationId}>{wfh.applicationId}</Text>
      </View>

      {/* Employee Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{wfh.employeeName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Employee ID:</Text>
          <Text style={styles.infoValue}>{wfh.employeeId}</Text>
        </View>
      </View>

      {/* WFH Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WFH Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>From:</Text>
          <Text style={styles.infoValue}>{formatDate(wfh.fromDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>To:</Text>
          <Text style={styles.infoValue}>{formatDate(wfh.toDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duration:</Text>
          <Text style={styles.infoValue}>
            {calculateDays(wfh.fromDate, wfh.toDate)} day(s)
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Work Location:</Text>
          <Text style={styles.infoValue}>{wfh.workLocation}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact Number:</Text>
          <Text style={styles.infoValue}>{wfh.contactNumber}</Text>
        </View>
        {wfh.wfhType === 'Flexible Hours' && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Available From:</Text>
              <Text style={styles.infoValue}>{formatTime(wfh.availableFrom)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Available To:</Text>
              <Text style={styles.infoValue}>{formatTime(wfh.availableTo)}</Text>
            </View>
          </>
        )}
      </View>

      {/* Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reason</Text>
        <Text style={styles.reasonText}>{wfh.reason}</Text>
      </View>

      {/* Approval Info */}
      {(wfh.approvedBy || wfh.approvalRemarks) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Approval Information</Text>
          {wfh.approvedBy && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {wfh.status === 'Approved' ? 'Approved By:' : 'Rejected By:'}
              </Text>
              <Text style={styles.infoValue}>{wfh.approvedBy}</Text>
            </View>
          )}
          {wfh.approvalDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{formatDate(wfh.approvalDate)}</Text>
            </View>
          )}
          {wfh.approvalRemarks && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remarks:</Text>
              <Text style={styles.infoValue}>{wfh.approvalRemarks}</Text>
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
            <Text style={styles.timelineDate}>{formatDate(wfh.createdAt)}</Text>
          </View>
        </View>
        {wfh.approvalDate && (
          <View style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: getStatusColor(wfh.status) },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>
                {wfh.status === 'Approved' ? 'Approved' : 'Rejected'}
              </Text>
              <Text style={styles.timelineDate}>{formatDate(wfh.approvalDate)}</Text>
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  errorText: { fontSize: 16, color: '#EF4444' },
  header: { backgroundColor: '#FFFFFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  typeText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  applicationId: { fontSize: 14, color: '#9CA3AF' },
  section: { backgroundColor: '#FFFFFF', padding: 20, marginTop: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 14, color: '#6B7280', flex: 1 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 2, textAlign: 'right' },
  reasonText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6', marginRight: 12, marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4 },
  timelineDate: { fontSize: 12, color: '#9CA3AF' },
  remarksInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', marginBottom: 16, minHeight: 80, textAlignVertical: 'top' },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  approveButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  deleteButton: { backgroundColor: '#EF4444' },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
})

