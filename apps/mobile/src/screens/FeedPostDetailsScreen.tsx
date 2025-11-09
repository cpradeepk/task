/**
 * Feed Post Details Screen
 * Displays full post with comments and reactions
 * 
 * Features:
 * - Full post content
 * - Reactions (like, love, celebrate, etc.)
 * - Threaded comments (max 2 levels)
 * - Add comment
 * - Share post
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useQuery, useMutation } from '@apollo/client'
import {
  GET_FEED_POST,
  CREATE_FEED_COMMENT,
  TOGGLE_FEED_REACTION,
} from '../config/graphql-queries'
import { getUserData } from '../utils/secureStorage'

export default function FeedPostDetailsScreen({ route }: any) {
  const { postId } = route.params
  const [commentText, setCommentText] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)

  // GraphQL queries and mutations
  const { data, loading, refetch } = useQuery(GET_FEED_POST, {
    variables: { postId },
    fetchPolicy: 'cache-and-network',
  })

  const [createComment, { loading: commentLoading }] = useMutation(CREATE_FEED_COMMENT)
  const [toggleReaction] = useMutation(TOGGLE_FEED_REACTION)

  const post = data?.feedPost

  React.useEffect(() => {
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

  const handleAddComment = async () => {
    if (!commentText.trim()) return

    try {
      await createComment({
        variables: {
          postId,
          content: commentText,
          createdBy: currentUser?.employeeId,
        },
      })
      setCommentText('')
      refetch()
      Alert.alert('Success', 'Comment added')
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment')
    }
  }

  const handleReaction = async (reactionType: string) => {
    try {
      await toggleReaction({
        variables: {
          postId,
          reactionType,
          userId: currentUser?.employeeId,
        },
      })
      refetch()
    } catch (error) {
      Alert.alert('Error', 'Failed to add reaction')
    }
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    )
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Post Content */}
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {post.createdBy?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.authorName}>{post.createdBy}</Text>
              <Text style={styles.postDate}>
                {new Date(post.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {/* Reactions */}
          <View style={styles.reactionsContainer}>
            <Text style={styles.sectionTitle}>Reactions</Text>
            <View style={styles.reactionButtons}>
              {['❤️', '👍', '🎉', '😊', '🔥'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionButton}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.reactionCount}>
              {post.reactionCount || 0} reactions
            </Text>
          </View>

          {/* Comments */}
          <View style={styles.commentsContainer}>
            <Text style={styles.sectionTitle}>
              Comments ({post.commentCount || 0})
            </Text>
            {post.comments?.map((comment: any) => (
              <View key={comment.id} style={styles.commentCard}>
                <Text style={styles.commentAuthor}>{comment.createdBy}</Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
                <Text style={styles.commentDate}>
                  {new Date(comment.createdAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add Comment */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity
          style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
          onPress={handleAddComment}
          disabled={!commentText.trim() || commentLoading}
        >
          {commentLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  postDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  postContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 20,
  },
  reactionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  reactionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  reactionCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  commentsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  commentCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  commentContent: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
})

