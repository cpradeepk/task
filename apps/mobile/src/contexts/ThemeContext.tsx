/**
 * Theme Context Hook
 * Re-exports ThemeProvider from isolated Providers file and provides useTheme hook
 * This file exists for backward compatibility with existing imports
 */

import { useContext } from 'react'
import { ThemeContext, ThemeProvider, lightColors, darkColors } from './Providers'

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Re-export for backward compatibility
export { ThemeProvider, lightColors, darkColors }

