/**
 * BugChecklistManager Component for Mobile
 * Manages checklists for bugs (similar to TaskChecklistManager but for bugs)
 */

import React, { useState, useEffect } from 'react'
import {
    View,
    ScrollView,
    StyleSheet,
    Alert,
} from 'react-native'
import { Text, TextInput, Button, Checkbox, IconButton, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import apiClient from '../services/apiClient'

interface ChecklistItem {
    id: number
    bugId: string
    itemText: string
    isCompleted: boolean
    createdAt: string
    description?: string
}

interface BugChecklistManagerProps {
    bugId: string
    canEdit?: boolean
}

export default function BugChecklistManager({
    bugId,
    canEdit = true,
}: BugChecklistManagerProps) {
    const [checklists, setChecklists] = useState<ChecklistItem[]>([])
    const [newItemText, setNewItemText] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)

    useEffect(() => {
        fetchChecklists()
    }, [bugId])

    const fetchChecklists = async () => {
        try {
            const data = await apiClient.get(`/api/development-checklists?parentBugId=${bugId}`)
            if (data.success) {
                setChecklists(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch checklists:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddItem = async () => {
        if (!newItemText.trim()) return

        setIsAdding(true)
        try {
            const data = await apiClient.post('/api/development-checklists', {
                parentBugId: bugId,
                description: newItemText.trim(),
                assignedTo: 'current', // Backend might require this, check if it fails
                createdBy: 'current', // Will be handled by session or API
            })
            if (data.success) {
                setNewItemText('')
                await fetchChecklists()
            } else {
                Alert.alert('Error', data.error || 'Failed to add checklist item')
            }
        } catch (error) {
            console.error('Failed to add checklist item:', error)
            Alert.alert('Error', 'Failed to add checklist item')
        } finally {
            setIsAdding(false)
        }
    }

    const handleToggleItem = async (item: ChecklistItem) => {
        try {
            const data = await apiClient.put(`/api/development-checklists/${item.id}`, {
                isCompleted: !item.isCompleted,
            })
            if (data.success) {
                await fetchChecklists()
            } else {
                Alert.alert('Error', data.error || 'Failed to update checklist item')
            }
        } catch (error) {
            console.error('Failed to update checklist item:', error)
            Alert.alert('Error', 'Failed to update checklist item')
        }
    }

    const handleDeleteItem = async (itemId: number) => {
        Alert.alert(
            'Delete Item',
            'Are you sure you want to delete this checklist item?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const data = await apiClient.del(`/api/development-checklists/${itemId}`)
                            if (data.success) {
                                await fetchChecklists()
                            } else {
                                Alert.alert('Error', data.error || 'Failed to delete checklist item')
                            }
                        } catch (error) {
                            console.error('Failed to delete checklist item:', error)
                            Alert.alert('Error', 'Failed to delete checklist item')
                        }
                    },
                },
            ]
        )
    }

    const completedCount = checklists.filter((item) => item.isCompleted).length
    const totalCount = checklists.length

    return (
        <View style={styles.container}>
            {/* Header with Progress */}
            <View style={styles.header}>
                <Text style={styles.title}>Checklist</Text>
                {totalCount > 0 && (
                    <Text style={styles.progress}>
                        {completedCount}/{totalCount} completed
                    </Text>
                )}
            </View>

            {/* Add New Item */}
            {canEdit && (
                <View style={styles.addItemContainer}>
                    <TextInput
                        mode="outlined"
                        label="New checklist item"
                        value={newItemText}
                        onChangeText={setNewItemText}
                        style={styles.input}
                        outlineColor={materialColors.outline}
                        activeOutlineColor={materialColors.primary}
                        onSubmitEditing={handleAddItem}
                    />
                    <Button
                        mode="contained"
                        onPress={handleAddItem}
                        disabled={isAdding || !newItemText.trim()}
                        loading={isAdding}
                        style={styles.addButton}
                        buttonColor={materialColors.primary}
                    >
                        Add
                    </Button>
                </View>
            )}

            {/* Checklist Items */}
        <ScrollView style={styles.list}>
            {checklists.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons
                        name="checkbox-marked-circle-outline"
                        size={48}
                        color={materialColors.textSecondary}
                    />
                    <Text style={styles.emptyText}>No checklist items yet</Text>
                </View>
            ) : (
                checklists.map((item, index) => (
                    <View key={item.id}>
                        <View style={styles.checklistItem}>
                            <Checkbox
                                status={item.isCompleted ? 'checked' : 'unchecked'}
                                onPress={() => canEdit && handleToggleItem(item)}
                                color={materialColors.primary}
                                disabled={!canEdit}
                            />
                            <Text
                                style={[
                                    styles.itemText,
                                    item.isCompleted && styles.itemTextCompleted,
                                ]}
                                numberOfLines={2}
                            >
                                {(item as any).description || (item as any).itemText}
                            </Text>
                            {canEdit && (
                                <IconButton
                                    icon="delete"
                                    size={20}
                                    iconColor={materialColors.error}
                                    onPress={() => handleDeleteItem(item.id)}
                                />
                            )}
                        </View>
                        {index < checklists.length - 1 && <Divider />}
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
    progress: {
        ...materialTypography.bodySmall,
        color: materialColors.primary,
        fontWeight: '600',
    },
    addItemContainer: {
        flexDirection: 'row',
        padding: materialSpacing.md,
        gap: materialSpacing.sm,
        backgroundColor: materialColors.surface,
    },
    input: {
        flex: 1,
        backgroundColor: materialColors.surface,
    },
    addButton: {
        alignSelf: 'center',
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
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: materialSpacing.sm,
        paddingLeft: materialSpacing.md,
    },
    itemText: {
        ...materialTypography.bodyMedium,
        flex: 1,
        color: materialColors.text,
    },
    itemTextCompleted: {
        textDecorationLine: 'line-through',
        color: materialColors.textSecondary,
    },
})
