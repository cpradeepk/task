/**
 * Skeleton Loading Components
 * Animated placeholder content shown while data loads
 */

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { useTheme } from '../contexts/ThemeContext'

/** Base animated skeleton block */
const SkeletonBlock = ({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string
  height: number
  borderRadius?: number
  style?: object
}) => {
  const { isDark } = useTheme()
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  const bgColor = isDark ? '#374151' : '#E5E7EB'

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: bgColor,
          opacity,
        },
        style,
      ]}
    />
  )
}

/** Dashboard stats card skeleton */
export const StatsCardSkeleton = () => {
  const { colors } = useTheme()
  return (
    <View style={[skeletonStyles.statsCard, { backgroundColor: colors.card }]}>
      <SkeletonBlock width={40} height={40} borderRadius={20} />
      <View style={skeletonStyles.statsTextGroup}>
        <SkeletonBlock width={60} height={12} />
        <SkeletonBlock width={30} height={20} style={{ marginTop: 6 }} />
      </View>
    </View>
  )
}

/** Task/Bug list item skeleton */
export const ListItemSkeleton = () => {
  const { colors } = useTheme()
  return (
    <View style={[skeletonStyles.listItem, { backgroundColor: colors.card }]}>
      <View style={skeletonStyles.listItemRow}>
        <SkeletonBlock width={50} height={18} borderRadius={4} />
        <SkeletonBlock width={60} height={18} borderRadius={10} />
      </View>
      <SkeletonBlock width="85%" height={14} style={{ marginTop: 10 }} />
      <SkeletonBlock width="60%" height={12} style={{ marginTop: 8 }} />
      <View style={[skeletonStyles.listItemRow, { marginTop: 12 }]}>
        <SkeletonBlock width={80} height={12} />
        <SkeletonBlock width={24} height={24} borderRadius={12} />
      </View>
    </View>
  )
}

/** Full dashboard loading skeleton */
export const DashboardSkeleton = () => {
  const { colors } = useTheme()
  return (
    <View style={[skeletonStyles.container, { backgroundColor: colors.background }]}>
      {/* Stats row */}
      <View style={skeletonStyles.statsRow}>
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </View>
      <View style={skeletonStyles.statsRow}>
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </View>

      {/* Section header */}
      <SkeletonBlock width={140} height={18} style={{ marginTop: 20, marginBottom: 12 }} />

      {/* List items */}
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />
    </View>
  )
}

/** Task/Bug list loading skeleton */
export const ListSkeleton = ({ count = 5 }: { count?: number }) => {
  const { colors } = useTheme()
  return (
    <View style={[skeletonStyles.container, { backgroundColor: colors.background }]}>
      {/* Filter bar skeleton */}
      <View style={skeletonStyles.filterBar}>
        <SkeletonBlock width="100%" height={40} borderRadius={20} />
      </View>
      <View style={skeletonStyles.chipRow}>
        <SkeletonBlock width={60} height={28} borderRadius={14} />
        <SkeletonBlock width={70} height={28} borderRadius={14} />
        <SkeletonBlock width={55} height={28} borderRadius={14} />
        <SkeletonBlock width={65} height={28} borderRadius={14} />
      </View>

      {/* List items */}
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </View>
  )
}

const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statsTextGroup: {
    flex: 1,
  },
  listItem: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterBar: {
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
})
