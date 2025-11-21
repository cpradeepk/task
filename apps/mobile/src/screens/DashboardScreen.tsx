import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native'
import { Card, Text, ActivityIndicator, IconButton, Surface } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { DebugMenu } from '../components/DebugMenu'
import { materialColors, materialTypography, materialSpacing, materialElevation } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { getUserToken, getUserData } from '../utils/secureStorage'
import DailyAttendanceCard from '../components/home/DailyAttendanceCard'

export default function DashboardScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()

  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [debugMenuVisible, setDebugMenuVisible] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const userData = await getUserData()
      const token = await getUserToken()

      if (userData) {
        setUser(userData)
      }

      if (token) {
        // Fetch tasks using API client
        const { buildApiUrl } = require('../config/api')
        const response = await fetch(buildApiUrl('/api/tasks'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        setTasks(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      Alert.alert('Error', 'Failed to load data')
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={materialColors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[materialColors.primary]}
            tintColor={materialColors.primary}
          />
        }
      >
        {/* Header */}
        <Surface style={styles.header} elevation={2}>
          <View style={styles.headerTextContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.greetingScroll}>
              <Text style={styles.greeting}>Welcome, {user?.name}!</Text>
            </ScrollView>
            <Text style={styles.role}>{user?.role}</Text>
          </View>
          <IconButton
            icon="bug"
            size={24}
            iconColor={materialColors.surface}
            onPress={() => setDebugMenuVisible(true)}
            style={styles.debugButton}
          />
        </Surface>

        {/* Attendance Card */}
        <View style={styles.section}>
          <DailyAttendanceCard />
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statCardContent}>
              <Text style={styles.statNumber}>{tasks.length}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statCardContent}>
              <Text style={styles.statNumber}>
                {tasks.filter((t) => t.status === 'In Progress').length}
              </Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard} elevation={1}>
            <Card.Content style={styles.statCardContent}>
              <Text style={styles.statNumber}>
                {tasks.filter((t) => t.status === 'Done').length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.actionsScrollView}
            contentContainerStyle={styles.actionsScrollContent}
          >
            <Card style={styles.actionCardHorizontal} elevation={1} onPress={() => navigation.navigate('TaskList' as never)}>
              <Card.Content>
                <Text style={styles.actionTitle}>📋 Tasks</Text>
                <Text style={styles.actionDescription}>View and manage tasks</Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCardHorizontal} elevation={1} onPress={() => navigation.navigate('CreateTask' as never)}>
              <Card.Content>
                <Text style={styles.actionTitle}>➕ Create Task</Text>
                <Text style={styles.actionDescription}>Create a new task</Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCardHorizontal} elevation={1} onPress={() => navigation.navigate('BugList' as never)}>
              <Card.Content>
                <Text style={styles.actionTitle}>🐛 Bugs</Text>
                <Text style={styles.actionDescription}>View and manage bugs</Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCardHorizontal} elevation={1} onPress={() => navigation.navigate('CreateBug' as never)}>
              <Card.Content>
                <Text style={styles.actionTitle}>➕ Report Bug</Text>
                <Text style={styles.actionDescription}>Create a new bug report</Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCardHorizontal} elevation={1} onPress={() => navigation.navigate('Feed' as never)}>
              <Card.Content>
                <Text style={styles.actionTitle}>📰 Feed</Text>
                <Text style={styles.actionDescription}>View team feed and updates</Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCardHorizontal} elevation={1} onPress={() => navigation.navigate('LeaveList' as never)}>
              <Card.Content>
                <Text style={styles.actionTitle}>🏖️ Leave</Text>
                <Text style={styles.actionDescription}>Apply for leave</Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCardHorizontal} elevation={1} onPress={() => navigation.navigate('WFHList' as never)}>
              <Card.Content>
                <Text style={styles.actionTitle}>🏠 WFH</Text>
                <Text style={styles.actionDescription}>Work from home requests</Text>
              </Card.Content>
            </Card>
          </ScrollView>
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

      </ScrollView>

      <DebugMenu
        visible={debugMenuVisible}
        onClose={() => setDebugMenuVisible(false)}
      />
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: materialColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: materialColors.background,
  },
  loadingText: {
    ...materialTypography.bodyLarge,
    color: materialColors.textSecondary,
    marginTop: materialSpacing.md,
  },
  header: {
    backgroundColor: materialColors.primary,
    padding: materialSpacing.lg,
    paddingTop: materialSpacing.xxl * 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: materialSpacing.md,
    maxWidth: '80%',
  },
  greetingScroll: {
    flexGrow: 0,
    maxWidth: '100%',
  },
  debugButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  greeting: {
    ...materialTypography.headlineMedium,
    color: materialColors.surface,
  },
  role: {
    ...materialTypography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: materialSpacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: materialSpacing.md,
    gap: materialSpacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: materialColors.surface,
    borderRadius: 12,
  },
  statCardContent: {
    alignItems: 'center',
  },
  statNumber: {
    ...materialTypography.headlineLarge,
    color: materialColors.primary,
  },
  statLabel: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
    marginTop: materialSpacing.xs,
  },
  section: {
    padding: materialSpacing.md,
  },
  sectionTitle: {
    ...materialTypography.titleLarge,
    color: materialColors.text,
    marginBottom: materialSpacing.md,
  },
  actionsScrollView: {
    flexGrow: 0,
  },
  actionsScrollContent: {
    paddingVertical: materialSpacing.xs,
    paddingRight: materialSpacing.md,
  },
  actionCard: {
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.sm,
  },
  actionCardHorizontal: {
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    marginRight: materialSpacing.md,
    width: 200,
  },
  actionTitle: {
    ...materialTypography.titleMedium,
    color: materialColors.text,
    marginBottom: materialSpacing.xs,
  },
  actionDescription: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
  },
  taskCard: {
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: materialColors.primary,
  },
  taskTitle: {
    ...materialTypography.bodyLarge,
    color: materialColors.text,
    fontWeight: '600',
  },
  taskStatus: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
    marginTop: materialSpacing.xs,
  },
  emptyCard: {
    backgroundColor: materialColors.surfaceVariant,
    borderRadius: 12,
  },
  emptyText: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
    textAlign: 'center',
  },
  logoutButton: {
    borderRadius: 8,
  },
})
