import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmployeeId } from '@/lib/db/users'
import { emailService } from '@/lib/email/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params

    if (!employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID is required'
      }, { status: 400 })
    }

    // Get user details from MySQL
    const user = await getUserByEmployeeId(employeeId)

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 })
    }

    if (!user.email) {
      return NextResponse.json({
        success: false,
        error: 'User email not found'
      }, { status: 400 })
    }

    if (!user.password) {
      return NextResponse.json({
        success: false,
        error: 'User password not found in system'
      }, { status: 400 })
    }

    // Check if email service is available
    const isAvailable = await emailService.isAvailableAsync()
    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        error: 'Email service is not available'
      }, { status: 503 })
    }

    // Get manager details if available
    let managerName = undefined
    if (user.managerId) {
      const manager = await getUserByEmployeeId(user.managerId)
      managerName = manager?.name
    }

    // Send credentials email using password from MySQL
    const emailResult = await emailService.sendUserCredentialsEmail({
      userEmail: user.email,
      userName: user.name,
      employeeId: user.employeeId,
      temporaryPassword: user.password, // Use password from MySQL
      department: user.department || 'Not specified',
      role: user.role || 'Employee',
      manager: managerName,
    })

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Credentials email sent successfully',
        data: {
          emailSent: true,
          recipient: user.email,
          messageId: emailResult.messageId
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Failed to send email: ${emailResult.message}`
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Failed to send credentials email:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send credentials email'
    }, { status: 500 })
  }
}
