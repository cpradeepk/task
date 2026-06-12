import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
} from 'react-native'
import { Text, Surface } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { getSecure, SECURE_KEYS } from '../utils/secureStorage'
import {
  isBiometricSupported,
  isBiometricEnrolled,
  isBiometricEnabled,
  getBiometricTypeName,
  authenticateWithBiometrics,
} from '../utils/biometricAuth'
import { materialTypography, materialSpacing } from '../config/materialTheme'

interface PinLockScreenProps {
  onUnlock: () => void
}

export default function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const { colors } = useTheme()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  
  // Animation values
  const shakeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    async function checkAndTriggerBiometrics() {
      const supported = await isBiometricSupported()
      const enrolled = await isBiometricEnrolled()
      const enabled = await isBiometricEnabled()
      const name = await getBiometricTypeName()
      
      const available = supported && enrolled && enabled
      setBiometricAvailable(available)
      setBiometricType(name)

      if (available) {
        // Automatically trigger biometric login
        setTimeout(() => {
          handleBiometricAuth()
        }, 300)
      }
    }
    checkAndTriggerBiometrics()
  }, [])

  const triggerShake = () => {
    Vibration.vibrate(100)
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }

  const handleKeyPress = async (num: string) => {
    setError('')
    if (pin.length < 4) {
      const nextPin = pin + num
      setPin(nextPin)
      
      if (nextPin.length === 4) {
        const storedPin = await getSecure(SECURE_KEYS.USER_PIN)
        if (storedPin === nextPin) {
          onUnlock()
        } else {
          setTimeout(() => {
            triggerShake()
            setError('Incorrect PIN. Please try again.')
            setPin('')
          }, 200)
        }
      }
    }
  }

  const handleBackspace = () => {
    setError('')
    setPin(pin.slice(0, -1))
  }

  const handleBiometricAuth = async () => {
    setError('')
    const authResult = await authenticateWithBiometrics(`Unlock Karmayog using ${biometricType}`)
    if (authResult.success) {
      onUnlock()
    } else if (authResult.error && authResult.error !== 'Authentication cancelled') {
      setError(authResult.error)
    }
  }

  const renderDot = (index: number) => {
    const active = pin.length > index
    return (
      <View
        key={index}
        style={[
          styles.dot,
          {
            borderColor: error ? colors.error : colors.primary,
            backgroundColor: active ? (error ? colors.error : colors.primary) : 'transparent',
          },
        ]}
      />
    )
  }

  const getBiometricIcon = () => {
    if (biometricType.toLowerCase().includes('face')) {
      return 'face-recognition'
    }
    return 'fingerprint'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Brand Accent */}
      <View style={[styles.gradientBar, { backgroundColor: colors.primary }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="shield-lock-outline" size={64} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>App Locked</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your 4-digit security PIN or use biometrics to unlock.
          </Text>
        </View>

        {/* PIN Indicators */}
        <Animated.View
          style={[
            styles.dotContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {[0, 1, 2, 3].map(renderDot)}
        </Animated.View>

        {/* Error Display */}
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}

        {/* Custom Numeric Keypad */}
        <Surface style={[styles.keypadContainer, { backgroundColor: colors.card }]} elevation={2}>
          <View style={styles.keypadRow}>
            {['1', '2', '3'].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keypadButton}
                onPress={() => handleKeyPress(num)}
                activeOpacity={0.6}
              >
                <Text style={[styles.keypadButtonText, { color: colors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['4', '5', '6'].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keypadButton}
                onPress={() => handleKeyPress(num)}
                activeOpacity={0.6}
              >
                <Text style={[styles.keypadButtonText, { color: colors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['7', '8', '9'].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keypadButton}
                onPress={() => handleKeyPress(num)}
                activeOpacity={0.6}
              >
                <Text style={[styles.keypadButtonText, { color: colors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {biometricAvailable ? (
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={handleBiometricAuth}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name={getBiometricIcon()} size={28} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.keypadButton} />
            )}
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.6}
            >
              <Text style={[styles.keypadButtonText, { color: colors.text }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={handleBackspace}
              activeOpacity={0.6}
            >
              <MaterialCommunityIcons name="backspace-outline" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Surface>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBar: {
    height: 4,
    width: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: materialSpacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: materialSpacing.xl,
  },
  title: {
    ...materialTypography.headlineMedium,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: materialSpacing.md,
    marginBottom: materialSpacing.xs,
  },
  subtitle: {
    ...materialTypography.bodyMedium,
    textAlign: 'center',
    paddingHorizontal: materialSpacing.lg,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    marginBottom: materialSpacing.md,
    gap: materialSpacing.md,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    ...materialTypography.bodyMedium,
    textAlign: 'center',
    height: 20,
    marginBottom: materialSpacing.md,
  },
  errorPlaceholder: {
    height: 20,
    marginBottom: materialSpacing.md,
  },
  keypadContainer: {
    borderRadius: 24,
    padding: materialSpacing.md,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: materialSpacing.sm,
  },
  keypadButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: 'normal',
  },
})
