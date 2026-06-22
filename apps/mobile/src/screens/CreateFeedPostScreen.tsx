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

import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { TextInput, Button, Surface } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useQuery, useMutation } from '@apollo/client/react'
import * as DocumentPicker from 'expo-document-picker'
import { GET_FEED_TOPICS, CREATE_FEED_POST, GET_FEED_POSTS } from '../config/graphql-queries'
import { getUserData, getUserToken } from '../utils/secureStorage'
import { API_BASE_URL } from '../config/api'
import { useTheme } from '../contexts/ThemeContext'
import { useResponsive } from '../hooks/useResponsive'
import { materialSpacing, materialTypography } from '../config/materialTheme'

export default function CreateFeedPostScreen({ route }: any) {
  const navigation = useNavigation()
  const { topicId: initialTopicId } = route.params || {}
  const { colors } = useTheme()
  const responsive = useResponsive()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId || '')
  const [contentType, setContentType] = useState<string>('text')
  const [linkUrl, setLinkUrl] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [attachedFile, setAttachedFile] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)

  // GraphQL queries and mutations
  const { data: topicsData, loading: topicsLoading } = useQuery(GET_FEED_TOPICS, {
    variables: { includePersonal: true },
    fetchPolicy: 'cache-and-network',
  })

  const [createPost, { loading: creating }] = useMutation(CREATE_FEED_POST)

  const topics = (topicsData as any)?.feedTopics || []

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

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: contentType === 'image' ? 'image/*' : contentType === 'video' ? 'video/*' : contentType === 'pdf' ? 'application/pdf' : '*/*',
        copyToCacheDirectory: true,
      })

      if (result.assets && result.assets.length > 0) {
        setAttachedFile(result.assets[0])
      }
    } catch (err) {
      console.warn('File pick cancelled or failed:', err)
    }
  }

  useEffect(() => {
    // Reset attached file when changing content type
    setAttachedFile(null)
  }, [contentType])

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

    if (['pdf', 'image', 'video'].includes(contentType) && !attachedFile) {
      Alert.alert('Error', 'Please attach a file for this content type')
      return
    }

    try {
      let mediaUrls: string[] = []

      if (attachedFile) {
        setIsUploading(true)
        const token = await getUserToken()
        const uploadUrl = `${API_BASE_URL}/api/upload`
        const formData = new FormData()
        formData.append('files', {
          uri: attachedFile.uri,
          name: attachedFile.name || 'file',
          type: attachedFile.mimeType || 'application/octet-stream'
        } as any)

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const uploadData = await uploadRes.json()
        if (uploadData.success && uploadData.files && uploadData.files.length > 0) {
          mediaUrls = uploadData.files
        } else {
          throw new Error(uploadData.error || 'Failed to upload file')
        }
      }

      await createPost({
        variables: {
          input: {
            contentType,
            content: content.trim(),
            linkUrl: (contentType === 'link' || contentType === 'youtube') ? linkUrl.trim() : null,
            linkTitle: title.trim() || null,
            mediaUrls: mediaUrls.length > 0 ? mediaUrls : null,
            topicIds: [selectedTopicId],
          }
        },
        refetchQueries: [
          { query: GET_FEED_POSTS, variables: { topicId: null, status: 'published', limit: 20, offset: 0 } },
          { query: GET_FEED_POSTS, variables: { topicId: selectedTopicId, status: 'published', limit: 20, offset: 0 } }
        ]
      })

      Alert.alert('Success', 'Post created successfully')
      navigation.goBack()
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post')
    } finally {
      setIsUploading(false)
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
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Title (Optional)</Text>
          <TextInput
            mode="outlined"
            placeholder="Enter post title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
          />
        </View>

        {/* Topic Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Topic *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.topicScroll}
            contentContainerStyle={{ gap: 8 }}
          >
            {topics.map((topic: any) => (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicButton,
                  selectedTopicId === topic.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                  selectedTopicId !== topic.id && { backgroundColor: colors.surfaceVariant, borderColor: colors.border }
                ]}
                onPress={() => setSelectedTopicId(topic.id)}
              >
                <Text
                  style={[
                    styles.topicButtonText,
                    { color: selectedTopicId === topic.id ? '#FFFFFF' : colors.text }
                  ]}
                >
                  {topic.icon} {topic.topicName}
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
            contentContainerStyle={{ gap: 8 }}
          >
            {contentTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  contentType === type.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                  contentType !== type.value && { backgroundColor: colors.surfaceVariant, borderColor: colors.border }
                ]}
                onPress={() => setContentType(type.value)}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: contentType === type.value ? '#FFFFFF' : colors.text }
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
            mode="outlined"
            placeholder="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            style={styles.contentInput}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
          />
        </View>

        {/* Link URL (if content type is link or youtube) */}
        {(contentType === 'link' || contentType === 'youtube') && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {contentType === 'youtube' ? 'YouTube URL *' : 'Link URL *'}
            </Text>
            <TextInput
              mode="outlined"
              placeholder={
                contentType === 'youtube'
                  ? 'https://www.youtube.com/watch?v=...'
                  : 'https://example.com'
              }
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              keyboardType="url"
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
            />
          </View>
        )}

        {/* File Picker for PDF, Image, Video */}
        {['pdf', 'image', 'video'].includes(contentType) && (
          <View style={styles.section}>
            <Text style={styles.label}>Attachment *</Text>
            <TouchableOpacity style={[styles.fileButton, { borderColor: colors.border }]} onPress={handleFilePick}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                {attachedFile ? 'Change File' : `Select ${contentType.toUpperCase()}`}
              </Text>
            </TouchableOpacity>
            {attachedFile && (
              <Text style={[styles.fileName, { color: colors.textSecondary }]}>
                Attached: {attachedFile.name}
              </Text>
            )}
          </View>
        )}

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, (creating || isUploading) && styles.createButtonDisabled, { backgroundColor: colors.primary }]}
          onPress={handleCreatePost}
          disabled={creating || isUploading}
        >
          {(creating || isUploading) ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: materialSpacing.md,
    maxWidth: responsive.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    marginBottom: materialSpacing.lg,
  },
  label: {
    ...materialTypography.labelLarge,
    color: colors.text,
    marginBottom: materialSpacing.xs,
  },
  topicScroll: {
    flexGrow: 0,
  },
  topicButton: {
    paddingHorizontal: materialSpacing.md,
    paddingVertical: materialSpacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  topicButtonText: {
    ...materialTypography.bodyMedium,
    fontWeight: '600',
  },
  typeScroll: {
    flexGrow: 0,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: materialSpacing.md,
    paddingVertical: materialSpacing.sm,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  typeButtonText: {
    ...materialTypography.bodyMedium,
    fontWeight: '600',
  },
  contentInput: {
    backgroundColor: colors.surface,
    minHeight: 120,
  },
  input: {
    backgroundColor: colors.surface,
  },
  createButton: {
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
  fileButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    marginTop: 4,
  },
})
