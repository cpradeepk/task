/**
 * Settings API Routes
 * Handles CRUD operations for configurable dropdown settings
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getSettings,
  getSettingsByType,
  createSetting,
  type SettingType,
  type CreateSettingData
} from '@/lib/db/settings'

/**
 * GET /api/settings
 * Get all settings or settings by type
 * Query params:
 * - type: SettingType (optional) - Filter by setting type
 * - activeOnly: boolean (optional, default: true) - Only return active settings
 * - grouped: boolean (optional) - Return settings grouped by type
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as SettingType | null
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const grouped = searchParams.get('grouped') === 'true'

    if (grouped) {
      const settingsByType = await getSettingsByType()
      return NextResponse.json({
        success: true,
        data: settingsByType
      })
    }

    const settings = await getSettings(type || undefined, activeOnly)

    return NextResponse.json({
      success: true,
      data: settings,
      count: settings.length
    })
  } catch (error) {
    console.error('Settings API GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch settings'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings
 * Create a new setting
 * Body: CreateSettingData
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.settingType || !body.settingValue || !body.createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: settingType, settingValue, createdBy'
        },
        { status: 400 }
      )
    }

    // Validate setting type
    const validTypes: SettingType[] = ['department', 'severity', 'priority', 'category', 'platform', 'task_priority']
    if (!validTypes.includes(body.settingType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid setting type. Must be one of: ${validTypes.join(', ')}`
        },
        { status: 400 }
      )
    }

    const settingData: CreateSettingData = {
      settingType: body.settingType,
      settingValue: body.settingValue.trim(),
      displayOrder: body.displayOrder,
      createdBy: body.createdBy
    }

    const newSetting = await createSetting(settingData)

    return NextResponse.json({
      success: true,
      data: newSetting,
      message: 'Setting created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Settings API POST error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create setting'
    const statusCode = errorMessage.includes('already exists') ? 409 : 500

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: statusCode }
    )
  }
}

