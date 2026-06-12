import { NextRequest, NextResponse } from 'next/server'
import { getSettingValue, updateSettingByKey } from '@/lib/db/settings'
import { getAuthUser } from '@/lib/auth-server'
import { syncAppConfigToFirestore, AppConfig } from '@/lib/firebase-admin'

const DEFAULT_CONFIG: AppConfig = {
  minAndroidVersion: '1.0.0',
  minIosVersion: '1.0.0',
  androidUrl: 'https://play.google.com/store/apps/details?id=com.karmayog',
  iosUrl: 'https://apps.apple.com/app/id123456789',
  maintenanceMode: false
}

/**
 * GET /api/settings/app-management
 * Fetches the current app version and maintenance settings
 */
export async function GET() {
  try {
    const config = await getSettingValue<AppConfig>('app_version_management', DEFAULT_CONFIG)
    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('❌ Failed to fetch app configuration:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch app configuration'
    }, { status: 500 })
  }
}

/**
 * POST /api/settings/app-management
 * Updates and syncs app version and maintenance settings
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    // Restrict to admin / top_management / employeeId AM-0001
    const isAuthorized = 
      authUser.employeeId === 'AM-0001' || 
      authUser.role === 'admin' || 
      authUser.role === 'top_management'

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Access denied: Administrator permissions required' }, { status: 403 })
    }

    const body = await request.json()
    const { minAndroidVersion, minIosVersion, androidUrl, iosUrl, maintenanceMode } = body

    // Validation
    if (
      minAndroidVersion === undefined ||
      minIosVersion === undefined ||
      androidUrl === undefined ||
      iosUrl === undefined ||
      maintenanceMode === undefined
    ) {
      return NextResponse.json({ success: false, error: 'Missing required configuration fields' }, { status: 400 })
    }

    const updatedConfig: AppConfig = {
      minAndroidVersion: String(minAndroidVersion).trim(),
      minIosVersion: String(minIosVersion).trim(),
      androidUrl: String(androidUrl).trim(),
      iosUrl: String(iosUrl).trim(),
      maintenanceMode: Boolean(maintenanceMode)
    }

    // 1. Save to PostgreSQL settings table
    await updateSettingByKey('app_version_management', updatedConfig)

    // 2. Sync to Firebase Firestore
    const synced = await syncAppConfigToFirestore(updatedConfig)

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      firestoreSynced: synced,
      message: 'App configuration updated and synchronized successfully'
    })
  } catch (error) {
    console.error('❌ Failed to update app configuration:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update app configuration'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/settings/app-management
 * Alias for POST to support partial updates or patch requests
 */
export async function PATCH(request: NextRequest) {
  return POST(request)
}
