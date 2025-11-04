import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [DIAGNOSTIC] Checking activity_log schema...')

    // Check schema
    const schemaResult = await query<any[]>(
      `SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'activity_log'
      ORDER BY ordinal_position`
    )

    console.log('📊 [DIAGNOSTIC] Schema columns:', schemaResult.map(r => r.column_name))

    // Check if is_comment exists
    const hasIsComment = schemaResult.some(row => row.column_name === 'is_comment')

    // Get most recent record
    let recentRecord = null
    try {
      const recordResult = await query<any[]>(
        `SELECT id, entity_id, action_type, is_comment, description, created_at
        FROM activity_log
        ORDER BY id DESC
        LIMIT 1`
      )
      recentRecord = recordResult.length > 0 ? recordResult[0] : null
      
      if (recentRecord) {
        console.log('📝 [DIAGNOSTIC] Recent record:', {
          id: recentRecord.id,
          is_comment: recentRecord.is_comment,
          is_comment_type: typeof recentRecord.is_comment
        })
      }
    } catch (error) {
      console.error('❌ [DIAGNOSTIC] Error fetching record:', error)
    }

    return NextResponse.json({
      success: true,
      schema: schemaResult,
      hasIsComment,
      recentRecord,
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'
    })
  } catch (error: any) {
    console.error('❌ [DIAGNOSTIC] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'
      },
      { status: 500 }
    )
  }
}

