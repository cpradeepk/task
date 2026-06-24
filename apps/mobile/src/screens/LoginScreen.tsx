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
  Linking,
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
import { materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function LoginScreen() {
  const { colors, theme } = useTheme()
  const { showToast } = useToast()
  const styles = React.useMemo(() => getStyles(colors), [colors])
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
      showToast('Please enter both employee ID and password', 'warning')
      return
    }

    setLoading(true)
    try {
      const result = await signIn(employeeId, password)
      if (!result.success) {
        showToast(result.error as string || 'Invalid credentials', 'error')
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
        showToast(authResult.error || 'Biometric authentication failed', 'error')
        setLoading(false)
        return
      }

      // Get stored token and user data
      const token = await getUserToken()
      const userData = await getUserData()

      if (!token || !userData) {
        showToast(
          'Please login with your employee ID and password first to enable biometric login.',
          'warning'
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
        showToast(
          'Your session has expired. Please login again with your credentials.',
          'error'
        )
      }
    } catch (error: any) {
      showToast(error.message || 'Biometric login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Gradient accent bar at top */}
      <View style={styles.gradientBar} />

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
          {/* Header with actual logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/amtariksha_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Karmayog</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Login Form Card */}
          <Surface style={styles.card} elevation={2}>
            <TextInput
              label="Employee ID or Email"
              value={employeeId}
              onChangeText={setEmployeeId}
              mode="outlined"
              disabled={loading || isOffline}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="AM-0001 or you@example.com"
              left={<TextInput.Icon icon="account" color={colors.textSecondary} />}
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
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
                left={<TextInput.Icon icon="lock" color={colors.primary} />}
                style={[styles.input, styles.passwordInput]}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIconButton}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={colors.primary}
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
            Sign in with your Employee ID (e.g., AM-0001) or email address
          </Text>

          {/* Legal Links */}
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://task.amtariksha.com/privacy')}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalLinkSeparator}>  •  </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://task.amtariksha.com/terms')}>
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  )
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBar: {
    height: 4,
    backgroundColor: colors.primary,
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
    paddingVertical: materialSpacing.md,
  },
  logo: {
    width: 280,
    height: 70,
  },
  title: {
    ...materialTypography.headlineLarge,
    color: colors.text,
    textAlign: 'center',
    marginBottom: materialSpacing.xs,
  },
  subtitle: {
    ...materialTypography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: materialSpacing.lg,
    elevation: materialElevation.level2,
    shadowColor: colors.shadow || '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  input: {
    marginBottom: materialSpacing.md,
    backgroundColor: colors.card,
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
    backgroundColor: colors.primaryLight ? `${colors.primary}1A` : 'rgba(134, 239, 172, 0.15)',
    borderRadius: 20,
  },
  loginButton: {
    marginTop: materialSpacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: materialSpacing.xs,
  },
  buttonLabel: {
    ...materialTypography.labelLarge,
    color: '#FFFFFF',
  },
  biometricButton: {
    marginTop: materialSpacing.md,
    borderRadius: 8,
    borderColor: colors.primary,
  },
  biometricButtonLabel: {
    ...materialTypography.labelLarge,
    color: colors.primary,
  },
  offlineNotice: {
    marginTop: materialSpacing.md,
    padding: materialSpacing.sm,
    backgroundColor: colors.warningLight || '#FEF3C7',
    borderRadius: 8,
  },
  offlineText: {
    ...materialTypography.bodySmall,
    color: colors.warning || '#F59E0B',
    textAlign: 'center',
  },
  helperText: {
    ...materialTypography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: materialSpacing.lg,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: materialSpacing.md,
    alignItems: 'center',
  },
  legalLinkText: {
    ...materialTypography.bodySmall,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  legalLinkSeparator: {
    ...materialTypography.bodySmall,
    color: colors.textTertiary,
  },
})
