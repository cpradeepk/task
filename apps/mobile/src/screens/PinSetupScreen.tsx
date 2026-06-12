import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  Dimensions,
} from 'react-native'
import { Text, Surface, Button, Portal, Dialog } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { saveSecure, SECURE_KEYS } from '../utils/secureStorage'
import {
  isBiometricSupported,
  isBiometricEnrolled,
  enableBiometric,
  getBiometricTypeName,
  authenticateWithBiometrics,
} from '../utils/biometricAuth'
import { materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'

const { width } = Dimensions.get('window')

interface PinSetupScreenProps {
  onComplete: () => void
}

export default function PinSetupScreen({ onComplete }: PinSetupScreenProps) {
  const { colors } = useTheme()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [step, setStep] = useState<'create' | 'confirm'>('create')
  const [error, setError] = useState('')
  const [showBiometricDialog, setShowBiometricDialog] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  
  // Animation values
  const shakeAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    async function checkBiometrics() {
      const supported = await isBiometricSupported()
      const enrolled = await isBiometricEnrolled()
      const name = await getBiometricTypeName()
      setBiometricAvailable(supported && enrolled)
      setBiometricType(name)
    }
    checkBiometrics()
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

  const handleKeyPress = (num: string) => {
    setError('')
    if (step === 'create') {
      if (pin.length < 4) {
        const nextPin = pin + num
        setPin(nextPin)
        if (nextPin.length === 4) {
          // Fade step transition
          setTimeout(() => {
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
              setStep('confirm')
              Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start()
            })
          }, 200)
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const nextConfirm = confirmPin + num
        setConfirmPin(nextConfirm)
        if (nextConfirm.length === 4) {
          if (pin === nextConfirm) {
            handleSuccess(pin)
          } else {
            setTimeout(() => {
              triggerShake()
              setError('PINs do not match. Try again.')
              setConfirmPin('')
            }, 200)
          }
        }
      }
    }
  }

  const handleBackspace = () => {
    setError('')
    if (step === 'create') {
      setPin(pin.slice(0, -1))
    } else {
      setConfirmPin(confirmPin.slice(0, -1))
    }
  }

  const handleReset = () => {
    setPin('')
    setConfirmPin('')
    setStep('create')
    setError('')
  }

  const handleSuccess = async (finalPin: string) => {
    try {
      await saveSecure(SECURE_KEYS.USER_PIN, finalPin)
      if (biometricAvailable) {
        setShowBiometricDialog(true)
      } else {
        onComplete()
      }
    } catch (err) {
      console.error('Failed to save PIN:', err)
      setError('Could not set PIN. Please try again.')
    }
  }

  const handleBiometricResponse = async (enable: boolean) => {
    setShowBiometricDialog(false)
    if (enable) {
      const authResult = await authenticateWithBiometrics(`Enable ${biometricType} access`)
      if (authResult.success) {
        await enableBiometric()
      }
    }
    onComplete()
  }

  const renderDot = (index: number) => {
    const currentVal = step === 'create' ? pin : confirmPin
    const active = currentVal.length > index
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Brand Accent */}
      <View style={[styles.gradientBar, { backgroundColor: colors.primary }]} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name={step === 'create' ? 'lock-plus-outline' : 'lock-check-outline'}
            size={64}
            color={colors.primary}
            style={styles.logo}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            {step === 'create' ? 'Create Security PIN' : 'Confirm Security PIN'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'create'
              ? 'Choose a 4-digit PIN to secure your account access.'
              : 'Please type the 4-digit PIN again to confirm.'}
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
            {step === 'confirm' ? (
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={handleReset}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name="refresh" size={26} color={colors.textSecondary} />
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
      </Animated.View>

      {/* Biometrics Opt-in Dialog */}
      <Portal>
        <Dialog visible={showBiometricDialog} onDismiss={() => handleBiometricResponse(false)}>
          <Dialog.Title>Enable {biometricType}?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Would you like to enable {biometricType} authentication for quick access next time you open the app?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => handleBiometricResponse(false)}>No, thanks</Button>
            <Button onPress={() => handleBiometricResponse(true)}>Enable</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  logo: {
    marginBottom: materialSpacing.md,
  },
  title: {
    ...materialTypography.headlineMedium,
    fontWeight: 'bold',
    textAlign: 'center',
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
