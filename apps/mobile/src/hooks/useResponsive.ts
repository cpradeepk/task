/**
 * Responsive Hook
 * Provides responsive layout utilities for tablets and different screen sizes
 */

import { useWindowDimensions } from 'react-native'

export const useResponsive = () => {
  const { width, height } = useWindowDimensions()

  // Breakpoints
  const isSmall = width < 375 // Small phones
  const isMedium = width >= 375 && width < 768 // Regular phones
  const isTablet = width >= 768 && width < 1024 // Tablets
  const isLarge = width >= 1024 // Large tablets / iPad Pro

  // Orientation
  const isLandscape = width > height
  const isPortrait = height > width

  // Responsive values
  const containerPadding = isTablet ? 24 : 16
  const cardPadding = isTablet ? 20 : 16
  const fontSize = {
    small: isTablet ? 13 : 12,
    medium: isTablet ? 15 : 14,
    large: isTablet ? 17 : 16,
    xlarge: isTablet ? 21 : 18,
    xxlarge: isTablet ? 25 : 22,
  }

  // Container max width for tablets (centered content)
  const maxContentWidth = isTablet ? 1024 : width

  // Grid columns
  const gridColumns = isLarge ? 3 : isTablet ? 2 : 1

  // Spacing
  const spacing = {
    xs: isTablet ? 6 : 4,
    sm: isTablet ? 10 : 8,
    md: isTablet ? 14 : 12,
    lg: isTablet ? 18 : 16,
    xl: isTablet ? 26 : 20,
    xxl: isTablet ? 34 : 24,
  }

  return {
    width,
    height,
    isSmall,
    isMedium,
    isTablet,
    isLarge,
    isLandscape,
    isPortrait,
    containerPadding,
    cardPadding,
    fontSize,
    maxContentWidth,
    gridColumns,
    spacing,
  }
}

