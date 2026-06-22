import React, { useState, useMemo } from 'react'
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Linking,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useMutation } from '@apollo/client/react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'

import { GET_FEED_POSTS, GET_FEED_TOPICS, INIT_PERSONAL_TOPICS } from '../config/graphql-queries'
import AppHeader from '../components/AppHeader'
import { materialColors } from '../config/materialTheme'
import { useTabBarControl } from '../context/TabBarContext'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'

export default function FeedScreen({ navigation }: any) {
    const { colors } = useTheme()
    const styles = useMemo(() => getStyles(colors), [colors])
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
    const { handleScroll } = useTabBarControl()
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: handleScroll
    })
    const insets = useSafeAreaInsets()
    const fabBottom = 60 + Math.max(insets.bottom, 10) + 16

    const [initPersonalTopics] = useMutation(INIT_PERSONAL_TOPICS)

    // Initialize personal topics on mount so Personal Notes show up
    React.useEffect(() => {
        initPersonalTopics()
            .then(() => {
                console.log('[FeedScreen] Personal topics initialized successfully')
            })
            .catch(err => {
                console.error('[FeedScreen] Failed to initialize personal topics:', err)
            })
    }, [])

    const { data: topicsData, loading: topicsLoading } = useQuery(GET_FEED_TOPICS, {
        variables: { includePersonal: true },
        fetchPolicy: 'cache-and-network',
    })

    const { data, loading, refetch } = useQuery(GET_FEED_POSTS, {
        variables: {
            topicId: selectedTopicId,
            status: 'published',
            limit: 20,
            offset: 0
        },
        fetchPolicy: 'cache-first',
    })

    const topics = (topicsData as any)?.feedTopics || []
    const posts = (data as any)?.feedPosts?.posts || []

    const handlePostPress = (postId: string) => {
        navigation.navigate('FeedPostDetails', { postId })
    }

    const handleCreatePost = () => {
        navigation.navigate('CreateFeedPost')
    }

    const handleTopicPress = (topicId: string | null) => {
        setSelectedTopicId(topicId)
    }

    if (loading && !data) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Feed" />
            {/* Topics Filter - Horizontal Scroll */}
            {!topicsLoading && topics.length > 0 && (
                <View style={styles.topicsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.topicsScroll}
                        contentContainerStyle={styles.topicsContent}
                    >
                        {/* All Topics Button */}
                        <TouchableOpacity
                            style={[
                                styles.topicChip,
                                { backgroundColor: selectedTopicId === null ? colors.primary : colors.surfaceVariant }
                            ]}
                            onPress={() => handleTopicPress(null)}
                        >
                            <Text style={[
                                styles.topicText,
                                { color: selectedTopicId === null ? '#FFFFFF' : colors.text }
                            ]}>
                                All Topics
                            </Text>
                        </TouchableOpacity>

                        {/* Topic Chips */}
                        {topics.map((topic: any) => (
                            <TouchableOpacity
                                key={topic.id}
                                style={[
                                    styles.topicChip,
                                    { backgroundColor: selectedTopicId === topic.id ? colors.primary : colors.surfaceVariant, flexDirection: 'row', alignItems: 'center', gap: 6 }
                                ]}
                                onPress={() => handleTopicPress(topic.id)}
                            >
                                {topic.icon && (
                                    <Text style={{ fontSize: 16 }}>{topic.icon}</Text>
                                )}
                                <Text style={[
                                    styles.topicText,
                                    { color: selectedTopicId === topic.id ? '#FFFFFF' : colors.text }
                                ]}>
                                    {topic.topicName}
                                </Text>
                                {topic.postCount > 0 && (
                                    <View style={{
                                        backgroundColor: selectedTopicId === topic.id ? 'rgba(255,255,255,0.3)' : colors.border,
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 10,
                                    }}>
                                        <Text style={{
                                            fontSize: 11,
                                            fontWeight: '600',
                                            color: selectedTopicId === topic.id ? '#FFFFFF' : colors.textSecondary,
                                        }}>
                                            {topic.postCount}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Posts List */}
            <Animated.ScrollView
                style={styles.postsList}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {posts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            No posts yet. Be the first to share something!
                        </Text>
                    </View>
                ) : (
                    posts.map((post: any) => (
                        <TouchableOpacity
                            key={post.postId}
                            style={styles.postCard}
                            onPress={() => handlePostPress(post.postId)}
                        >
                            {/* Post Header */}
                            <View style={styles.postHeader}>
                                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.avatarText}>
                                        {post.author?.name?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.authorName}>
                                        {post.author?.name || 'Unknown'}
                                    </Text>
                                    <Text style={styles.timestamp}>
                                        {new Date(post.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            {/* Post Topics */}
                            {post.topics && post.topics.length > 0 && (
                                <View style={styles.postTopics}>
                                    {post.topics.map((topic: any) => (
                                        <View
                                            key={topic.id}
                                            style={styles.postTopicChip}
                                        >
                                            {topic.icon && (
                                                <Text style={{ fontSize: 12 }}>{topic.icon}</Text>
                                            )}
                                            <Text style={styles.postTopicText}>
                                                {topic.topicName}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Post Title */}
                            {post.contentType !== 'link' && post.linkTitle && (
                                <Text style={styles.postTitle} numberOfLines={1}>
                                    {post.linkTitle}
                                </Text>
                            )}

                            {/* Post Content */}
                            <Text style={styles.postContent} numberOfLines={3}>
                                {post.content}
                            </Text>

                            {/* Link/Media Rendering */}
                            {(post.contentType === 'link' || post.contentType === 'youtube') && post.linkUrl && (
                                <TouchableOpacity onPress={() => Linking.openURL(post.linkUrl)} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <MaterialCommunityIcons name={post.contentType === 'youtube' ? 'youtube' : 'link'} size={20} color={colors.primary} />
                                    <Text style={{ color: colors.primary, textDecorationLine: 'underline' }} numberOfLines={1}>
                                        {post.linkUrl}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            
                            {['pdf', 'image', 'video'].includes(post.contentType) && post.mediaUrls && post.mediaUrls.length > 0 && (
                                <TouchableOpacity onPress={() => Linking.openURL(post.mediaUrls[0])} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <MaterialCommunityIcons name={post.contentType === 'pdf' ? 'file-pdf-box' : post.contentType === 'image' ? 'image' : 'video'} size={20} color={colors.primary} />
                                    <Text style={{ color: colors.primary, textDecorationLine: 'underline' }}>
                                        View Attached {post.contentType.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Post Stats */}
                            <View style={styles.postStats}>
                                <Text style={styles.statText}>
                                    💬 {post.commentCount || 0}
                                </Text>
                                <Text style={styles.statText}>
                                    ❤️ {post.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </Animated.ScrollView>

            {/* Floating Create Button */}
            <TouchableOpacity
                style={[styles.fab, { bottom: fabBottom }]}
                onPress={handleCreatePost}
            >
                <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    )
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    topicsContainer: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    topicsScroll: { paddingVertical: 12, paddingHorizontal: 16 },
    topicsContent: { gap: 8 },
    topicChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    topicText: {
        fontSize: 14,
        fontWeight: '600',
    },
    postsList: { flex: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
    emptyText: { fontSize: 18, color: colors.textSecondary, textAlign: 'center' },
    postCard: {
        backgroundColor: colors.surface,
        marginBottom: 8,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
    authorName: { fontSize: 15, fontWeight: '600', color: colors.text },
    timestamp: { fontSize: 12, color: colors.textSecondary },
    postTopics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    postTopicChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    postTopicText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
    postTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    postContent: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
    postStats: { flexDirection: 'row', marginTop: 12, gap: 16 },
    statText: { fontSize: 13, color: colors.textSecondary },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
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
})
