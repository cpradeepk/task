import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native'
import { TextInput, Button, Text, Surface } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AuthContext } from '../contexts/AuthContext'
import {
  isBiometricSupported,
  isBiometricEnrolled,
  authenticateWithBiometrics,
  isBiometricEnabled,
  getBiometricTypeName
} from '../utils/biometricAuth'
import { getUserToken, getUserData } from '../utils/secureStorage'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function LoginScreen() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const [showPassword, setShowPassword] = useState(false)
  const { signIn } = React.useContext(AuthContext)
  const { isOffline } = useNetworkStatus()

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const slideAnim = React.useRef(new Animated.Value(50)).current

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability()

    // Fade in animation (faster: 300ms instead of 600ms)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()
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
        Alert.alert('Login Failed', result.error as string || 'Invalid credentials')
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoTextContainer}>
                <Text style={styles.logoText}>AMTARIKSHA</Text>
              </View>
            </View>
            <Text style={styles.title}>JSR Task Management</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Login Form Card */}
          <Surface style={styles.card} elevation={2}>
            <TextInput
              label="Employee ID"
              value={employeeId}
              onChangeText={setEmployeeId}
              mode="outlined"
              disabled={loading || isOffline}
              autoCapitalize="characters"
              placeholder="e.g., AM-0001"
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
              outlineColor={materialColors.outline}
              activeOutlineColor={materialColors.primary}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                disabled={loading || isOffline}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                left={<TextInput.Icon icon="lock" color={materialColors.primary} />}
                style={[styles.input, styles.passwordInput]}
                outlineColor={materialColors.outline}
                activeOutlineColor={materialColors.primary}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIconButton}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={materialColors.primary}
                />
              </TouchableOpacity>
            </View>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || isOffline || !employeeId || !password}
              style={styles.loginButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            {biometricAvailable && (
              <Button
                mode="outlined"
                onPress={handleBiometricLogin}
                disabled={loading || isOffline}
                style={styles.biometricButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.biometricButtonLabel}
                icon="fingerprint"
              >
                Login with {biometricType}
              </Button>
            )}

            {isOffline && (
              <View style={styles.offlineNotice}>
                <Text style={styles.offlineText}>
                  📡 You're offline. Please connect to the internet to login.
                </Text>
              </View>
            )}
          </Surface>

          {/* Helper Text */}
          <Text style={styles.helperText}>
            Use your Employee ID (e.g., AM-0001) to login
          </Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: materialColors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: materialSpacing.lg,
  },
  formContainer: {
    width: '100%',
  },
  header: {
    marginBottom: materialSpacing.xl,
    alignItems: 'center',
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: materialSpacing.lg,
    backgroundColor: '#FFFFFF',
    padding: materialSpacing.lg,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: materialColors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: materialColors.primary,
    letterSpacing: 2,
  },
  logo: {
    width: 320,
    height: 80,
  },
  title: {
    ...materialTypography.headlineLarge,
    color: materialColors.text,
    textAlign: 'center',
    marginBottom: materialSpacing.xs,
  },
  subtitle: {
    ...materialTypography.bodyLarge,
    color: materialColors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: materialColors.surface,
    borderRadius: 16,
    padding: materialSpacing.lg,
    elevation: materialElevation.level2,
    shadowColor: materialColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  input: {
    marginBottom: materialSpacing.md,
    backgroundColor: materialColors.surface,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: materialSpacing.md,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 48,
  },
  eyeIconButton: {
    position: 'absolute',
    right: 8,
    top: 12,
    padding: 12,
    zIndex: 10,
    backgroundColor: 'rgba(255, 163, 1, 0.1)',
    borderRadius: 20,
  },
  loginButton: {
    marginTop: materialSpacing.sm,
    borderRadius: 8,
    backgroundColor: materialColors.primary,
  },
  buttonContent: {
    paddingVertical: materialSpacing.xs,
  },
  buttonLabel: {
    ...materialTypography.labelLarge,
  },
  biometricButton: {
    marginTop: materialSpacing.md,
    borderRadius: 8,
    borderColor: materialColors.primary,
  },
  biometricButtonLabel: {
    ...materialTypography.labelLarge,
    color: materialColors.primary,
  },
  offlineNotice: {
    marginTop: materialSpacing.md,
    padding: materialSpacing.sm,
    backgroundColor: materialColors.warningContainer,
    borderRadius: 8,
  },
  offlineText: {
    ...materialTypography.bodySmall,
    color: materialColors.onWarningContainer,
    textAlign: 'center',
  },
  helperText: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
    textAlign: 'center',
    marginTop: materialSpacing.lg,
  },
})
