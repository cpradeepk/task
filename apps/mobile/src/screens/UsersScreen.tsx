import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { Card, Text, Button, ActivityIndicator, IconButton, Portal, Dialog, TextInput, Divider, Avatar, Chip, Searchbar } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getUserData } from '../utils/secureStorage'
import { materialSpacing, materialTypography, materialColors } from '../config/materialTheme'
import { useResponsive } from '../hooks/useResponsive'
import apiClient from '../services/apiClient'
import { SearchablePicker } from '../components/SearchablePicker'

interface User {
  employeeId: string
  name: string
  email: string
  phone?: string
  department: string
  role: 'employee' | 'management' | 'top_management' | 'admin' | 'amtarikshian'
  status: 'active' | 'inactive'
  managerEmail?: string
  managerId?: string
  warningCount: number
  telegramToken?: string
}

export default function UsersScreen() {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // User Dialog State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null) // null means create mode
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields
  const [empId, setEmpId] = useState('')
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState<'employee' | 'management' | 'top_management' | 'admin' | 'amtarikshian'>('employee')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [managerEmail, setManagerEmail] = useState('')
  const [password, setPassword] = useState('') // Create mode only
  const [warningCount, setWarningCount] = useState('0')
  const [telegramToken, setTelegramToken] = useState('')

  const [depts, setDepts] = useState<string[]>([])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const user = await getUserData()
      if (user) {
        setCurrentUser(user)
      }

      // Fetch users
      const res = await apiClient.get('/api/users?includeInactive=true')
      if (res && res.success && Array.isArray(res.data)) {
        setUsers(res.data)
      } else if (Array.isArray(res)) {
        setUsers(res)
      } else {
        setError(res?.error || 'Failed to fetch users list')
      }

      // Fetch departments from settings
      const settingsRes = await apiClient.get('/api/settings?grouped=true&activeOnly=true')
      if (settingsRes && settingsRes.success && settingsRes.data) {
        const fetchedDepts = settingsRes.data.department || settingsRes.data.Department || []
        const deptNames = Array.isArray(fetchedDepts)
          ? fetchedDepts.map((d: any) => d.value || d)
          : []
        setDepts(deptNames)
      }

    } catch (err) {
      console.error(err)
      setError('An error occurred loading user list')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  const openUserDialog = (user: User | null = null) => {
    setSelectedUser(user)
    if (user) {
      // Edit mode
      setEmpId(user.employeeId)
      setUserName(user.name)
      setEmail(user.email)
      setPhone(user.phone || '')
      setDepartment(user.department)
      setRole(user.role)
      setStatus(user.status)
      setManagerEmail(user.managerEmail || '')
      setWarningCount(String(user.warningCount || 0))
      setTelegramToken(user.telegramToken || '')
      setPassword('')
    } else {
      // Create mode
      setEmpId('')
      setUserName('')
      setEmail('')
      setPhone('')
      setDepartment(depts[0] || '')
      setRole('employee')
      setStatus('active')
      setManagerEmail('')
      setWarningCount('0')
      setTelegramToken('')
      setPassword('')
    }
    setIsUserModalOpen(true)
  }

  const handleSaveUser = async () => {
    if (!userName.trim() || !email.trim() || (!selectedUser && !password.trim()) || !empId.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields (*) including password in create mode.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload: any = {
        employeeId: empId.trim(),
        name: userName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        department: department || depts[0],
        role: role,
        status: status,
        managerEmail: managerEmail.trim() || null,
        warningCount: parseInt(warningCount) || 0,
        telegramToken: telegramToken.trim() || null
      }

      if (!selectedUser) {
        payload.password = password
      }

      const url = selectedUser ? `/api/users/${selectedUser.employeeId}` : '/api/users'
      const method = selectedUser ? 'PUT' : 'POST'

      const res = await apiClient.apiRequest(url, {
        method,
        body: JSON.stringify(payload)
      })

      if (res && res.success) {
        Alert.alert('Success', `User ${selectedUser ? 'updated' : 'created'} successfully!`)
        setIsUserModalOpen(false)
        loadData()
      } else {
        Alert.alert('Error', res?.error || 'Failed to save user')
      }

    } catch (err) {
      console.error(err)
      Alert.alert('Error', 'An error occurred while saving user data')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = () => {
    if (!selectedUser) return

    Alert.prompt(
      'Reset Password',
      `Enter a new password for ${selectedUser.name}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async (newPass?: string) => {
            if (!newPass || !newPass.trim()) {
              Alert.alert('Error', 'Password cannot be empty')
              return
            }
            try {
              setIsSubmitting(true)
              const res = await apiClient.put(`/api/users/${selectedUser.employeeId}`, {
                ...selectedUser,
                password: newPass.trim()
              })
              if (res && res.success) {
                Alert.alert('Success', 'Password reset successfully!')
              } else {
                Alert.alert('Error', res?.error || 'Failed to reset password')
              }
            } catch (err) {
              console.error(err)
              Alert.alert('Error', 'An error occurred resetting the password')
            } finally {
              setIsSubmitting(false)
            }
          }
        }
      ]
    )
  }

  // Filtered and sorted users
  const filteredUsers = useMemo(() => {
    let list = users

    if (searchQuery) {
      const lower = searchQuery.toLowerCase()
      list = list.filter(u => 
        u.name.toLowerCase().includes(lower) || 
        u.employeeId.toLowerCase().includes(lower) || 
        u.email.toLowerCase().includes(lower)
      )
    }

    if (roleFilter !== 'all') {
      list = list.filter(u => u.role === roleFilter)
    }

    if (statusFilter !== 'all') {
      list = list.filter(u => u.status === statusFilter)
    }

    // Sort: active users first
    return [...list].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      return a.name.localeCompare(b.name)
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const getInitials = (name: string) => {
    return name
      ? name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
      : 'U'
  }

  return (
    <View style={styles.container}>
      {/* Header filters */}
      <View style={styles.header}>
        <Searchbar
          placeholder="Search employees..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={colors.primary}
        />
        <View style={styles.filtersRow}>
          <View style={styles.pickerWrapper}>
            <SearchablePicker
              label="Role"
              selectedValue={roleFilter}
              onValueChange={setRoleFilter}
              items={[
                { label: 'All Roles', value: 'all' },
                { label: 'Employee', value: 'employee' },
                { label: 'Management', value: 'management' },
                { label: 'Top Management', value: 'top_management' },
                { label: 'Admin', value: 'admin' },
              ]}
            />
          </View>
          <View style={styles.pickerWrapper}>
            <SearchablePicker
              label="Status"
              selectedValue={statusFilter}
              onValueChange={setStatusFilter}
              items={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator style={styles.loader} size="large" color={colors.primary} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <IconButton icon="alert-circle-outline" size={48} iconColor={materialColors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={loadData} style={{ marginTop: 12 }}>
              Try Again
            </Button>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredUsers.map(user => (
              <Card key={user.employeeId} style={[styles.userCard, user.status !== 'active' && styles.inactiveCard]} onPress={() => openUserDialog(user)}>
                <Card.Content style={styles.cardContent}>
                  <Avatar.Text size={40} label={getInitials(user.name)} style={[styles.avatar, { backgroundColor: user.status === 'active' ? colors.primary : colors.textTertiary }]} />
                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Chip style={styles.roleChip} textStyle={styles.roleChipText}>{user.role}</Chip>
                    </View>
                    <Text style={styles.userId}>{user.employeeId} • {user.department}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <IconButton icon="chevron-right" size={20} iconColor={colors.textTertiary} />
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add User FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => openUserDialog(null)}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* User Edit/Create Portal */}
      <Portal>
        <Dialog visible={isUserModalOpen} onDismiss={() => setIsUserModalOpen(false)}>
          <Dialog.Title>{selectedUser ? 'Edit User Details' : 'Create New User'}</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 380 }}>
              <TextInput
                label="Employee ID *"
                value={empId}
                onChangeText={setEmpId}
                mode="outlined"
                style={styles.modalInput}
                disabled={!!selectedUser}
              />
              <TextInput
                label="Full Name *"
                value={userName}
                onChangeText={setUserName}
                mode="outlined"
                style={styles.modalInput}
              />
              <TextInput
                label="Email Address *"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                autoCapitalize="none"
                style={styles.modalInput}
              />
              <TextInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.modalInput}
              />
              {!selectedUser ? (
                <TextInput
                  label="Password *"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  autoCapitalize="none"
                  style={styles.modalInput}
                />
              ) : null}
              
              <SearchablePicker
                label="Department"
                selectedValue={department}
                onValueChange={setDepartment}
                items={depts.map(d => ({ label: d, value: d }))}
              />

              <SearchablePicker
                label="System Role"
                selectedValue={role}
                onValueChange={(val) => setRole(val as any)}
                items={[
                  { label: 'Employee', value: 'employee' },
                  { label: 'Amtariksian', value: 'amtarikshian' },
                  { label: 'Management', value: 'management' },
                  { label: 'Top Management', value: 'top_management' },
                  { label: 'Admin', value: 'admin' },
                ]}
              />

              <SearchablePicker
                label="Status"
                selectedValue={status}
                onValueChange={(val) => setStatus(val as any)}
                items={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ]}
              />

              <TextInput
                label="Manager Email"
                value={managerEmail}
                onChangeText={setManagerEmail}
                mode="outlined"
                autoCapitalize="none"
                style={styles.modalInput}
              />

              <TextInput
                label="Warning Count"
                value={warningCount}
                onChangeText={setWarningCount}
                mode="outlined"
                keyboardType="numeric"
                style={styles.modalInput}
              />

              <TextInput
                label="Telegram Token"
                value={telegramToken}
                onChangeText={setTelegramToken}
                mode="outlined"
                style={styles.modalInput}
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions style={{ flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            {selectedUser ? (
              <Button mode="outlined" textColor={materialColors.error} onPress={handleResetPassword} style={{ borderColor: materialColors.error }}>
                Reset Password
              </Button>
            ) : <View />}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button onPress={() => setIsUserModalOpen(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleSaveUser} loading={isSubmitting} disabled={isSubmitting}>
                Save
              </Button>
            </View>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: materialSpacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    overflow: 'hidden',
    height: 40,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: '100%',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...materialTypography.bodyMedium,
    color: materialColors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: '#999',
    marginTop: 12,
  },
  listContainer: {
    padding: materialSpacing.md,
    gap: 8,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: materialSpacing.sm,
  },
  avatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  userName: {
    ...materialTypography.titleMedium,
    fontWeight: 'bold',
    color: colors.text,
  },
  userId: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
  },
  userEmail: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  roleChip: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  roleChipText: {
    fontSize: 9,
    lineHeight: 10,
    color: colors.primary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  selectLabel: {
    ...materialTypography.bodyMedium,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
})
