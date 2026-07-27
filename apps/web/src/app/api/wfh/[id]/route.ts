import { NextRequest, NextResponse } from 'next/server'
import { updateWFH, getWFHById } from '@/lib/db/wfh'
import { requireAuth } from '@/lib/auth-server'
import { canApproveFor, canViewUser } from '@/lib/authz'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const updates = await request.json()

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'WFH application ID is required'
      }, { status: 400 })
    }

    // Load the record first: who owns it decides what the caller may do.
    // Previously this accepted arbitrary updates with NO check, so any signed-in
    // user could approve their OWN application by PUTing { status: 'Approved' },
    // or alter someone else's.
    const existing = await getWFHById(id)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'WFH application not found' }, { status: 404 })
    }

    const auth = await requireAuth(request)
    if (!auth.ok) return auth.response

    const isOwner = existing.employeeId === auth.user.employeeId
    const isDecision = typeof updates?.status === 'string' &&
      ['Approved', 'Rejected'].includes(updates.status)

    if (isDecision) {
      // Approving or rejecting is a manager action, and canApproveFor returns
      // false for self, so nobody can approve their own application.
      if (!(await canApproveFor(auth.user, existing.employeeId))) {
        return NextResponse.json(
          { success: false, error: 'You cannot approve or reject this application.' },
          { status: 403 }
        )
      }
    } else if (!isOwner && !(await canViewUser(auth.user, existing.employeeId))) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to modify this application.' },
        { status: 403 }
      )
    }

    const wfh = await updateWFH(id, updates)

    return NextResponse.json({
      success: true,
      data: wfh,
      message: 'WFH application updated successfully'
    })
  } catch (error) {
    console.error('Failed to update WFH application:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update WFH application'
    }, { status: 500 })
  }
}

// PATCH handler (alias for PUT to support both methods)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params })
}
