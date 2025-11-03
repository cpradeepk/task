/**
 * Individual Setting API Routes
 * Handles update and delete operations for a specific setting
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getSettingById,
  updateSetting,
  deleteSetting,
  permanentlyDeleteSetting,
  type UpdateSettingData
} from '@/lib/db/settings'

/**
 * GET /api/settings/[id]
 * Get a specific setting by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const settingId = parseInt(id)

    if (isNaN(settingId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid setting ID'
        },
        { status: 400 }
      )
    }

    const setting = await getSettingById(settingId)

    if (!setting) {
      return NextResponse.json(
        {
          success: false,
          error: 'Setting not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: setting
    })
  } catch (error) {
    console.error('Setting API GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch setting'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/settings/[id]
 * Update a specific setting
 *
 * Body: UpdateSettingData
 * {
 *   value?: any,
 *   description?: string,
 *   metadata?: any,
 *   isActive?: boolean
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const settingId = parseInt(id)

    if (isNaN(settingId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid setting ID'
        },
        { status: 400 }
      )
    }

    const body = await request.json()

    const updateData: UpdateSettingData = {}

    if (body.value !== undefined) {
      updateData.value = body.value
    }

    if (body.description !== undefined) {
      updateData.description = body.description
    }

    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No fields to update'
        },
        { status: 400 }
      )
    }

    const updatedSetting = await updateSetting(settingId, updateData)

    return NextResponse.json({
      success: true,
      data: updatedSetting,
      message: 'Setting updated successfully'
    })
  } catch (error) {
    console.error('Setting API PATCH error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to update setting'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/[id]
 * Delete a specific setting (soft delete by default)
 * Query params:
 * - permanent: boolean (optional) - Permanently delete the setting
 */
// PUT handler (alias for PATCH to support both methods)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const settingId = parseInt(id)

    if (isNaN(settingId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid setting ID'
        },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      await permanentlyDeleteSetting(settingId)
    } else {
      await deleteSetting(settingId)
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'Setting permanently deleted' : 'Setting deactivated successfully'
    })
  } catch (error) {
    console.error('Setting API DELETE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete setting'
      },
      { status: 500 }
    )
  }
}

