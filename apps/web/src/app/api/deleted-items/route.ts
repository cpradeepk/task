/**
 * API Route: /api/deleted-items
 * Purpose: Fetch all soft-deleted items across the system (admin only)
 * Methods: GET
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'

interface DeletedProject {
  id: string
  projectId: string
  projectName: string
  description: string | null
  deletedAt: string
  deletedBy: string
  itemType: 'project'
}

interface DeletedTask {
  id: number
  taskId: string
  description: string
  assignedTo: string
  status: string
  priority: string
  deletedAt: string
  deletedBy: string
  itemType: 'task'
}

interface DeletedSubTask {
  id: number
  parentTaskId: string
  description: string
  assignedTo: string
  status: string
  deletedAt: string
  deletedBy: string
  itemType: 'subtask'
}

interface DeletedBug {
  id: number
  bugId: string
  title: string
  severity: string
  status: string
  assignedTo: string
  deletedAt: string
  deletedBy: string
  itemType: 'bug'
}

type DeletedItem = DeletedProject | DeletedTask | DeletedSubTask | DeletedBug

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get('type') // 'all', 'project', 'task', 'subtask', 'bug'

    const deletedItems: DeletedItem[] = []

    // Fetch deleted projects
    if (!itemType || itemType === 'all' || itemType === 'project') {
      const deletedProjects = await query<any[]>(
        `SELECT 
          id,
          project_id as projectId,
          project_name as projectName,
          description,
          deleted_at as deletedAt,
          deleted_by as deletedBy
         FROM projects 
         WHERE deleted_at IS NOT NULL 
         ORDER BY deleted_at DESC`
      )

      deletedProjects.forEach(project => {
        deletedItems.push({
          ...project,
          itemType: 'project'
        })
      })
    }

    // Fetch deleted tasks
    if (!itemType || itemType === 'all' || itemType === 'task') {
      const deletedTasks = await query<any[]>(
        `SELECT 
          id,
          task_id as taskId,
          description,
          assigned_to as assignedTo,
          status,
          priority,
          deleted_at as deletedAt,
          deleted_by as deletedBy
         FROM tasks 
         WHERE deleted_at IS NOT NULL 
         ORDER BY deleted_at DESC`
      )

      deletedTasks.forEach(task => {
        deletedItems.push({
          ...task,
          itemType: 'task'
        })
      })
    }

    // Fetch deleted subtasks
    if (!itemType || itemType === 'all' || itemType === 'subtask') {
      const deletedSubTasks = await query<any[]>(
        `SELECT 
          id,
          parent_task_id as parentTaskId,
          description,
          assigned_to as assignedTo,
          status,
          deleted_at as deletedAt,
          deleted_by as deletedBy
         FROM subtasks 
         WHERE deleted_at IS NOT NULL 
         ORDER BY deleted_at DESC`
      )

      deletedSubTasks.forEach(subtask => {
        deletedItems.push({
          ...subtask,
          itemType: 'subtask'
        })
      })
    }

    // Fetch deleted bugs
    if (!itemType || itemType === 'all' || itemType === 'bug') {
      const deletedBugs = await query<any[]>(
        `SELECT 
          id,
          bug_id as bugId,
          title,
          severity,
          status,
          assigned_to as assignedTo,
          deleted_at as deletedAt,
          deleted_by as deletedBy
         FROM bugs 
         WHERE deleted_at IS NOT NULL 
         ORDER BY deleted_at DESC`
      )

      deletedBugs.forEach(bug => {
        deletedItems.push({
          ...bug,
          itemType: 'bug'
        })
      })
    }

    // Sort all items by deletedAt (most recent first)
    deletedItems.sort((a, b) => {
      const dateA = new Date(a.deletedAt).getTime()
      const dateB = new Date(b.deletedAt).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      data: deletedItems,
      count: {
        total: deletedItems.length,
        projects: deletedItems.filter(item => item.itemType === 'project').length,
        tasks: deletedItems.filter(item => item.itemType === 'task').length,
        subtasks: deletedItems.filter(item => item.itemType === 'subtask').length,
        bugs: deletedItems.filter(item => item.itemType === 'bug').length
      }
    })
  } catch (error) {
    console.error('Error fetching deleted items:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deleted items' },
      { status: 500 }
    )
  }
}

