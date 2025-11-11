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
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery } from '@apollo/client'
import { GET_FEED_POSTS, GET_FEED_TOPICS } from '../config/graphql-queries'
import { FeedPost, FeedTopic } from '../types'
import { getUserData } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'

export default function FeedScreen() {
  const navigation = useNavigation()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])
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
  const posts = postsData?.feedPosts || []

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

  const handlePostPress = useCallback((post: FeedPost) => {
    navigation.navigate('FeedPostDetails' as never, { postId: post.id } as never)
  }, [navigation])

  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreateFeedPost' as never, { topicId: selectedTopicId } as never)
  }, [navigation, selectedTopicId])

  const renderTopic = ({ item }: { item: FeedTopic }) => (
    <TouchableOpacity
      style={[
        styles.topicButton,
        selectedTopicId === item.id && styles.topicButtonActive,
      ]}
      onPress={() => handleTopicPress(item.id)}
    >
      <Text
        style={[
          styles.topicButtonText,
          selectedTopicId === item.id && styles.topicButtonTextActive,
        ]}
      >
        {item.name}
      </Text>
      {item.postCount > 0 && (
        <View style={styles.topicBadge}>
          <Text style={styles.topicBadgeText}>{item.postCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderPost = ({ item }: { item: FeedPost }) => (
    <TouchableOpacity style={styles.postCard} onPress={() => handlePostPress(item)}>
      <View style={styles.postHeader}>
        <View style={styles.postAuthor}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.createdBy?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.authorName}>{item.createdBy}</Text>
            <Text style={styles.postDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.postContent} numberOfLines={4}>
        {item.content}
      </Text>

      {item.contentType !== 'text' && (
        <View style={styles.contentTypeBadge}>
          <Text style={styles.contentTypeText}>
            {item.contentType === 'link' && '🔗 Link'}
            {item.contentType === 'pdf' && '📄 PDF'}
            {item.contentType === 'youtube' && '▶️ Video'}
            {item.contentType === 'image' && '🖼️ Image'}
            {item.contentType === 'video' && '🎥 Video'}
          </Text>
        </View>
      )}

      <View style={styles.postFooter}>
        <View style={styles.postStats}>
          <Text style={styles.statText}>❤️ {item.reactionCount || 0}</Text>
          <Text style={styles.statText}>💬 {item.commentCount || 0}</Text>
          <Text style={styles.statText}>👁️ {item.viewCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  if (topicsLoading && !topicsData) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Topic Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.topicContainer}
        contentContainerStyle={styles.topicContentContainer}
      >
        <TouchableOpacity
          style={[
            styles.topicButton,
            selectedTopicId === null && styles.topicButtonActive,
          ]}
          onPress={() => handleTopicPress(null)}
        >
          <Text
            style={[
              styles.topicButtonText,
              selectedTopicId === null && styles.topicButtonTextActive,
            ]}
          >
            All Posts
          </Text>
        </TouchableOpacity>
        {topics.map((topic: FeedTopic) => (
          <View key={topic.id}>{renderTopic({ item: topic })}</View>
        ))}
      </ScrollView>

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
            tintColor={colors.primary}
            colors={[colors.primary]}
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
      <TouchableOpacity style={styles.fab} onPress={handleCreatePost}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: responsive.spacing.sm,
    fontSize: responsive.fontSize.md,
    color: colors.textSecondary,
  },
  topicContainer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topicContentContainer: {
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.sm,
    alignItems: 'center',
  },
  topicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.md,
    paddingVertical: responsive.spacing.xs,
    marginRight: responsive.spacing.xs,
    borderRadius: responsive.borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
  },
  topicButtonActive: {
    backgroundColor: colors.primary,
  },
  topicButtonText: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  topicButtonTextActive: {
    color: colors.card,
    fontWeight: '600',
  },
  topicBadge: {
    marginLeft: responsive.spacing.xxs,
    backgroundColor: colors.card,
    borderRadius: responsive.borderRadius.md,
    paddingHorizontal: responsive.spacing.xxs,
    paddingVertical: 2,
  },
  topicBadgeText: {
    fontSize: responsive.fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: responsive.spacing.md,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: responsive.borderRadius.lg,
    padding: responsive.spacing.md,
    marginBottom: responsive.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    marginBottom: responsive.spacing.sm,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsive.spacing.sm,
  },
  avatarText: {
    fontSize: responsive.fontSize.lg,
    color: colors.card,
    fontWeight: '600',
  },
  authorName: {
    fontSize: responsive.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  postDate: {
    fontSize: responsive.fontSize.xs,
    color: colors.textSecondary,
  },
  postContent: {
    fontSize: responsive.fontSize.md,
    color: colors.text,
    lineHeight: 22,
    marginBottom: responsive.spacing.sm,
  },
  contentTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: responsive.spacing.sm,
    paddingVertical: responsive.spacing.xxs,
    borderRadius: responsive.borderRadius.lg,
    marginBottom: responsive.spacing.sm,
  },
  contentTypeText: {
    fontSize: responsive.fontSize.xs,
    color: colors.textSecondary,
  },
  postFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.backgroundSecondary,
    paddingTop: responsive.spacing.sm,
  },
  postStats: {
    flexDirection: 'row',
    gap: responsive.spacing.md,
  },
  statText: {
    fontSize: responsive.fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: responsive.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: responsive.fontSize.md,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: responsive.spacing.lg,
    bottom: responsive.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: colors.card,
    fontWeight: '300',
  },
})

