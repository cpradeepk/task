/**
 * API Route: /api/deleted-items/permanent-delete
 * Purpose: Permanently delete soft-deleted items (admin only)
 * Methods: DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { requireRole } from '@/lib/auth-server'

export async function DELETE(request: NextRequest) {
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

    // Permanently delete the item (only if it's already soft-deleted).
    // tableName/idColumn come from a fixed switch (not user input); use pg ($1)
    // placeholders and RETURNING so we can confirm a row was actually removed.
    const rows = await query<Array<{ id: number }>>(
      `DELETE FROM ${tableName}
       WHERE ${idColumn} = $1 AND deleted_at IS NOT NULL
       RETURNING ${idColumn} AS id`,
      [id]
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found or not soft-deleted' },
        { status: 404 }
      )
    }

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

