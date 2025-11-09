/**
 * Create Leave Screen
 * Form to create new leave application
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation } from '@react-navigation/native'
import { getUserData } from '../utils/secureStorage'

const LEAVE_TYPES = [
  'Sick Leave',
  'Casual Leave',
  'Annual Leave',
  'Emergency Leave',
  'Maternity Leave',
  'Paternity Leave',
]

export default function CreateLeaveScreen() {
  const navigation = useNavigation()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [leaveType, setLeaveType] = useState('')
  const [fromDate, setFromDate] = useState(new Date())
  const [toDate, setToDate] = useState(new Date())
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [reason, setReason] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [showFromDatePicker, setShowFromDatePicker] = useState(false)
  const [showToDatePicker, setShowToDatePicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }

  const handleFromDateChange = (event: any, selectedDate?: Date) => {
    setShowFromDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setFromDate(selectedDate)
      // Auto-adjust toDate if it's before fromDate
      if (selectedDate > toDate) {
        setToDate(selectedDate)
      }
    }
  }

  const handleToDateChange = (event: any, selectedDate?: Date) => {
    setShowToDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setToDate(selectedDate)
    }
  }

  const calculateDays = () => {
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const validateForm = () => {
    if (!leaveType) {
      Alert.alert('Error', 'Please select leave type')
      return false
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason')
      return false
    }
    if (fromDate > toDate) {
      Alert.alert('Error', 'From date cannot be after to date')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)

      const applicationId = `LA-${Date.now()}`
      const leaveData = {
        applicationId,
        employeeId: currentUser.employeeId,
        employeeName: currentUser.name,
        leaveType,
        reason: reason.trim(),
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: toDate.toISOString().split('T')[0],
        isHalfDay,
        emergencyContact: emergencyContact.trim() || null,
        status: 'Pending',
        managerId: currentUser.managerId || null,
      }

      const response = await fetch('http://localhost:3000/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveData),
      })

      const result = await response.json()

      if (result.success) {
        Alert.alert('Success', 'Leave application submitted successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ])
      } else {
        Alert.alert('Error', result.error || 'Failed to submit leave application')
      }
    } catch (error) {
      console.error('Failed to submit leave:', error)
      Alert.alert('Error', 'Failed to submit leave application')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Leave Type */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Leave Type <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.typeGrid}>
            {LEAVE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  leaveType === type && styles.typeButtonActive,
                ]}
                onPress={() => setLeaveType(type)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    leaveType === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Range */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Date Range <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowFromDatePicker(true)}
            >
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateValue}>{formatDate(fromDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowToDatePicker(true)}
            >
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateValue}>{formatDate(toDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.daysInfo}>
            <Text style={styles.daysText}>
              Total: {calculateDays()} day(s)
            </Text>
          </View>
        </View>

        {/* Half Day Toggle */}
        <View style={styles.field}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIsHalfDay(!isHalfDay)}
          >
            <View style={[styles.checkbox, isHalfDay && styles.checkboxChecked]}>
              {isHalfDay && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Half Day</Text>
          </TouchableOpacity>
        </View>

        {/* Reason */}
        <View style={styles.field}>
          <Text style={styles.label}>
            Reason <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter reason for leave..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Emergency Contact */}
        <View style={styles.field}>
          <Text style={styles.label}>Emergency Contact (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            keyboardType="phone-pad"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display="default"
          onChange={handleFromDateChange}
          minimumDate={new Date()}
        />
      )}

      {showToDatePicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display="default"
          onChange={handleToDateChange}
          minimumDate={fromDate}
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  daysInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  daysText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})


