/**
 * API Route: /api/deleted-items/permanent-delete
 * Purpose: Permanently delete soft-deleted items (admin only)
 * Methods: DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'

export async function DELETE(request: NextRequest) {
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

    // Permanently delete the item (only if it's already soft-deleted)
    const result = await query(
      `DELETE FROM ${tableName} 
       WHERE ${idColumn} = ? AND deleted_at IS NOT NULL`,
      [id]
    )

    return NextResponse.json({
      success: true,
      message: `${itemType} permanently deleted`
    })
  } catch (error) {
    console.error('Error permanently deleting item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete item' },
      { status: 500 }
    )
  }
}

