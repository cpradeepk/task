import React, { useState, useCallback, useMemo } from 'react'
import {
    View,
    FlatList,
    StyleSheet,
    RefreshControl,
    Alert,
} from 'react-native'
import { Card, Text, ActivityIndicator, Button, useTheme } from 'react-native-paper'
import { useQuery, useMutation } from '@apollo/client/react'
import {
    PENDING_ATTENDANCE_REQUESTS,
    APPROVE_ATTENDANCE_REQUEST,
    REJECT_ATTENDANCE_REQUEST
} from '../config/graphql-queries'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { formatDateTimeIST, formatDateIST } from '../utils/datetime'
import { useResponsive } from '../hooks/useResponsive'

interface AttendanceRequest {
    id: string
    userId: string
    attendanceDate: string
    requestType: string
    originalTime: string | null
    newTime: string
    reason: string
    status: string
    createdAt: string
    user: {
        employeeId: string
        name: string
        department: string
        role: string
    }
}

export default function AttendanceApprovalsScreen() {
    const { colors } = useTheme()
    const responsive = useResponsive()
    const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

    const [approvingId, setApprovingId] = useState<string | null>(null)
    const [rejectingId, setRejectingId] = useState<string | null>(null)

    const { data, loading, refetch, error } = useQuery(PENDING_ATTENDANCE_REQUESTS, {
        fetchPolicy: 'cache-and-network',
    })

    const [approveRequest] = useMutation(APPROVE_ATTENDANCE_REQUEST)
    const [rejectRequest] = useMutation(REJECT_ATTENDANCE_REQUEST)

    const requests = (data as any)?.pendingAttendanceRequests || []

    const handleRefresh = useCallback(async () => {
        try {
            await refetch()
        } catch (e) {
            console.error(e)
        }
    }, [refetch])

    const handleApprove = useCallback(async (id: string) => {
        try {
            setApprovingId(id)
            const res = await approveRequest({ variables: { requestId: id } })
            if (res.data?.approveAttendanceRequest) {
                Alert.alert('Success', 'Request approved')
                refetch()
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to approve request')
        } finally {
            setApprovingId(null)
        }
    }, [approveRequest, refetch])

    const handleReject = useCallback(async (id: string) => {
        try {
            setRejectingId(id)
            const res = await rejectRequest({ variables: { requestId: id } })
            if (res.data?.rejectAttendanceRequest) {
                Alert.alert('Success', 'Request rejected')
                refetch()
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to reject request')
        } finally {
            setRejectingId(null)
        }
    }, [rejectRequest, refetch])

    const renderItem = ({ item }: { item: AttendanceRequest }) => (
        <Card style={styles.card}>
            <Card.Content>
                <Text style={styles.userName}>{item.user.name}</Text>
                <Text style={styles.userDept}>{item.user.department}</Text>

                <View style={styles.divider} />

                <View style={styles.row}>
                    <Text style={styles.label}>Date:</Text>
                    <Text style={styles.value}>{formatDateIST(item.attendanceDate)}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Type:</Text>
                    <Text style={styles.value}>{item.requestType}</Text>
                </View>

                {item.originalTime && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Original:</Text>
                        <Text style={styles.value}>{formatDateTimeIST(item.originalTime)}</Text>
                    </View>
                )}

                <View style={styles.row}>
                    <Text style={styles.label}>New:</Text>
                    <Text style={styles.value}>{formatDateTimeIST(item.newTime)}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Reason:</Text>
                    <Text style={styles.value}>{item.reason}</Text>
                </View>

                <View style={styles.actions}>
                    <Button
                        mode="contained"
                        onPress={() => handleApprove(item.id)}
                        loading={approvingId === item.id}
                        disabled={!!approvingId || !!rejectingId}
                        style={styles.approveBtn}
                    >
                        Approve
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => handleReject(item.id)}
                        loading={rejectingId === item.id}
                        disabled={!!approvingId || !!rejectingId}
                        style={styles.rejectBtn}
                        textColor={colors.error}
                    >
                        Reject
                    </Button>
                </View>
            </Card.Content>
        </Card>
    )

    if (loading && !data) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={requests}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>No pending requests</Text>
                    </View>
                }
            />
        </View>
    )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    listContent: {
        padding: materialSpacing.md,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: materialSpacing.xl,
    },
    card: {
        marginBottom: materialSpacing.md,
        backgroundColor: colors.surface,
        borderRadius: 12,
    },
    userName: {
        ...materialTypography.titleMedium,
        fontWeight: 'bold',
    },
    userDept: {
        ...materialTypography.bodySmall,
        color: colors.textSecondary,
        marginBottom: materialSpacing.sm,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: materialSpacing.sm,
    },
    row: {
        flexDirection: 'row',
        marginBottom: materialSpacing.xs,
    },
    label: {
        ...materialTypography.bodyMedium,
        color: colors.textSecondary,
        width: 80,
        fontWeight: '600',
    },
    value: {
        ...materialTypography.bodyMedium,
        color: colors.text,
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: materialSpacing.md,
        gap: materialSpacing.sm,
    },
    approveBtn: {
        backgroundColor: colors.success,
    },
    rejectBtn: {
        borderColor: colors.error,
    },
    emptyText: {
        ...materialTypography.bodyLarge,
        color: colors.textSecondary,
    },
})
