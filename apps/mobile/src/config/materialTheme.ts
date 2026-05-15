/**
 * Material Design 3 Theme Configuration
 * Provides Material Design 3 color schemes, typography, and spacing
 */

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'

// Material Design 3 Color Palette (matching web app sage green theme)
export const materialColors = {
  // Primary colors (sage green to match web app)
  primary: '#86EFAC',       // Sage green (web app primary)
  primaryLight: '#BBF7D0',  // Green 200 (lighter sage)
  primaryDark: '#22C55E',   // Green 500 (darker for hover/active)

  // Secondary colors
  secondary: '#1976D2',     // Blue 700
  secondaryLight: '#42A5F5', // Blue 400
  secondaryDark: '#0D47A1',  // Blue 900

  // Surface colors
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  surfaceDim: '#E0E0E0',

  // Background colors
  background: '#FAFAFA',
  backgroundDark: '#121212',

  // Text colors
  text: '#212121',
  textSecondary: '#757575',
  textTertiary: '#9E9E9E',
  textDisabled: '#BDBDBD',

  // Status colors
  success: '#4CAF50',       // Green 500
  successContainer: '#C8E6C9', // Green 100
  warning: '#FF9800',       // Orange 500
  warningContainer: '#FFF3E0', // Orange 50
  onWarningContainer: '#E65100', // Orange 900
  error: '#F44336',         // Red 500
  errorContainer: '#FFCDD2', // Red 100
  info: '#2196F3',          // Blue 500

  // Utility colors
  border: '#E0E0E0',
  outline: '#79747E',       // Material Design 3 outline
  divider: '#BDBDBD',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Elevation shadows (Material Design 3)
  shadow: '#000000',
}

// Dark mode colors — lighter sage stays primary for dark surfaces
export const materialColorsDark = {
  primary: '#BBF7D0',       // Green 200 — lighter sage for dark bg contrast
  primaryLight: '#86EFAC',  // Sage (the brand color)
  primaryDark: '#4ADE80',   // Green 400 — slightly darker for hover/active

  secondary: '#94A3B8',     // Slate 400
  secondaryLight: '#CBD5E1', // Slate 300
  secondaryDark: '#64748B',  // Slate 500

  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2C',
  surfaceDim: '#121212',

  background: '#121212',
  backgroundDark: '#000000',

  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  textDisabled: '#6E6E6E',

  success: '#81C784',       // Green 300
  warning: '#FFB74D',       // Orange 300
  warningContainer: '#E65100', // Orange 900
  onWarningContainer: '#FFF3E0', // Orange 50
  error: '#E57373',         // Red 300
  info: '#64B5F6',          // Blue 300

  border: '#3E3E3E',
  outline: '#938F99',       // Material Design 3 outline (dark)
  divider: '#4E4E4E',
  overlay: 'rgba(0, 0, 0, 0.7)',

  shadow: '#000000',
}

// Material Design 3 Typography
export const materialTypography = {
  // Display styles
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontWeight: '400' as const,
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontWeight: '400' as const,
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '400' as const,
  },

  // Headline styles
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '400' as const,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400' as const,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400' as const,
  },

  // Title styles
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500' as const,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },

  // Body styles
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },

  // Label styles
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
}

// Material Design 3 Spacing (8dp grid)
export const materialSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

// Material Design 3 Elevation levels
export const materialElevation = {
  level0: 0,
  level1: 1,
  level2: 3,
  level3: 6,
  level4: 8,
  level5: 12,
}

// React Native Paper theme configuration
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: materialColors.primary,
    secondary: materialColors.secondary,
    surface: materialColors.surface,
    background: materialColors.background,
    error: materialColors.error,
  },
}

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: materialColorsDark.primary,
    secondary: materialColorsDark.secondary,
    surface: materialColorsDark.surface,
    background: materialColorsDark.background,
    error: materialColorsDark.error,
  },
}

