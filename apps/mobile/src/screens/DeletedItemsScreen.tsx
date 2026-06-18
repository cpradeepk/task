import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { Card, Text, Button, ActivityIndicator, IconButton, Divider, Chip } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getUserData } from '../utils/secureStorage'
import { materialSpacing, materialTypography, materialColors } from '../config/materialTheme'
import { useResponsive } from '../hooks/useResponsive'
import apiClient from '../services/apiClient'

interface DeletedItem {
  id: number | string
  itemType: 'project' | 'task' | 'subtask' | 'bug'
  deletedAt: string
  deletedBy: string
  // Project fields
  projectId?: string
  projectName?: string
  // Task fields
  taskId?: string
  description?: string
  assignedTo?: string
  status?: string
  priority?: string
  // Subtask fields
  parentTaskId?: string
  // Bug fields
  bugId?: string
  title?: string
  severity?: string
}

interface Counts {
  total: number
  projects: number
  tasks: number
  subtasks: number
  bugs: number
}

export default function DeletedItemsScreen() {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const navigation = useNavigation()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([])
  const [counts, setCounts] = useState<Counts>({
    total: 0,
    projects: 0,
    tasks: 0,
    subtasks: 0,
    bugs: 0
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filterType, setFilterType] = useState<'all' | 'project' | 'task' | 'subtask' | 'bug'>('all')
  const [isRestoring, setIsRestoring] = useState<string | number | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | number | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const user = await getUserData()
      if (user) {
        setCurrentUser(user)
      }

      const res = await apiClient.get('/api/deleted-items')
      if (res && res.success) {
        setDeletedItems(res.data || [])
        setCounts((res as any).count || {
          total: 0,
          projects: 0,
          tags: 0,
          tasks: 0,
          subtasks: 0,
          bugs: 0
        } as any)
      } else {
        setError(res?.error || 'Failed to load deleted items')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred loading soft-deleted items')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  const handleRestore = (item: DeletedItem) => {
    Alert.alert(
      'Restore Item',
      `Are you sure you want to restore this ${item.itemType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              setIsRestoring(item.id)
              const res = await apiClient.post('/api/deleted-items/restore', {
                itemType: item.itemType,
                id: item.id
              })
              if (res && res.success) {
                Alert.alert('Success', `${item.itemType} restored successfully!`)
                loadData()
              } else {
                Alert.alert('Error', res?.error || 'Failed to restore item')
              }
            } catch (err) {
              console.error(err)
              Alert.alert('Error', 'An error occurred while restoring the item')
            } finally {
              setIsRestoring(null)
            }
          }
        }
      ]
    )
  }

  const handlePermanentDelete = (item: DeletedItem) => {
    Alert.alert(
      '⚠️ PERMANENT DELETE',
      `Are you sure you want to PERMANENTLY delete this ${item.itemType}?\n\nThis action CANNOT be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(item.id)
              const res = await apiClient.apiRequest('/api/deleted-items/permanent-delete', {
                method: 'DELETE',
                body: JSON.stringify({
                  itemType: item.itemType,
                  id: item.id
                })
              })
              if (res && res.success) {
                Alert.alert('Success', `${item.itemType} deleted permanently.`)
                loadData()
              } else {
                Alert.alert('Error', res?.error || 'Failed to delete item')
              }
            } catch (err) {
              console.error(err)
              Alert.alert('Error', 'An error occurred while permanently deleting the item')
            } finally {
              setIsDeleting(null)
            }
          }
        }
      ]
    )
  }

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return deletedItems
    return deletedItems.filter(item => item.itemType === filterType)
  }, [deletedItems, filterType])

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'project':
        return 'folder-open'
      case 'task':
        return 'checkbox-marked-circle-outline'
      case 'subtask':
        return 'format-list-bulleted'
      case 'bug':
        return 'bug-outline'
      default:
        return 'file-outline'
    }
  }

  const getItemTitle = (item: DeletedItem) => {
    switch (item.itemType) {
      case 'project':
        return `${item.projectId} - ${item.projectName}`
      case 'task':
        return `${item.taskId} - ${item.description}`
      case 'subtask':
        return `Subtask for ${item.parentTaskId}: ${item.description}`
      case 'bug':
        return `${item.bugId} - ${item.title}`
      default:
        return 'Deleted Item'
    }
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Chip selected={filterType === 'all'} onPress={() => setFilterType('all')} style={styles.chip}>
            All ({counts.total})
          </Chip>
          <Chip selected={filterType === 'project'} onPress={() => setFilterType('project')} style={styles.chip}>
            Projects ({counts.projects})
          </Chip>
          <Chip selected={filterType === 'task'} onPress={() => setFilterType('task')} style={styles.chip}>
            Tasks ({counts.tasks})
          </Chip>
          <Chip selected={filterType === 'subtask'} onPress={() => setFilterType('subtask')} style={styles.chip}>
            Subtasks ({counts.subtasks})
          </Chip>
          <Chip selected={filterType === 'bug'} onPress={() => setFilterType('bug')} style={styles.chip}>
            Bugs ({counts.bugs})
          </Chip>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <IconButton icon="alert-circle-outline" size={48} iconColor={materialColors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={loadData} style={{ marginTop: 12 }}>
              Retry
            </Button>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="trash-can-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No deleted items found</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredItems.map(item => (
              <Card key={`${item.itemType}-${item.id}`} style={styles.card}>
                <Card.Content>
                  <View style={styles.itemHeader}>
                    <MaterialCommunityIcons name={getItemIcon(item.itemType) as any} size={22} color={colors.primary} />
                    <Chip compact style={styles.typeChip}>
                      {item.itemType}
                    </Chip>
                  </View>
                  
                  <Text style={styles.itemTitle}>{getItemTitle(item)}</Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>Deleted: {new Date(item.deletedAt).toLocaleDateString()}</Text>
                    <Text style={styles.metaText}>By: {item.deletedBy}</Text>
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.actions}>
                    <Button
                      mode="contained"
                      icon="restore"
                      onPress={() => handleRestore(item)}
                      loading={isRestoring === item.id}
                      disabled={isRestoring === item.id || isDeleting === item.id}
                      style={[styles.actionBtn, { backgroundColor: materialColors.success }]}
                      labelStyle={{ color: '#fff', fontSize: 12 }}
                      compact
                    >
                      Restore
                    </Button>
                    <Button
                      mode="outlined"
                      icon="trash-can"
                      textColor={materialColors.error}
                      onPress={() => handlePermanentDelete(item)}
                      loading={isDeleting === item.id}
                      disabled={isRestoring === item.id || isDeleting === item.id}
                      style={[styles.actionBtn, { borderColor: materialColors.error }]}
                      labelStyle={{ fontSize: 12 }}
                      compact
                    >
                      Delete
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingVertical: materialSpacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: materialSpacing.md,
    gap: 8,
  },
  chip: {
    height: 32,
  },
  scrollView: {
    flex: 1,
  },
  loader: {
    marginTop: 40,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...materialTypography.bodyMedium,
    color: materialColors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: colors.textSecondary,
    marginTop: 12,
  },
  listContainer: {
    padding: materialSpacing.md,
    gap: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeChip: {
    height: 20,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    ...materialTypography.bodyLarge,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  divider: {
    marginVertical: materialSpacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionBtn: {
    borderRadius: 8,
  },
})
