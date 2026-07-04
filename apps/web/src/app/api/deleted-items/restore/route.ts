/**
 * API Route: /api/deleted-items/restore
 * Purpose: Restore soft-deleted items (admin only)
 * Methods: POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { requireRole } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'top_management'])
    if (!auth.ok) return auth.response

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

    // Restore the item by clearing deleted_at/deleted_by. Use pg ($1)
    // placeholders and RETURNING to confirm a row was restored.
    const rows = await query<Array<{ id: number }>>(
      `UPDATE ${tableName}
       SET deleted_at = NULL, deleted_by = NULL
       WHERE ${idColumn} = $1 AND deleted_at IS NOT NULL
       RETURNING ${idColumn} AS id`,
      [id]
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found or not deleted' },
        { status: 404 }
      )
    }

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

