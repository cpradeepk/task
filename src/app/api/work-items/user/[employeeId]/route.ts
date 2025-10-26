/**
 * Unified Work Items API Route
 * 
 * GET /api/work-items/user/[employeeId] - Get all work items (tasks + bugs) for a user
 * 
 * This endpoint combines tasks and bugs into a unified list for the dashboard
 * Supports filtering by project, status, and type (task/bug)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTasksByEmployeeId, getSupportTasksForEmployee } from '@/lib/db/tasks'
import { getBugsByEmployeeId } from '@/lib/db/bugs'
import { getProjectById } from '@/lib/db/projects'
import { WorkItem } from '@/lib/types'

/**
 * GET /api/work-items/user/[employeeId]
 * 
 * Query parameters:
 * - type: 'task' | 'bug' | 'all' (default: 'all')
 * - projectId: Filter by project ID (optional)
 * - status: Filter by status (optional)
 * 
 * Returns a unified list of tasks and bugs with project information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all'
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    let workItems: WorkItem[] = []

    // Fetch tasks if needed
    if (type === 'all' || type === 'task') {
      const tasks = await getTasksByEmployeeId(employeeId)
      const supportTasks = await getSupportTasksForEmployee(employeeId)
      
      // Combine and deduplicate tasks
      const allTasks = [...tasks, ...supportTasks]
      const uniqueTasks = Array.from(
        new Map(allTasks.map(task => [task.taskId, task])).values()
      )

      // Convert tasks to work items
      for (const task of uniqueTasks) {
        // Get project name if project_id exists
        let projectName: string | undefined
        if (task.projectId) {
          const project = await getProjectById(task.projectId)
          projectName = project?.projectName
        }

        workItems.push({
          id: task.taskId,
          type: 'task',
          title: task.description,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assignedTo,
          dueDate: task.endDate,
          projectId: task.projectId,
          projectName: projectName,
          createdAt: task.createdAt
        })
      }
    }

    // Fetch bugs if needed
    if (type === 'all' || type === 'bug') {
      const bugs = await getBugsByEmployeeId(employeeId)

      // Convert bugs to work items
      for (const bug of bugs) {
        // Get project name if project_id exists
        let projectName: string | undefined
        if (bug.projectId) {
          const project = await getProjectById(bug.projectId)
          projectName = project?.projectName
        }

        workItems.push({
          id: bug.bugId,
          type: 'bug',
          title: bug.title,
          status: bug.status,
          priority: bug.priority,
          assignedTo: bug.assignedTo || bug.reportedBy,
          dueDate: bug.resolvedDate || '',
          projectId: bug.projectId,
          projectName: projectName,
          severity: bug.severity,
          createdAt: bug.createdAt
        })
      }
    }

    // Apply filters
    if (projectId) {
      workItems = workItems.filter(item => item.projectId === projectId)
    }

    if (status) {
      workItems = workItems.filter(item => item.status === status)
    }

    // Sort by creation date (newest first)
    workItems.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(workItems, { status: 200 })
  } catch (error) {
    console.error('Error fetching work items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch work items' },
      { status: 500 }
    )
  }
}

