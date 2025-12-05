import React, { useState, useCallback } from 'react'
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from 'react-native'
import { useQuery } from '@apollo/client/react'
import { Card, Title, Paragraph, List, Avatar, useTheme, Divider } from 'react-native-paper'
import { ADMIN_DASHBOARD_QUERY } from '../config/graphql-queries'
import { materialColors, materialSpacing, materialTypography } from '../config/materialTheme'

export default function AttendanceDashboardScreen() {
    const theme = useTheme()
    const [refreshing, setRefreshing] = useState(false)

    const { data, loading, error, refetch } = useQuery(ADMIN_DASHBOARD_QUERY, {
        pollInterval: 60000, // Refresh every minute
        fetchPolicy: 'cache-and-network',
    })

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await refetch()
        } catch (e) {
            console.error(e)
        } finally {
            setRefreshing(false)
        }
    }, [refetch])

    if (loading && !data) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={materialColors.primary} />
            </View>
        )
    }

    if (error && !data) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Error loading dashboard</Text>
                <Text style={styles.errorSubText}>{error.message}</Text>
            </View>
        )
    }

    const dashboardData = (data as any)?.adminDashboardData

    if (!dashboardData) {
        return null
    }

    const StatCard = ({ title, value, icon, color, bgColor }: any) => (
        <Card style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
            <Card.Content style={styles.statCardContent}>
                <View>
                    <Text style={styles.statTitle}>{title}</Text>
                    <Text style={styles.statValue}>{value}</Text>
                </View>
                <Avatar.Icon size={48} icon={icon} style={{ backgroundColor: bgColor }} color={color} />
            </Card.Content>
        </Card>
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ONLINE':
                return '#10B981' // Green
            case 'PRESENT':
                return '#3B82F6' // Blue
            case 'ABSENT':
                return '#6B7280' // Gray
            case 'ON_LEAVE':
                return '#F59E0B' // Yellow
            case 'WFH':
                return '#8B5CF6' // Purple
            default:
                return '#6B7280'
        }
    }

    const formatTime = (timeString?: string) => {
        if (!timeString) return '-'
        const date = new Date(timeString)
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[materialColors.primary]} />
            }
        >
            <View style={styles.content}>
                <Text style={styles.headerTitle}>Attendance Overview</Text>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <StatCard
                                title="Online Now"
                                value={dashboardData.usersOnline}
                                icon="account-check"
                                color="#10B981"
                                bgColor="#D1FAE5"
                            />
                        </View>
                        <View style={styles.col}>
                            <StatCard
                                title="Present"
                                value={dashboardData.usersPresent}
                                icon="account-clock"
                                color="#3B82F6"
                                bgColor="#DBEAFE"
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <StatCard
                                title="Absent"
                                value={dashboardData.usersAbsent}
                                icon="account-remove"
                                color="#6B7280"
                                bgColor="#F3F4F6"
                            />
                        </View>
                        <View style={styles.col}>
                            <StatCard
                                title="On Leave"
                                value={dashboardData.usersOnLeave}
                                icon="airplane"
                                color="#F59E0B"
                                bgColor="#FEF3C7"
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.col}>
                            <StatCard
                                title="WFH"
                                value={dashboardData.usersWFH}
                                icon="home-account"
                                color="#8B5CF6"
                                bgColor="#EDE9FE"
                            />
                        </View>
                        <View style={styles.col}>
                            <StatCard
                                title="Pending"
                                value={dashboardData.pendingLeaveRequests + dashboardData.pendingWFHRequests}
                                icon="clock-alert"
                                color="#F97316"
                                bgColor="#FFEDD5"
                            />
                        </View>
                    </View>
                </View>

                <Divider style={styles.divider} />

                <Text style={styles.headerTitle}>Live Attendance</Text>
                <Text style={styles.subHeader}>Current status of all active users</Text>

                <Card style={styles.listCard}>
                    {dashboardData.liveAttendance.map((record: any, index: number) => (
                        <React.Fragment key={record.userId}>
                            <List.Item
                                title={record.userName}
                                description={`${record.role} • ${record.department || '-'}`}
                                left={props => (
                                    <Avatar.Text
                                        {...props}
                                        size={40}
                                        label={record.userName.substring(0, 2).toUpperCase()}
                                        style={{ backgroundColor: getStatusColor(record.status) }}
                                        color="#FFFFFF"
                                    />
                                )}
                                right={props => (
                                    <View style={styles.statusContainer}>
                                        <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                                            {record.status}
                                        </Text>
                                        <Text style={styles.timeText}>
                                            {record.signInTime ? `In: ${formatTime(record.signInTime)}` : ''}
                                        </Text>
                                    </View>
                                )}
                            />
                            {index < dashboardData.liveAttendance.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </Card>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    content: {
        padding: materialSpacing.md,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...materialTypography.titleLarge,
        color: '#111827',
        marginBottom: materialSpacing.sm,
        fontWeight: 'bold',
    },
    subHeader: {
        ...materialTypography.bodyMedium,
        color: '#6B7280',
        marginBottom: materialSpacing.md,
    },
    statsGrid: {
        marginBottom: materialSpacing.lg,
    },
    row: {
        flexDirection: 'row',
        marginHorizontal: -6,
        marginBottom: 12,
    },
    col: {
        flex: 1,
        paddingHorizontal: 6,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        elevation: 2,
    },
    statCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statTitle: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 24,
        color: '#111827',
        fontWeight: 'bold',
        marginTop: 4,
    },
    divider: {
        marginVertical: materialSpacing.md,
    },
    listCard: {
        backgroundColor: '#FFFFFF',
        marginBottom: materialSpacing.xl,
    },
    statusContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginRight: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    timeText: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 2,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        fontWeight: 'bold',
    },
    errorSubText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
})
