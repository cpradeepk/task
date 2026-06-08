import React, { useState, useCallback, useMemo } from 'react'
import {
    View,
    ScrollView,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Platform,
    Modal,
    TextInput
} from 'react-native'
import { useQuery, useMutation } from '@apollo/client/react'
import { Card, Text, Button, ActivityIndicator, Avatar, Divider, IconButton, Portal, Dialog } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { ADMIN_DASHBOARD_QUERY, REQUEST_MANUAL_ATTENDANCE } from '../config/graphql-queries'
import { materialColors, materialSpacing, materialTypography } from '../config/materialTheme'
import { formatTimeIST, formatDateIST } from '../utils/datetime'
import { useNavigation } from '@react-navigation/native'
import { getUserData } from '../utils/secureStorage'
import { useTheme } from '../contexts/ThemeContext'

export default function AttendanceDashboardScreen() {
    const { colors } = useTheme()
    const styles = useMemo(() => getStyles(colors), [colors])
    const navigation = useNavigation<any>()
    const [refreshing, setRefreshing] = useState(false)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')

    // Request Manual Attendance State
    const [showRequestModal, setShowRequestModal] = useState(false)
    const [requestDate, setRequestDate] = useState(new Date())
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [signInTime, setSignInTime] = useState(new Date())
    const [showSignInPicker, setShowSignInPicker] = useState(false)
    const [signOutTime, setSignOutTime] = useState(new Date())
    const [showSignOutPicker, setShowSignOutPicker] = useState(false)
    const [reason, setReason] = useState('')

    const [requestManualAttendance, { loading: requestLoading }] = useMutation(REQUEST_MANUAL_ATTENDANCE)

    const isDashboardAdmin = useMemo(() => {
        if (!userRole) return false;
        const role = userRole.toLowerCase();
        return ['admin', 'hr', 'management', 'top_management'].includes(role);
    }, [userRole])

    const { data, loading, refetch } = useQuery<any, any>(ADMIN_DASHBOARD_QUERY, {
        pollInterval: 0,
        fetchPolicy: 'cache-and-network',
        skip: !isDashboardAdmin
    })

    const dashboardData = (data as any)?.adminDashboardData

    React.useEffect(() => {
        getUserData().then(user => {
            if (user) {
                setUserRole(user.role)
                setUserName(user.name)
            }
        })
    }, [])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await refetch()
        } catch (e) {
            console.log("Fetch error (expected if not admin):", e)
        } finally {
            setRefreshing(false)
        }
    }, [refetch])

    const handleRequestSubmit = async () => {
        try {
            await requestManualAttendance({
                variables: {
                    input: {
                        date: requestDate.toISOString().split('T')[0],
                        signInTime: signInTime.toISOString(),
                        signOutTime: signOutTime.toISOString(),
                        reason: reason
                    }
                }
            })
            setShowRequestModal(false)
            setReason('')
            // Optionally show success message
        } catch (e) {
            console.error(e)
            // Optionally show error
        }
    }

    // DateTimePicker Helpers
    const onChangeDate = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false)
        if (selectedDate) setRequestDate(selectedDate)
    }
    const onChangeSignIn = (event: any, selectedDate?: Date) => {
        setShowSignInPicker(false)
        if (selectedDate) setSignInTime(selectedDate)
    }
    const onChangeSignOut = (event: any, selectedDate?: Date) => {
        setShowSignOutPicker(false)
        if (selectedDate) setSignOutTime(selectedDate)
    }

    const QuickActionBtn = ({ icon, label, onPress, color }: any) => (
        <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
            <View style={[styles.actionIcon, { backgroundColor: color }]}>
                <IconButton icon={icon} iconColor="white" size={24} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    )

    const StatCard = ({ title, value, icon, color, bgColor }: any) => (
        <Card style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
            <Card.Content style={styles.statCardContent}>
                <View>
                    <Text style={styles.statTitle}>{title}</Text>
                    <Text style={styles.statValue}>{value || 0}</Text>
                </View>
                <Avatar.Icon size={48} icon={icon} style={{ backgroundColor: bgColor }} color={color} />
            </Card.Content>
        </Card>
    )

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
        >
            <View style={styles.content}>
                <Text style={styles.welcomeText}>Welcome, {userName}</Text>

                {/* Quick Actions */}
                <View style={styles.actionRow}>
                    <QuickActionBtn
                        icon="calendar-month"
                        label="My Calendar"
                        onPress={() => navigation.navigate('AttendanceCalendar')}
                        color={colors.primary}
                    />
                    <QuickActionBtn
                        icon="clock-edit"
                        label="Request Edit"
                        onPress={() => setShowRequestModal(true)}
                        color={colors.primary}
                    />
                    {['admin', 'management', 'top_management'].includes(userRole?.toLowerCase() || '') && (
                        <QuickActionBtn
                            icon="check-decagram"
                            label="Approvals"
                            onPress={() => navigation.navigate('AttendanceApprovals')}
                            color={colors.success}
                        />
                    )}
                </View>

                {/* Admin Dashboard */}
                {dashboardData && (
                    <>
                        <Divider style={styles.divider} />
                        <Text style={styles.headerTitle}>Overview</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <StatCard title="Online" value={dashboardData.usersOnline} icon="account-check" color="#10B981" bgColor="#D1FAE5" />
                                </View>
                                <View style={styles.col}>
                                    <StatCard title="Present" value={dashboardData.usersPresent} icon="account-clock" color="#3B82F6" bgColor="#DBEAFE" />
                                </View>
                            </View>
                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <StatCard title="Absent" value={dashboardData.usersAbsent} icon="account-remove" color="#6B7280" bgColor="#F3F4F6" />
                                </View>
                                <View style={styles.col}>
                                    <StatCard title="Leave" value={dashboardData.usersOnLeave} icon="airplane" color="#F59E0B" bgColor="#FEF3C7" />
                                </View>
                            </View>
                        </View>

                        {dashboardData.liveAttendance && (
                            <>
                                <Text style={styles.headerTitle}>Live Attendance</Text>
                                <Card style={styles.listCard}>
                                    {dashboardData.liveAttendance.map((record: any, index: number) => (
                                        <React.Fragment key={record.userId}>
                                            <View style={styles.listItem}>
                                                <Avatar.Text
                                                    size={40}
                                                    label={record.userName.substring(0, 2).toUpperCase()}
                                                    style={{ backgroundColor: record.status === 'ONLINE' ? '#10B981' : '#6B7280' }}
                                                />
                                                <View style={styles.listItemContent}>
                                                    <Text style={styles.listItemTitle}>{record.userName}</Text>
                                                    <Text style={styles.listItemSubtitle}>{record.status}</Text>
                                                </View>
                                                <Text style={styles.listItemTime}>
                                                    {record.signInTime ? formatTimeIST(record.signInTime) : '-'}
                                                </Text>
                                            </View>
                                            {index < dashboardData.liveAttendance.length - 1 && <Divider style={styles.divider} />}
                                        </React.Fragment>
                                    ))}
                                </Card>
                            </>
                        )}
                    </>
                )}
            </View>

            {/* Request Modal */}
            <Modal visible={showRequestModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Text style={styles.modalTitle}>Request Attendance Edit</Text>

                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateInput}>
                            <Text style={{ color: colors.text }}>Date: {formatDateIST(requestDate.toISOString())}</Text>
                        </TouchableOpacity>

                        <View style={styles.timeRow}>
                            <TouchableOpacity onPress={() => setShowSignInPicker(true)} style={styles.timeInput}>
                                <Text style={{ color: colors.text }}>In: {formatTimeIST(signInTime.toISOString())}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowSignOutPicker(true)} style={styles.timeInput}>
                                <Text style={{ color: colors.text }}>Out: {formatTimeIST(signOutTime.toISOString())}</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            placeholder="Reason"
                            value={reason}
                            onChangeText={setReason}
                            style={styles.textInput}
                            placeholderTextColor={colors.textTertiary}
                        />

                        <View style={styles.modalActions}>
                            <Button onPress={() => setShowRequestModal(false)} textColor={colors.textSecondary}>Cancel</Button>
                            <Button mode="contained" onPress={handleRequestSubmit} loading={requestLoading} buttonColor={colors.primary} textColor="#FFFFFF">Submit</Button>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker value={requestDate} mode="date" display="default" onChange={onChangeDate} />
                        )}
                        {showSignInPicker && (
                            <DateTimePicker value={signInTime} mode="time" display="default" onChange={onChangeSignIn} />
                        )}
                        {showSignOutPicker && (
                            <DateTimePicker value={signOutTime} mode="time" display="default" onChange={onChangeSignOut} />
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    )
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: materialSpacing.md },
    welcomeText: { ...materialTypography.headlineSmall, color: colors.text, marginBottom: materialSpacing.md },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: materialSpacing.lg },
    actionBtn: { alignItems: 'center' },
    actionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 4, elevation: 2 },
    actionLabel: { ...materialTypography.labelMedium, color: colors.text },
    headerTitle: { ...materialTypography.titleLarge, marginBottom: materialSpacing.sm, fontWeight: 'bold', color: colors.text },
    statsGrid: { marginBottom: materialSpacing.lg },
    row: { flexDirection: 'row', marginHorizontal: -6, marginBottom: 12 },
    col: { flex: 1, paddingHorizontal: 6 },
    statCard: { backgroundColor: colors.surface, elevation: 2 },
    statCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statTitle: { fontSize: 12, color: colors.textSecondary },
    statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4, color: colors.text },
    listCard: { backgroundColor: colors.surface, padding: 0 },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    listItemContent: { flex: 1, marginLeft: 12 },
    listItemTitle: { fontWeight: 'bold', color: colors.text },
    listItemSubtitle: { fontSize: 12, color: colors.textSecondary },
    listItemTime: { fontSize: 12, color: colors.textSecondary },
    divider: { marginVertical: materialSpacing.md, backgroundColor: colors.border },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 20, borderRadius: 10, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: colors.text },
    dateInput: { padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 5, marginBottom: 10, backgroundColor: colors.surfaceVariant },
    timeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    timeInput: { flex: 1, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 5, backgroundColor: colors.surfaceVariant },
    textInput: { padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 5, marginBottom: 20, backgroundColor: colors.surfaceVariant, color: colors.text },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
})
