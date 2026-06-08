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

import React, { useState, useMemo } from 'react'
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
import { useQuery, useMutation } from '@apollo/client/react'
import { IconButton } from 'react-native-paper'
import {
  GET_FEED_POST,
  CREATE_FEED_COMMENT,
  TOGGLE_FEED_REACTION,
  TOGGLE_FEED_SAVE,
} from '../config/graphql-queries'
import { getUserData } from '../utils/secureStorage'
import { formatDateTimeIST } from '../utils/datetime'
import { useTheme } from '../contexts/ThemeContext'

export default function FeedPostDetailsScreen({ route }: any) {
  const { colors } = useTheme()
  const styles = useMemo(() => getStyles(colors), [colors])
  const { postId } = route.params
  const [commentText, setCommentText] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)

  // GraphQL queries and mutations
  const { data, loading, refetch } = useQuery(GET_FEED_POST, {
    variables: { postId },
    fetchPolicy: 'cache-and-network',
  })

  const [createComment, { loading: commentLoading }] = useMutation<any, any>(CREATE_FEED_COMMENT)
  const [toggleReaction] = useMutation<any, any>(TOGGLE_FEED_REACTION)
  const [toggleSave] = useMutation<any, any>(TOGGLE_FEED_SAVE)

  const post = (data as any)?.feedPost

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
        },
      })
      setCommentText('')
      refetch()
      Alert.alert('Success', 'Comment added')
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment')
    }
  }

  const handleReaction = async (emoji: string) => {
    try {
      await toggleReaction({
        variables: {
          postId,
          emoji,
        },
      })
      refetch()
    } catch (error) {
      Alert.alert('Error', 'Failed to add reaction')
    }
  }

  const handleSave = async () => {
    try {
      await toggleSave({
        variables: { postId },
        optimisticResponse: {
          toggleFeedSave: {
            action: post.isSaved ? 'unsaved' : 'saved',
            message: post.isSaved ? 'Post removed from saved' : 'Post saved',
            __typename: 'FeedSaveResponse'
          }
        },
        update: (cache, { data: { toggleFeedSave } }) => {
          const isSaved = toggleFeedSave.action === 'saved'
          cache.modify({
            id: cache.identify({ __typename: 'FeedPost', postId }),
            fields: {
              isSaved: () => isSaved
            }
          })
        }
      })
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle save')
    }
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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
                {post.author?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{post.author?.name || 'Unknown'}</Text>
              <Text style={styles.postDate}>
                {formatDateTimeIST(post.createdAt)}
              </Text>
            </View>
            <IconButton
              icon={post.isSaved ? 'bookmark' : 'bookmark-outline'}
              selected={post.isSaved}
              onPress={handleSave}
              size={24}
              iconColor={post.isSaved ? colors.primary : colors.textSecondary}
            />
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
              {post.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0} reactions
            </Text>
          </View>

          {/* Comments */}
          <View style={styles.commentsContainer}>
            <Text style={styles.sectionTitle}>
              Comments ({post.commentCount || 0})
            </Text>
            {post.comments?.map((comment: any) => (
              <View key={comment.commentId} style={styles.commentCard}>
                <Text style={styles.commentAuthor}>{comment.author?.name || 'Unknown'}</Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
                <Text style={styles.commentDate}>
                  {formatDateTimeIST(comment.createdAt)}
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
          placeholderTextColor={colors.textTertiary}
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

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
  },
  scrollView: {
    flex: 1,
  },
  postCard: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primary,
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
    color: colors.text,
  },
  postDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  postContent: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  reactionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  reactionCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  commentsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  commentCard: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  commentContent: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
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
