import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Card } from 'react-native-paper'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialTypography, materialSpacing } from '../config/materialTheme'
import { getUserData } from '../utils/secureStorage'
import DailyAttendanceCard from '../components/home/DailyAttendanceCard'
import { useTabBarControl } from '../context/TabBarContext'
import AppHeader from '../components/AppHeader'
import apiClient from '../services/apiClient'

export default function HomeScreen() {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const { handleScroll } = useTabBarControl()
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: handleScroll
  })

  const loadData = useCallback(async () => {
    try {
      const userData = await getUserData()
      let tasksData = []
      if (userData) {
        setUser(userData)
        const response = await apiClient.get(`/api/tasks/user/${userData.employeeId}`)
        tasksData = response.data || []
      }
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to load user or tasks:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Karmayog"
      />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Greeting Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>Hello,</Text>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>{user?.name} 👋</Text>
          {user?.role ? (
            <Text style={[styles.welcomeRole, { color: colors.primary }]}>{user.role}</Text>
          ) : null}
        </View>

        {/* Attendance Card */}
        <View style={styles.section}>
          <DailyAttendanceCard />
        </View>

        {/* Recent Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          {tasks.length === 0 ? (
            <Card style={styles.emptyCard} elevation={0}>
              <Card.Content>
                <Text style={styles.emptyText}>No tasks yet</Text>
              </Card.Content>
            </Card>
          ) : (
            tasks.slice(0, 5).map((task) => (
              <Card key={task.taskId} style={styles.taskCard} elevation={1}>
                <Card.Content>
                  <Text style={styles.taskTitle}>{task.name || task.description}</Text>
                  <Text style={styles.taskStatus}>{task.status}</Text>
                </Card.Content>
              </Card>
            ))
          )}
        </View>

      </Animated.ScrollView>
    </SafeAreaView>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  welcomeSection: {
    paddingHorizontal: materialSpacing.lg,
    paddingVertical: materialSpacing.md,
  },
  welcomeSub: {
    fontSize: 16,
    fontWeight: '400',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  welcomeRole: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  section: {
    padding: materialSpacing.md,
  },
  sectionTitle: {
    ...materialTypography.titleLarge,
    color: colors.text,
    marginBottom: materialSpacing.sm,
  },
  emptyCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...materialTypography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: materialSpacing.md,
  },
  taskCard: {
    marginBottom: materialSpacing.sm,
    backgroundColor: colors.surface,
  },
  taskTitle: {
    ...materialTypography.titleMedium,
    color: colors.text,
    marginBottom: 4,
  },
  taskStatus: {
    ...materialTypography.bodySmall,
    color: colors.primary,
  },
})
