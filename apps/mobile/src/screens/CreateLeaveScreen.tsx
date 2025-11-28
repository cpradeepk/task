/**
 * Create Leave Screen
 * Form to create new leave application
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native'
import { TextInput, Button, Surface, Text, ActivityIndicator } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useNavigation } from '@react-navigation/native'
import { getUserData } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

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
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

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

  const loadCurrentUser = useCallback(async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }, [])

  const handleFromDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowFromDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setFromDate(selectedDate)
      // Auto-adjust toDate if it's before fromDate
      if (selectedDate > toDate) {
        setToDate(selectedDate)
      }
    }
  }, [toDate])

  const handleToDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowToDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setToDate(selectedDate)
    }
  }, [])

  const calculateDays = useCallback(() => {
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }, [fromDate, toDate])

  const validateForm = useCallback(() => {
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
  }, [leaveType, reason, fromDate, toDate])

  const handleSubmit = useCallback(async () => {
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

      const response = await fetch('https://task.amtariksha.com/api/leaves', {
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
  }, [validateForm, currentUser, leaveType, reason, fromDate, toDate, isHalfDay, emergencyContact, navigation])

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [])

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
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

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
              textColor={colors.textSecondary}
            >
              Cancel
            </Button>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
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
    </KeyboardAvoidingView>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  form: {
    padding: responsive.spacing.lg,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  field: {
    marginBottom: responsive.spacing.xl,
  },
  label: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: responsive.spacing.xs,
  },
  required: {
    color: colors.error,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: responsive.spacing.xs,
  },
  typeButton: {
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
    borderRadius: responsive.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  typeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeButtonText: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: responsive.spacing.sm,
  },
  dateButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.sm,
  },
  dateLabel: {
    fontSize: responsive.fontSize.xs,
    color: colors.textTertiary,
    marginBottom: responsive.spacing.xxs,
  },
  dateValue: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  daysInfo: {
    marginTop: responsive.spacing.xs,
    padding: responsive.spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: responsive.borderRadius.md,
  },
  daysText: {
    fontSize: responsive.fontSize.sm,
    color: colors.primary,
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
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.sm,
    marginRight: responsive.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.card,
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
  },
  checkboxLabel: {
    fontSize: responsive.fontSize.sm,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.sm,
    fontSize: responsive.fontSize.sm,
    color: colors.text,
  },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: responsive.borderRadius.md,
    padding: responsive.spacing.sm,
    fontSize: responsive.fontSize.sm,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: responsive.spacing.md,
    marginTop: responsive.spacing.xs,
  },
  cancelButton: {
    flex: 1,
    borderColor: colors.border,
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: responsive.spacing.md,
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
    marginTop: 0,
  },
  submitButtonText: {
    fontSize: responsive.fontSize.md,
    fontWeight: '600',
    color: colors.card,
  },
})


