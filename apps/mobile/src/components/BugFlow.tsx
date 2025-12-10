/**
 * BugFlow Component for Mobile
 * Visual bug workflow/status tracker
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'

interface BugFlowProps {
    currentStatus: string
    statusHistory?: Array<{ status: string; date: string }>
}

export default function BugFlow({ currentStatus, statusHistory = [] }: BugFlowProps) {
    // Define bug lifecycle stages
    const stages = [
        { key: 'New', label: 'New', icon: 'alert-circle' },
        { key: 'In Progress', label: 'In Progress', icon: 'progress-clock' },
        { key: 'Resolved', label: 'Resolved', icon: 'check-circle' },
        { key: 'Closed', label: 'Closed', icon: 'check-all' },
    ]

    const getCurrentStageIndex = () => {
        return stages.findIndex((stage) => stage.key === currentStatus)
    }

    const currentStageIndex = getCurrentStageIndex()

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Bug Flow</Text>
                <Text style={styles.currentStatus}>{currentStatus}</Text>
            </View>

            {/* Flow Visualization */}
            <View style={styles.flowContainer}>
                {stages.map((stage, index) => {
                    const isActive = index === currentStageIndex
                    const isCompleted = index < currentStageIndex
                    const isPending = index > currentStageIndex

                    return (
                        <View key={stage.key} style={styles.stageContainer}>
                            {/* Stage Circle */}
                            <View style={styles.stageWrapper}>
                                <View
                                    style={[
                                        styles.stageCircle,
                                        isActive && styles.stageCircleActive,
                                        isCompleted && styles.stageCircleCompleted,
                                        isPending && styles.stageCirclePending,
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name={stage.icon as any}
                                        size={24}
                                        color={
                                            isActive
                                                ? materialColors.surface
                                                : isCompleted
                                                    ? materialColors.surface
                                                    : materialColors.textSecondary
                                        }
                                    />
                                </View>

                                {/* Connector Line */}
                                {index < stages.length - 1 && (
                                    <View
                                        style={[
                                            styles.connector,
                                            isCompleted && styles.connectorCompleted,
                                        ]}
                                    />
                                )}
                            </View>

                            {/* Stage Label */}
                            <Text
                                style={[
                                    styles.stageLabel,
                                    isActive && styles.stageLabelActive,
                                    isCompleted && styles.stageLabelCompleted,
                                ]}
                            >
                                {stage.label}
                            </Text>
                        </View>
                    )
                })}
            </View>

            {/* Status History */}
            {statusHistory.length > 0 && (
                <View style={styles.historyContainer}>
                    <Text style={styles.historyTitle}>Status History</Text>
                    {statusHistory.map((item, index) => (
                        <View key={index} style={styles.historyItem}>
                            <MaterialCommunityIcons
                                name="circle-small"
                                size={16}
                                color={materialColors.textSecondary}
                            />
                            <Text style={styles.historyText}>
                                {item.status} - {item.date}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: materialColors.surface,
        padding: materialSpacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: materialSpacing.lg,
    },
    title: {
        ...materialTypography.titleMedium,
        fontWeight: '600',
        color: materialColors.text,
    },
    currentStatus: {
        ...materialTypography.labelMedium,
        fontWeight: '600',
        color: materialColors.primary,
    },
    flowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: materialSpacing.lg,
    },
    stageContainer: {
        flex: 1,
        alignItems: 'center',
    },
    stageWrapper: {
        position: 'relative',
        alignItems: 'center',
        width: '100%',
    },
    stageCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: materialColors.outline,
        marginBottom: materialSpacing.sm,
        zIndex: 1,
    },
    stageCircleActive: {
        backgroundColor: materialColors.primary,
    },
    stageCircleCompleted: {
        backgroundColor: '#4CAF50',
    },
    stageCirclePending: {
        backgroundColor: materialColors.outline,
    },
    connector: {
        position: 'absolute',
        top: 24,
        left: '50%',
        right: '-50%',
        height: 2,
        backgroundColor: materialColors.outline,
        zIndex: 0,
    },
    connectorCompleted: {
        backgroundColor: '#4CAF50',
    },
    stageLabel: {
        ...materialTypography.bodySmall,
        color: materialColors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: materialSpacing.xs,
    },
    stageLabelActive: {
        ...materialTypography.labelMedium,
        fontWeight: '600',
        color: materialColors.primary,
    },
    stageLabelCompleted: {
        color: '#4CAF50',
    },
    historyContainer: {
        marginTop: materialSpacing.md,
        paddingTop: materialSpacing.md,
        borderTopWidth: 1,
        borderTopColor: materialColors.outline,
    },
    historyTitle: {
        ...materialTypography.labelLarge,
        fontWeight: '600',
        color: materialColors.text,
        marginBottom: materialSpacing.sm,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: materialSpacing.xs,
    },
    historyText: {
        ...materialTypography.bodySmall,
        color: materialColors.textSecondary,
    },
})
