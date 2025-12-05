/**
 * Settings Screen
 * 
 * Allows users to configure app settings:
 * - Biometric authentication (enable/disable)
 * - Theme mode (light/dark)
 * - Notification preferences
 * - Account information
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { Card, Text, Button, ActivityIndicator, Surface, Divider } from 'react-native-paper'
import { AuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import {
  isBiometricSupported,
  isBiometricEnrolled,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getBiometricTypeName,
  authenticateWithBiometrics,
} from '../utils/biometricAuth'
import { getUserData } from '../utils/secureStorage'

export default function SettingsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricEnrolled, setBiometricEnrolled] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const { signOut } = React.useContext(AuthContext)
  const { theme, toggleTheme, colors, isDark } = useTheme()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load user data
      const userData = await getUserData()
      setUser(userData)

      // Check biometric availability
      const supported = await isBiometricSupported()
      const enrolled = await isBiometricEnrolled()
      const enabled = await isBiometricEnabled()
      const type = await getBiometricTypeName()

      setBiometricSupported(supported)
      setBiometricEnrolled(enrolled)
      setBiometricEnabled(enabled)
      setBiometricType(type)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      // Enabling biometric - require authentication first
      const authResult = await authenticateWithBiometrics(
        `Enable ${biometricType} for login`
      )

      if (!authResult.success) {
        Alert.alert('Authentication Failed', authResult.error || 'Failed to enable biometric login')
        return
      }

      await enableBiometric()
      setBiometricEnabled(true)
      Alert.alert('Success', `${biometricType} login enabled`)
    } else {
      // Disabling biometric
      await disableBiometric()
      setBiometricEnabled(false)
      Alert.alert('Success', `${biometricType} login disabled`)
    }
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut()
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Employee ID</Text>
          <Text style={styles.infoValue}>{user?.employeeId || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{user?.name || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>{user?.department || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{user?.role || 'N/A'}</Text>
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Dark Mode</Text>
            <Text style={styles.settingDescription}>
              {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>

        {biometricSupported && biometricEnrolled ? (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{biometricType} Login</Text>
              <Text style={styles.settingDescription}>
                Use {biometricType} to login quickly
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
        ) : (
          <Text style={styles.warningText}>
            {!biometricSupported
              ? 'Biometric authentication is not supported on this device'
              : 'No biometric authentication is set up on this device'}
          </Text>
        )}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  warningText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    marginHorizontal: 20,
    marginTop: 30,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 20,
    color: '#999',
    fontSize: 12,
  },
})

