import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { Card, Text, Button, ActivityIndicator, useTheme, Surface } from 'react-native-paper'
import { useQuery, useMutation } from '@apollo/client/react'
import { format } from 'date-fns'
import { useNavigation } from '@react-navigation/native'
import { GET_ATTENDANCE, SIGN_IN, SIGN_OUT } from '../../config/graphql-queries'
import { materialColors, materialSpacing, materialTypography } from '../../config/materialTheme'

export default function DailyAttendanceCard() {
    const theme = useTheme()
    const navigation = useNavigation<any>()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [workDuration, setWorkDuration] = useState<string>('00:00:00')
    const [loadingAction, setLoadingAction] = useState(false)

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Get today's date string for query
    const todayDate = format(new Date(), 'yyyy-MM-dd')

    // Fetch attendance data
    const { data, loading, error, refetch } = useQuery(GET_ATTENDANCE, {
        variables: { date: todayDate },
        fetchPolicy: 'network-only',
        pollInterval: 60000 // Poll every minute
    })

    const attendance = (data as any)?.attendance

    // Calculate work duration
    useEffect(() => {
        if (attendance?.signInTime && !attendance.signOutTime) {
            const interval = setInterval(() => {
                const start = new Date(parseInt(attendance.signInTime))
                const now = new Date()
                const diff = now.getTime() - start.getTime()

                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)

                setWorkDuration(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                )
            }, 1000)
            return () => clearInterval(interval)
        } else if (attendance?.workHours) {
            const hours = Math.floor(attendance.workHours)
            const minutes = Math.floor((attendance.workHours - hours) * 60)
            setWorkDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`)
        } else {
            setWorkDuration('00:00:00')
        }
    }, [attendance])

    // Mutations
    const [signIn] = useMutation(SIGN_IN, {
        onCompleted: () => {
            refetch()
            setLoadingAction(false)
        },
        onError: (err) => {
            console.error('Sign In Error:', err)
            setLoadingAction(false)
            Alert.alert('Error', err.message)
        }
    })

    const [signOut] = useMutation(SIGN_OUT, {
        onCompleted: () => {
            refetch()
            setLoadingAction(false)
        },
        onError: (err) => {
            console.error('Sign Out Error:', err)
            setLoadingAction(false)
            Alert.alert('Error', err.message)
        }
    })

    const handleSignIn = () => {
        setLoadingAction(true)
        signIn()
    }

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out for the day?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: () => {
                        setLoadingAction(true)
                        signOut()
                    }
                }
            ]
        )
    }

    if (loading && !attendance) {
        return (
            <Card style={styles.card} elevation={1}>
                <Card.Content style={styles.loadingContent}>
                    <ActivityIndicator size="small" color={materialColors.primary} />
                    <Text style={styles.loadingText}>Loading attendance...</Text>
                </Card.Content>
            </Card>
        )
    }

    if (error) {
        return (
            <Card style={styles.card} elevation={1}>
                <Card.Content>
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                        Failed to load attendance data
                    </Text>
                    <Button mode="text" onPress={() => refetch()}>Retry</Button>
                </Card.Content>
            </Card>
        )
    }

    const isSignedOut = !!attendance?.signOutTime
    const isSignedIn = !!attendance?.signInTime && !isSignedOut

    return (
        <Card style={styles.card} elevation={1} onPress={() => navigation.navigate('AttendanceDashboard')}>
            <Card.Content>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Daily Attendance</Text>
                        <Text style={styles.date}>{format(currentTime, 'EEE, MMM d')}</Text>
                    </View>
                    <Surface style={styles.statusBadge} elevation={0}>
                        <Text style={[
                            styles.statusText,
                            { color: isSignedIn ? materialColors.success : isSignedOut ? materialColors.textSecondary : materialColors.warning }
                        ]}>
                            {isSignedIn ? 'Working' : isSignedOut ? 'Completed' : 'Not Started'}
                        </Text>
                    </Surface>
                </View>

                <View style={styles.clockContainer}>
                    <Text style={styles.clock}>{format(currentTime, 'HH:mm:ss')}</Text>
                    <Text style={styles.clockLabel}>Current Time</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Work Hours</Text>
                        <Text style={styles.statValue}>{workDuration}</Text>
                    </View>
                    {attendance?.signInTime && (
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Sign In</Text>
                            <Text style={styles.statValue}>
                                {format(new Date(parseInt(attendance.signInTime)), 'hh:mm a')}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.actions}>
                    {!attendance?.signInTime ? (
                        <Button
                            mode="contained"
                            onPress={handleSignIn}
                            loading={loadingAction}
                            disabled={loadingAction}
                            style={[styles.button, { backgroundColor: materialColors.primary }]}
                            labelStyle={styles.buttonLabel}
                        >
                            Sign In
                        </Button>
                    ) : !attendance.signOutTime ? (
                        <Button
                            mode="contained"
                            onPress={handleSignOut}
                            loading={loadingAction}
                            disabled={loadingAction}
                            style={[styles.button, { backgroundColor: materialColors.error }]}
                            labelStyle={styles.buttonLabel}
                        >
                            Sign Out
                        </Button>
                    ) : (
                        <Surface style={styles.completedBadge} elevation={0}>
                            <Text style={styles.completedText}>Attendance Completed</Text>
                        </Surface>
                    )}
                </View>
            </Card.Content>
        </Card>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: materialColors.surface,
        borderRadius: 16,
        marginBottom: materialSpacing.md,
    },
    loadingContent: {
        alignItems: 'center',
        padding: materialSpacing.lg,
    },
    loadingText: {
        marginTop: materialSpacing.sm,
        color: materialColors.textSecondary,
    },
    errorText: {
        textAlign: 'center',
        marginBottom: materialSpacing.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: materialSpacing.lg,
    },
    headerLeft: {
        flex: 1,
    },
    title: {
        ...materialTypography.titleMedium,
        color: materialColors.text,
        fontWeight: '600',
    },
    date: {
        ...materialTypography.bodySmall,
        color: materialColors.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: materialColors.background,
        paddingHorizontal: materialSpacing.sm,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        ...materialTypography.labelSmall,
        fontWeight: '600',
    },
    clockContainer: {
        alignItems: 'center',
        marginBottom: materialSpacing.lg,
    },
    clock: {
        ...materialTypography.displayMedium,
        color: materialColors.text,
        fontFamily: 'monospace',
        fontWeight: '700',
    },
    clockLabel: {
        ...materialTypography.labelSmall,
        color: materialColors.textSecondary,
        marginTop: materialSpacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: materialColors.background,
        borderRadius: 12,
        padding: materialSpacing.md,
        marginBottom: materialSpacing.lg,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        ...materialTypography.labelSmall,
        color: materialColors.textSecondary,
        marginBottom: 4,
    },
    statValue: {
        ...materialTypography.titleMedium,
        color: materialColors.text,
        fontWeight: '600',
    },
    actions: {
        marginTop: materialSpacing.xs,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 4,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '600',
        paddingVertical: 2,
    },
    completedBadge: {
        backgroundColor: materialColors.successContainer,
        padding: materialSpacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    completedText: {
        color: materialColors.success,
        fontWeight: '600',
    },
})
