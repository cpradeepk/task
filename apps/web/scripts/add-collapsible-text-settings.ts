/**
 * Script to add collapsible text settings to the database
 * Run with: npx tsx scripts/add-collapsible-text-settings.ts
 */

import { query } from '../src/lib/db'

async function addCollapsibleTextSettings() {
  try {
    console.log('Adding collapsible text settings...')

    // Setting 1: Collapse thresholds for different components
    console.log('1. Adding collapsible_text_thresholds...')
    await query(`
      INSERT INTO settings (key, value, description, metadata, is_active, created_by, created_at, updated_at)
      VALUES (
        $1, $2, $3, $4, TRUE, 'system', NOW(), NOW()
      )
      ON CONFLICT (key) DO UPDATE SET
        value = $5,
        updated_at = NOW()
    `, [
      'collapsible_text_thresholds',
      JSON.stringify({
        bug_description: { maxCharacters: 300, maxLines: 5 },
        task_description: { maxCharacters: 300, maxLines: 5 },
        activity_description: { maxCharacters: 300, maxLines: 5 },
        comment_description: { maxCharacters: 300, maxLines: 5 },
        prompt_description: { maxCharacters: 300, maxLines: 5 },
        default: { maxCharacters: 300, maxLines: 5 }
      }),
      'Collapse thresholds for different text components. Each component can have custom maxCharacters and maxLines values.',
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
    console.log('✅ collapsible_text_thresholds added')

    // Setting 2: Persist expanded state preference
    console.log('2. Adding collapsible_text_persist_state...')
    await query(`
      INSERT INTO settings (key, value, description, metadata, is_active, created_by, created_at, updated_at)
      VALUES (
        $1, $2, $3, $4, TRUE, 'system', NOW(), NOW()
      )
      ON CONFLICT (key) DO UPDATE SET
        value = $5,
        updated_at = NOW()
    `, [
      'collapsible_text_persist_state',
      JSON.stringify({
        bug_description: false,
        task_description: false,
        activity_description: false,
        comment_description: false,
        prompt_description: false,
        default: false
      }),
      'Controls whether expanded/collapsed state should persist in localStorage for different components. Set to true to remember user preference.',
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
    console.log('✅ collapsible_text_persist_state added')

    // Setting 3: UI customization options
    console.log('3. Adding collapsible_text_ui_options...')
    await query(`
      INSERT INTO settings (key, value, description, metadata, is_active, created_by, created_at, updated_at)
      VALUES (
        $1, $2, $3, $4, TRUE, 'system', NOW(), NOW()
      )
      ON CONFLICT (key) DO UPDATE SET
        value = $5,
        updated_at = NOW()
    `, [
      'collapsible_text_ui_options',
      JSON.stringify({
        showGradient: true,
        gradientColor: 'white',
        buttonPosition: 'right',
        showLineCount: true
      }),
      'UI customization options for collapsible text components. Controls gradient overlay, button position, and line count display.',
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
    console.log('✅ collapsible_text_ui_options added')

    console.log('\n✅ All collapsible text settings added successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error adding settings:', error)
    process.exit(1)
  }
}

addCollapsibleTextSettings()

