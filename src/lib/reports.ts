'use client'

import { Task, User, LeaveApplication, WFHApplication, DailyReport, MonthlyReport } from './types'
import { getAllUsers } from './auth'
import { DateUtils } from './dateUtils'

// Helper functions to fetch data from APIs
async function fetchTasks(): Promise<Task[]> {
  try {
    const response = await fetch('/api/tasks')
    const result = await response.json()
    return result.success ? result.data : []
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

async function fetchLeaveApplications(): Promise<LeaveApplication[]> {
  try {
    const response = await fetch('/api/leaves')
    const result = await response.json()
    return result.success ? result.data : []
  } catch (error) {
    console.error('Error fetching leave applications:', error)
    return []
  }
}

async function fetchWFHApplications(): Promise<WFHApplication[]> {
  try {
    const response = await fetch('/api/wfh')
    const result = await response.json()
    return result.success ? result.data : []
  } catch (error) {
    console.error('Error fetching WFH applications:', error)
    return []
  }
}

// Daily Performance Report
export async function generateDailyReport(date: string): Promise<DailyReport[]> {
  const tasks = await fetchTasks()
  const users = await getAllUsers()
  const reports: DailyReport[] = []

  users.forEach(user => {
    if (user.status !== 'active') return

    const userTasks = tasks.filter(task => task.assignedTo === user.employeeId)
    
    // Filter tasks for the specific date
    const dateTasks = userTasks.filter(task => {
      const taskStart = new Date(task.startDate)
      const taskEnd = new Date(task.endDate)
      const reportDate = new Date(date)
      
      return reportDate >= taskStart && reportDate <= taskEnd
    })

    // Calculate statistics
    const totalTasks = dateTasks.length
    const tasksInProgress = dateTasks.filter(task => task.status === 'In Progress').length
    const tasksDelayed = dateTasks.filter(task => task.status === 'Delayed').length
    const tasksCompleted = dateTasks.filter(task => task.status === 'Done').length

    // Calculate hours worked from user's Hours Log for this specific date
    const hoursWorked = DateUtils.parseHoursFromLog(user.hoursLog || '', date)

    // Calculate MTD (Month-to-Date) statistics
    const monthStart = new Date(date)
    monthStart.setDate(1)
    
    const mtdTasks = userTasks.filter(task => {
      const taskDate = new Date(task.updatedAt)
      return taskDate >= monthStart && taskDate <= new Date(date) && task.status === 'Done'
    })

    const tasksCompletedMTD = mtdTasks.length

    // Calculate MTD hours from Hours Log
    let hoursMTD = 0
    const reportDate = new Date(date)

    for (let d = new Date(monthStart); d <= reportDate; d.setDate(d.getDate() + 1)) {
      const dayString = d.toISOString().split('T')[0]
      hoursMTD += DateUtils.parseHoursFromLog(user.hoursLog || '', dayString)
    }

    reports.push({
      date,
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

  return reports.filter(report => report.totalTasks > 0)
}

// Monthly Summary Report
export async function generateMonthlyReport(month: string, year: number): Promise<MonthlyReport[]> {
  const users = await getAllUsers()
  const leaveApplications = await fetchLeaveApplications()
  const wfhApplications = await fetchWFHApplications()
  const tasks = await fetchTasks()
  const reports: MonthlyReport[] = []

  users.forEach(user => {
    if (user.status !== 'active') return

    // Filter applications for the specific month/year
    const monthStart = new Date(year, parseInt(month) - 1, 1)
    const monthEnd = new Date(year, parseInt(month), 0)

    const userLeaves = leaveApplications.filter(app => {
      const appDate = new Date(app.fromDate)
      return app.employeeId === user.employeeId && 
             appDate >= monthStart && 
             appDate <= monthEnd &&
             app.status === 'Approved'
    })

    const userWFHs = wfhApplications.filter(app => {
      const appDate = new Date(app.fromDate)
      return app.employeeId === user.employeeId && 
             appDate >= monthStart && 
             appDate <= monthEnd &&
             app.status === 'Approved'
    })

    // Calculate total hours worked in the month from Hours Log
    let totalHoursWorked = 0
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dayString = d.toISOString().split('T')[0]
      totalHoursWorked += DateUtils.parseHoursFromLog(user.hoursLog || '', dayString)
    }

    reports.push({
      month,
      year,
      employeeId: user.employeeId,
      employeeName: user.name,
      totalLeaves: userLeaves.length,
      totalWFH: userWFHs.length,
      totalHoursWorked,
      warningCount: user.warningCount
    })
  })

  return reports
}

// Team Task Overview Report
export async function generateTeamTaskReport(date: string, managerId?: string): Promise<any> {
  const tasks = await fetchTasks()
  const users = await getAllUsers()
  
  // Filter tasks for the specific date
  const dateTasks = tasks.filter(task => {
    const taskStart = new Date(task.startDate)
    const taskEnd = new Date(task.endDate)
    const reportDate = new Date(date)
    
    return reportDate >= taskStart && reportDate <= taskEnd
  })

  // Group tasks by employee
  const teamTasks: { [key: string]: Task[] } = {}
  
  dateTasks.forEach(task => {
    if (!teamTasks[task.assignedTo]) {
      teamTasks[task.assignedTo] = []
    }
    teamTasks[task.assignedTo].push(task)
  })

  // Convert to array format with employee details
  const teamTasksArray = Object.entries(teamTasks).map(([employeeName, tasks]) => {
    const user = users.find(u => u.name === employeeName)
    return {
      employeeId: user?.employeeId || '',
      employeeName,
      tasks
    }
  })

  return {
    date,
    managerId: managerId || '',
    teamTasks: teamTasksArray
  }
}

// Utility functions for report calculations
export function calculateTaskCompletionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  const completedTasks = tasks.filter(task => task.status === 'Done').length
  return Math.round((completedTasks / tasks.length) * 100)
}

export function calculateAverageHoursPerTask(tasks: Task[]): number {
  const completedTasks = tasks.filter(task => task.status === 'Done' && task.actualHours)
  if (completedTasks.length === 0) return 0
  
  const totalHours = completedTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0)
  return Math.round((totalHours / completedTasks.length) * 10) / 10
}

export function getTaskStatusDistribution(tasks: Task[]): { [key: string]: number } {
  const distribution: { [key: string]: number } = {}
  
  tasks.forEach(task => {
    distribution[task.status] = (distribution[task.status] || 0) + 1
  })
  
  return distribution
}

export function formatReportDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatMonthYear(month: string, year: number): string {
  const date = new Date(year, parseInt(month) - 1, 1)
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long'
  })
}
