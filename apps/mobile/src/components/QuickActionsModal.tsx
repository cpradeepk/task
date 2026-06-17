import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Alert } from 'react-native'
import { Portal, Dialog, Button, TextInput, Text } from 'react-native-paper'
import { SearchablePicker } from './SearchablePicker'
import { updateTask } from '../services/taskService'
import { updateBug } from '../services/bugService'
import { post } from '../services/apiClient'
import { useTheme } from '../contexts/ThemeContext'

interface QuickActionsModalProps {
  visible: boolean
  onDismiss: () => void
  type: 'task' | 'bug'
  item: any // task or bug object
  users: any[] // to populate assignee list
  onSuccess: () => void // call to refresh parent list
}

export default function QuickActionsModal({
  visible,
  onDismiss,
  type,
  item,
  users,
  onSuccess
}: QuickActionsModalProps) {
  const { colors } = useTheme()
  const [status, setStatus] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (item) {
      setStatus(item.status || '')
      if (type === 'task') {
        const assignedArray = Array.isArray(item.assignedTo) ? item.assignedTo : []
        setAssignedTo(assignedArray[0] || '')
      } else {
        setAssignedTo(item.assignedTo || '')
      }
    }
    setCommentText('')
  }, [item, type, visible])

  const statusOptions = type === 'task'
    ? ['Yet to Start', 'In Progress', 'Delayed', 'Done', 'Cancel', 'Hold', 'ReOpened', 'Stop']
    : ['New', 'In Progress', 'Resolved', 'Closed', 'ReOpened']

  const handleSave = async () => {
    if (!item) return
    setSubmitting(true)
    try {
      const id = type === 'task' ? item.internal_id || item.taskId : item.id || item.bugId
      const statusChanged = status !== item.status
      let assignedChanged = false

      if (type === 'task') {
        const oldAssigned = Array.isArray(item.assignedTo) ? item.assignedTo[0] : ''
        assignedChanged = assignedTo !== oldAssigned
      } else {
        assignedChanged = assignedTo !== item.assignedTo
      }

      // 1. Save Status / Assignment updates
      if (type === 'task') {
        if (statusChanged || assignedChanged) {
          const updates: any = {}
          if (statusChanged) updates.status = status
          if (assignedChanged) updates.assignedTo = assignedTo
          await updateTask(item.taskId, updates)
        }
      } else {
        if (statusChanged || assignedChanged) {
          const updates: any = {}
          if (statusChanged) updates.status = status
          if (assignedChanged) updates.assignedTo = assignedTo
          await updateBug(item.bugId, updates)
        }
      }

      // 2. Save Comment if entered
      if (commentText.trim()) {
        await post('/api/activity-log', {
          entityType: type,
          entityId: type === 'task' ? item.taskId : item.bugId,
          actionType: 'comment',
          description: commentText.trim(),
          isComment: true
        })
      }

      Alert.alert('Success', 'Quick action updated successfully')
      onSuccess()
      onDismiss()
    } catch (error: any) {
      console.error('Quick action failed:', error)
      Alert.alert('Error', error?.message || 'Failed to complete quick action')
    } finally {
      setSubmitting(false)
    }
  }

  const userItems = users.map(u => ({
    label: u.name,
    value: u.employeeId
  }))

  const itemId = item ? (type === 'task' ? item.taskId : item.bugId) : ''

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ backgroundColor: colors.surface }}>
        <Dialog.Title style={{ color: colors.text }}>Quick Actions: {itemId}</Dialog.Title>
        <Dialog.Content style={{ paddingBottom: 8 }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Status Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Update Status</Text>
            <View style={styles.statusRow}>
              {statusOptions.map((opt) => (
                <Button
                  key={opt}
                  mode={status === opt ? 'contained' : 'outlined'}
                  onPress={() => setStatus(opt)}
                  style={styles.statusButton}
                  labelStyle={{ fontSize: 11, marginHorizontal: 2 }}
                  buttonColor={status === opt ? colors.primary : undefined}
                  textColor={status === opt ? '#ffffff' : colors.primary}
                >
                  {opt}
                </Button>
              ))}
            </View>

            {/* Assignee Section */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Reassign</Text>
            <SearchablePicker
              label="Assignee"
              placeholder="Select User"
              selectedValue={assignedTo}
              onValueChange={setAssignedTo}
              items={userItems}
            />

            {/* Comments Section */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Add Comment</Text>
            <TextInput
              mode="outlined"
              placeholder="Type comment here..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={3}
              textColor={colors.text}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              style={{ backgroundColor: colors.surface }}
            />
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={submitting}>Cancel</Button>
          <Button onPress={handleSave} loading={submitting} disabled={submitting}>Save</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  statusButton: {
    borderRadius: 8,
    minWidth: '30%'
  }
})
