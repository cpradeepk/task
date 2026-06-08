/**
 * RelatedItemsManager Component for Mobile
 * Displays and manages related tasks/bugs
 */

import React, { useState, useEffect } from 'react'
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from 'react-native'
import { Text, Chip, ActivityIndicator, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import apiClient from '../services/apiClient'

interface RelatedItem {
    id: string
    type: 'task' | 'bug'
    title: string
    status: string
    priority?: string
}

interface RelatedItemsManagerProps {
    itemId: string
    itemType: 'task' | 'bug'
    onItemPress?: (item: RelatedItem) => void
}

export default function RelatedItemsManager({
    itemId,
    itemType,
    onItemPress,
}: RelatedItemsManagerProps) {
    const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchRelatedItems()
    }, [itemId, itemType])

    const fetchRelatedItems = async () => {
        try {
            // Fetch related items from API
            const path =
                itemType === 'task'
                    ? `/api/tasks/${itemId}/related`
                    : `/api/bugs/${itemId}/related`

            const data = await apiClient.get(path)
            if (data.success) {
                setRelatedItems(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch related items:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getStatusColor = (status: string): string => {
        const statusColors: Record<string, string> = {
            Open: materialColors.primary,
            'In Progress': '#2196F3',
            Completed: '#4CAF50',
            Closed: '#9E9E9E',
            Resolved: '#4CAF50',
            New: '#FF9800',
            Delayed: '#F44336',
            'On Hold': '#9E9E9E',
        }
        return statusColors[status] || materialColors.textSecondary
    }

    const getItemIcon = (type: string): string => {
        return type === 'task' ? 'checkbox-marked-circle-outline' : 'bug'
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={materialColors.primary} />
                <Text style={styles.loadingText}>Loading related items...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Related Items</Text>
                <Text style={styles.count}>{relatedItems.length}</Text>
            </View>

            {/* Related Items List */}
            <ScrollView style={styles.list}>
                {relatedItems.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="link-variant-off"
                            size={48}
                            color={materialColors.textSecondary}
                        />
                        <Text style={styles.emptyText}>No related items</Text>
                    </View>
                ) : (
                    relatedItems.map((item, index) => (
                        <View key={item.id}>
                            <TouchableOpacity
                                style={styles.relatedItem}
                                onPress={() => onItemPress && onItemPress(item)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.itemHeader}>
                                    <MaterialCommunityIcons
                                        name={getItemIcon(item.type) as any}
                                        size={20}
                                        color={materialColors.primary}
                                        style={styles.itemIcon}
                                    />
                                    <Text style={styles.itemId}>{item.id}</Text>
                                    <Chip
                                        mode="flat"
                                        style={[
                                            styles.statusChip,
                                            { backgroundColor: getStatusColor(item.status) + '20' },
                                        ]}
                                        textStyle={[
                                            styles.statusText,
                                            { color: getStatusColor(item.status) },
                                        ]}
                                    >
                                        {item.status}
                                    </Chip>
                                </View>
                                <Text style={styles.itemTitle} numberOfLines={2}>
                                    {item.title}
                                </Text>
                                {item.priority && (
                                    <Text style={styles.itemPriority}>Priority: {item.priority}</Text>
                                )}
                            </TouchableOpacity>
                            {index < relatedItems.length - 1 && <Divider />}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: materialColors.surface,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: materialSpacing.xl,
    },
    loadingText: {
        ...materialTypography.bodySmall,
        color: materialColors.textSecondary,
        marginTop: materialSpacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: materialSpacing.md,
        backgroundColor: materialColors.surface,
        borderBottomWidth: 1,
        borderBottomColor: materialColors.outline,
    },
    title: {
        ...materialTypography.titleMedium,
        fontWeight: '600',
        color: materialColors.text,
    },
    count: {
        ...materialTypography.bodyMedium,
        color: materialColors.primary,
        fontWeight: '600',
    },
    list: {
        flex: 1,
    },
    emptyContainer: {
        padding: materialSpacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...materialTypography.bodyMedium,
        color: materialColors.textSecondary,
        marginTop: materialSpacing.md,
        textAlign: 'center',
    },
    relatedItem: {
        padding: materialSpacing.md,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: materialSpacing.xs,
    },
    itemIcon: {
        marginRight: materialSpacing.xs,
    },
    itemId: {
        ...materialTypography.labelMedium,
        fontWeight: '600',
        color: materialColors.primary,
        marginRight: materialSpacing.sm,
    },
    statusChip: {
        height: 24,
    },
    statusText: {
        ...materialTypography.labelSmall,
        fontWeight: '600',
    },
    itemTitle: {
        ...materialTypography.bodyMedium,
        color: materialColors.text,
        marginBottom: materialSpacing.xs,
    },
    itemPriority: {
        ...materialTypography.bodySmall,
        color: materialColors.textSecondary,
    },
})
