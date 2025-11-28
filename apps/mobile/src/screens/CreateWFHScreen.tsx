/**
 * Create WFH Screen
 * Form to create new WFH application
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
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useResponsive } from '../hooks/useResponsive'

const WFH_TYPES = ['Full Day', 'Half Day', 'Flexible Hours']

export default function CreateWFHScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [wfhType, setWFHType] = useState('')
  const [fromDate, setFromDate] = useState(new Date())
  const [toDate, setToDate] = useState(new Date())
  const [workLocation, setWorkLocation] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [availableFrom, setAvailableFrom] = useState(new Date())
  const [availableTo, setAvailableTo] = useState(new Date())
  const [reason, setReason] = useState('')
  const [showFromDatePicker, setShowFromDatePicker] = useState(false)
  const [showToDatePicker, setShowToDatePicker] = useState(false)
  const [showAvailableFromPicker, setShowAvailableFromPicker] = useState(false)
  const [showAvailableToPicker, setShowAvailableToPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadCurrentUser = useCallback(async () => {
    const user = await getUserData()
    setCurrentUser(user)
  }, [])

  useEffect(() => {
    loadCurrentUser()
  }, [loadCurrentUser])

  const handleFromDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowFromDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setFromDate(selectedDate)
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

  const handleAvailableFromChange = useCallback((event: any, selectedTime?: Date) => {
    setShowAvailableFromPicker(Platform.OS === 'ios')
    if (selectedTime) {
      setAvailableFrom(selectedTime)
    }
  }, [])

  const handleAvailableToChange = useCallback((event: any, selectedTime?: Date) => {
    setShowAvailableToPicker(Platform.OS === 'ios')
    if (selectedTime) {
      setAvailableTo(selectedTime)
    }
  }, [])

  const calculateDays = useCallback(() => {
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }, [fromDate, toDate])

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }, [])

  const validateForm = useCallback(() => {
    if (!wfhType) {
      Alert.alert('Error', 'Please select WFH type')
      return false
    }
    if (!workLocation.trim()) {
      Alert.alert('Error', 'Please provide work location')
      return false
    }
    if (!contactNumber.trim()) {
      Alert.alert('Error', 'Please provide contact number')
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
  }, [wfhType, workLocation, contactNumber, reason, fromDate, toDate])

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)

      const applicationId = `WFH-${Date.now()}`
      const wfhData = {
        applicationId,
        employeeId: currentUser.employeeId,
        employeeName: currentUser.name,
        wfhType,
        reason: reason.trim(),
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: toDate.toISOString().split('T')[0],
        workLocation: workLocation.trim(),
        contactNumber: contactNumber.trim(),
        availableFrom:
          wfhType === 'Flexible Hours'
            ? availableFrom.toTimeString().split(' ')[0].substring(0, 5)
            : null,
        availableTo:
          wfhType === 'Flexible Hours'
            ? availableTo.toTimeString().split(' ')[0].substring(0, 5)
            : null,
        status: 'Pending',
        managerId: currentUser.managerId || null,
      }

      const { buildApiUrl } = require('../config/api')
      const response = await fetch(buildApiUrl('/api/wfh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wfhData),
      })

      const result = await response.json()

      if (result.success) {
        Alert.alert('Success', 'WFH application submitted successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ])
      } else {
        Alert.alert('Error', result.error || 'Failed to submit WFH application')
      }
    } catch (error) {
      console.error('Failed to submit WFH:', error)
      Alert.alert('Error', 'Failed to submit WFH application')
    } finally {
      setSubmitting(false)
    }
  }, [validateForm, currentUser, wfhType, reason, fromDate, toDate, workLocation, contactNumber, availableFrom, availableTo, navigation])

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
          {/* WFH Type */}
          <View style={styles.field}>
            <Text style={styles.label}>
              WFH Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.typeGrid}>
              {WFH_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    wfhType === type && styles.typeButtonActive,
                  ]}
                  onPress={() => setWFHType(type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      wfhType === type && styles.typeButtonTextActive,
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
              <Text style={styles.daysText}>Total: {calculateDays()} day(s)</Text>
            </View>
          </View>

          {/* Work Location */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Work Location <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Home, Coworking Space, etc."
              value={workLocation}
              onChangeText={setWorkLocation}
            />
          </View>

          {/* Contact Number */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Contact Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Availability Times (for Flexible Hours) */}
          {wfhType === 'Flexible Hours' && (
            <View style={styles.field}>
              <Text style={styles.label}>Availability</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowAvailableFromPicker(true)}
                >
                  <Text style={styles.dateLabel}>From</Text>
                  <Text style={styles.dateValue}>{formatTime(availableFrom)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowAvailableToPicker(true)}
                >
                  <Text style={styles.dateLabel}>To</Text>
                  <Text style={styles.dateValue}>{formatTime(availableTo)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reason */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Reason <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter reason for WFH..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
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

        {showAvailableFromPicker && (
          <DateTimePicker
            value={availableFrom}
            mode="time"
            display="default"
            onChange={handleAvailableFromChange}
          />
        )}

        {showAvailableToPicker && (
          <DateTimePicker
            value={availableTo}
            mode="time"
            display="default"
            onChange={handleAvailableToChange}
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

