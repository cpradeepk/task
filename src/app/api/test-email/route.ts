import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/email/service'

export async function GET() {
  try {
    console.log('🔍 Testing email service status...')

    // Test email service status
    const status = emailService.getStatus()
    const isAvailable = await emailService.isAvailableAsync()

    console.log('📧 Email service status:', status)
    console.log('📧 Email service available:', isAvailable)

    return NextResponse.json({
      success: true,
      message: 'Email service status',
      data: {
        ...status,
        availableAsync: isAvailable,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Email service test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test email service',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, ...data } = await request.json()
    
    const isAvailable = await emailService.isAvailableAsync()
    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        error: 'Email service is not available'
      }, { status: 503 })
    }

    let result
    
    switch (type) {
      case 'task_created':
        result = await emailService.sendTaskCreatedEmail({
          creatorName: data.creatorName || 'Test User',
          creatorEmail: data.creatorEmail || 'test@example.com',
          managerEmail: data.managerEmail,
          taskTitle: data.taskTitle || 'Test Task',
          taskDescription: data.taskDescription || 'This is a test task description',
          priority: data.priority || 'High',
          dueDate: data.dueDate || '2024-12-31',
          assignedTo: data.assignedTo || 'John Doe',
          taskId: data.taskId || 'TEST-001',
        })
        break
        
      case 'leave_approved':
        result = await emailService.sendLeaveStatusEmail({
          userEmail: data.userEmail || 'test@example.com',
          userName: data.userName || 'Test User',
          leaveType: data.leaveType || 'Annual Leave',
          startDate: data.startDate || '2024-12-25',
          endDate: data.endDate || '2024-12-31',
          days: data.days || 5,
          status: 'approved',
          reason: data.reason || 'Holiday vacation',
          approvedBy: data.approvedBy || 'Manager Name',
          comments: data.comments || 'Approved for holiday season',
        })
        break
        
      case 'leave_rejected':
        result = await emailService.sendLeaveStatusEmail({
          userEmail: data.userEmail || 'test@example.com',
          userName: data.userName || 'Test User',
          leaveType: data.leaveType || 'Annual Leave',
          startDate: data.startDate || '2024-12-25',
          endDate: data.endDate || '2024-12-31',
          days: data.days || 5,
          status: 'rejected',
          reason: data.reason || 'Holiday vacation',
          approvedBy: data.approvedBy || 'Manager Name',
          comments: data.comments || 'Insufficient leave balance',
        })
        break
        
      case 'user_credentials':
        result = await emailService.sendUserCredentialsEmail({
          userEmail: data.userEmail || 'test@example.com',
          userName: data.userName || 'Test User',
          employeeId: data.employeeId || 'AM-001',
          temporaryPassword: data.temporaryPassword || 'TempPass123!',
          department: data.department || 'IT',
          role: data.role || 'Employee',
          manager: data.manager || 'Manager Name',
        })
        break
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid email type. Use: task_created, leave_approved, leave_rejected, user_credentials'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully`,
      data: result
    })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send test email'
    }, { status: 500 })
  }
}
