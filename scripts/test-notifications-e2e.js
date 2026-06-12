#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

// Load environment variables
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const targetUserId = 'AM-0012'; // Keval

    try {
        await client.connect();
        console.log('🔌 Connected to PostgreSQL database');

        // Check if Keval exists
        const userCheck = await client.query('SELECT name FROM users WHERE employee_id = $1', [targetUserId]);
        if (userCheck.rows.length === 0) {
            console.error(`❌ User ${targetUserId} not found.`);
            process.exit(1);
        }
        console.log(`👤 Found user: ${userCheck.rows[0].name}`);

        // Find or create a self-assigned task for Keval
        let taskId;
        const taskCheck = await client.query(
            "SELECT task_id, description, status FROM tasks WHERE assigned_to::jsonb ? $1 AND deleted_at IS NULL LIMIT 1",
            [targetUserId]
        );

        if (taskCheck.rows.length > 0) {
            taskId = taskCheck.rows[0].task_id;
            console.log(`📋 Found existing task: ${taskId} ("${taskCheck.rows[0].description}") with status: ${taskCheck.rows[0].status}`);
        } else {
            console.log(`📋 No self-assigned tasks found. Creating a temporary task for testing...`);
            taskId = `TSK-TEST-${Date.now()}`;
            await client.query(
                `INSERT INTO tasks (
                    task_id, internal_id, description, assigned_to, assigned_by, start_date, end_date, status
                ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, CURRENT_DATE + 5, 'Yet to Start')`,
                [taskId, taskId, 'Temporary Verification Task', JSON.stringify([targetUserId]), targetUserId]
            );
            console.log(`✅ Temporary task ${taskId} created`);
        }

        // Generate JWT token for Keval
        console.log('🔑 Generating authentication token...');
        const token = jwt.sign(
            { employeeId: targetUserId, role: 'employee', name: 'Keval' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Test 1: Update task status via local API server
        console.log('\n🚀 Test 1: Updating task status to trigger self-notification...');
        const newStatus = taskCheck.rows[0]?.status === 'In Progress' ? 'Yet to Start' : 'In Progress';
        
        const updateResponse = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!updateResponse.ok) {
            const errText = await updateResponse.text();
            throw new Error(`API returned error status ${updateResponse.status}: ${errText}`);
        }

        const updateResult = await updateResponse.json();
        console.log('✅ API response received:', updateResult.success ? 'Success' : 'Failure');

        // Allow background async operations to complete
        console.log('⏳ Waiting 2 seconds for notifications to write to DB...');
        await new Promise(r => setTimeout(r, 2000));

        // Check if feed_notification was created for Keval (self-notification)
        const notifCheck = await client.query(
            "SELECT notification_id, title, message, created_at FROM feed_notifications WHERE user_id = $1 AND actor_id = $1 AND task_id = $2 ORDER BY created_at DESC LIMIT 1",
            [targetUserId, taskId]
        );

        if (notifCheck.rows.length > 0) {
            console.log('\n🎉 SUCCESS: Self-notification successfully created in the database!');
            console.log(`   ID:      ${notifCheck.rows[0].notification_id}`);
            console.log(`   Title:   ${notifCheck.rows[0].title}`);
            console.log(`   Message: ${notifCheck.rows[0].message}`);
        } else {
            console.error('\n❌ FAILURE: Self-notification was NOT created in the database.');
        }

        // Test 2: Post comment on task via activity-log API
        console.log('\n🚀 Test 2: Posting task comment (comment notification)...');
        const commentResponse = await fetch(`http://localhost:3000/api/activity-log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                entityType: 'task',
                entityId: taskId,
                actionType: 'comment',
                description: 'Verifying comment notifications via E2E test script',
                isComment: true
            })
        });

        if (!commentResponse.ok) {
            const errText = await commentResponse.text();
            throw new Error(`API returned error status ${commentResponse.status}: ${errText}`);
        }

        const commentResult = await commentResponse.json();
        console.log('✅ Comment API response received:', commentResult.success ? 'Success' : 'Failure');

        // Let's check that the comment is logged
        const commentCheck = await client.query(
            "SELECT id, description FROM activity_log WHERE entity_id = $1 AND is_comment = 1 ORDER BY id DESC LIMIT 1",
            [taskId]
        );
        if (commentCheck.rows.length > 0) {
            console.log(`✅ Comment logged in activity_log: "${commentCheck.rows[0].description}"`);
        } else {
            console.error('❌ Comment was NOT logged in activity_log');
        }

        // Clean up temporary task if we created one
        if (!taskCheck.rows.length) {
            console.log('\n🧹 Cleaning up temporary task and notifications...');
            await client.query("DELETE FROM feed_notifications WHERE task_id = $1", [taskId]);
            await client.query("DELETE FROM activity_log WHERE entity_id = $1", [taskId]);
            await client.query("DELETE FROM tasks WHERE task_id = $1", [taskId]);
            console.log('🧹 Cleanup complete.');
        }

    } catch (err) {
        console.error('❌ E2E verification failed:', err);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed.');
    }
}

main();
