import React, { useState, useEffect } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { AuthContext } from '../contexts/AuthContext'
import {
  isBiometricSupported,
  isBiometricEnrolled,
  authenticateWithBiometrics,
  isBiometricEnabled,
  getBiometricTypeName
} from '../utils/biometricAuth'
import { getUserToken, getUserData } from '../utils/secureStorage'

export default function LoginScreen() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const { signIn } = React.useContext(AuthContext)

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability()
  }, [])

  const checkBiometricAvailability = async () => {
    const supported = await isBiometricSupported()
    const enrolled = await isBiometricEnrolled()
    const enabled = await isBiometricEnabled()
    const type = await getBiometricTypeName()

    setBiometricAvailable(supported && enrolled && enabled)
    setBiometricType(type)
  }

  const handleLogin = async () => {
    if (!employeeId || !password) {
      Alert.alert('Error', 'Please enter both employee ID and password')
      return
    }

    setLoading(true)
    try {
      const result = await signIn(employeeId, password)
      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Invalid credentials')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricLogin = async () => {
    setLoading(true)
    try {
      // Authenticate with biometrics
      const authResult = await authenticateWithBiometrics(`Login with ${biometricType}`)

      if (!authResult.success) {
        Alert.alert('Authentication Failed', authResult.error || 'Biometric authentication failed')
        setLoading(false)
        return
      }

      // Get stored token and user data
      const token = await getUserToken()
      const userData = await getUserData()

      if (!token || !userData) {
        Alert.alert(
          'No Saved Credentials',
          'Please login with your employee ID and password first to enable biometric login.'
        )
        setLoading(false)
        return
      }

      // Verify token is still valid by attempting to use it
      // The token will be automatically used by Apollo Client
      // If it's expired, the user will be logged out automatically

      // Dispatch sign in action (token is already in SecureStore)
      const result = await signIn(userData.employeeId, '')

      if (!result.success) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again with your credentials.'
        )
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Biometric login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>JSR Task Management</Text>
      <Text style={styles.subtitle}>Mobile App</Text>

      <TextInput
        style={styles.input}
        placeholder="Employee ID"
        value={employeeId}
        onChangeText={setEmployeeId}
        editable={!loading}
        placeholderTextColor="#999"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      {biometricAvailable && (
        <TouchableOpacity
          style={[styles.biometricButton, loading && styles.buttonDisabled]}
          onPress={handleBiometricLogin}
          disabled={loading}
        >
          <Text style={styles.biometricButtonText}>
            🔐 Login with {biometricType}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.demoText}>Demo: admin-001 / 1234</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  biometricButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 12,
  },
})
