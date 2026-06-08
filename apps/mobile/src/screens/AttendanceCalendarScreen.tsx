import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
    View,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Dimensions
} from 'react-native'
import { Card, Text, ActivityIndicator, IconButton, Surface } from 'react-native-paper'
import { useQuery } from '@apollo/client/react'
import { SearchablePicker } from '../components/SearchablePicker'
import { GET_MONTHLY_ATTENDANCE } from '../config/graphql-queries'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'
import { useResponsive } from '../hooks/useResponsive'
import { formatTimeIST } from '../utils/datetime'
import { useTheme } from '../contexts/ThemeContext'
import { getUserData } from '../utils/secureStorage'
import apiClient from '../services/apiClient'

interface AttendanceRecord {
    id: string
    date: string
    signInTime: string | null
    signOutTime: string | null
    status: string
    workHours: number
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SCREEN_WIDTH = Dimensions.get('window').width

export default function AttendanceCalendarScreen() {
    const { colors } = useTheme()
    const responsive = useResponsive()
    const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
    const [teamMembersList, setTeamMembersList] = useState<any[]>([])

    useEffect(() => {
        const loadUserAndTeam = async () => {
            const user = await getUserData()
            if (!user) return

            setUserId(user.employeeId)
            setCurrentUserRole(user.role)
            const list = [{ employeeId: user.employeeId, name: 'Myself' }]

            try {
                const roleLower = user.role?.toLowerCase()
                if (['admin', 'top_management'].includes(roleLower)) {
                    // Fetch all users using api
                    const result = await apiClient.get('/api/users')
                    const allUsers = result.success ? result.data : []
                    if (Array.isArray(allUsers)) {
                        allUsers.forEach((u: any) => {
                            if (u.employeeId !== user.employeeId) {
                                list.push({ employeeId: u.employeeId, name: u.name })
                            }
                        })
                    }
                } else if (roleLower === 'management') {
                    // Fetch team members
                    const result = await apiClient.get(`/api/users/team/${user.employeeId}`)
                    const team = result.success ? result.data : []
                    if (Array.isArray(team)) {
                        team.forEach((u: any) => {
                            if (u.employeeId !== user.employeeId) {
                                list.push({ employeeId: u.employeeId, name: u.name })
                            }
                        })
                    }
                }
            } catch (e) {
                console.error('Failed to load team list for calendar:', e)
            }
            setTeamMembersList(list)
        }
        loadUserAndTeam()
    }, [])

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1 // 1-indexed for API

    const { data, loading, refetch } = useQuery<any, any>(GET_MONTHLY_ATTENDANCE, {
        variables: { userId, year, month },
        skip: !userId,
        fetchPolicy: 'cache-and-network',
    })

    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>()
        if (data?.monthlyAttendance) {
            data.monthlyAttendance.forEach((record: AttendanceRecord) => {
                // record.date is "YYYY-MM-DD"
                map.set(record.date, record)
            })
        }
        return map
    }, [data])

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 2, 1))
    }

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month, 1))
    }

    const handleRefresh = useCallback(async () => {
        try {
            await refetch()
        } catch (e) {
            console.error(e)
        }
    }, [refetch])

    const renderCalendar = () => {
        const daysInMonth = new Date(year, month, 0).getDate()
        const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0 = Sun

        const days = []

        // Header
        const header = (
            <View key="header" style={styles.calendarHeader}>
                {DAYS_OF_WEEK.map(day => (
                    <Text key={day} style={styles.weekDayText}>{day}</Text>
                ))}
            </View>
        )

        // Grid
        const gridCells = []

        // Empty cells
        for (let i = 0; i < firstDayOfWeek; i++) {
            gridCells.push(<View key={`empty-${i}`} style={styles.dayCell} />)
        }

        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const record = attendanceMap.get(dateStr)
            const isSelected = selectedDate === dateStr
            const isToday = new Date().toISOString().split('T')[0] === dateStr

            let statusColor = colors.surfaceVariant // Default/Absent
            let textColor = colors.text

            if (record) {
                switch (record.status) {
                    case 'Present':
                        statusColor = colors.successLight
                        textColor = colors.success
                        break
                    case 'Absent':
                        statusColor = colors.errorLight
                        textColor = colors.error
                        break
                    case 'Leave':
                        statusColor = colors.warningLight
                        textColor = colors.warning
                        break
                    case 'WFH':
                        statusColor = colors.infoLight
                        textColor = colors.info
                        break
                    case 'Holiday':
                        statusColor = colors.successLight
                        textColor = colors.success
                        break
                    case 'Half Day':
                        statusColor = colors.warningLight
                        textColor = colors.warning
                        break
                }
            }

            gridCells.push(
                <TouchableOpacity
                    key={d}
                    style={[
                        styles.dayCell,
                        { backgroundColor: statusColor },
                        isSelected && styles.selectedDayCell,
                        isToday && styles.todayCell
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                >
                    <Text style={[styles.dayText, { color: textColor }]}>{d}</Text>
                    {record?.workHours ? (
                        <Text style={styles.hoursText}>{record.workHours}h</Text>
                    ) : null}
                </TouchableOpacity>
            )
        }

        // Fill remaining row
        const totalCells = gridCells.length
        const remaining = 7 - (totalCells % 7)
        if (remaining < 7) {
            for (let i = 0; i < remaining; i++) {
                gridCells.push(<View key={`empty-end-${i}`} style={styles.dayCell} />)
            }
        }

        // Rows
        const rows = []
        for (let i = 0; i < gridCells.length; i += 7) {
            rows.push(
                <View key={`row-${i}`} style={styles.calendarRow}>
                    {gridCells.slice(i, i + 7)}
                </View>
            )
        }

        return (
            <View style={styles.calendarContainer}>
                {header}
                {rows}
            </View>
        )
    }

    const selectedRecord = selectedDate ? attendanceMap.get(selectedDate) : null

    const showTeamPicker = ['admin', 'top_management', 'management'].includes(currentUserRole?.toLowerCase() || '')

    return (
        <View style={styles.container}>
            {showTeamPicker && teamMembersList.length > 1 && (
                <View style={styles.pickerContainer}>
                    <SearchablePicker
                        label="View Calendar"
                        selectedValue={userId || ''}
                        onValueChange={(itemValue) => {
                            setUserId(itemValue)
                            setSelectedDate(null)
                        }}
                        items={teamMembersList.map((member) => ({
                            label: member.name,
                            value: member.employeeId,
                        }))}
                    />
                </View>
            )}

            <View style={styles.monthSelector}>
                <IconButton icon="chevron-left" onPress={handlePrevMonth} />
                <Text style={styles.monthTitle}>
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <IconButton icon="chevron-right" onPress={handleNextMonth} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[colors.primary]} />
                }
            >
                {renderCalendar()}

                {selectedDate && (
                    <Card style={styles.detailsCard}>
                        <Card.Title
                            title={`Details for ${new Date(selectedDate).toDateString()}`}
                            subtitle={selectedRecord?.status || 'No Record'}
                        />
                        <Card.Content>
                            {selectedRecord ? (
                                <>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>In:</Text>
                                        <Text style={styles.value}>{selectedRecord.signInTime ? formatTimeIST(selectedRecord.signInTime) : '--:--'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Out:</Text>
                                        <Text style={styles.value}>{selectedRecord.signOutTime ? formatTimeIST(selectedRecord.signOutTime) : '--:--'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>Hours:</Text>
                                        <Text style={styles.value}>{selectedRecord.workHours || 0}</Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={styles.noDataText}>No attendance data available for this date.</Text>
                            )}
                        </Card.Content>
                    </Card>
                )}
            </ScrollView>
        </View>
    )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: materialSpacing.xl,
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: materialSpacing.sm,
        backgroundColor: colors.surface,
        elevation: 2,
    },
    monthTitle: {
        ...materialTypography.titleLarge,
        fontWeight: 'bold',
    },
    calendarContainer: {
        padding: materialSpacing.sm,
        backgroundColor: colors.surface,
        margin: materialSpacing.sm,
        borderRadius: 12,
        elevation: 1,
    },
    calendarHeader: {
        flexDirection: 'row',
        marginBottom: materialSpacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        paddingBottom: materialSpacing.xs,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        fontWeight: 'bold',
        color: colors.textSecondary,
        fontSize: 12,
    },
    calendarRow: {
        flexDirection: 'row',
        height: 50, // Fixed height for cells
        marginBottom: 4,
    },
    dayCell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginHorizontal: 2,
    },
    selectedDayCell: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    todayCell: {
        borderWidth: 1,
        borderColor: colors.secondary,
    },
    dayText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    hoursText: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    detailsCard: {
        margin: materialSpacing.md,
        backgroundColor: colors.surface,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: materialSpacing.xs,
    },
    label: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    value: {
        color: colors.text,
    },
    noDataText: {
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: materialSpacing.md,
        paddingVertical: materialSpacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    pickerLabel: {
        ...materialTypography.bodyMedium,
        color: colors.textSecondary,
        fontWeight: '600',
        marginRight: 10,
    },
    pickerWrapper: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        backgroundColor: colors.background,
        overflow: 'hidden',
        height: 45,
        justifyContent: 'center',
    },
})
