/**
 * AppHeader Component
 * A reusable, premium header toolbar for all tab screens in the mobile app.
 * Includes a drawer toggler, screen title, theme toggle, and notification bell.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, IconButton } from 'react-native-paper'
import { useTheme, useDrawer } from '../contexts/ThemeContext'
import NotificationBell from './NotificationBell'
import { materialTypography } from '../config/materialTheme'

interface AppHeaderProps {
  title: string
  rightAction?: React.ReactNode
}

export default function AppHeader({ title, rightAction }: AppHeaderProps) {
  const { colors, theme, toggleTheme } = useTheme()
  const { openDrawer } = useDrawer()

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.leftSection}>
        <IconButton
          icon="menu"
          size={24}
          iconColor={colors.text}
          onPress={openDrawer}
          style={styles.iconButton}
        />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.rightSection}>
        <IconButton
          icon={theme === 'dark' ? 'weather-sunny' : 'weather-night'}
          size={22}
          iconColor={colors.text}
          onPress={toggleTheme}
          style={styles.iconButton}
        />
        <NotificationBell />
        {rightAction}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...materialTypography.titleLarge,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    margin: 0,
  },
})
