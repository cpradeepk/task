import React, { useState } from 'react'
import {
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native'
import { useQuery } from '@apollo/client/react'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { GET_FEED_POSTS, GET_FEED_TOPICS } from '../config/graphql-queries'
import { materialColors } from '../config/materialTheme'
import { useTabBarControl } from '../context/TabBarContext'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'

export default function FeedScreen({ navigation }: any) {
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
    const { handleScroll } = useTabBarControl()
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: handleScroll
    })

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
        fetchPolicy: 'cache-and-network',
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
                <ActivityIndicator size="large" color={materialColors.primary} />
            </View>
        )
    }

    return (
        <View style={styles.container}>
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
                                { backgroundColor: selectedTopicId === null ? materialColors.primary : '#F3F4F6' }
                            ]}
                            onPress={() => handleTopicPress(null)}
                        >
                            <Text style={[
                                styles.topicText,
                                { color: selectedTopicId === null ? '#FFFFFF' : '#374151' }
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
                                    { backgroundColor: selectedTopicId === topic.id ? materialColors.primary : '#F3F4F6', flexDirection: 'row', alignItems: 'center', gap: 6 }
                                ]}
                                onPress={() => handleTopicPress(topic.id)}
                            >
                                {topic.icon && (
                                    <Text style={{ fontSize: 16 }}>{topic.icon}</Text>
                                )}
                                <Text style={[
                                    styles.topicText,
                                    { color: selectedTopicId === topic.id ? '#FFFFFF' : '#374151' }
                                ]}>
                                    {topic.topicName}
                                </Text>
                                {topic.postCount > 0 && (
                                    <View style={{
                                        backgroundColor: selectedTopicId === topic.id ? 'rgba(255,255,255,0.3)' : '#E5E7EB',
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 10,
                                    }}>
                                        <Text style={{
                                            fontSize: 11,
                                            fontWeight: '600',
                                            color: selectedTopicId === topic.id ? '#FFFFFF' : '#6B7280',
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
                                <View style={[styles.avatar, { backgroundColor: materialColors.primary }]}>
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

                            {/* Post Content */}
                            <Text style={styles.postContent} numberOfLines={3}>
                                {post.content}
                            </Text>

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
                style={styles.fab}
                onPress={handleCreatePost}
            >
                <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
    topicsContainer: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
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
    emptyText: { fontSize: 18, color: '#6B7280', textAlign: 'center' },
    postCard: {
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
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
    authorName: { fontSize: 15, fontWeight: '600', color: '#111827' },
    timestamp: { fontSize: 12, color: '#6B7280' },
    postTopics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    postTopicChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    postTopicText: { fontSize: 12, color: '#4F46E5', fontWeight: '500' },
    postContent: { fontSize: 15, color: '#374151', lineHeight: 22 },
    postStats: { flexDirection: 'row', marginTop: 12, gap: 16 },
    statText: { fontSize: 13, color: '#6B7280' },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: materialColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
})
