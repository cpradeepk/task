import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { Card, Text, Button, ActivityIndicator, IconButton, Portal, Dialog, TextInput, Divider, Chip } from 'react-native-paper'
import { useQuery, useMutation } from '@apollo/client/react'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getUserData } from '../utils/secureStorage'
import { materialSpacing, materialTypography, materialColors } from '../config/materialTheme'
import { useResponsive } from '../hooks/useResponsive'
import { GET_FEED_TOPICS, CREATE_FEED_TOPIC } from '../config/graphql-queries'
import apiClient from '../services/apiClient'

interface Topic {
  id: string
  topicName: string
  description: string | null
  icon: string | null
  displayOrder: number
  isPersonal: boolean
  createdBy: string
  createdAt: string
  postCount?: number
}

export default function FeedTopicsScreen() {
  const { colors } = useTheme()
  const responsive = useResponsive()
  const navigation = useNavigation()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Form Fields
  const [topicName, setTopicName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [displayOrder, setDisplayOrder] = useState('')

  useEffect(() => {
    getUserData().then(setCurrentUser)
  }, [])

  const { data, loading, refetch, error } = useQuery(GET_FEED_TOPICS, {
    variables: { includePersonal: false },
    fetchPolicy: 'cache-and-network'
  })

  const [createFeedTopic, { loading: creating }] = useMutation(CREATE_FEED_TOPIC)

  const topics = useMemo(() => {
    const rawData = data as any
    if (!rawData || !Array.isArray(rawData.feedTopics)) return []
    // Filter out personal notes/saved posts just like web
    return rawData.feedTopics.filter((t: Topic) => 
      !t.isPersonal &&
      t.topicName !== 'Personal Notes' &&
      t.topicName !== 'Saved Posts'
    ).sort((a: Topic, b: Topic) => a.displayOrder - b.displayOrder)
  }, [data])

  const handleCreate = async () => {
    if (!topicName.trim()) {
      Alert.alert('Validation Error', 'Topic Name is required')
      return
    }

    try {
      await createFeedTopic({
        variables: {
          input: {
            topicName: topicName.trim(),
            description: description.trim() || null,
            icon: icon.trim() || null,
            displayOrder: parseInt(displayOrder) || topics.length + 1
          }
        }
      })

      Alert.alert('Success', 'Topic created successfully')
      setIsCreateOpen(false)
      setTopicName('')
      setDescription('')
      setIcon('')
      setDisplayOrder('')
      refetch()
    } catch (err: any) {
      console.error(err)
      if (err?.message?.includes('unique') || err?.message?.includes('duplicate')) {
        Alert.alert('Error', `A topic with the name "${topicName}" already exists.`)
      } else {
        Alert.alert('Error', err?.message || 'Failed to create topic')
      }
    }
  }

  const handleDelete = (topicId: string, name: string) => {
    Alert.alert(
      'Delete Topic',
      `Are you sure you want to delete the topic "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(topicId)
              const res = await apiClient.del(`/api/feed/topics/${topicId}`)
              if (res && res.success) {
                Alert.alert('Success', 'Topic deleted successfully')
                refetch()
              } else {
                Alert.alert('Error', res?.error || 'Failed to delete topic')
              }
            } catch (err) {
              console.error(err)
              Alert.alert('Error', 'An error occurred while deleting the topic')
            } finally {
              setIsDeleting(null)
            }
          }
        }
      ]
    )
  }

  const canManage = useMemo(() => {
    if (!currentUser) return false
    const role = currentUser.role?.toLowerCase()
    return role === 'admin' || role === 'top_management'
  }, [currentUser])

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} colors={[colors.primary]} />}
      >
        {loading && topics.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <IconButton icon="alert-circle-outline" size={48} iconColor={materialColors.error} />
            <Text style={styles.errorText}>Failed to load topics</Text>
            <Button mode="contained" onPress={() => refetch()} style={{ marginTop: 12 }}>
              Retry
            </Button>
          </View>
        ) : topics.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="format-list-bulleted" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No feed topics found</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {topics.map((topic: Topic) => (
              <Card key={topic.id} style={styles.topicCard}>
                <Card.Content style={styles.cardContent}>
                  <Text style={styles.topicIcon}>{topic.icon || '📁'}</Text>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicName}>{topic.topicName}</Text>
                    {topic.description ? (
                      <Text style={styles.topicDesc}>{topic.description}</Text>
                    ) : null}
                    <Text style={styles.topicMeta}>Order: {topic.displayOrder} • Posts: {topic.postCount || 0}</Text>
                  </View>
                  {canManage ? (
                    <IconButton
                      icon="trash-can-outline"
                      iconColor={materialColors.error}
                      size={22}
                      onPress={() => handleDelete(topic.id, topic.topicName)}
                      disabled={isDeleting === topic.id}
                    />
                  ) : null}
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {canManage ? (
        <TouchableOpacity style={styles.fab} onPress={() => setIsCreateOpen(true)}>
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      ) : null}

      <Portal>
        {/* Create Topic Modal */}
        <Dialog visible={isCreateOpen} onDismiss={() => setIsCreateOpen(false)}>
          <Dialog.Title>Create New Feed Topic</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Topic Name *"
              value={topicName}
              onChangeText={setTopicName}
              mode="outlined"
              style={styles.modalInput}
            />
            <TextInput
              label="Icon (Emoji, e.g. 💻, 🎨)"
              value={icon}
              onChangeText={setIcon}
              mode="outlined"
              style={styles.modalInput}
            />
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />
            <TextInput
              label="Display Order"
              value={displayOrder}
              onChangeText={setDisplayOrder}
              mode="outlined"
              keyboardType="numeric"
              style={styles.modalInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleCreate} loading={creating} disabled={creating}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: '#999',
    marginTop: 12,
  },
  listContainer: {
    padding: materialSpacing.md,
    gap: 8,
  },
  topicCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: materialSpacing.sm,
  },
  topicIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  topicInfo: {
    flex: 1,
    gap: 2,
  },
  topicName: {
    ...materialTypography.titleMedium,
    fontWeight: 'bold',
    color: colors.text,
  },
  topicDesc: {
    ...materialTypography.bodySmall,
    color: colors.textSecondary,
  },
  topicMeta: {
    fontSize: 10,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
})
