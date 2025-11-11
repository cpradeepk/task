/**
 * Isolated Providers
 * Contains all context providers with ZERO local dependencies
 * This prevents circular dependency issues in the monorepo
 */

import * as React from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Light theme colors
const lightColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  primary: '#3B82F6',
  primaryLight: '#EFF6FF',
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

// Dark theme colors
const darkColors = {
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  border: '#374151',
  borderLight: '#4B5563',
  primary: '#60A5FA',
  primaryLight: '#1E3A8A',
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
  toggleTheme: () => {},
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

  const Provider = ThemeContext.Provider
  return React.createElement(Provider, { value }, children)
}

// Export colors for direct use
export { lightColors, darkColors }

// Default export for easier importing
export default ThemeProvider
