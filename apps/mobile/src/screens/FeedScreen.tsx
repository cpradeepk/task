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

import { useMutation } from '@apollo/client'
import { GET_FEED_POSTS, GET_FEED_TOPICS, TOGGLE_FEED_SAVE } from '../config/graphql-queries'
import { IconButton } from 'react-native-paper'

// ... inside component ...
const [toggleSave] = useMutation(TOGGLE_FEED_SAVE)

const handleSave = useCallback(async (post: any) => {
  try {
    await toggleSave({
      variables: { postId: post.postId },
      optimisticResponse: {
        toggleFeedSave: {
          action: post.isSaved ? 'unsaved' : 'saved',
          message: post.isSaved ? 'Post removed from saved' : 'Post saved',
          __typename: 'FeedSaveResponse'
        }
      },
      update: (cache, { data: { toggleFeedSave } }) => {
        const isSaved = toggleFeedSave.action === 'saved'

        // Update the specific post in the cache
        cache.modify({
          id: cache.identify({ __typename: 'FeedPost', postId: post.postId }),
          fields: {
            isSaved: () => isSaved
          }
        })
      }
    })
  } catch (error) {
    console.error('Failed to toggle save:', error)
  }
}, [toggleSave])

  // ... inside renderPost ...
  < View style = { styles.postFooter } >
            <View style={styles.postStats}>
              <Text style={styles.statText}>
                ❤️ {item.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0}
              </Text>
              <Text style={styles.statText}>💬 {item.commentCount || 0}</Text>
              <Text style={styles.statText}>👁️ {item.viewCount || 0}</Text>
            </View>
            <IconButton
              icon={item.isSaved ? 'bookmark' : 'bookmark-outline'}
              selected={item.isSaved}
              onPress={() => handleSave(item)}
              size={20}
              iconColor={item.isSaved ? materialColors.primary : materialColors.textSecondary}
            />
          </View >


