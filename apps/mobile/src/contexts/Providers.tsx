/**
 * Isolated Providers
 * Contains all context providers with ZERO local dependencies
 * This prevents circular dependency issues in the monorepo
 */

import * as React from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Light theme colors — sage green primary brand (#86EFAC)
const lightColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  primary: '#86EFAC',
  primaryLight: '#F0FDF4',
  primaryDark: '#22C55E',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  pink: '#EC4899',
  pinkLight: '#FCE7F3',
}

// Dark theme colors — lighter sage stays primary for dark surfaces
const darkColors = {
  background: '#111827',
  card: '#1F2937',
  surface: '#1F2937',
  surfaceVariant: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  border: '#374151',
  borderLight: '#4B5563',
  primary: '#BBF7D0',
  primaryLight: '#14532D',
  primaryDark: '#4ADE80',
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#78350F',
  error: '#F87171',
  errorLight: '#7F1D1D',
  purple: '#A78BFA',
  purpleLight: '#4C1D95',
  pink: '#F472B6',
  pinkLight: '#831843',
}

interface ThemeContextType {
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
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light')

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

// Export colors for direct use
export { lightColors, darkColors }

// Default export for easier importing
export default ThemeProvider
