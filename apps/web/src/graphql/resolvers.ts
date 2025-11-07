import DataLoader from 'dataloader'
import { getPool } from '@/lib/db'
import {
  logResolverStart,
  logResolverSuccess,
  logResolverError,
  logDatabaseQuery,
  logDatabaseResult,
  logDatabaseError
} from '@/lib/graphql-logger'

const pool = getPool()

// DataLoader for batching user queries
const createUserLoader = () => new DataLoader(async (employeeIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE employee_id = ANY($1)',
    [employeeIds]
  )

  const userMap = new Map(result.rows.map((user: any) => [user.employee_id, user]))
  return employeeIds.map(id => userMap.get(id) || null)
})

// DataLoader for batching task queries
const createTaskLoader = () => new DataLoader(async (taskIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM tasks WHERE task_id = ANY($1) AND deleted_at IS NULL',
    [taskIds]
  )

  const taskMap = new Map(result.rows.map((task: any) => [task.task_id, task]))
  return taskIds.map(id => taskMap.get(id) || null)
})

// DataLoader for batching bug queries
const createBugLoader = () => new DataLoader(async (bugIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM bugs WHERE bug_id = ANY($1) AND deleted_at IS NULL',
    [bugIds]
  )

  const bugMap = new Map(result.rows.map((bug: any) => [bug.bug_id, bug]))
  return bugIds.map(id => bugMap.get(id) || null)
})

// DataLoader for batching subtask queries
// Note: The subtasks table was renamed to task_checklists in migration 020
const createSubtaskLoader = () => new DataLoader(async (parentTaskIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM task_checklists WHERE parent_task_id = ANY($1) AND deleted_at IS NULL',
    [parentTaskIds]
  )

  const subtaskMap = new Map<string, any[]>()
  result.rows.forEach((subtask: any) => {
    if (!subtaskMap.has(subtask.parent_task_id)) {
      subtaskMap.set(subtask.parent_task_id, [])
    }
    subtaskMap.get(subtask.parent_task_id)!.push(subtask)
  })

  return parentTaskIds.map(id => subtaskMap.get(id) || [])
})

// DataLoader for batching bug subtask queries
// Note: The bug_subtasks table was renamed to development_checklists in migration 020
const createBugSubtaskLoader = () => new DataLoader(async (parentBugIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM development_checklists WHERE parent_bug_id = ANY($1) AND deleted_at IS NULL',
    [parentBugIds]
  )

  const subtaskMap = new Map<string, any[]>()
  result.rows.forEach((subtask: any) => {
    if (!subtaskMap.has(subtask.parent_bug_id)) {
      subtaskMap.set(subtask.parent_bug_id, [])
    }
    subtaskMap.get(subtask.parent_bug_id)!.push(subtask)
  })

  return parentBugIds.map(id => subtaskMap.get(id) || [])
})

// DataLoader for batching feed post queries
const createFeedPostLoader = () => new DataLoader(async (postIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM feed_posts WHERE post_id = ANY($1) AND deleted_at IS NULL',
    [postIds]
  )

  const postMap = new Map(result.rows.map((post: any) => [post.post_id, post]))
  return postIds.map(id => postMap.get(id) || null)
})

// DataLoader for batching feed topic queries
const createFeedTopicLoader = () => new DataLoader(async (topicIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM feed_topics WHERE id = ANY($1) AND deleted_at IS NULL',
    [topicIds]
  )

  const topicMap = new Map(result.rows.map((topic: any) => [topic.id, topic]))
  return topicIds.map(id => topicMap.get(id) || null)
})

// DataLoader for batching feed comments by post ID
const createFeedCommentsLoader = () => new DataLoader(async (postIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM feed_comments WHERE post_id = ANY($1) AND deleted_at IS NULL ORDER BY created_at ASC',
    [postIds]
  )

  const commentMap = new Map<string, any[]>()
  result.rows.forEach((comment: any) => {
    if (!commentMap.has(comment.post_id)) {
      commentMap.set(comment.post_id, [])
    }
    commentMap.get(comment.post_id)!.push(comment)
  })

  return postIds.map(id => commentMap.get(id) || [])
})

// DataLoader for batching feed reactions by post ID
const createFeedReactionsLoader = () => new DataLoader(async (postIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM feed_reactions WHERE post_id = ANY($1) AND deleted_at IS NULL',
    [postIds]
  )

  const reactionMap = new Map<string, any[]>()
  result.rows.forEach((reaction: any) => {
    if (!reactionMap.has(reaction.post_id)) {
      reactionMap.set(reaction.post_id, [])
    }
    reactionMap.get(reaction.post_id)!.push(reaction)
  })

  return postIds.map(id => reactionMap.get(id) || [])
})

// DataLoader for batching feed post topics
const createFeedPostTopicsLoader = () => new DataLoader(async (postIds: readonly string[]) => {
  const result = await pool.query(
    `SELECT fpt.post_id, ft.*
     FROM feed_post_topics fpt
     JOIN feed_topics ft ON fpt.topic_id = ft.id
     WHERE fpt.post_id = ANY($1) AND ft.deleted_at IS NULL`,
    [postIds]
  )

  const topicMap = new Map<string, any[]>()
  result.rows.forEach((row: any) => {
    if (!topicMap.has(row.post_id)) {
      topicMap.set(row.post_id, [])
    }
    topicMap.get(row.post_id)!.push(row)
  })

  return postIds.map(id => topicMap.get(id) || [])
})

export const createContext = () => ({
  loaders: {
    user: createUserLoader(),
    task: createTaskLoader(),
    bug: createBugLoader(),
    subtasks: createSubtaskLoader(),
    bugSubtasks: createBugSubtaskLoader(),
    feedPost: createFeedPostLoader(),
    feedTopic: createFeedTopicLoader(),
    feedComments: createFeedCommentsLoader(),
    feedReactions: createFeedReactionsLoader(),
    feedPostTopics: createFeedPostTopicsLoader()
  }
})

export const resolvers = {
  Query: {
    // Users
    users: async () => {
      const { startTime } = logResolverStart('users', {})

      try {
        const dbStart = logDatabaseQuery(
          'SELECT * FROM users ORDER BY name',
          [],
          'users'
        )

        const result = await pool.query(
          'SELECT * FROM users ORDER BY name'
        )

        logDatabaseResult(result.rows.length, dbStart.startTime, 'users')
        logResolverSuccess('users', result.rows, startTime)

        return result.rows
      } catch (error) {
        logResolverError('users', error, startTime)
        throw error
      }
    },

    user: async (_: any, { employeeId }: any, { loaders }: any) => {
      const { startTime } = logResolverStart('user', { employeeId })

      try {
        const result = await loaders.user.load(employeeId)
        logResolverSuccess('user', result, startTime)
        return result
      } catch (error) {
        logResolverError('user', error, startTime)
        throw error
      }
    },

    // Tasks
    tasks: async (_: any, filters: any) => {
      const { startTime } = logResolverStart('tasks', filters)

      try {
        let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL'
        const params: any[] = []
        let paramIndex = 1

        if (filters.assignedTo) {
          // ✅ FIXED: assigned_to is JSONB array, use jsonb_array_elements_text
          query += ` AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(assigned_to) AS elem
            WHERE elem = $${paramIndex++}
          )`
          params.push(filters.assignedTo)
        }
        if (filters.assignedBy) {
          query += ` AND assigned_by = $${paramIndex++}`
          params.push(filters.assignedBy)
        }
        if (filters.status) {
          query += ` AND status = $${paramIndex++}`
          params.push(filters.status)
        }
        if (filters.priority) {
          query += ` AND priority = $${paramIndex++}`
          params.push(filters.priority)
        }

        query += ' ORDER BY created_at DESC'

        const dbStart = logDatabaseQuery(query, params, 'tasks')
        const result = await pool.query(query, params)
        logDatabaseResult(result.rows.length, dbStart.startTime, 'tasks')

        logResolverSuccess('tasks', result.rows, startTime)
        return result.rows
      } catch (error) {
        logResolverError('tasks', error, startTime)
        throw error
      }
    },

    task: async (_: any, { taskId }: any, { loaders }: any) => {
      const { startTime } = logResolverStart('task', { taskId })

      try {
        const result = await loaders.task.load(taskId)
        logResolverSuccess('task', result, startTime)
        return result
      } catch (error) {
        logResolverError('task', error, startTime)
        throw error
      }
    },

    // Subtasks
    subtasks: async (_: any, { parentTaskId }: any, { loaders }: any) => {
      return loaders.subtasks.load(parentTaskId)
    },

    // Bugs
    bugs: async (_: any, filters: any) => {
      let query = 'SELECT * FROM bugs WHERE deleted_at IS NULL'
      const params: any[] = []
      let paramIndex = 1

      if (filters.assignedTo) {
        query += ` AND assigned_to = $${paramIndex++}`
        params.push(filters.assignedTo)
      }
      if (filters.reportedBy) {
        query += ` AND reported_by = $${paramIndex++}`
        params.push(filters.reportedBy)
      }
      if (filters.status) {
        query += ` AND status = $${paramIndex++}`
        params.push(filters.status)
      }
      if (filters.severity) {
        query += ` AND severity = $${paramIndex++}`
        params.push(filters.severity)
      }
      if (filters.category) {
        query += ` AND category = $${paramIndex++}`
        params.push(filters.category)
      }

      query += ' ORDER BY created_at DESC'

      const result = await pool.query(query, params)
      return result.rows
    },

    bug: async (_: any, { bugId }: any, { loaders }: any) => {
      return loaders.bug.load(bugId)
    },
    
    // Bug Subtasks
    bugSubtasks: async (_: any, { parentBugId }: any, { loaders }: any) => {
      return loaders.bugSubtasks.load(parentBugId)
    },
    
    // Projects
    projects: async () => {
      const result = await pool.query(
        'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY project_name'
      )
      return result.rows
    },

    project: async (_: any, { projectId }: any) => {
      const result = await pool.query(
        'SELECT * FROM projects WHERE project_id = $1 AND deleted_at IS NULL',
        [projectId]
      )
      return result.rows[0] || null
    },

    // Settings
    settings: async (_: any, { activeOnly }: any) => {
      let query = 'SELECT * FROM settings'
      if (activeOnly) {
        query += ' WHERE is_active = true'
      }
      query += ' ORDER BY key'

      const result = await pool.query(query)
      return result.rows
    },

    setting: async (_: any, { key }: any) => {
      const result = await pool.query(
        'SELECT * FROM settings WHERE key = $1',
        [key]
      )
      return result.rows[0] || null
    },

    // Dashboard
    dashboard: async (_: any, { employeeId, role }: any) => {
      const { startTime } = logResolverStart('dashboard', { employeeId, role })

      try {
        const isManagement = ['management', 'top_management', 'admin'].includes(role)

        // ✅ OPTIMIZED: Execute all queries in parallel using Promise.all
        const [tasksResult, bugsResult, usersResult, settingsResult] = await Promise.all([
          // Fetch tasks
          (async () => {
            let tasksQuery = 'SELECT * FROM tasks WHERE deleted_at IS NULL'
            if (!isManagement) {
              // ✅ FIXED: assigned_to is JSONB array, use jsonb_array_elements_text
              tasksQuery += ` AND (
                assigned_by = $1
                OR EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(assigned_to) AS elem
                  WHERE elem = $2
                )
                OR EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(support) AS elem
                  WHERE elem = $3
                )
              )`
            }
            tasksQuery += ' ORDER BY created_at DESC'

            const tasksParams = isManagement ? [] : [employeeId, employeeId, employeeId]
            const dbStart = logDatabaseQuery(tasksQuery, tasksParams, 'dashboard.tasks')
            const result = await pool.query(tasksQuery, tasksParams)
            logDatabaseResult(result.rows.length, dbStart.startTime, 'dashboard.tasks')
            return result
          })(),

          // Fetch bugs
          (async () => {
            let bugsQuery = 'SELECT * FROM bugs WHERE deleted_at IS NULL'
            if (!isManagement) {
              bugsQuery += ' AND (assigned_to = $1 OR reported_by = $2)'
            }
            bugsQuery += ' ORDER BY created_at DESC'

            const bugsParams = isManagement ? [] : [employeeId, employeeId]
            const dbStart = logDatabaseQuery(bugsQuery, bugsParams, 'dashboard.bugs')
            const result = await pool.query(bugsQuery, bugsParams)
            logDatabaseResult(result.rows.length, dbStart.startTime, 'dashboard.bugs')
            return result
          })(),

          // Fetch users
          (async () => {
            const dbStart = logDatabaseQuery(
              'SELECT * FROM users ORDER BY name',
              [],
              'dashboard.users'
            )
            const result = await pool.query('SELECT * FROM users ORDER BY name')
            logDatabaseResult(result.rows.length, dbStart.startTime, 'dashboard.users')
            return result
          })(),

          // Fetch settings
          (async () => {
            const dbStart = logDatabaseQuery(
              'SELECT * FROM settings WHERE is_active = true ORDER BY key',
              [],
              'dashboard.settings'
            )
            const result = await pool.query('SELECT * FROM settings WHERE is_active = true ORDER BY key')
            logDatabaseResult(result.rows.length, dbStart.startTime, 'dashboard.settings')
            return result
          })()
        ])

        const result = {
          tasks: tasksResult.rows,
          bugs: bugsResult.rows,
          users: usersResult.rows,
          settings: settingsResult.rows
        }

        logResolverSuccess('dashboard', result, startTime)
        return result
      } catch (error) {
        logResolverError('dashboard', error, startTime)
        throw error
      }
    },

    // Feed Queries
    feedPosts: async (_: any, { topicId, status, search, limit = 20, offset = 0 }: any, context: any) => {
      const { startTime } = logResolverStart('feedPosts', { topicId, status, search, limit, offset })

      try {
        let sql = `
          SELECT DISTINCT fp.*
          FROM feed_posts fp
          LEFT JOIN feed_post_topics fpt ON fp.post_id = fpt.post_id
          WHERE fp.deleted_at IS NULL
        `
        const params: any[] = []

        if (topicId) {
          sql += ` AND fpt.topic_id = $${params.length + 1}`
          params.push(topicId)
        }

        if (status) {
          sql += ` AND fp.status = $${params.length + 1}`
          params.push(status)
        }

        if (search) {
          sql += ` AND (fp.content ILIKE $${params.length + 1} OR fp.link_title ILIKE $${params.length + 2})`
          params.push(`%${search}%`, `%${search}%`)
        }

        sql += ` ORDER BY fp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
        params.push(limit, offset)

        const dbStart = logDatabaseQuery(sql, params, 'feedPosts')
        const postsResult = await pool.query(sql, params)
        logDatabaseResult(postsResult.rows.length, dbStart.startTime, 'feedPosts')

        const totalResult = await pool.query(
          'SELECT COUNT(*) FROM feed_posts WHERE deleted_at IS NULL'
        )
        const total = parseInt(totalResult.rows[0].count)

        const result = {
          posts: postsResult.rows,
          total,
          hasMore: offset + postsResult.rows.length < total
        }

        logResolverSuccess('feedPosts', result, startTime)
        return result
      } catch (error) {
        logResolverError('feedPosts', error, startTime)
        throw error
      }
    },

    feedPost: async (_: any, { postId }: any, { loaders }: any) => {
      const { startTime } = logResolverStart('feedPost', { postId })

      try {
        const post = await loaders.feedPost.load(postId)
        logResolverSuccess('feedPost', post, startTime)
        return post
      } catch (error) {
        logResolverError('feedPost', error, startTime)
        throw error
      }
    },

    feedTopics: async (_: any, { includePersonal = true }: any, context: any) => {
      const { startTime } = logResolverStart('feedTopics', { includePersonal })

      try {
        let sql = 'SELECT * FROM feed_topics WHERE deleted_at IS NULL'
        const params: any[] = []

        if (!includePersonal) {
          sql += ' AND is_personal = false'
        }

        sql += ' ORDER BY display_order ASC'

        const dbStart = logDatabaseQuery(sql, params, 'feedTopics')
        const result = await pool.query(sql, params)
        logDatabaseResult(result.rows.length, dbStart.startTime, 'feedTopics')

        logResolverSuccess('feedTopics', result.rows, startTime)
        return result.rows
      } catch (error) {
        logResolverError('feedTopics', error, startTime)
        throw error
      }
    },

    feedTopic: async (_: any, { id }: any, { loaders }: any) => {
      const { startTime } = logResolverStart('feedTopic', { id })

      try {
        const topic = await loaders.feedTopic.load(id)
        logResolverSuccess('feedTopic', topic, startTime)
        return topic
      } catch (error) {
        logResolverError('feedTopic', error, startTime)
        throw error
      }
    },

    feedComments: async (_: any, { postId }: any, { loaders }: any) => {
      const { startTime } = logResolverStart('feedComments', { postId })

      try {
        const comments = await loaders.feedComments.load(postId)
        logResolverSuccess('feedComments', comments, startTime)
        return comments
      } catch (error) {
        logResolverError('feedComments', error, startTime)
        throw error
      }
    },

    feedReactions: async (_: any, { postId }: any, { loaders }: any) => {
      const { startTime } = logResolverStart('feedReactions', { postId })

      try {
        const reactions = await loaders.feedReactions.load(postId)

        // Group by emoji
        const grouped: Record<string, any> = {}
        reactions.forEach((r: any) => {
          if (!grouped[r.emoji]) {
            grouped[r.emoji] = { emoji: r.emoji, userIds: [], count: 0 }
          }
          grouped[r.emoji].userIds.push(r.user_id)
          grouped[r.emoji].count++
        })

        const result = Object.values(grouped)
        logResolverSuccess('feedReactions', result, startTime)
        return result
      } catch (error) {
        logResolverError('feedReactions', error, startTime)
        throw error
      }
    }
  },
  
  // Field resolvers for User
  User: {
    // Map snake_case database columns to camelCase GraphQL fields
    employeeId: (user: any) => user.employee_id,
    name: (user: any) => user.name,
    email: (user: any) => user.email,
    phone: (user: any) => user.phone,
    department: (user: any) => user.department,
    role: (user: any) => user.role,
    status: (user: any) => user.status,
    managerEmail: (user: any) => user.manager_email,
    isTodayTask: (user: any) => user.is_today_task,
    warningCount: (user: any) => user.warning_count,
    createdAt: (user: any) => user.created_at,
    updatedAt: (user: any) => user.updated_at,

    tasks: async (user: any, _: any, { loaders }: any) => {
      // ✅ FIXED: assigned_to is JSONB array, use jsonb_array_elements_text
      const result = await pool.query(
        `SELECT * FROM tasks
         WHERE deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(assigned_to) AS elem
           WHERE elem = $1
         )`,
        [user.employee_id]
      )
      return result.rows
    },

    bugs: async (user: any, _: any, { loaders }: any) => {
      const result = await pool.query(
        'SELECT * FROM bugs WHERE assigned_to = $1 AND deleted_at IS NULL',
        [user.employee_id]
      )
      return result.rows
    }
  },

  // Field resolvers for Task
  Task: {
    // Map snake_case database columns to camelCase GraphQL fields
    // Note: GraphQL queries request these fields, so we must provide resolvers
    id: (task: any) => task.internal_id,
    taskId: (task: any) => task.task_id,
    selectType: (task: any) => task.select_type,
    recursiveType: (task: any) => task.recursive_type,
    name: (task: any) => task.name,
    description: (task: any) => task.description,
    assignedTo: (task: any) => {
      // ✅ FIXED: assignedTo is stored as JSONB array in PostgreSQL
      if (!task.assigned_to) return []
      if (Array.isArray(task.assigned_to)) return task.assigned_to

      // Handle string case (legacy data or parsing issue)
      if (typeof task.assigned_to === 'string') {
        try {
          const trimmed = task.assigned_to.trim()
          if (trimmed === '' || trimmed === 'null') return []
          const parsed = JSON.parse(trimmed)
          return Array.isArray(parsed) ? parsed : [parsed] // If single value, wrap in array
        } catch (error) {
          console.warn('Failed to parse assignedTo field for task:', task.task_id, 'Value:', task.assigned_to)
          return []
        }
      }

      return []
    },
    assignedBy: (task: any) => task.assigned_by,
    support: (task: any) => {
      // Support is stored as JSONB array in PostgreSQL, but might be a string
      if (!task.support) return []
      if (Array.isArray(task.support)) return task.support

      // Handle string case (legacy data or parsing issue)
      if (typeof task.support === 'string') {
        try {
          const trimmed = task.support.trim()
          if (trimmed === '' || trimmed === 'null') return []
          // Try to parse as JSON
          const parsed = JSON.parse(trimmed)
          return Array.isArray(parsed) ? parsed : []
        } catch (error) {
          // If JSON parsing fails, might be comma-separated string
          console.warn('Failed to parse support field for task:', task.task_id, 'Value:', task.support)
          return []
        }
      }

      return []
    },
    startDate: (task: any) => task.start_date,
    endDate: (task: any) => task.end_date,
    priority: (task: any) => task.priority,
    estimatedHours: (task: any) => task.estimated_hours,
    actualHours: (task: any) => task.actual_hours,
    dailyHours: (task: any) => task.daily_hours,
    status: (task: any) => task.status,
    remarks: (task: any) => task.remarks,
    difficulties: (task: any) => task.difficulties,
    relatedTasks: (task: any) => task.related_tasks,
    projectId: (task: any) => task.project_id,
    subprojectId: (task: any) => task.subproject_id,
    parentTaskId: (task: any) => task.parent_task_id,
    department: (task: any) => task.department,
    timerState: (task: any) => task.timer_state,
    deletedAt: (task: any) => task.deleted_at,
    deletedBy: (task: any) => task.deleted_by,
    createdAt: (task: any) => task.created_at,
    updatedAt: (task: any) => task.updated_at,

    assignedToUser: async (task: any, _: any, { loaders }: any) => {
      // ✅ FIXED: assignedTo is now an array, return first user for backward compatibility
      const assignedToArray = Array.isArray(task.assigned_to) ? task.assigned_to : []
      if (assignedToArray.length === 0) return null

      try {
        return await loaders.user.load(assignedToArray[0])
      } catch (error) {
        console.error(`[Task.assignedToUser] Failed to load user ${assignedToArray[0]}:`, error)
        return null
      }
    },

    assignedToUsers: async (task: any, _: any, { loaders }: any) => {
      // ✅ NEW: Return all assigned users
      const assignedToArray = Array.isArray(task.assigned_to) ? task.assigned_to : []
      if (assignedToArray.length === 0) return []

      try {
        // loadMany can return Error objects in the array, filter them out
        const results = await loaders.user.loadMany(assignedToArray)
        return results.filter((result: any) => !(result instanceof Error))
      } catch (error) {
        console.error(`[Task.assignedToUsers] Failed to load users:`, error)
        return []
      }
    },

    assignedByUser: async (task: any, _: any, { loaders }: any) => {
      if (!task.assigned_by) return null

      try {
        return await loaders.user.load(task.assigned_by)
      } catch (error) {
        console.error(`[Task.assignedByUser] Failed to load user ${task.assigned_by}:`, error)
        return null
      }
    },

    supportUsers: async (task: any, _: any, { loaders }: any) => {
      if (!task.support) return []
      // Support is stored as JSONB array in PostgreSQL
      const supportIds = Array.isArray(task.support) ? task.support : []

      try {
        const results = await Promise.all(
          supportIds.map(async (id: string) => {
            try {
              return await loaders.user.load(id)
            } catch (error) {
              console.error(`[Task.supportUsers] Failed to load user ${id}:`, error)
              return null
            }
          })
        )
        return results.filter((user: any) => user !== null)
      } catch (error) {
        console.error(`[Task.supportUsers] Failed to load support users:`, error)
        return []
      }
    },

    subtasks: (task: any, _: any, { loaders }: any) => {
      return loaders.subtasks.load(task.task_id)
    },

    project: async (task: any) => {
      if (!task.project_id) return null
      const result = await pool.query(
        'SELECT * FROM projects WHERE project_id = $1 AND deleted_at IS NULL',
        [task.project_id]
      )
      return result.rows[0] || null
    }
  },

  // Field resolvers for SubTask
  SubTask: {
    // Map snake_case database columns to camelCase GraphQL fields
    id: (subtask: any) => subtask.id,
    subTaskId: (subtask: any) => `SUBTASK-${subtask.id}`, // ✅ FIXED: Generate subTaskId from id (no sub_task_id column in PostgreSQL)
    parentTaskId: (subtask: any) => subtask.parent_task_id,
    description: (subtask: any) => subtask.description,
    assignedTo: (subtask: any) => subtask.assigned_to,
    assignedBy: (subtask: any) => subtask.assigned_by || subtask.created_by || null, // ✅ FIXED: Column doesn't exist, fallback to created_by
    startDate: (subtask: any) => subtask.start_date || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    endDate: (subtask: any) => subtask.end_date || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    priority: (subtask: any) => subtask.priority || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    estimatedHours: (subtask: any) => subtask.estimated_hours || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    actualHours: (subtask: any) => subtask.actual_hours || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    status: (subtask: any) => subtask.status || 'Not Started', // ✅ FIXED: Provide default value
    remarks: (subtask: any) => subtask.remarks || null,
    deletedAt: (subtask: any) => subtask.deleted_at,
    deletedBy: (subtask: any) => subtask.deleted_by,
    createdAt: (subtask: any) => subtask.created_at || new Date().toISOString(), // ✅ FIXED: Provide default
    updatedAt: (subtask: any) => subtask.updated_at || new Date().toISOString(), // ✅ FIXED: Provide default

    assignedToUser: async (subtask: any, _: any, { loaders }: any) => {
      if (!subtask.assigned_to) return null

      try {
        return await loaders.user.load(subtask.assigned_to)
      } catch (error) {
        console.error(`[SubTask.assignedToUser] Failed to load user ${subtask.assigned_to}:`, error)
        return null
      }
    },

    assignedByUser: async (subtask: any, _: any, { loaders }: any) => {
      if (!subtask.assigned_by) return null

      try {
        return await loaders.user.load(subtask.assigned_by)
      } catch (error) {
        console.error(`[SubTask.assignedByUser] Failed to load user ${subtask.assigned_by}:`, error)
        return null
      }
    },

    parentTask: async (subtask: any, _: any, { loaders }: any) => {
      if (!subtask.parent_task_id) return null

      try {
        return await loaders.task.load(subtask.parent_task_id)
      } catch (error) {
        console.error(`[SubTask.parentTask] Failed to load task ${subtask.parent_task_id}:`, error)
        return null
      }
    }
  },

  // Field resolvers for Bug
  Bug: {
    // Map snake_case database columns to camelCase GraphQL fields
    id: (bug: any) => bug.id,
    bugId: (bug: any) => bug.bug_id,
    description: (bug: any) => bug.description,
    category: (bug: any) => bug.category,
    severity: (bug: any) => bug.severity,
    status: (bug: any) => bug.status,
    assignedTo: (bug: any) => bug.assigned_to,
    assignedBy: (bug: any) => bug.assigned_by,
    reportedBy: (bug: any) => bug.reported_by,
    reportedDate: (bug: any) => bug.reported_date,
    resolvedDate: (bug: any) => bug.resolved_date,
    estimatedHours: (bug: any) => bug.estimated_hours,
    actualHours: (bug: any) => bug.actual_hours,
    remarks: (bug: any) => bug.remarks,
    projectId: (bug: any) => bug.project_id,
    subprojectId: (bug: any) => bug.subproject_id,
    relatedBugs: (bug: any) => bug.related_bugs,
    platform: (bug: any) => bug.platform,
    environment: (bug: any) => bug.environment,
    bugType: (bug: any) => bug.bug_type,
    criticality: (bug: any) => bug.criticality,
    parentDevId: (bug: any) => bug.parent_dev_id,
    timerState: (bug: any) => bug.timer_state,
    timerStartTime: (bug: any) => bug.timer_start_time,
    timerPausedTime: (bug: any) => bug.timer_paused_time,
    timerTotalTime: (bug: any) => bug.timer_total_time,
    timerSessions: (bug: any) => bug.timer_sessions,
    deletedAt: (bug: any) => bug.deleted_at,
    deletedBy: (bug: any) => bug.deleted_by,
    createdAt: (bug: any) => bug.created_at,
    updatedAt: (bug: any) => bug.updated_at,

    assignedToUser: async (bug: any, _: any, { loaders }: any) => {
      if (!bug.assigned_to) return null
      try {
        return await loaders.user.load(bug.assigned_to)
      } catch (error) {
        console.error(`[Bug.assignedToUser] Failed to load user ${bug.assigned_to}:`, error)
        return null
      }
    },

    assignedByUser: async (bug: any, _: any, { loaders }: any) => {
      if (!bug.assigned_by) return null
      try {
        return await loaders.user.load(bug.assigned_by)
      } catch (error) {
        console.error(`[Bug.assignedByUser] Failed to load user ${bug.assigned_by}:`, error)
        return null
      }
    },

    reportedByUser: async (bug: any, _: any, { loaders }: any) => {
      if (!bug.reported_by) return null
      try {
        return await loaders.user.load(bug.reported_by)
      } catch (error) {
        console.error(`[Bug.reportedByUser] Failed to load user ${bug.reported_by}:`, error)
        return null
      }
    },

    subtasks: (bug: any, _: any, { loaders }: any) => {
      return loaders.bugSubtasks.load(bug.bug_id)
    },

    attachments: (bug: any) => {
      if (!bug.attachments) return []
      // Attachments is stored as JSONB in PostgreSQL
      return Array.isArray(bug.attachments) ? bug.attachments : []
    }
  },

  // Field resolvers for BugSubTask
  BugSubTask: {
    // Map snake_case database columns to camelCase GraphQL fields
    id: (subtask: any) => subtask.id,
    subTaskId: (subtask: any) => `BUGSUBTASK-${subtask.id}`, // ✅ FIXED: Generate subTaskId from id (no sub_task_id column in PostgreSQL)
    parentBugId: (subtask: any) => subtask.parent_bug_id,
    description: (subtask: any) => subtask.description,
    assignedTo: (subtask: any) => subtask.assigned_to,
    assignedBy: (subtask: any) => subtask.assigned_by || subtask.created_by || null, // ✅ FIXED: Column doesn't exist, fallback to created_by
    startDate: (subtask: any) => subtask.start_date || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    endDate: (subtask: any) => subtask.end_date || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    priority: (subtask: any) => subtask.priority || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    estimatedHours: (subtask: any) => subtask.estimated_hours || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    actualHours: (subtask: any) => subtask.actual_hours || null, // ✅ FIXED: Column doesn't exist in PostgreSQL
    status: (subtask: any) => subtask.status || 'Not Started', // ✅ FIXED: Provide default value
    remarks: (subtask: any) => subtask.remarks || null,
    isCompleted: (subtask: any) => subtask.is_completed || false,
    displayOrder: (subtask: any) => subtask.display_order || 0,
    deletedAt: (subtask: any) => subtask.deleted_at,
    deletedBy: (subtask: any) => subtask.deleted_by,
    createdAt: (subtask: any) => subtask.created_at || new Date().toISOString(), // ✅ FIXED: Provide default
    updatedAt: (subtask: any) => subtask.updated_at || new Date().toISOString(), // ✅ FIXED: Provide default
    createdBy: (subtask: any) => subtask.created_by,

    assignedToUser: async (subtask: any, _: any, { loaders }: any) => {
      if (!subtask.assigned_to) return null

      try {
        return await loaders.user.load(subtask.assigned_to)
      } catch (error) {
        console.error(`[BugSubTask.assignedToUser] Failed to load user ${subtask.assigned_to}:`, error)
        return null
      }
    },

    assignedByUser: async (subtask: any, _: any, { loaders }: any) => {
      if (!subtask.assigned_by) return null

      try {
        return await loaders.user.load(subtask.assigned_by)
      } catch (error) {
        console.error(`[BugSubTask.assignedByUser] Failed to load user ${subtask.assigned_by}:`, error)
        return null
      }
    },

    parentBug: async (subtask: any, _: any, { loaders }: any) => {
      if (!subtask.parent_bug_id) return null

      try {
        return await loaders.bug.load(subtask.parent_bug_id)
      } catch (error) {
        console.error(`[BugSubTask.parentBug] Failed to load bug ${subtask.parent_bug_id}:`, error)
        return null
      }
    }
  },

  // Field resolvers for Project
  Project: {
    // Map snake_case database columns to camelCase GraphQL fields
    id: (project: any) => project.id,
    projectId: (project: any) => project.project_id,
    projectName: (project: any) => project.project_name,
    description: (project: any) => project.description,
    parentProjectId: (project: any) => project.parent_project_id,
    deletedAt: (project: any) => project.deleted_at,
    deletedBy: (project: any) => project.deleted_by,
    createdAt: (project: any) => project.created_at,
    updatedAt: (project: any) => project.updated_at,

    tasks: async (project: any) => {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE project_id = $1 AND deleted_at IS NULL',
        [project.project_id]
      )
      return result.rows
    }
  },

  // Field resolvers for Setting
  Setting: {
    // Map snake_case database columns to camelCase GraphQL fields
    id: (setting: any) => setting.id,
    key: (setting: any) => setting.key,
    value: (setting: any) => setting.value,
    type: (setting: any) => setting.type,
    isActive: (setting: any) => setting.is_active,
    createdAt: (setting: any) => setting.created_at,
    updatedAt: (setting: any) => setting.updated_at,
  },

  // Field resolvers for FeedPost
  FeedPost: {
    postId: (post: any) => post.post_id,
    contentType: (post: any) => post.content_type,
    content: (post: any) => post.content,
    linkUrl: (post: any) => post.link_url,
    linkTitle: (post: any) => post.link_title,
    linkDescription: (post: any) => post.link_description,
    linkImage: (post: any) => post.link_image,
    mediaUrls: (post: any) => post.media_urls ? JSON.parse(post.media_urls) : [],
    createdBy: (post: any) => post.created_by,
    createdAt: (post: any) => post.created_at,
    updatedAt: (post: any) => post.updated_at,
    status: (post: any) => post.status,

    author: async (post: any, _: any, { loaders }: any) => {
      if (!post.created_by) return null

      try {
        return await loaders.user.load(post.created_by)
      } catch (error) {
        console.error(`[FeedPost.author] Failed to load user ${post.created_by}:`, error)
        return null
      }
    },

    topics: async (post: any, _: any, { loaders }: any) => {
      if (!post.post_id) return []

      try {
        return await loaders.feedPostTopics.load(post.post_id)
      } catch (error) {
        console.error(`[FeedPost.topics] Failed to load topics for post ${post.post_id}:`, error)
        return []
      }
    },

    reactions: async (post: any, _: any, { loaders, user }: any) => {
      if (!post.post_id) return []

      try {
        const reactions = await loaders.feedReactions.load(post.post_id)

        // Group by emoji
        const grouped: Record<string, any> = {}
        reactions.forEach((r: any) => {
          if (!grouped[r.emoji]) {
            grouped[r.emoji] = { emoji: r.emoji, userIds: [], count: 0, hasUserReacted: false }
          }
          grouped[r.emoji].userIds.push(r.user_id)
          grouped[r.emoji].count++
          if (user && r.user_id === user.employeeId) {
            grouped[r.emoji].hasUserReacted = true
          }
        })

        return Object.values(grouped)
      } catch (error) {
        console.error(`[FeedPost.reactions] Failed to load reactions for post ${post.post_id}:`, error)
        return []
      }
    },

    comments: async (post: any, _: any, { loaders }: any) => {
      if (!post.post_id) return []

      try {
        return await loaders.feedComments.load(post.post_id)
      } catch (error) {
        console.error(`[FeedPost.comments] Failed to load comments for post ${post.post_id}:`, error)
        return []
      }
    },

    viewCount: async (post: any) => {
      if (!post.post_id) return 0

      try {
        const result = await pool.query(
          'SELECT COUNT(*) FROM feed_views WHERE post_id = $1',
          [post.post_id]
        )
        return parseInt(result.rows[0].count)
      } catch (error) {
        console.error(`[FeedPost.viewCount] Failed to get view count for post ${post.post_id}:`, error)
        return 0
      }
    },

    commentCount: async (post: any) => {
      if (!post.post_id) return 0

      try {
        const result = await pool.query(
          'SELECT COUNT(*) FROM feed_comments WHERE post_id = $1 AND deleted_at IS NULL',
          [post.post_id]
        )
        return parseInt(result.rows[0].count)
      } catch (error) {
        console.error(`[FeedPost.commentCount] Failed to get comment count for post ${post.post_id}:`, error)
        return 0
      }
    },

    isSaved: async (post: any, _: any, { user }: any) => {
      if (!user) return false
      if (!post.post_id) return false

      try {
        const result = await pool.query(
          `SELECT fpt.topic_id
           FROM feed_post_topics fpt
           JOIN feed_topics ft ON fpt.topic_id = ft.id
           WHERE fpt.post_id = $1 AND ft.is_saved = true AND ft.owner_user_id = $2 AND ft.deleted_at IS NULL`,
          [post.post_id, user.employeeId]
        )
        return result.rows.length > 0
      } catch (error) {
        console.error(`[FeedPost.isSaved] Failed to check if post ${post.post_id} is saved:`, error)
        return false
      }
    },

    hasUserReacted: async (post: any, _: any, { user }: any) => {
      if (!user) return false
      if (!post.post_id) return false

      try {
        const result = await pool.query(
          'SELECT * FROM feed_reactions WHERE post_id = $1 AND user_id = $2 AND deleted_at IS NULL',
          [post.post_id, user.employeeId]
        )
        return result.rows.length > 0
      } catch (error) {
        console.error(`[FeedPost.hasUserReacted] Failed to check if user reacted to post ${post.post_id}:`, error)
        return false
      }
    }
  },

  // Field resolvers for FeedTopic
  FeedTopic: {
    id: (topic: any) => topic.topic_id || topic.id,
    topicName: (topic: any) => topic.topic_name,
    description: (topic: any) => topic.description,
    icon: (topic: any) => topic.icon,
    displayOrder: (topic: any) => topic.display_order,
    isPersonal: (topic: any) => topic.is_personal || false,
    isSaved: (topic: any) => topic.is_saved || false,
    ownerUserId: (topic: any) => topic.owner_user_id,
    createdBy: (topic: any) => topic.created_by,
    createdAt: (topic: any) => topic.created_at
  },

  // Field resolvers for FeedComment
  FeedComment: {
    commentId: (comment: any) => comment.comment_id,
    postId: (comment: any) => comment.post_id,
    parentCommentId: (comment: any) => comment.parent_comment_id,
    content: (comment: any) => comment.content,
    createdBy: (comment: any) => comment.created_by,
    createdAt: (comment: any) => comment.created_at,
    updatedAt: (comment: any) => comment.updated_at,

    author: async (comment: any, _: any, { loaders }: any) => {
      return loaders.user.load(comment.created_by)
    },

    replies: async (comment: any) => {
      const result = await pool.query(
        'SELECT * FROM feed_comments WHERE parent_comment_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
        [comment.comment_id]
      )
      return result.rows
    }
  },

  // Field resolvers for FeedReaction
  FeedReaction: {
    emoji: (reaction: any) => reaction.emoji,
    count: (reaction: any) => reaction.count,
    hasUserReacted: (reaction: any) => reaction.hasUserReacted || false,

    users: async (reaction: any, _: any, { loaders }: any) => {
      const userIds = reaction.userIds || []
      const users = await Promise.all(userIds.map((id: string) => loaders.user.load(id)))
      return users.filter((u: any) => u !== null)
    }
  },

  // Mutations
  Mutation: {
    // Task mutations
    createTask: async (_: any, { input }: any) => {
      const taskId = `TSK-${Date.now()}`
      const support = input.support ? JSON.stringify(input.support) : '[]'

      // ✅ FIXED: Use snake_case column names for PostgreSQL
      await pool.query(
        `INSERT INTO tasks (task_id, description, assigned_to, assigned_by, support, start_date, end_date,
         priority, estimated_hours, select_type, recursive_type, project_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending', NOW(), NOW())`,
        [taskId, input.description, JSON.stringify([input.assignedTo]), input.assignedBy, support, input.startDate,
         input.endDate, input.priority, input.estimatedHours, input.selectType, input.recursiveType, input.projectId]
      )

      const result = await pool.query(
        'SELECT * FROM tasks WHERE task_id = $1',
        [taskId]
      )
      return result.rows[0]
    },

    updateTask: async (_: any, { taskId, input }: any) => {
      const updates: string[] = []
      const params: any[] = []
      let paramIndex = 1

      // ✅ FIXED: Map camelCase to snake_case and use PostgreSQL parameterized queries
      const fieldMap: Record<string, string> = {
        description: 'description',
        assignedTo: 'assigned_to',
        support: 'support',
        startDate: 'start_date',
        endDate: 'end_date',
        priority: 'priority',
        estimatedHours: 'estimated_hours',
        actualHours: 'actual_hours',
        status: 'status',
        remarks: 'remarks',
        difficulties: 'difficulties'
      }

      Object.keys(input).forEach(key => {
        if (input[key] !== undefined && fieldMap[key]) {
          const dbColumn = fieldMap[key]

          if (key === 'support' && Array.isArray(input[key])) {
            updates.push(`${dbColumn} = $${paramIndex++}`)
            params.push(JSON.stringify(input[key]))
          } else if (key === 'assignedTo') {
            updates.push(`${dbColumn} = $${paramIndex++}`)
            params.push(JSON.stringify([input[key]]))
          } else {
            updates.push(`${dbColumn} = $${paramIndex++}`)
            params.push(input[key])
          }
        }
      })

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      updates.push(`updated_at = NOW()`)
      params.push(taskId)

      await pool.query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE task_id = $${paramIndex}`,
        params
      )

      const result = await pool.query(
        'SELECT * FROM tasks WHERE task_id = $1',
        [taskId]
      )
      return result.rows[0]
    },

    deleteTask: async (_: any, { taskId }: any) => {
      await pool.query(
        'UPDATE tasks SET deleted_at = NOW() WHERE task_id = $1',
        [taskId]
      )
      return true
    },

    // Bug mutations
    createBug: async (_: any, { input }: any) => {
      const bugId = `BUG-${Date.now()}`

      // ✅ FIXED: Use snake_case column names for PostgreSQL
      await pool.query(
        `INSERT INTO bugs (bug_id, description, category, severity, status, assigned_to, assigned_by,
         reported_by, reported_date, estimated_hours, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Open', $5, $6, $7, $8, $9, NOW(), NOW())`,
        [bugId, input.description, input.category, input.severity, input.assignedTo, input.assignedBy,
         input.reportedBy, input.reportedDate, input.estimatedHours]
      )

      const result = await pool.query(
        'SELECT * FROM bugs WHERE bug_id = $1',
        [bugId]
      )
      return result.rows[0]
    },

    updateBug: async (_: any, { bugId, input }: any) => {
      const updates: string[] = []
      const params: any[] = []
      let paramIndex = 1

      // ✅ FIXED: Map camelCase to snake_case and use PostgreSQL parameterized queries
      const fieldMap: Record<string, string> = {
        description: 'description',
        category: 'category',
        severity: 'severity',
        status: 'status',
        assignedTo: 'assigned_to',
        estimatedHours: 'estimated_hours',
        actualHours: 'actual_hours',
        remarks: 'remarks',
        resolvedDate: 'resolved_date'
      }

      Object.keys(input).forEach(key => {
        if (input[key] !== undefined && fieldMap[key]) {
          const dbColumn = fieldMap[key]
          updates.push(`${dbColumn} = $${paramIndex++}`)
          params.push(input[key])
        }
      })

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      updates.push(`updated_at = NOW()`)
      params.push(bugId)

      await pool.query(
        `UPDATE bugs SET ${updates.join(', ')} WHERE bug_id = $${paramIndex}`,
        params
      )

      const result = await pool.query(
        'SELECT * FROM bugs WHERE bug_id = $1',
        [bugId]
      )
      return result.rows[0]
    },

    deleteBug: async (_: any, { bugId }: any) => {
      await pool.query(
        'UPDATE bugs SET deleted_at = NOW() WHERE bug_id = $1',
        [bugId]
      )
      return true
    },

    // User mutations
    createUser: async (_: any, { input }: any) => {
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(input.password, 10)

      // ✅ FIXED: Use snake_case column names for PostgreSQL
      await pool.query(
        `INSERT INTO users (employee_id, name, email, phone, department, role, password, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`,
        [input.employeeId, input.name, input.email, input.phone, input.department, input.role, hashedPassword]
      )

      const result = await pool.query(
        'SELECT * FROM users WHERE employee_id = $1',
        [input.employeeId]
      )
      return result.rows[0]
    },

    updateUser: async (_: any, { employeeId, input }: any) => {
      const updates: string[] = []
      const params: any[] = []
      let paramIndex = 1

      // ✅ FIXED: Map camelCase to snake_case and use PostgreSQL parameterized queries
      const fieldMap: Record<string, string> = {
        name: 'name',
        email: 'email',
        phone: 'phone',
        department: 'department',
        role: 'role',
        status: 'status',
        isTodayTask: 'is_today_task'
      }

      Object.keys(input).forEach(key => {
        if (input[key] !== undefined && fieldMap[key]) {
          const dbColumn = fieldMap[key]
          updates.push(`${dbColumn} = $${paramIndex++}`)
          params.push(input[key])
        }
      })

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      updates.push(`updated_at = NOW()`)
      params.push(employeeId)

      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE employee_id = $${paramIndex}`,
        params
      )

      const result = await pool.query(
        'SELECT * FROM users WHERE employee_id = $1',
        [employeeId]
      )
      return result.rows[0]
    },

    // Feed Mutations
    createFeedPost: async (_: any, { input }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const status = ['admin', 'top_management'].includes(user.role) ? 'published' : 'pending'
      const mediaUrls = input.mediaUrls ? JSON.stringify(input.mediaUrls) : null

      await pool.query(
        `INSERT INTO feed_posts (post_id, content_type, content, link_url, link_title, link_description, link_image, media_urls, created_by, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [postId, input.contentType, input.content, input.linkUrl, input.linkTitle, input.linkDescription, input.linkImage, mediaUrls, user.employeeId, status]
      )

      // Link to topics
      for (const topicId of input.topicIds) {
        await pool.query(
          'INSERT INTO feed_post_topics (post_id, topic_id) VALUES ($1, $2)',
          [postId, topicId]
        )
      }

      const result = await pool.query(
        'SELECT * FROM feed_posts WHERE post_id = $1',
        [postId]
      )
      return result.rows[0]
    },

    updateFeedPost: async (_: any, { postId, input }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const updates: string[] = []
      const params: any[] = []
      let paramIndex = 1

      const fieldMap: Record<string, string> = {
        content: 'content',
        linkUrl: 'link_url',
        linkTitle: 'link_title',
        linkDescription: 'link_description',
        linkImage: 'link_image',
        mediaUrls: 'media_urls',
        status: 'status'
      }

      Object.keys(input).forEach(key => {
        if (input[key] !== undefined && fieldMap[key]) {
          const dbColumn = fieldMap[key]

          if (key === 'mediaUrls' && Array.isArray(input[key])) {
            updates.push(`${dbColumn} = $${paramIndex++}`)
            params.push(JSON.stringify(input[key]))
          } else if (key !== 'topicIds') {
            updates.push(`${dbColumn} = $${paramIndex++}`)
            params.push(input[key])
          }
        }
      })

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`)
        params.push(postId)

        await pool.query(
          `UPDATE feed_posts SET ${updates.join(', ')} WHERE post_id = $${paramIndex}`,
          params
        )
      }

      // Update topics if provided
      if (input.topicIds) {
        await pool.query('DELETE FROM feed_post_topics WHERE post_id = $1', [postId])
        for (const topicId of input.topicIds) {
          await pool.query(
            'INSERT INTO feed_post_topics (post_id, topic_id) VALUES ($1, $2)',
            [postId, topicId]
          )
        }
      }

      const result = await pool.query(
        'SELECT * FROM feed_posts WHERE post_id = $1',
        [postId]
      )
      return result.rows[0]
    },

    deleteFeedPost: async (_: any, { postId }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      await pool.query(
        'UPDATE feed_posts SET deleted_at = NOW(), deleted_by = $1 WHERE post_id = $2',
        [user.employeeId, postId]
      )
      return true
    },

    createFeedComment: async (_: any, { postId, content, parentCommentId }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await pool.query(
        `INSERT INTO feed_comments (comment_id, post_id, parent_comment_id, content, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [commentId, postId, parentCommentId, content, user.employeeId]
      )

      const result = await pool.query(
        'SELECT * FROM feed_comments WHERE comment_id = $1',
        [commentId]
      )
      return result.rows[0]
    },

    deleteFeedComment: async (_: any, { commentId }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      await pool.query(
        'UPDATE feed_comments SET deleted_at = NOW(), deleted_by = $1 WHERE comment_id = $2',
        [user.employeeId, commentId]
      )
      return true
    },

    toggleFeedReaction: async (_: any, { postId, emoji }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const existing = await pool.query(
        'SELECT * FROM feed_reactions WHERE post_id = $1 AND user_id = $2 AND emoji = $3 AND deleted_at IS NULL',
        [postId, user.employeeId, emoji]
      )

      if (existing.rows.length > 0) {
        await pool.query(
          'UPDATE feed_reactions SET deleted_at = NOW(), deleted_by = $1 WHERE post_id = $2 AND user_id = $3 AND emoji = $4',
          [user.employeeId, postId, user.employeeId, emoji]
        )
        return { action: 'removed', message: 'Reaction removed' }
      } else {
        await pool.query(
          'INSERT INTO feed_reactions (post_id, user_id, emoji, created_at) VALUES ($1, $2, $3, NOW())',
          [postId, user.employeeId, emoji]
        )
        return { action: 'added', message: 'Reaction added' }
      }
    },

    trackFeedView: async (_: any, { postId }: any, { user }: any) => {
      if (!user) return false

      // Check if view already exists (idempotent)
      const existing = await pool.query(
        'SELECT * FROM feed_views WHERE post_id = $1 AND user_id = $2',
        [postId, user.employeeId]
      )

      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO feed_views (post_id, user_id, viewed_at) VALUES ($1, $2, NOW())',
          [postId, user.employeeId]
        )
      }

      return true
    },

    toggleFeedSave: async (_: any, { postId }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      // Get user's "Saved Posts" topic
      const savedTopic = await pool.query(
        'SELECT id FROM feed_topics WHERE is_saved = true AND owner_user_id = $1 AND deleted_at IS NULL',
        [user.employeeId]
      )

      if (savedTopic.rows.length === 0) {
        throw new Error('Saved Posts topic not found. Please initialize personal topics first.')
      }

      const savedTopicId = savedTopic.rows[0].id

      // Check if already saved
      const existing = await pool.query(
        'SELECT * FROM feed_post_topics WHERE post_id = $1 AND topic_id = $2',
        [postId, savedTopicId]
      )

      if (existing.rows.length > 0) {
        await pool.query(
          'DELETE FROM feed_post_topics WHERE post_id = $1 AND topic_id = $2',
          [postId, savedTopicId]
        )
        return { action: 'removed', message: 'Post removed from Saved Posts' }
      } else {
        await pool.query(
          'INSERT INTO feed_post_topics (post_id, topic_id) VALUES ($1, $2)',
          [postId, savedTopicId]
        )
        return { action: 'added', message: 'Post saved successfully' }
      }
    },

    createFeedTopic: async (_: any, { input }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const result = await pool.query(
        `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, created_by, created_at)
         VALUES ($1, $2, $3, $4, false, $5, NOW())
         RETURNING *`,
        [input.topicName, input.description, input.icon, input.displayOrder || 999, user.employeeId]
      )

      return result.rows[0]
    },

    initPersonalTopics: async (_: any, __: any, { user }: any) => {
      if (!user) {
        console.error('[initPersonalTopics] Unauthorized - no user in context')
        throw new Error('Unauthorized')
      }

      try {
        console.log(`[initPersonalTopics] Initializing personal topics for user ${user.employeeId}`)

        // Check if personal topics already exist
        const existing = await pool.query(
          'SELECT * FROM feed_topics WHERE is_personal = true AND owner_user_id = $1 AND deleted_at IS NULL',
          [user.employeeId]
        )

        if (existing.rows.length >= 2) {
          console.log(`[initPersonalTopics] Personal topics already exist for user ${user.employeeId}`)
          const personalNotes = existing.rows.find((t: any) => !t.is_saved)
          const savedPosts = existing.rows.find((t: any) => t.is_saved)

          if (!personalNotes || !savedPosts) {
            console.error('[initPersonalTopics] Missing personal topics:', { personalNotes: !!personalNotes, savedPosts: !!savedPosts })
            throw new Error('Personal topics exist but are incomplete')
          }

          return {
            personalNotes,
            savedPosts
          }
        }

        console.log(`[initPersonalTopics] Creating new personal topics for user ${user.employeeId}`)

        // Create Personal Notes topic
        const personalNotes = await pool.query(
          `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, owner_user_id, created_by, created_at)
           VALUES ($1, $2, $3, $4, true, $5, $6, NOW())
           RETURNING *`,
          [`${user.name}'s Personal Notes`, 'Your private notes and thoughts', '📝', 1000, user.employeeId, user.employeeId]
        )

        // Create Saved Posts topic
        const savedPosts = await pool.query(
          `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, is_saved, owner_user_id, created_by, created_at)
           VALUES ($1, $2, $3, $4, true, true, $5, $6, NOW())
           RETURNING *`,
          [`${user.name}'s Saved Posts`, 'Posts you want to save for later', '🔖', 1001, user.employeeId, user.employeeId]
        )

        console.log(`[initPersonalTopics] Successfully created personal topics for user ${user.employeeId}`)

        return {
          personalNotes: personalNotes.rows[0],
          savedPosts: savedPosts.rows[0]
        }
      } catch (error: any) {
        console.error(`[initPersonalTopics] Error for user ${user?.employeeId}:`, error)
        throw new Error(`Failed to initialize personal topics: ${error.message}`)
      }
    }
  }
}

