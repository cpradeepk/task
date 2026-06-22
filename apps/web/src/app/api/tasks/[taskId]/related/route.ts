import { NextRequest, NextResponse } from 'next/server'
import { getTaskById } from '@/lib/db/tasks'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const task = await getTaskById(taskId)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // In a full implementation, you would fetch tasks related to this one.
    // Here we're mocking empty related items for now to prevent the JSON parse crash on mobile.
    // You can implement the actual logic by querying tasks where related_tasks contains this ID
    
    return NextResponse.json({
      success: true,
      data: [],
      source: 'mysql'
    })
  } catch (error) {
    console.error('Failed to get related tasks:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get related tasks'
    }, { status: 500 })
  }
}
