import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'

/**
 * DELETE /api/relationships/[id]
 * Soft delete a relationship
 * Query params:
 * - type: 'task' | 'task-development' | 'development' (which table to delete from)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'type query parameter is required' },
        { status: 400 }
      )
    }

    let tableName: string
    if (type === 'task') {
      tableName = 'task_relationships'
    } else if (type === 'task-development') {
      tableName = 'task_development_relationships'
    } else if (type === 'development') {
      tableName = 'development_relationships'
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "task", "task-development", or "development"' },
        { status: 400 }
      )
    }

    // Soft delete the relationship
    await query(
      `UPDATE ${tableName} SET deleted_at = NOW() WHERE id = $1`,
      [parseInt(id)]
    )

    return NextResponse.json({
      success: true,
      message: 'Relationship deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting relationship:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete relationship' },
      { status: 500 }
    )
  }
}

