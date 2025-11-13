/**
 * Feed Screen
 * Main feed view with topic filtering and post list
 * 
 * Features:
 * - Topic sidebar/filter
 * - Post list with reactions, comments
 * - Create post button
 * - Pull-to-refresh
 * - Real-time updates
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { Card, Text, Surface, ActivityIndicator, Chip, FAB } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@apollo/client/react'
import { GET_FEED_POSTS, GET_FEED_TOPICS } from '../config/graphql-queries'
import { FeedPost, FeedTopic } from '../types'
import { getUserData } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function FeedScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
  const { isOffline } = useNetworkStatus()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  // GraphQL queries
  const { data: topicsData, loading: topicsLoading } = useQuery(GET_FEED_TOPICS, {
    fetchPolicy: 'cache-and-network',
  })

  const { data: postsData, loading: postsLoading, refetch } = useQuery(GET_FEED_POSTS, {
    variables: { topicId: selectedTopicId },
    fetchPolicy: 'cache-and-network',
  })

  const topics = topicsData?.feedTopics || []
  const posts = postsData?.feedPosts?.posts || []

  const loadCurrentUser = useCallback(async () => {
    try {
      const userData = await getUserData()
      setCurrentUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }, [])

  useEffect(() => {
    loadCurrentUser()
  }, [loadCurrentUser])

  const handleRefresh = useCallback(async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh feed:', error)
    }
  }, [refetch])

  const handleTopicPress = useCallback((topicId: string | null) => {
    setSelectedTopicId(topicId)
  }, [])

  const handlePostPress = useCallback((post: any) => {
    navigation.navigate('FeedPostDetails' as never, { postId: post.postId } as never)
  }, [navigation])

  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreateFeedPost' as never, { topicId: selectedTopicId } as never)
  }, [navigation, selectedTopicId])

  const renderTopic = ({ item }: { item: any }) => (
    <Chip
      mode={selectedTopicId === item.id ? 'flat' : 'outlined'}
      selected={selectedTopicId === item.id}
      onPress={() => handleTopicPress(item.id)}
      style={styles.topicChip}
      textStyle={styles.topicChipText}
      selectedColor={materialColors.surface}
    >
      {item.topicName} {item.postCount > 0 && `(${item.postCount})`}
    </Chip>
  )

  const renderPost = ({ item }: { item: any }) => {
    const authorName = item.author?.name || 'Unknown'
    const topicNames = item.topics?.map((t: any) => t.topicName).join(', ') || ''

    return (
      <Card style={styles.postCard} elevation={1} onPress={() => handlePostPress(item)}>
        <Card.Content>
          <View style={styles.postHeader}>
            <View style={styles.postAuthor}>
              <Surface style={styles.avatar} elevation={0}>
                <Text style={styles.avatarText}>
                  {authorName.charAt(0).toUpperCase()}
                </Text>
              </Surface>
              <View>
                <Text style={styles.authorName}>{authorName}</Text>
                <Text style={styles.postDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {topicNames && (
            <View style={styles.topicsContainer}>
              {item.topics?.map((topic: any) => (
                <Chip
                  key={topic.id}
                  mode="outlined"
                  compact
                  style={styles.topicTag}
                  textStyle={styles.topicTagText}
                >
                  {topic.topicName}
                </Chip>
              ))}
            </View>
          )}

          <Text style={styles.postContent} numberOfLines={4}>
            {item.content}
          </Text>

          {item.contentType !== 'text' && (
            <Chip
              mode="flat"
              compact
              style={styles.contentTypeChip}
              textStyle={styles.contentTypeText}
            >
              {item.contentType === 'link' && '🔗 Link'}
              {item.contentType === 'pdf' && '📄 PDF'}
              {item.contentType === 'youtube' && '▶️ Video'}
              {item.contentType === 'image' && '🖼️ Image'}
              {item.contentType === 'video' && '🎥 Video'}
            </Chip>
          )}

          <View style={styles.postFooter}>
            <View style={styles.postStats}>
              <Text style={styles.statText}>
                ❤️ {item.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0}
              </Text>
              <Text style={styles.statText}>💬 {item.commentCount || 0}</Text>
              <Text style={styles.statText}>👁️ {item.viewCount || 0}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    )
  }

  if (topicsLoading && !topicsData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={materialColors.primary} />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Topic Filter */}
      <Surface style={styles.topicContainer} elevation={0}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicContentContainer}
        >
          <Chip
            mode={selectedTopicId === null ? 'flat' : 'outlined'}
            selected={selectedTopicId === null}
            onPress={() => handleTopicPress(null)}
            style={styles.topicChip}
            textStyle={styles.topicChipText}
            selectedColor={materialColors.surface}
          >
            All Posts
          </Chip>
          {topics.map((topic: FeedTopic) => (
            <View key={topic.id}>{renderTopic({ item: topic })}</View>
          ))}
        </ScrollView>
      </Surface>

      {/* Post List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={postsLoading}
            onRefresh={handleRefresh}
            tintColor={materialColors.primary}
            colors={[materialColors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {selectedTopicId ? 'No posts in this topic' : 'No posts yet'}
            </Text>
          </View>
        }
      />

      {/* Create Post FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreatePost}
        color={materialColors.surface}
        disabled={isOffline}
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
  topicContainer: {
    backgroundColor: materialColors.surface,
    paddingVertical: materialSpacing.sm,
  },
  topicContentContainer: {
    paddingHorizontal: materialSpacing.md,
    alignItems: 'center',
    gap: materialSpacing.xs,
  },
  topicChip: {
    marginRight: materialSpacing.xs,
    height: 32,
  },
  topicChipText: {
    ...materialTypography.labelMedium,
  },
  listContent: {
    padding: materialSpacing.md,
  },
  postCard: {
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    marginBottom: materialSpacing.md,
  },
  postHeader: {
    marginBottom: materialSpacing.sm,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: materialColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: materialSpacing.sm,
  },
  avatarText: {
    ...materialTypography.titleMedium,
    color: materialColors.surface,
    fontWeight: '600',
  },
  authorName: {
    ...materialTypography.labelLarge,
    color: materialColors.text,
    fontWeight: '600',
  },
  postDate: {
    ...materialTypography.labelSmall,
    color: materialColors.textSecondary,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: materialSpacing.xs,
    marginBottom: materialSpacing.sm,
  },
  topicTag: {
    height: 24,
  },
  topicTagText: {
    ...materialTypography.labelSmall,
  },
  postContent: {
    ...materialTypography.bodyMedium,
    color: materialColors.text,
    lineHeight: 22,
    marginBottom: materialSpacing.sm,
  },
  contentTypeChip: {
    alignSelf: 'flex-start',
    height: 24,
    marginBottom: materialSpacing.sm,
    backgroundColor: materialColors.surfaceVariant,
  },
  contentTypeText: {
    ...materialTypography.labelSmall,
    color: materialColors.textSecondary,
  },
  postFooter: {
    borderTopWidth: 1,
    borderTopColor: materialColors.outline,
    paddingTop: materialSpacing.sm,
  },
  postStats: {
    flexDirection: 'row',
    gap: materialSpacing.md,
  },
  statText: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
  },
  emptyContainer: {
    padding: materialSpacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: materialColors.textTertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: materialSpacing.lg,
    bottom: materialSpacing.lg,
    backgroundColor: materialColors.primary,
  },
})

