import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'

/**
 * GET /api/relationships
 * Get all relationships for a specific task or development item
 * Query params:
 * - id: string (task ID or development ID)
 * - type: 'task' | 'development'
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json(
        { success: false, error: 'id and type are required' },
        { status: 400 }
      )
    }

    if (type !== 'task' && type !== 'development') {
      return NextResponse.json(
        { success: false, error: 'type must be "task" or "development"' },
        { status: 400 }
      )
    }

    let relationships: any[] = []

    if (type === 'task') {
      // Get task-to-task relationships
      const taskToTask = await query(
        `SELECT tr.*, t.task_id, t.name, t.description, t.status, t.priority
         FROM task_relationships tr
         JOIN tasks t ON tr.target_task_id = t.task_id
         WHERE tr.source_task_id = $1 AND tr.deleted_at IS NULL`,
        [id]
      )

      // Get task-to-development relationships
      const taskToDev = await query(
        `SELECT tdr.*, b.bug_id, b.title as name, b.description, b.status, b.priority
         FROM task_development_relationships tdr
         JOIN bugs b ON tdr.target_dev_id = b.bug_id
         WHERE tdr.source_task_id = $1 AND tdr.deleted_at IS NULL`,
        [id]
      )

      relationships = [
        ...taskToTask.rows.map((r: any) => ({ ...r, targetType: 'task' })),
        ...taskToDev.rows.map((r: any) => ({ ...r, targetType: 'development' }))
      ]
    } else {
      // Get development-to-development relationships
      const devToDev = await query(
        `SELECT dr.*, b.bug_id, b.title as name, b.description, b.status, b.priority
         FROM development_relationships dr
         JOIN bugs b ON dr.target_dev_id = b.bug_id
         WHERE dr.source_dev_id = $1 AND dr.deleted_at IS NULL`,
        [id]
      )

      // Get development-to-task relationships (reverse of task-to-development)
      const devToTask = await query(
        `SELECT tdr.*, t.task_id, t.name, t.description, t.status, t.priority
         FROM task_development_relationships tdr
         JOIN tasks t ON tdr.source_task_id = t.task_id
         WHERE tdr.target_dev_id = $1 AND tdr.deleted_at IS NULL`,
        [id]
      )

      relationships = [
        ...devToDev.rows.map((r: any) => ({ ...r, targetType: 'development' })),
        ...devToTask.rows.map((r: any) => ({ ...r, targetType: 'task', relationshipType: reverseRelationshipType(r.relationship_type) }))
      ]
    }

    return NextResponse.json({
      success: true,
      data: relationships
    })
  } catch (error) {
    console.error('Error fetching relationships:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch relationships' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/relationships
 * Create a new relationship between tasks/development items
 * Body: {
 *   sourceId: string
 *   sourceType: 'task' | 'development'
 *   targetId: string
 *   targetType: 'task' | 'development'
 *   relationshipType: 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates'
 *   createdBy: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceId, sourceType, targetId, targetType, relationshipType, createdBy } = body

    // Validation
    if (!sourceId || !sourceType || !targetId || !targetType || !relationshipType || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    const validTypes = ['task', 'development']
    const validRelationships = ['blocks', 'is_blocked_by', 'relates_to', 'duplicates']

    if (!validTypes.includes(sourceType) || !validTypes.includes(targetType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid source or target type' },
        { status: 400 }
      )
    }

    if (!validRelationships.includes(relationshipType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid relationship type' },
        { status: 400 }
      )
    }

    // Determine which table to use
    let tableName: string
    let sourceCol: string
    let targetCol: string

    if (sourceType === 'task' && targetType === 'task') {
      tableName = 'task_relationships'
      sourceCol = 'source_task_id'
      targetCol = 'target_task_id'
    } else if (sourceType === 'task' && targetType === 'development') {
      tableName = 'task_development_relationships'
      sourceCol = 'source_task_id'
      targetCol = 'target_dev_id'
    } else if (sourceType === 'development' && targetType === 'development') {
      tableName = 'development_relationships'
      sourceCol = 'source_dev_id'
      targetCol = 'target_dev_id'
    } else {
      // development to task - use task_development_relationships in reverse
      return NextResponse.json(
        { success: false, error: 'Development-to-task relationships not supported directly. Create task-to-development instead.' },
        { status: 400 }
      )
    }

    // Insert the relationship
    const result = await query(
      `INSERT INTO ${tableName} (${sourceCol}, ${targetCol}, relationship_type, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [sourceId, targetId, relationshipType, createdBy]
    )

    // Create bidirectional relationship for certain types
    const reverseType = reverseRelationshipType(relationshipType)
    if (reverseType) {
      await query(
        `INSERT INTO ${tableName} (${sourceCol}, ${targetCol}, relationship_type, created_by, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [targetId, sourceId, reverseType, createdBy]
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error creating relationship:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create relationship' },
      { status: 500 }
    )
  }
}

// Helper function to get reverse relationship type
function reverseRelationshipType(type: string): string | null {
  const reverseMap: Record<string, string> = {
    'blocks': 'is_blocked_by',
    'is_blocked_by': 'blocks',
    'duplicates': 'duplicates', // symmetric
    'relates_to': 'relates_to'  // symmetric
  }
  return reverseMap[type] || null
}

