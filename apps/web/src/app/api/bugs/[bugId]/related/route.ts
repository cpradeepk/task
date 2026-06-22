import { NextRequest, NextResponse } from 'next/server'
import { getBugById } from '@/lib/db/bugs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bugId: string }> }
) {
  try {
    const { bugId } = await params

    if (!bugId) {
      return NextResponse.json(
        { error: 'Bug ID is required' },
        { status: 400 }
      )
    }

    const bug = await getBugById(bugId)
    
    if (!bug) {
      return NextResponse.json(
        { error: 'Bug not found' },
        { status: 404 }
      )
    }

    // Mock empty related items for now to prevent JSON parse crashes
    return NextResponse.json({
      success: true,
      data: [],
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get related bugs:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get related bugs'
    }, { status: 500 })
  }
}
