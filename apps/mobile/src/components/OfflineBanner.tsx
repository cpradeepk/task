/**
 * Offline Banner Component
 * Displays a banner when the device is offline
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useTheme } from '../contexts/ThemeContext'

export const OfflineBanner: React.FC = () => {
  const { isOffline } = useNetworkStatus()
  const { colors } = useTheme()

  if (!isOffline) {
    return null
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
      <Text style={styles.text}>📡 You're offline. Some features may be limited.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
})

