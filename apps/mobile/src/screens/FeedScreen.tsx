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

import React, { useState, useEffect } from 'react'
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
import { FeedPost, FeedTopic } from '../../packages/shared/types'
import { getUserData } from '../utils/secureStorage'

export default function FeedScreen() {
  const navigation = useNavigation()
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

  useEffect(() => {
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const userData = await getUserData()
      setCurrentUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const handleRefresh = async () => {
    try {
      await refetch()
    } catch (error) {
      console.error('Failed to refresh feed:', error)
    }
  }

  const handleTopicPress = (topicId: string | null) => {
    setSelectedTopicId(topicId)
  }

  const handlePostPress = (post: FeedPost) => {
    navigation.navigate('FeedPostDetails' as never, { postId: post.id } as never)
  }

  const handleCreatePost = () => {
    navigation.navigate('CreateFeedPost' as never, { topicId: selectedTopicId } as never)
  }

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
        <ActivityIndicator size="large" color="#3B82F6" />
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
          <RefreshControl refreshing={postsLoading} onRefresh={handleRefresh} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  topicContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topicContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  topicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  topicButtonActive: {
    backgroundColor: '#3B82F6',
  },
  topicButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  topicButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topicBadge: {
    marginLeft: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  topicBadgeText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  postHeader: {
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  postDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  postContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  contentTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  contentTypeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  postFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
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
    color: '#FFFFFF',
    fontWeight: '300',
  },
})

