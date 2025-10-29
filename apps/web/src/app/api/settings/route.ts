/**
 * Settings API Routes
 * Handles CRUD operations for key-value JSON settings
 *
 * NEW STRUCTURE (Migration 015):
 * - One row per setting key
 * - JSON values for flexibility
 * - No ENUM restrictions
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getAllSettings,
  getSettingByKey,
  getSettingsByKeys,
  getDropdownSettings,
  getSettingsByType, // Legacy compatibility
  createSetting,
  type CreateSettingData
} from '@/lib/db/settings'

/**
 * GET /api/settings
 * Get all settings or specific settings by key
 *
 * Query params:
 * - key: string (optional) - Get a specific setting by key
 * - keys: string (optional) - Comma-separated list of keys to fetch
 * - activeOnly: boolean (optional, default: true) - Only return active settings
 * - grouped: boolean (optional) - Return dropdown settings grouped by type (LEGACY)
 * - dropdowns: boolean (optional) - Return only array-type settings (for dropdowns)
 *
 * Examples:
 * - GET /api/settings - Get all settings
 * - GET /api/settings?key=departments - Get departments setting
 * - GET /api/settings?keys=departments,severities - Get multiple settings
 * - GET /api/settings?grouped=true - Get legacy grouped format
 * - GET /api/settings?dropdowns=true - Get all dropdown options
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')
    const keys = searchParams.get('keys')
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const grouped = searchParams.get('grouped') === 'true'
    const dropdowns = searchParams.get('dropdowns') === 'true'

    // Legacy grouped format (for backward compatibility)
    if (grouped) {
      const settingsByType = await getSettingsByType()
      return NextResponse.json({
        success: true,
        data: settingsByType
      })
    }

    // Get dropdown settings only
    if (dropdowns) {
      const dropdownSettings = await getDropdownSettings()
      return NextResponse.json({
        success: true,
        data: dropdownSettings
      })
    }

    // Get specific setting by key
    if (key) {
      const setting = await getSettingByKey(key)
      if (!setting) {
        return NextResponse.json(
          {
            success: false,
            error: `Setting with key "${key}" not found`
          },
          { status: 404 }
        )
      }
      return NextResponse.json({
        success: true,
        data: setting
      })
    }

    // Get multiple settings by keys
    if (keys) {
      const keyArray = keys.split(',').map(k => k.trim())
      const settings = await getSettingsByKeys(keyArray)
      return NextResponse.json({
        success: true,
        data: settings
      })
    }

    // Get all settings
    const settings = await getAllSettings(activeOnly)

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
 *
 * Body: CreateSettingData
 * {
 *   key: string,
 *   value: any (will be stored as JSON),
 *   description?: string,
 *   metadata?: any,
 *   createdBy: string
 * }
 *
 * Examples:
 * {
 *   "key": "departments",
 *   "value": ["Frontend - iOS", "Frontend - Android", "Backend - Node js"],
 *   "description": "Department options for user assignment",
 *   "createdBy": "AM-0001"
 * }
 *
 * {
 *   "key": "max_file_size_mb",
 *   "value": 10,
 *   "description": "Maximum file upload size in MB",
 *   "metadata": {"type": "number", "min": 1, "max": 100},
 *   "createdBy": "AM-0001"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.key || body.value === undefined || !body.createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: key, value, createdBy'
        },
        { status: 400 }
      )
    }

    // Validate key format (alphanumeric, underscores, hyphens only)
    if (!/^[a-zA-Z0-9_-]+$/.test(body.key)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid key format. Use only alphanumeric characters, underscores, and hyphens.'
        },
        { status: 400 }
      )
    }

    const settingData: CreateSettingData = {
      key: body.key.trim(),
      value: body.value,
      description: body.description,
      metadata: body.metadata,
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

