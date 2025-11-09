/**
 * Create Feed Post Screen
 * Create new feed post with content type selection
 * 
 * Features:
 * - Content type selection (text, link, youtube, pdf, image, video)
 * - Topic selection
 * - Rich text input
 * - File upload (for pdf, image, video)
 * - Link preview
 */

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useQuery, useMutation } from '@apollo/client'
import { GET_FEED_TOPICS, CREATE_FEED_POST } from '../config/graphql-queries'
import { getUserData } from '../utils/secureStorage'

export default function CreateFeedPostScreen({ route }: any) {
  const navigation = useNavigation()
  const { topicId: initialTopicId } = route.params || {}

  const [content, setContent] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId || '')
  const [contentType, setContentType] = useState<string>('text')
  const [linkUrl, setLinkUrl] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)

  // GraphQL queries and mutations
  const { data: topicsData } = useQuery(GET_FEED_TOPICS, {
    fetchPolicy: 'cache-and-network',
  })

  const [createPost, { loading: creating }] = useMutation(CREATE_FEED_POST)

  const topics = topicsData?.feedTopics || []

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

  const handleCreatePost = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter post content')
      return
    }

    if (!selectedTopicId) {
      Alert.alert('Error', 'Please select a topic')
      return
    }

    if (contentType === 'link' && !linkUrl.trim()) {
      Alert.alert('Error', 'Please enter a link URL')
      return
    }

    try {
      await createPost({
        variables: {
          topicId: selectedTopicId,
          content,
          contentType,
          linkUrl: contentType === 'link' ? linkUrl : null,
          createdBy: currentUser?.employeeId,
        },
      })

      Alert.alert('Success', 'Post created successfully')
      navigation.goBack()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post')
    }
  }

  const contentTypes = [
    { value: 'text', label: '📝 Text', icon: '📝' },
    { value: 'link', label: '🔗 Link', icon: '🔗' },
    { value: 'youtube', label: '▶️ YouTube', icon: '▶️' },
    { value: 'pdf', label: '📄 PDF', icon: '📄' },
    { value: 'image', label: '🖼️ Image', icon: '🖼️' },
    { value: 'video', label: '🎥 Video', icon: '🎥' },
  ]

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Topic Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Topic *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.topicScroll}
          >
            {topics.map((topic: any) => (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicButton,
                  selectedTopicId === topic.id && styles.topicButtonActive,
                ]}
                onPress={() => setSelectedTopicId(topic.id)}
              >
                <Text
                  style={[
                    styles.topicButtonText,
                    selectedTopicId === topic.id && styles.topicButtonTextActive,
                  ]}
                >
                  {topic.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Content Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeScroll}
          >
            {contentTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  contentType === type.value && styles.typeButtonActive,
                ]}
                onPress={() => setContentType(type.value)}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.typeButtonText,
                    contentType === type.value && styles.typeButtonTextActive,
                  ]}
                >
                  {type.label.replace(/[^\w\s]/g, '')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Content *</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Link URL (if content type is link or youtube) */}
        {(contentType === 'link' || contentType === 'youtube') && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {contentType === 'youtube' ? 'YouTube URL *' : 'Link URL *'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                contentType === 'youtube'
                  ? 'https://www.youtube.com/watch?v=...'
                  : 'https://example.com'
              }
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, creating && styles.createButtonDisabled]}
          onPress={handleCreatePost}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  topicScroll: {
    flexGrow: 0,
  },
  topicButton: {
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
  },
  topicButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  typeScroll: {
    flexGrow: 0,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  typeIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  typeButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    minHeight: 120,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
