import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

export default function DashboardScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { signOut } = React.useContext(AuthContext)

  const loadData = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem('user')
      const token = await AsyncStorage.getItem('userToken')

      if (userStr) {
        setUser(JSON.parse(userStr))
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

  const handleLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await signOut()
        },
      },
    ])
  }, [signOut])

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.name}!</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {tasks.filter((t) => t.status === 'In Progress').length}
          </Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {tasks.filter((t) => t.status === 'Done').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('TaskList' as never)}
        >
          <Text style={styles.actionTitle}>📋 Tasks</Text>
          <Text style={styles.actionDescription}>View and manage tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('CreateTask' as never)}
        >
          <Text style={styles.actionTitle}>➕ Create Task</Text>
          <Text style={styles.actionDescription}>Create a new task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('BugList' as never)}
        >
          <Text style={styles.actionTitle}>🐛 Bugs</Text>
          <Text style={styles.actionDescription}>View and manage bugs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('CreateBug' as never)}
        >
          <Text style={styles.actionTitle}>➕ Report Bug</Text>
          <Text style={styles.actionDescription}>Create a new bug report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Feed' as never)}
        >
          <Text style={styles.actionTitle}>📰 Feed</Text>
          <Text style={styles.actionDescription}>View team feed and updates</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('LeaveList' as never)}
        >
          <Text style={styles.actionTitle}>🏖️ Leave</Text>
          <Text style={styles.actionDescription}>Apply for leave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('WFHList' as never)}
        >
          <Text style={styles.actionTitle}>🏠 WFH</Text>
          <Text style={styles.actionDescription}>Work from home requests</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Tasks</Text>
        {tasks.slice(0, 5).map((task) => (
          <View key={task.taskId} style={styles.taskCard}>
            <Text style={styles.taskTitle}>{task.name || task.description}</Text>
            <Text style={styles.taskStatus}>{task.status}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    padding: responsive.spacing.lg,
    paddingTop: responsive.spacing.xxl * 2,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  greeting: {
    fontSize: responsive.fontSize.xl,
    fontWeight: 'bold',
    color: colors.card,
  },
  role: {
    fontSize: responsive.fontSize.sm,
    color: colors.primaryLight,
    marginTop: responsive.spacing.xxs,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: responsive.spacing.md,
    gap: responsive.spacing.sm,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: responsive.spacing.md,
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statNumber: {
    fontSize: responsive.fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: responsive.fontSize.xs,
    color: colors.textSecondary,
    marginTop: responsive.spacing.xxs,
  },
  section: {
    padding: responsive.spacing.md,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: responsive.fontSize.lg,
    fontWeight: 'bold',
    marginBottom: responsive.spacing.sm,
    color: colors.text,
  },
  taskCard: {
    backgroundColor: colors.card,
    padding: responsive.spacing.md,
    borderRadius: responsive.borderRadius.md,
    marginBottom: responsive.spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  taskTitle: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  taskStatus: {
    fontSize: responsive.fontSize.xs,
    color: colors.textSecondary,
    marginTop: responsive.spacing.xxs,
  },
  actionCard: {
    backgroundColor: colors.card,
    padding: responsive.spacing.lg,
    borderRadius: responsive.borderRadius.lg,
    marginBottom: responsive.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionTitle: {
    fontSize: responsive.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: responsive.spacing.xxs,
  },
  actionDescription: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: colors.error,
    margin: responsive.spacing.md,
    padding: responsive.spacing.md,
    borderRadius: responsive.borderRadius.md,
    alignItems: 'center',
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  logoutButtonText: {
    color: colors.card,
    fontSize: responsive.fontSize.md,
    fontWeight: 'bold',
  },
})
