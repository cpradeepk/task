/**
 * Migration API: Add Collapsible Text Settings
 * Run this once to add the collapsible text configuration settings to the database
 */

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST() {
  try {
    // Setting 1: Collapse thresholds for different components
    await query(`
      INSERT INTO settings (\`key\`, value, description, metadata, is_active, created_by, created_at, updated_at)
      VALUES (
        'collapsible_text_thresholds',
        ?,
        'Collapse thresholds for different text components. Each component can have custom maxCharacters and maxLines values.',
        ?,
        TRUE,
        'system',
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        value = ?,
        updated_at = NOW()
    `, [
      JSON.stringify({
        bug_description: { maxCharacters: 300, maxLines: 5 },
        task_description: { maxCharacters: 300, maxLines: 5 },
        activity_description: { maxCharacters: 300, maxLines: 5 },
        comment_description: { maxCharacters: 300, maxLines: 5 },
        prompt_description: { maxCharacters: 300, maxLines: 5 },
        default: { maxCharacters: 300, maxLines: 5 }
      }),
      JSON.stringify({
        type: 'object',
        editable: true,
        category: 'ui_behavior',
        components: ['bug_description', 'task_description', 'activity_description', 'comment_description', 'prompt_description', 'default']
      }),
      JSON.stringify({
        bug_description: { maxCharacters: 300, maxLines: 5 },
        task_description: { maxCharacters: 300, maxLines: 5 },
        activity_description: { maxCharacters: 300, maxLines: 5 },
        comment_description: { maxCharacters: 300, maxLines: 5 },
        prompt_description: { maxCharacters: 300, maxLines: 5 },
        default: { maxCharacters: 300, maxLines: 5 }
      })
    ])

    // Setting 2: Persist expanded state preference
    await query(`
      INSERT INTO settings (\`key\`, value, description, metadata, is_active, created_by, created_at, updated_at)
      VALUES (
        'collapsible_text_persist_state',
        ?,
        'Controls whether expanded/collapsed state should persist in localStorage for different components. Set to true to remember user preference.',
        ?,
        TRUE,
        'system',
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        value = ?,
        updated_at = NOW()
    `, [
      JSON.stringify({
        bug_description: false,
        task_description: false,
        activity_description: false,
        comment_description: false,
        prompt_description: false,
        default: false
      }),
      JSON.stringify({
        type: 'object',
        editable: true,
        category: 'ui_behavior',
        components: ['bug_description', 'task_description', 'activity_description', 'comment_description', 'prompt_description', 'default']
      }),
      JSON.stringify({
        bug_description: false,
        task_description: false,
        activity_description: false,
        comment_description: false,
        prompt_description: false,
        default: false
      })
    ])

    // Setting 3: UI customization options
    await query(`
      INSERT INTO settings (\`key\`, value, description, metadata, is_active, created_by, created_at, updated_at)
      VALUES (
        'collapsible_text_ui_options',
        ?,
        'UI customization options for collapsible text components. Controls gradient overlay, button position, and line count display.',
        ?,
        TRUE,
        'system',
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        value = ?,
        updated_at = NOW()
    `, [
      JSON.stringify({
        showGradient: true,
        gradientColor: 'white',
        buttonPosition: 'right',
        showLineCount: true
      }),
      JSON.stringify({
        type: 'object',
        editable: true,
        category: 'ui_appearance',
        options: {
          showGradient: { type: 'boolean', default: true },
          gradientColor: { type: 'string', default: 'white', options: ['white', 'gray-50', 'blue-50'] },
          buttonPosition: { type: 'string', default: 'right', options: ['left', 'right'] },
          showLineCount: { type: 'boolean', default: true }
        }
      }),
      JSON.stringify({
        showGradient: true,
        gradientColor: 'white',
        buttonPosition: 'right',
        showLineCount: true
      })
    ])

    return NextResponse.json({
      success: true,
      message: 'Collapsible text settings added successfully',
      settings: [
        'collapsible_text_thresholds',
        'collapsible_text_persist_state',
        'collapsible_text_ui_options'
      ]
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add settings'
    }, { status: 500 })
  }
}

