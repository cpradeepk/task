/**
 * Create WFH Screen
 * Form to create new WFH application
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

const WFH_TYPES = ['Full Day', 'Half Day', 'Flexible Hours']

export default function CreateWFHScreen() {
  const navigation = useNavigation()
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

  const handleAvailableFromChange = (event: any, selectedTime?: Date) => {
    setShowAvailableFromPicker(Platform.OS === 'ios')
    if (selectedTime) {
      setAvailableFrom(selectedTime)
    }
  }

  const handleAvailableToChange = (event: any, selectedTime?: Date) => {
    setShowAvailableToPicker(Platform.OS === 'ios')
    if (selectedTime) {
      setAvailableTo(selectedTime)
    }
  }

  const calculateDays = () => {
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const validateForm = () => {
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
  }

  const handleSubmit = async () => {
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

      const response = await fetch('http://localhost:3000/api/wfh', {
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
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  form: { padding: 20 },
  field: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#EF4444' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  typeButtonActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  typeButtonText: { fontSize: 14, color: '#6B7280' },
  typeButtonTextActive: { color: '#3B82F6', fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateButton: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12 },
  dateLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  dateValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  daysInfo: { marginTop: 8, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8 },
  daysText: { fontSize: 14, color: '#3B82F6', fontWeight: '500' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827' },
  textArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', minHeight: 100, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { backgroundColor: '#9CA3AF' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
})

