/**
 * API Route: /api/deleted-items/restore
 * Purpose: Restore soft-deleted items (admin only)
 * Methods: POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemType, id } = body

    if (!itemType || !id) {
      return NextResponse.json(
        { success: false, error: 'Missing itemType or id' },
        { status: 400 }
      )
    }

    let tableName: string
    let idColumn: string

    // Determine table and ID column based on item type
    switch (itemType) {
      case 'project':
        tableName = 'projects'
        idColumn = 'id'
        break
      case 'task':
        tableName = 'tasks'
        idColumn = 'id'
        break
      case 'subtask':
        tableName = 'subtasks'
        idColumn = 'id'
        break
      case 'bug':
        tableName = 'bugs'
        idColumn = 'id'
        break
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid item type' },
          { status: 400 }
        )
    }

    // Restore the item by setting deleted_at and deleted_by to NULL
    await query(
      `UPDATE ${tableName} 
       SET deleted_at = NULL, deleted_by = NULL 
       WHERE ${idColumn} = ?`,
      [id]
    )

    return NextResponse.json({
      success: true,
      message: `${itemType} restored successfully`
    })
  } catch (error) {
    console.error('Error restoring item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to restore item' },
      { status: 500 }
    )
  }
}

