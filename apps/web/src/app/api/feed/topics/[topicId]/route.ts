/**
 * API Route: /api/feed/topics/[topicId]
 * Purpose: Update or delete a specific feed topic (admin only)
 * Methods: PATCH, DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'
import { getAuthUser } from '@/lib/auth-server'

/**
 * PATCH /api/feed/topics/[topicId]
 * Update a topic (admin only)
 * Body: { topicName?, description?, icon?, displayOrder? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is system admin
    const userResult = await query(
      `SELECT is_system_admin FROM users WHERE employee_id = $1`,
      [user.employeeId]
    )

    if (!userResult[0] || userResult[0].is_system_admin !== 1) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const { topicId } = await params
    const body = await request.json()
    const { topicName, description, icon, displayOrder } = body

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (topicName !== undefined) {
      updates.push(`topic_name = $${paramIndex++}`)
      values.push(topicName)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(description)
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`)
      values.push(icon)
    }
    if (displayOrder !== undefined) {
      updates.push(`display_order = $${paramIndex++}`)
      values.push(displayOrder)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(topicId)

    const result = await query(
      `UPDATE feed_topics 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    )

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Topic not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result[0]
    })
  } catch (error: any) {
    console.error('Error updating feed topic:', error)
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Topic name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update topic' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/feed/topics/[topicId]
 * Soft delete a topic (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is system admin
    const userResult = await query(
      `SELECT is_system_admin FROM users WHERE employee_id = $1`,
      [user.employeeId]
    )

    if (!userResult[0] || userResult[0].is_system_admin !== 1) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const { topicId } = await params

    // Soft delete the topic
    const result = await query(
      `UPDATE feed_topics 
       SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [user.employeeId, topicId]
    )

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Topic not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Topic deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting feed topic:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete topic' },
      { status: 500 }
    )
  }
}

