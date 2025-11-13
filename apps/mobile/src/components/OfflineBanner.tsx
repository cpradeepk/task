/**
 * Offline Banner Component - Material Design 3
 * Displays an animated banner when the device is offline
 */

import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'

export const OfflineBanner: React.FC = () => {
  const { isOffline } = useNetworkStatus()
  const slideAnim = useRef(new Animated.Value(-100)).current

  useEffect(() => {
    if (isOffline) {
      // Slide in animation (faster spring)
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 7,
      }).start()
    } else {
      // Slide out animation (faster: 150ms instead of 200ms)
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 150,
        useNativeDriver: true,
      }).start()
    }
  }, [isOffline, slideAnim])

  if (!isOffline) {
    return null
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📡</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>You're offline</Text>
          <Text style={styles.subtitle}>Some features may be limited</Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: materialColors.warning,
    paddingVertical: materialSpacing.md,
    paddingHorizontal: materialSpacing.md,
    elevation: materialElevation.level2,
    shadowColor: materialColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: materialSpacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...materialTypography.titleMedium,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    ...materialTypography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
  },
})

