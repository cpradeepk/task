'use client'

/**
 * SettingsManager Component
 *
 * @deprecated This component is deprecated after Migration 015.
 * The settings table structure has changed from multiple rows per type
 * to one row per key with JSON values.
 *
 * This component will be removed in a future update.
 * Use the new settings API directly or create a new settings management component.
 */

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import type { LegacySetting, SettingType } from '@/lib/db/settings'
import { getCurrentUser } from '@/lib/auth'

interface SettingsManagerProps {
  settingType: SettingType
  title: string
  description: string
}

export default function SettingsManager({ settingType, title, description }: SettingsManagerProps) {
  // This component is deprecated - show deprecation notice only
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Deprecation Warning */}
      <div className="p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
        <div className="flex items-start space-x-4">
          <AlertTriangle className="h-8 w-8 text-yellow-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              ⚠️ Component Deprecated - Migration 015
            </h3>
            <div className="space-y-3 text-sm text-yellow-800">
              <p>
                <strong>This settings management interface is no longer available.</strong>
              </p>
              <p>
                The settings table structure has been migrated to a more flexible key-value JSON format.
                Settings are now stored as:
              </p>
              <div className="bg-yellow-100 p-3 rounded border border-yellow-300 font-mono text-xs">
                <div>{'{'}</div>
                <div className="ml-4">"key": "departments",</div>
                <div className="ml-4">"value": ["Frontend - iOS", "Frontend - Android", ...],</div>
                <div className="ml-4">"description": "Department options"</div>
                <div>{'}'}</div>
              </div>
              <p>
                <strong>What you were trying to manage:</strong> {title}
              </p>
              <p>
                <strong>Setting Type:</strong> {settingType}
              </p>
              <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
                <p className="font-semibold mb-2">To manage settings now:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Use the Settings API directly: <code className="bg-gray-100 px-1 py-0.5 rounded">GET /api/settings</code></li>
                  <li>Or create a new settings management component for the new structure</li>
                  <li>See Migration 015 documentation for details</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Legacy implementation removed - see git history if needed
