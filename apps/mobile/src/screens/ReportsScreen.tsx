import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { Card, Text, Button, ActivityIndicator, IconButton, Divider, Chip } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { useProjectFilter } from '../contexts/ProjectFilterContext'
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getUserData } from '../utils/secureStorage'
import { materialSpacing, materialTypography, materialColors } from '../config/materialTheme'
import { useResponsive } from '../hooks/useResponsive'
import apiClient from '../services/apiClient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { SearchablePicker } from '../components/SearchablePicker'

// Helper class for parsing hours log
class DateUtils {
  static parseHoursFromLog(hoursLog: string, dateStr: string): number {
    if (!hoursLog) return 0
    try {
      // Typically hoursLog is a JSON string of date -> hours
      const logObj = JSON.parse(hoursLog)
      return parseFloat(logObj[dateStr]) || 0
    } catch {
      // Fallback if it's stored differently
      return 0
    }
  }
}

export default function ReportsScreen() {
  const { selectedProjectIds } = useProjectFilter()
  const { colors } = useTheme()
  const responsive = useResponsive()
  const navigation = useNavigation()
  const styles = useMemo(() => getStyles(colors, responsive), [colors, responsive])

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'team'>('daily')

  // Date selection states
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1) // default to yesterday
    return d
  })
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return String(new Date().getMonth() + 1).padStart(2, '0')
  })
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return new Date().getFullYear()
  })

  // Reports data states
  const [dailyReports, setDailyReports] = useState<any[]>([])
  const [monthlyReports, setMonthlyReports] = useState<any[]>([])
  const [teamReports, setTeamReports] = useState<any[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getUserData().then(setCurrentUser)
  }, [])

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false)
    if (date) {
      setSelectedDate(date)
    }
  }

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    setDailyReports([])
    setMonthlyReports([])
    setTeamReports([])

    try {
      // Fetch users (needed for all reports)
      const usersRes = await apiClient.get('/api/users?includeInactive=false')
      const users: any[] = (usersRes && usersRes.success ? usersRes.data : usersRes) || []

      // Fetch tasks (needed for daily & team & monthly)
      const tasksRes = await apiClient.get('/api/tasks?scopeByUserProjects=true&limit=1000')
      let tasks: any[] = (tasksRes && tasksRes.success ? tasksRes.data : tasksRes) || []

      if (selectedProjectIds && selectedProjectIds.length > 0) {
        tasks = tasks.filter(task => task.projectId && selectedProjectIds.includes(task.projectId))
      }

      const targetDateStr = selectedDate.toISOString().split('T')[0]

      if (reportType === 'daily') {
        const reports: any[] = []
        users.forEach(user => {
          if (user.status !== 'active') return

          // Filter tasks assigned to this user
          const userTasks = tasks.filter(task => {
            const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]
            return assignees.includes(user.employeeId)
          })

          // Overlaps targetDateStr
          const dateTasks = userTasks.filter(task => {
            const start = new Date(task.startDate)
            const end = new Date(task.endDate)
            const reportDate = new Date(targetDateStr)
            return reportDate >= start && reportDate <= end
          })

          const totalTasks = dateTasks.length
          const tasksInProgress = dateTasks.filter(t => t.status === 'In Progress').length
          const tasksDelayed = dateTasks.filter(t => t.status === 'Delayed').length
          const tasksCompleted = dateTasks.filter(t => t.status === 'Done').length

          // Daily hours from hoursLog
          const hoursWorked = DateUtils.parseHoursFromLog(user.hoursLog || '', targetDateStr)

          // Month to date completed tasks count
          const monthStart = new Date(targetDateStr)
          monthStart.setDate(1)

          const mtdTasks = userTasks.filter(task => {
            const taskDate = new Date(task.updatedAt)
            return taskDate >= monthStart && taskDate <= new Date(targetDateStr) && task.status === 'Done'
          })

          const tasksCompletedMTD = mtdTasks.length

          // MTD Hours
          let hoursMTD = 0
          const reportDate = new Date(targetDateStr)
          for (let d = new Date(monthStart); d <= reportDate; d.setDate(d.getDate() + 1)) {
            const dayString = d.toISOString().split('T')[0]
            hoursMTD += DateUtils.parseHoursFromLog(user.hoursLog || '', dayString)
          }

          reports.push({
            employeeId: user.employeeId,
            employeeName: user.name,
            totalTasks,
            tasksInProgress,
            tasksDelayed,
            tasksCompleted,
            hoursWorked,
            tasksCompletedMTD,
            hoursMTD
          })
        })

        let filteredDaily = reports.filter(r => r.totalTasks > 0 || r.hoursWorked > 0)
        if (selectedProjectIds && selectedProjectIds.length > 0 && currentUser?.employeeId) {
          filteredDaily = filteredDaily.filter(r => r.employeeId === currentUser.employeeId)
        }
        setDailyReports(filteredDaily)

      } else if (reportType === 'monthly') {
        // Fetch leaves & wfh
        const leavesRes = await apiClient.get('/api/leaves')
        const leaves: any[] = (leavesRes && leavesRes.success ? leavesRes.data : leavesRes) || []

        const wfhRes = await apiClient.get('/api/wfh')
        const wfh: any[] = (wfhRes && wfhRes.success ? wfhRes.data : wfhRes) || []

        const monthNum = parseInt(selectedMonth)
        const monthStart = new Date(selectedYear, monthNum - 1, 1)
        const monthEnd = new Date(selectedYear, monthNum, 0)

        const reports: any[] = []
        users.forEach(user => {
          if (user.status !== 'active') return

          const userLeaves = leaves.filter(app => {
            const appDate = new Date(app.fromDate)
            return app.employeeId === user.employeeId &&
                   appDate >= monthStart &&
                   appDate <= monthEnd &&
                   app.status === 'Approved'
          })

          const userWFHs = wfh.filter(app => {
            const appDate = new Date(app.fromDate)
            return app.employeeId === user.employeeId &&
                   appDate >= monthStart &&
                   appDate <= monthEnd &&
                   app.status === 'Approved'
          })

          // Monthly hours sum
          let totalHoursWorked = 0
          for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dayString = d.toISOString().split('T')[0]
            totalHoursWorked += DateUtils.parseHoursFromLog(user.hoursLog || '', dayString)
          }

          reports.push({
            employeeId: user.employeeId,
            employeeName: user.name,
            totalLeaves: userLeaves.length,
            totalWFH: userWFHs.length,
            totalHoursWorked,
            warningCount: user.warningCount || 0
          })
        })

        let filteredMonthly = reports
        if (selectedProjectIds && selectedProjectIds.length > 0 && currentUser?.employeeId) {
          filteredMonthly = filteredMonthly.filter(r => r.employeeId === currentUser.employeeId)
        }
        setMonthlyReports(filteredMonthly)

      } else if (reportType === 'team') {
        // Find tasks on date
        const dateTasks = tasks.filter(task => {
          const start = new Date(task.startDate)
          const end = new Date(task.endDate)
          const reportDate = new Date(targetDateStr)
          return reportDate >= start && reportDate <= end
        })

        const teamMap: Record<string, any[]> = {}
        dateTasks.forEach(task => {
          const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]
          assignees.forEach((assignee: string) => {
            if (!teamMap[assignee]) {
              teamMap[assignee] = []
            }
            teamMap[assignee].push(task)
          })
        })

        const reports = Object.entries(teamMap).map(([empId, userTasks]) => {
          const userObj = users.find(u => u.employeeId === empId || u.name === empId)
          return {
            employeeId: userObj?.employeeId || empId,
            employeeName: userObj?.name || empId,
            tasks: userTasks
          }
        })

        let filteredTeam = reports
        if (selectedProjectIds && selectedProjectIds.length > 0 && currentUser?.employeeId) {
          filteredTeam = filteredTeam.filter(r => r.employeeId === currentUser.employeeId || r.employeeName === currentUser.name)
        }
        setTeamReports(filteredTeam)
      }

    } catch (err) {
      console.error(err)
      setError('Failed to generate report data')
    } finally {
      setLoading(false)
    }
  }

  const formatReportDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <View style={styles.container}>
      {/* Report selection and parameters card */}
      <Card style={styles.paramsCard}>
        <Card.Content style={{ gap: 12 }}>
          <SearchablePicker
            label="Report Type"
            selectedValue={reportType}
            onValueChange={(val: any) => {
              setReportType(val)
              setError(null)
              setDailyReports([])
              setMonthlyReports([])
              setTeamReports([])
            }}
            items={[
              { label: 'Daily Performance', value: 'daily' },
              { label: 'Monthly Summary', value: 'monthly' },
              { label: 'Team Task Overview', value: 'team' },
            ]}
          />

          {reportType === 'daily' || reportType === 'team' ? (
            <View>
              <Text style={styles.selectLabel}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateSelector}>
                <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.dateSelectorText}>{formatReportDate(selectedDate)}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <SearchablePicker
                  label="Month"
                  selectedValue={selectedMonth}
                  onValueChange={setSelectedMonth}
                  items={months.map(m => ({ label: m.label, value: m.value }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SearchablePicker
                  label="Year"
                  selectedValue={String(selectedYear)}
                  onValueChange={(val: any) => setSelectedYear(Number(val))}
                  items={years.map(y => ({ label: String(y), value: String(y) }))}
                />
              </View>
            </View>
          )}

          <Button
            mode="contained"
            icon="chart-bar"
            onPress={generateReport}
            loading={loading}
            disabled={loading}
            style={styles.generateBtn}
          >
            Generate Report
          </Button>
        </Card.Content>
      </Card>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} style={styles.resultsScroll}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <IconButton icon="alert-circle-outline" size={48} iconColor={materialColors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            {/* Daily Report Rendering */}
            {reportType === 'daily' && dailyReports.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.reportTitle}>Daily Performance - {selectedDate.toLocaleDateString()}</Text>
                {dailyReports.map(r => (
                  <Card key={r.employeeId} style={styles.reportCard}>
                    <Card.Content>
                      <Text style={styles.empName}>{r.employeeName} ({r.employeeId})</Text>
                      <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Tasks</Text>
                          <Text style={styles.statVal}>{r.totalTasks}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Completed</Text>
                          <Text style={styles.statVal}>{r.tasksCompleted}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Worked</Text>
                          <Text style={styles.statVal}>{r.hoursWorked}h</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>MTD Done</Text>
                          <Text style={styles.statVal}>{r.tasksCompletedMTD} ({r.hoursMTD}h)</Text>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : null}

            {/* Monthly Summary Rendering */}
            {reportType === 'monthly' && monthlyReports.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.reportTitle}>Monthly Summary - {selectedMonth}/{selectedYear}</Text>
                {monthlyReports.map(r => (
                  <Card key={r.employeeId} style={styles.reportCard}>
                    <Card.Content>
                      <Text style={styles.empName}>{r.employeeName} ({r.employeeId})</Text>
                      <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Leaves</Text>
                          <Text style={styles.statVal}>{r.totalLeaves}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>WFH</Text>
                          <Text style={styles.statVal}>{r.totalWFH}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Hours</Text>
                          <Text style={styles.statVal}>{r.totalHoursWorked}h</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>Warnings</Text>
                          <Chip compact style={{ backgroundColor: r.warningCount > 0 ? colors.errorLight : colors.successLight }} textStyle={{ fontSize: 10, color: r.warningCount > 0 ? colors.error : colors.success }}>
                            {r.warningCount}
                          </Chip>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : null}

            {/* Team Task Overview Rendering */}
            {reportType === 'team' && teamReports.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Text style={styles.reportTitle}>Team Task Overview - {selectedDate.toLocaleDateString()}</Text>
                {teamReports.map(member => (
                  <Card key={member.employeeId} style={styles.reportCard}>
                    <Card.Content>
                      <Text style={styles.empName}>{member.employeeName} ({member.employeeId})</Text>
                      <Text style={styles.metaLabel}>{member.tasks.length} tasks scheduled</Text>
                      <Divider style={{ marginVertical: 8 }} />
                      <View style={{ gap: 8 }}>
                        {member.tasks.map((task: any) => (
                          <View key={task.id} style={styles.teamTaskRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.taskDesc}>{task.description}</Text>
                              <Text style={styles.taskId}>{task.taskId}</Text>
                            </View>
                            <Chip compact style={{ height: 24, justifyContent: 'center' }}>{task.status}</Chip>
                            <Text style={styles.taskHrs}>{task.actualHours || 0}h / {task.estimatedHours}h</Text>
                          </View>
                        ))}
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : null}

            {/* Empty States */}
            {!loading && dailyReports.length === 0 && monthlyReports.length === 0 && teamReports.length === 0 && (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="google-analytics" size={64} color={colors.textTertiary} />
                <Text style={styles.emptyText}>Tap Generate to generate report metrics</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  )
}

const getStyles = (colors: any, responsive: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  paramsCard: {
    margin: materialSpacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    gap: 8,
  },
  dateSelectorText: {
    ...materialTypography.bodyMedium,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
  },
  generateBtn: {
    marginTop: 8,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContainer: {
    paddingHorizontal: materialSpacing.md,
  },
  reportTitle: {
    ...materialTypography.titleMedium,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    marginBottom: 8,
  },
  empName: {
    ...materialTypography.titleMedium,
    fontWeight: 'bold',
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-between',
    gap: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  loader: {
    marginTop: 40,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...materialTypography.bodyMedium,
    color: materialColors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...materialTypography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  teamTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    gap: 8,
  },
  taskDesc: {
    ...materialTypography.bodySmall,
    fontWeight: 'bold',
    color: colors.text,
  },
  taskId: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  taskHrs: {
    fontSize: 11,
    color: colors.text,
    width: 60,
    textAlign: 'right',
  },
})
