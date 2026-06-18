/**
 * Isolated Providers
 * Contains all context providers with ZERO local dependencies
 * This prevents circular dependency issues in the monorepo
 */

import * as React from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Light theme colors — Vibrant Purple primary (#8B5CF6)
const lightColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  text: '#111827',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  primary: '#8B5CF6',
  primaryLight: '#EDE9FE',
  primaryDark: '#7C3AED',
  // Semantic status colors (universally understood)
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  // Legacy accents kept for any existing references
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  pink: '#EC4899',
  pinkLight: '#FCE7F3',
}

// Dark theme colors — dark gunmetal background (#121212) with brighter purple
const darkColors = {
  background: '#121212',
  card: '#1E1E1E',
  surface: '#2A2A2A',
  surfaceVariant: '#1E1E1E',
  text: '#F3F4F6',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  border: '#2A2A2A',
  borderLight: '#1E1E1E',
  primary: '#A78BFA',
  primaryLight: '#3B1376',
  primaryDark: '#8B5CF6',
  success: '#4ADE80',
  successLight: '#14532D',
  warning: '#FBBF24',
  warningLight: '#78350F',
  error: '#F87171',
  errorLight: '#7F1D1D',
  info: '#60A5FA',
  infoLight: '#1E3A8A',
  purple: '#A78BFA',
  purpleLight: '#3B1376',
  pink: '#F472B6',
  pinkLight: '#831843',
}

export interface ThemeContextType {
  theme: 'light' | 'dark'
  colors: typeof lightColors
  toggleTheme: () => void
  isDark: boolean
}

export const ThemeContext = React.createContext<ThemeContextType>({
  theme: 'light',
  colors: lightColors,
  toggleTheme: () => { },
  isDark: false,
})

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Default to dark mode — matches the 'Energetic Startup' design direction.
  // Users can toggle to light; their choice is persisted in AsyncStorage.
  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark')

  React.useEffect(() => {
    loadTheme()
  }, [])

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeMode')
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme)
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
    }
  }

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light'
      setTheme(newTheme)
      await AsyncStorage.setItem('themeMode', newTheme)
    } catch (error) {
      console.error('Failed to save theme:', error)
    }
  }

  const colors = theme === 'light' ? lightColors : darkColors
  const isDark = theme === 'dark'

  const value: ThemeContextType = {
    theme,
    colors,
    toggleTheme,
    isDark,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Drawer Context & Provider
export interface DrawerContextType {
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

export const DrawerContext = React.createContext<DrawerContextType>({
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
})

export const DrawerProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const openDrawer = React.useCallback(() => setIsOpen(true), [])
  const closeDrawer = React.useCallback(() => setIsOpen(false), [])

  return (
    <DrawerContext.Provider value={{ isDrawerOpen: isOpen, openDrawer, closeDrawer }}>
      {children}
    </DrawerContext.Provider>
  )
}

export const useDrawer = () => {
  const context = React.useContext(DrawerContext)
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider')
  }
  return context
}

// Export colors for direct use
export { lightColors, darkColors }

// Default export for easier importing
export default ThemeProvider

