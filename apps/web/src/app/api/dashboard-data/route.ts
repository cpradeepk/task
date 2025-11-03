import { NextRequest, NextResponse } from 'next/server'
import { withTimeout } from '@/lib/db/config'
import { getTasksByEmployeeId, getAllTasks } from '@/lib/db/tasks'
import { getBugsByEmployeeId, getAllBugs } from '@/lib/db/bugs'
import { getUsersByEmployeeIds, getAllUsers } from '@/lib/db/users'
import { getDropdownSettings } from '@/lib/db/settings'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const employeeId = sp.get('employeeId') || ''
    const role = (sp.get('role') || 'employee').toLowerCase()
    const includeUsers = sp.get('includeUsers') === 'true' || ['admin', 'top_management'].includes(role)

    // Load core data in parallel based on role
    let tasksPromise: Promise<any[]> | null = null
    let bugsPromise: Promise<any[]> | null = null
    let usersPromise: Promise<any[]> | null = null

    if (includeUsers) {
      usersPromise = withTimeout(getAllUsers(), 10000, 'Failed to fetch users')
      tasksPromise = withTimeout(getAllTasks(), 10000, 'Failed to fetch tasks')
      bugsPromise = withTimeout(getAllBugs(), 10000, 'Failed to fetch bugs')
    } else {
      tasksPromise = withTimeout(getTasksByEmployeeId(employeeId), 10000, 'Failed to fetch tasks for user')
      bugsPromise = withTimeout(getBugsByEmployeeId(employeeId), 10000, 'Failed to fetch bugs for user')
    }

    const settingsPromise = withTimeout(getDropdownSettings(), 8000, 'Failed to fetch settings')

    const [tasks, bugs, settings, users] = await Promise.all([
      tasksPromise!,
      bugsPromise!,
      settingsPromise,
      usersPromise || Promise.resolve([])
    ])

    // Build user map from referenced IDs
    const idSet = new Set<string>()
    tasks.forEach((t: any) => {
      if (t.assignedTo) idSet.add(t.assignedTo)
      if (t.assignedBy) idSet.add(t.assignedBy)
      if (Array.isArray(t.support)) t.support.forEach((s: string) => idSet.add(s))
    })
    bugs.forEach((b: any) => {
      if (b.assignedTo) idSet.add(b.assignedTo)
      if (b.assignedBy) idSet.add(b.assignedBy)
      if (b.reportedBy) idSet.add(b.reportedBy)
    })
    // Always include current user
    if (employeeId) idSet.add(employeeId)

    // If we already fetched all users (admin view), use that list to build map
    let userMap: Record<string, any> = {}
    if (users && users.length > 0 && includeUsers) {
      userMap = Object.fromEntries(users.map((u: any) => [u.employeeId, u]))
    } else {
      const ids = Array.from(idSet)
      const batchUsers = ids.length > 0 ? await withTimeout(getUsersByEmployeeIds(ids), 8000, 'Failed to fetch users batch') : []
      userMap = Object.fromEntries(batchUsers.map((u: any) => [u.employeeId, u]))
    }

    const payload = {
      success: true,
      data: {
        tasks,
        bugs,
        settings,
        users: includeUsers ? (users || []) : undefined,
        userMap,
        counts: { tasks: tasks.length, bugs: bugs.length, users: includeUsers ? (users?.length || 0) : Object.keys(userMap).length }
      },
      source: 'database'
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return res
  } catch (error: any) {
    console.error('Error in GET /api/dashboard-data:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed to load dashboard data' }, { status: 500 })
  }
}

