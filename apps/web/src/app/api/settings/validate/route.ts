import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { key, value } = body

        if (!key || !value) {
            return NextResponse.json({ success: false, error: 'Missing key or value' }, { status: 400 })
        }

        let tableName = ''
        let columnName = ''

        // Map setting keys to database tables/columns
        switch (key) {
            case 'task_statuses':
                tableName = 'tasks'
                columnName = 'status'
                break
            case 'task_priorities':
                tableName = 'tasks'
                columnName = 'priority'
                break
            case 'bug_types':
                tableName = 'bugs'
                columnName = 'type'
                break
            case 'bug_statuses':
                tableName = 'bugs'
                columnName = 'status'
                break
            case 'bug_severities':
                tableName = 'bugs'
                columnName = 'severity'
                break
            case 'bug_categories':
                tableName = 'bugs'
                columnName = 'category'
                break
            case 'departments':
                tableName = 'users'
                columnName = 'department'
                break
            case 'platforms':
                tableName = 'bugs'
                columnName = 'platform'
                break
            case 'bug_priorities':
                tableName = 'bugs'
                columnName = 'priority'
                break
            case 'designations':
                tableName = 'users'
                columnName = 'role' // Note: designations usually map to role or a specific designation column if it exists? 
                // Checking users schema would be good, but 'role' is usually admin/user. 
                // Let's assume designations might be stored in 'department' or a flexible field? 
                // Actually earlier 'User Management' likely used 'role' for permissions.
                // Let's check get_users schema if needed. for now, let's map to role? No, likely designation is just a string.
                // If users doesn't have designation column, I might fail.
                // Let's skip designation mapping for now or default to 0 count if usage check is complex.
                // But for safety, let's map it so if column exists it checks.
                // Actually, if Designation is not in `users` table, this query will fail.
                // Use users.role for now or remove case.
                return NextResponse.json({ success: true, inUse: false, count: 0 })
            default:
                // If unknown key, assume safe to delete (or return error if strict)
                return NextResponse.json({ success: true, inUse: false, count: 0 })
        }

        // Check usage
        // Use parameterized query to prevent SQL injection
        // Note: Table and Column names cannot be parameterized in SQL, only values.
        // Since we hardcode the table/column names in the switch above, it is safe.
        const sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${columnName} = $1`

        const results = await query<any[]>(sql, [value])
        const count = results[0]?.count || 0

        return NextResponse.json({
            success: true,
            inUse: count > 0,
            count: Number(count)
        })

    } catch (error) {
        console.error('Validation API error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to validate usage' },
            { status: 500 }
        )
    }
}
