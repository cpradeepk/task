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
import { mentionQueries, mentionMutations, mentionFieldResolvers } from './mention-resolvers'
import { notificationQueries, notificationMutations, FeedNotificationFieldResolvers, createNotificationLoader } from './notification-resolvers'
import { parseMentions, storeMentions } from '@/lib/mention-parser'
import { createCommentNotification, createReactionNotification, createPostStatusNotification } from '@/lib/notification-helper'

// Lazy-load pool to avoid database connection during build time
const getPoolInstance = () => getPool()

// DataLoader for batching user queries
const createUserLoader = () => new DataLoader(async (employeeIds: readonly string[]) => {
  const result = await getPoolInstance().query(
    'SELECT * FROM users WHERE employee_id = ANY($1)',
    [employeeIds]
  )

  const userMap = new Map(result.rows.map((user: any) => [user.employee_id, user]))
  return employeeIds.map(id => userMap.get(id) || null)
})

// DataLoader for batching task queries
const createTaskLoader = () => new DataLoader(async (taskIds: readonly string[]) => {
  const result = await getPoolInstance().query(
    'SELECT * FROM tasks WHERE task_id = ANY($1) AND deleted_at IS NULL',
    [taskIds]
  )

  const taskMap = new Map(result.rows.map((task: any) => [task.task_id, task]))
  return taskIds.map(id => taskMap.get(id) || null)
})

// DataLoader for batching bug queries
const createBugLoader = () => new DataLoader(async (bugIds: readonly string[]) => {
  const result = await getPoolInstance().query(
    'SELECT * FROM bugs WHERE bug_id = ANY($1) AND deleted_at IS NULL',
    [bugIds]
  )

  const bugMap = new Map(result.rows.map((bug: any) => [bug.bug_id, bug]))
  return bugIds.map(id => bugMap.get(id) || null)
})

// DataLoader for batching project queries
const createProjectLoader = () => new DataLoader(async (projectIds: readonly string[]) => {
  const result = await getPoolInstance().query(
    'SELECT * FROM projects WHERE project_id = ANY($1) AND deleted_at IS NULL',
    [projectIds]
  )

  const projectMap = new Map(result.rows.map((project: any) => [project.project_id, project]))
  return projectIds.map(id => projectMap.get(id) || null)
})

// DataLoader for batching subtask queries
// Note: The subtasks table was renamed to task_checklists in migration 020
const createSubtaskLoader = () => new DataLoader(async (parentTaskIds: readonly string[]) => {
  const result = await getPoolInstance().query(
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
  const result = await getPoolInstance().query(
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
  const result = await getPoolInstance().query(
    'SELECT * FROM feed_posts WHERE post_id = ANY($1) AND deleted_at IS NULL',
    [postIds]
  )

  const postMap = new Map(result.rows.map((post: any) => [post.post_id, post]))
  return postIds.map(id => postMap.get(id) || null)
})

// DataLoader for batching feed topic queries
const createFeedTopicLoader = () => new DataLoader(async (topicIds: readonly string[]) => {
  const result = await getPoolInstance().query(
    'SELECT * FROM feed_topics WHERE id = ANY($1) AND deleted_at IS NULL',
    [topicIds]
  )

  const topicMap = new Map(result.rows.map((topic: any) => [topic.id, topic]))
  return topicIds.map(id => topicMap.get(id) || null)
})

// DataLoader for batching feed comments by post ID
const createFeedCommentsLoader = () => new DataLoader(async (postIds: readonly string[]) => {
  const result = await getPoolInstance().query(
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
  const result = await getPoolInstance().query(
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
  const result = await getPoolInstance().query(
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
    projectLoader: createProjectLoader(),
    subtasks: createSubtaskLoader(),
    bugSubtasks: createBugSubtaskLoader(),
    feedPost: createFeedPostLoader(),
    feedTopic: createFeedTopicLoader(),
    feedComments: createFeedCommentsLoader(),
    feedReactions: createFeedReactionsLoader(),
    feedPostTopics: createFeedPostTopicsLoader(),
    notificationLoader: createNotificationLoader()
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

        const result = await getPoolInstance().query(
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

        query += ' ORDER BY updated_at DESC'

        // Add pagination
        if (filters.limit) {
          query += ` LIMIT $${paramIndex++}`
          params.push(filters.limit)
        }
        if (filters.offset) {
          query += ` OFFSET $${paramIndex++}`
          params.push(filters.offset)
        }

        const dbStart = logDatabaseQuery(query, params, 'tasks')
        const result = await getPoolInstance().query(query, params)
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

      query += ' ORDER BY updated_at DESC'

      // Add pagination
      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`
        params.push(filters.limit)
      }
      if (filters.offset) {
        query += ` OFFSET $${paramIndex++}`
        params.push(filters.offset)
      }

      const result = await getPoolInstance().query(query, params)
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
      const result = await getPoolInstance().query(
        'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY project_name'
      )
      return result.rows
    },

    project: async (_: any, { projectId }: any) => {
      const result = await getPoolInstance().query(
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

      const result = await getPoolInstance().query(query)
      return result.rows
    },

    setting: async (_: any, { key }: any) => {
      const result = await getPoolInstance().query(
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
            tasksQuery += ' ORDER BY updated_at DESC'

            const tasksParams = isManagement ? [] : [employeeId, employeeId, employeeId]
            const dbStart = logDatabaseQuery(tasksQuery, tasksParams, 'dashboard.tasks')
            const result = await getPoolInstance().query(tasksQuery, tasksParams)
            logDatabaseResult(result.rows.length, dbStart.startTime, 'dashboard.tasks')
            return result
          })(),

          // Fetch bugs
          (async () => {
            let bugsQuery = 'SELECT * FROM bugs WHERE deleted_at IS NULL'
            if (!isManagement) {
              bugsQuery += ' AND (assigned_to = $1 OR reported_by = $2)'
            }
            bugsQuery += ' ORDER BY updated_at DESC'

            const bugsParams = isManagement ? [] : [employeeId, employeeId]
            const dbStart = logDatabaseQuery(bugsQuery, bugsParams, 'dashboard.bugs')
            const result = await getPoolInstance().query(bugsQuery, bugsParams)
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
            const result = await getPoolInstance().query('SELECT * FROM users ORDER BY name')
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
            const result = await getPoolInstance().query('SELECT * FROM settings WHERE is_active = true ORDER BY key')
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
          sql += ` AND (fp.content ILIKE $${params.length + 1} OR fp.og_title ILIKE $${params.length + 2})`
          params.push(`%${search}%`, `%${search}%`)
        }

        sql += ` ORDER BY fp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
        params.push(limit, offset)

        const dbStart = logDatabaseQuery(sql, params, 'feedPosts')
        const postsResult = await getPoolInstance().query(sql, params)
        logDatabaseResult(postsResult.rows.length, dbStart.startTime, 'feedPosts')

        const totalResult = await getPoolInstance().query(
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
      const { user } = context

      if (!user) {
        logResolverError('feedTopics', new Error('Unauthorized'), startTime)
        throw new Error('Unauthorized')
      }

      try {
        let sql = 'SELECT * FROM feed_topics WHERE deleted_at IS NULL'
        const params: any[] = []

        if (!includePersonal) {
          // Only public topics (not personal and not saved)
          sql += ' AND is_personal = false AND is_saved = false'
        } else {
          // Include:
          // 1. Public topics (is_personal = false AND is_saved = false)
          // 2. User's personal topics (is_personal = true AND owner_user_id = current user)
          // 3. User's saved posts (is_saved = true AND owner_user_id = current user)
          sql += ' AND ((is_personal = false AND is_saved = false) OR owner_user_id = $1)'
          params.push(user.employeeId)
        }

        sql += ' ORDER BY display_order ASC'

        const dbStart = logDatabaseQuery(sql, params, 'feedTopics')
        const result = await getPoolInstance().query(sql, params)
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
    },

    // Mention Queries
    ...mentionQueries,

    // Notification Queries
    ...notificationQueries
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
      const result = await getPoolInstance().query(
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
      const result = await getPoolInstance().query(
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
    startDate: (task: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!task.start_date) return null
      if (task.start_date instanceof Date) return task.start_date.toISOString()
      if (typeof task.start_date === 'number') return new Date(task.start_date).toISOString()
      return task.start_date
    },
    endDate: (task: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!task.end_date) return null
      if (task.end_date instanceof Date) return task.end_date.toISOString()
      if (typeof task.end_date === 'number') return new Date(task.end_date).toISOString()
      return task.end_date
    },
    priority: (task: any) => task.priority,
    estimatedHours: (task: any) => task.estimated_hours,
    actualHours: (task: any) => task.actual_hours,
    dailyHours: (task: any) => {
      // daily_hours is JSONB in database, convert to JSON string for GraphQL
      if (!task.daily_hours) return null
      if (typeof task.daily_hours === 'string') return task.daily_hours
      return JSON.stringify(task.daily_hours)
    },
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

    project: async (task: any, _: any, { loaders }: any) => {
      if (!task.project_id) return null
      try {
        return await loaders.projectLoader.load(task.project_id)
      } catch (error) {
        console.error(`[Task.project] Failed to load project ${task.project_id}:`, error)
        return null
      }
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
    startDate: (subtask: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!subtask.start_date) return null
      if (subtask.start_date instanceof Date) return subtask.start_date.toISOString()
      if (typeof subtask.start_date === 'number') return new Date(subtask.start_date).toISOString()
      return subtask.start_date
    },
    endDate: (subtask: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!subtask.end_date) return null
      if (subtask.end_date instanceof Date) return subtask.end_date.toISOString()
      if (typeof subtask.end_date === 'number') return new Date(subtask.end_date).toISOString()
      return subtask.end_date
    },
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
    title: (bug: any) => bug.title,
    description: (bug: any) => bug.description,
    category: (bug: any) => bug.category,
    severity: (bug: any) => bug.severity,
    priority: (bug: any) => bug.priority,
    status: (bug: any) => bug.status,
    platform: (bug: any) => bug.platform,
    type: (bug: any) => bug.type,
    feature: (bug: any) => bug.feature,
    assignedTo: (bug: any) => bug.assigned_to,
    assignedBy: (bug: any) => bug.assigned_by,
    reportedBy: (bug: any) => bug.reported_by,
    reportedDate: (bug: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!bug.reported_date) return null
      if (bug.reported_date instanceof Date) return bug.reported_date.toISOString()
      if (typeof bug.reported_date === 'number') return new Date(bug.reported_date).toISOString()
      return bug.reported_date
    },
    resolvedDate: (bug: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!bug.resolved_date) return null
      if (bug.resolved_date instanceof Date) return bug.resolved_date.toISOString()
      if (typeof bug.resolved_date === 'number') return new Date(bug.resolved_date).toISOString()
      return bug.resolved_date
    },
    startDate: (bug: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!bug.start_date) return null
      if (bug.start_date instanceof Date) return bug.start_date.toISOString()
      if (typeof bug.start_date === 'number') return new Date(bug.start_date).toISOString()
      return bug.start_date
    },
    endDate: (bug: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!bug.end_date) return null
      if (bug.end_date instanceof Date) return bug.end_date.toISOString()
      if (typeof bug.end_date === 'number') return new Date(bug.end_date).toISOString()
      return bug.end_date
    },
    estimatedHours: (bug: any) => bug.estimated_hours,
    actualHours: (bug: any) => bug.actual_hours,
    remarks: (bug: any) => bug.remarks,
    projectId: (bug: any) => bug.project_id,
    subprojectId: (bug: any) => bug.subproject_id,
    relatedBugs: (bug: any) => bug.related_bugs,
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
    },

    project: async (bug: any, _: any, { loaders }: any) => {
      if (!bug.project_id) return null
      try {
        return await loaders.projectLoader.load(bug.project_id)
      } catch (error) {
        console.error(`[Bug.project] Failed to load project ${bug.project_id}:`, error)
        return null
      }
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
    startDate: (subtask: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!subtask.start_date) return null
      if (subtask.start_date instanceof Date) return subtask.start_date.toISOString()
      if (typeof subtask.start_date === 'number') return new Date(subtask.start_date).toISOString()
      return subtask.start_date
    },
    endDate: (subtask: any) => {
      // Convert MySQL DATE to ISO 8601 string
      if (!subtask.end_date) return null
      if (subtask.end_date instanceof Date) return subtask.end_date.toISOString()
      if (typeof subtask.end_date === 'number') return new Date(subtask.end_date).toISOString()
      return subtask.end_date
    },
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
      const result = await getPoolInstance().query(
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
    value: (setting: any) => {
      // value can be a JSON array in database, convert to JSON string for GraphQL
      if (!setting.value) return null
      if (typeof setting.value === 'string') return setting.value
      // If it's an array or object, stringify it
      return JSON.stringify(setting.value)
    },
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
    linkTitle: (post: any) => post.og_title,
    linkDescription: (post: any) => post.og_description,
    linkImage: (post: any) => post.og_image,
    mediaUrls: (post: any) => post.media_urls ? JSON.parse(post.media_urls) : [],
    createdBy: (post: any) => post.created_by,
    createdAt: (post: any) => {
      if (!post.created_at) {
        console.warn(`[FeedPost] createdAt is null/undefined for post ${post.post_id}`)
        return null
      }
      // Validate the date and return ISO string
      const date = new Date(post.created_at)
      if (isNaN(date.getTime())) {
        console.error(`[FeedPost] Invalid createdAt date for post ${post.post_id}: ${post.created_at}`)
        return null
      }
      return date.toISOString()
    },
    updatedAt: (post: any) => {
      if (!post.updated_at) return null
      const date = new Date(post.updated_at)
      if (isNaN(date.getTime())) {
        console.error(`[FeedPost] Invalid updatedAt date for post ${post.post_id}: ${post.updated_at}`)
        return null
      }
      return date.toISOString()
    },
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
        const result = await getPoolInstance().query(
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
        const result = await getPoolInstance().query(
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
        const result = await getPoolInstance().query(
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
        const result = await getPoolInstance().query(
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
    createdAt: (topic: any) => topic.created_at,
    postCount: async (topic: any) => {
      try {
        const topicId = topic.topic_id || topic.id
        const result = await getPoolInstance().query(
          `SELECT COUNT(DISTINCT fp.post_id) as count
           FROM feed_post_topics fpt
           JOIN feed_posts fp ON fpt.post_id = fp.post_id
           WHERE fpt.topic_id = $1
           AND fp.deleted_at IS NULL
           AND fp.status = 'published'`,
          [topicId]
        )
        return parseInt(result.rows[0]?.count || '0')
      } catch (error) {
        console.error(`[FeedTopic.postCount] Failed to get post count for topic ${topic.topic_id || topic.id}:`, error)
        return 0
      }
    }
  },

  // Field resolvers for FeedComment
  FeedComment: {
    commentId: (comment: any) => comment.comment_id,
    postId: (comment: any) => comment.post_id,
    parentCommentId: (comment: any) => comment.parent_comment_id,
    content: (comment: any) => comment.content,
    createdBy: (comment: any) => comment.created_by,
    createdAt: (comment: any) => {
      if (!comment.created_at) {
        console.warn(`[FeedComment] createdAt is null/undefined for comment ${comment.comment_id}`)
        return null
      }
      const date = new Date(comment.created_at)
      if (isNaN(date.getTime())) {
        console.error(`[FeedComment] Invalid createdAt date for comment ${comment.comment_id}: ${comment.created_at}`)
        return null
      }
      return comment.created_at
    },
    updatedAt: (comment: any) => {
      if (!comment.updated_at) return null
      const date = new Date(comment.updated_at)
      if (isNaN(date.getTime())) {
        console.error(`[FeedComment] Invalid updatedAt date for comment ${comment.comment_id}: ${comment.updated_at}`)
        return null
      }
      return comment.updated_at
    },

    author: async (comment: any, _: any, { loaders }: any) => {
      return loaders.user.load(comment.created_by)
    },

    replies: async (comment: any) => {
      const result = await getPoolInstance().query(
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
    // Authentication mutations
    login: async (_: any, { employeeId, password }: any) => {
      const { startTime } = logResolverStart('login', { employeeId })

      try {
        // Query user from database
        const dbStart = logDatabaseQuery(
          'SELECT * FROM users WHERE employee_id = $1 AND status = $2',
          [employeeId, 'active'],
          'login'
        )

        const result = await getPoolInstance().query(
          'SELECT * FROM users WHERE employee_id = $1 AND status = $2',
          [employeeId, 'active']
        )

        logDatabaseResult(result.rows.length, dbStart.startTime, 'login')

        if (result.rows.length === 0) {
          logResolverError('login', new Error('User not found or inactive'), startTime)
          throw new Error('Invalid credentials')
        }

        const user = result.rows[0]

        // Verify password (plain text comparison for now)
        if (user.password !== password) {
          logResolverError('login', new Error('Invalid password'), startTime)
          throw new Error('Invalid credentials')
        }

        // Generate JWT token
        const jwt = require('jsonwebtoken')
        const token = jwt.sign(
          {
            employeeId: user.employee_id,
            role: user.role,
            name: user.name
          },
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
          { expiresIn: '7d' }
        )

        const response = {
          token,
          user: user
        }

        logResolverSuccess('login', response, startTime)
        return response
      } catch (error) {
        logResolverError('login', error, startTime)
        throw error
      }
    },

    // Task mutations
    createTask: async (_: any, { input }: any) => {
      const taskId = `TSK-${Date.now()}`
      const support = input.support ? JSON.stringify(input.support) : '[]'

      // ✅ FIXED: Use snake_case column names for PostgreSQL
      await getPoolInstance().query(
        `INSERT INTO tasks (task_id, description, assigned_to, assigned_by, support, start_date, end_date,
         priority, estimated_hours, select_type, recursive_type, project_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending', NOW(), NOW())`,
        [taskId, input.description, JSON.stringify([input.assignedTo]), input.assignedBy, support, input.startDate,
         input.endDate, input.priority, input.estimatedHours, input.selectType, input.recursiveType, input.projectId]
      )

      const result = await getPoolInstance().query(
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

      await getPoolInstance().query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE task_id = $${paramIndex}`,
        params
      )

      const result = await getPoolInstance().query(
        'SELECT * FROM tasks WHERE task_id = $1',
        [taskId]
      )
      return result.rows[0]
    },

    deleteTask: async (_: any, { taskId }: any) => {
      await getPoolInstance().query(
        'UPDATE tasks SET deleted_at = NOW() WHERE task_id = $1',
        [taskId]
      )
      return true
    },

    // Bug mutations
    createBug: async (_: any, { input }: any) => {
      // ✅ UPDATED: Generate sequential bug ID with DEV- prefix
      // Get latest bug ID from database to continue numbering
      const latestBugResult = await getPoolInstance().query(
        `SELECT bug_id FROM bugs
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`
      )
      const latestBugId = latestBugResult.rows[0]?.bug_id

      // Import generateSequentialBugId function
      const { generateSequentialBugId } = await import('@/lib/data')
      const bugId = generateSequentialBugId(latestBugId)

      // ✅ FIXED: Use snake_case column names for PostgreSQL
      await getPoolInstance().query(
        `INSERT INTO bugs (bug_id, description, category, severity, status, assigned_to, assigned_by,
         reported_by, reported_date, estimated_hours, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Open', $5, $6, $7, $8, $9, NOW(), NOW())`,
        [bugId, input.description, input.category, input.severity, input.assignedTo, input.assignedBy,
         input.reportedBy, input.reportedDate, input.estimatedHours]
      )

      const result = await getPoolInstance().query(
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

      await getPoolInstance().query(
        `UPDATE bugs SET ${updates.join(', ')} WHERE bug_id = $${paramIndex}`,
        params
      )

      const result = await getPoolInstance().query(
        'SELECT * FROM bugs WHERE bug_id = $1',
        [bugId]
      )
      return result.rows[0]
    },

    deleteBug: async (_: any, { bugId }: any) => {
      await getPoolInstance().query(
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
      await getPoolInstance().query(
        `INSERT INTO users (employee_id, name, email, phone, department, role, password, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`,
        [input.employeeId, input.name, input.email, input.phone, input.department, input.role, hashedPassword]
      )

      const result = await getPoolInstance().query(
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

      await getPoolInstance().query(
        `UPDATE users SET ${updates.join(', ')} WHERE employee_id = $${paramIndex}`,
        params
      )

      const result = await getPoolInstance().query(
        'SELECT * FROM users WHERE employee_id = $1',
        [employeeId]
      )
      return result.rows[0]
    },

    // Feed Mutations
    createFeedPost: async (_: any, { input }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Check if posting to personal topic
      const topicCheck = await getPoolInstance().query(
        'SELECT is_personal FROM feed_topics WHERE id = ANY($1) AND deleted_at IS NULL',
        [input.topicIds]
      )
      const isPersonalPost = topicCheck.rows.some((t: any) => t.is_personal === true)

      // Auto-publish for: personal posts, admin, top_management, management, amtarikshian
      const status = isPersonalPost || ['admin', 'top_management', 'management', 'amtarikshian'].includes(user.role)
        ? 'published'
        : 'pending'

      const mediaUrls = input.mediaUrls ? JSON.stringify(input.mediaUrls) : null

      await getPoolInstance().query(
        `INSERT INTO feed_posts (post_id, content_type, content, link_url, og_title, og_description, og_image, created_by, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [postId, input.contentType, input.content, input.linkUrl, input.linkTitle, input.linkDescription, input.linkImage, user.employeeId, status]
      )

      // Link to topics
      for (const topicId of input.topicIds) {
        await getPoolInstance().query(
          'INSERT INTO feed_post_topics (post_id, topic_id) VALUES ($1, $2)',
          [postId, topicId]
        )
      }

      // Parse and store mentions
      try {
        const mentions = await parseMentions(input.content)
        if (mentions.length > 0) {
          await storeMentions(mentions, postId, null, user.employeeId)
          console.log(`✅ [createFeedPost] Stored ${mentions.length} mentions for post ${postId}`)
        }
      } catch (error) {
        console.error('[createFeedPost] Error parsing/storing mentions:', error)
        // Don't fail the post creation if mention parsing fails
      }

      const result = await getPoolInstance().query(
        'SELECT * FROM feed_posts WHERE post_id = $1',
        [postId]
      )
      return result.rows[0]
    },

    updateFeedPost: async (_: any, { postId, input }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      // Get the current post to check for status changes
      const currentPostResult = await getPoolInstance().query(
        'SELECT status, created_by FROM feed_posts WHERE post_id = $1',
        [postId]
      )
      const currentPost = currentPostResult.rows[0]
      const oldStatus = currentPost?.status
      const postAuthorId = currentPost?.created_by

      const updates: string[] = []
      const params: any[] = []
      let paramIndex = 1

      const fieldMap: Record<string, string> = {
        content: 'content',
        linkUrl: 'link_url',
        linkTitle: 'og_title',
        linkDescription: 'og_description',
        linkImage: 'og_image',
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

        await getPoolInstance().query(
          `UPDATE feed_posts SET ${updates.join(', ')} WHERE post_id = $${paramIndex}`,
          params
        )
      }

      // Update topics if provided
      if (input.topicIds) {
        await getPoolInstance().query('DELETE FROM feed_post_topics WHERE post_id = $1', [postId])
        for (const topicId of input.topicIds) {
          await getPoolInstance().query(
            'INSERT INTO feed_post_topics (post_id, topic_id) VALUES ($1, $2)',
            [postId, topicId]
          )
        }
      }

      // Create notification if status changed to published or rejected
      if (input.status && input.status !== oldStatus && postAuthorId) {
        try {
          if (input.status === 'published' && oldStatus === 'pending') {
            await createPostStatusNotification(
              postAuthorId,
              user.employeeId,
              postId,
              'approved',
              user.name
            )
            console.log(`✅ [updateFeedPost] Created approval notification for post author ${postAuthorId}`)
          } else if (input.status === 'rejected') {
            await createPostStatusNotification(
              postAuthorId,
              user.employeeId,
              postId,
              'rejected',
              user.name
            )
            console.log(`✅ [updateFeedPost] Created rejection notification for post author ${postAuthorId}`)
          }
        } catch (notifError) {
          console.error('[updateFeedPost] Error creating notification:', notifError)
          // Don't fail the update if notification fails
        }
      }

      const result = await getPoolInstance().query(
        'SELECT * FROM feed_posts WHERE post_id = $1',
        [postId]
      )
      return result.rows[0]
    },

    deleteFeedPost: async (_: any, { postId }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      await getPoolInstance().query(
        'UPDATE feed_posts SET deleted_at = NOW(), deleted_by = $1 WHERE post_id = $2',
        [user.employeeId, postId]
      )
      return true
    },

    createFeedComment: async (_: any, { postId, content, parentCommentId }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await getPoolInstance().query(
        `INSERT INTO feed_comments (comment_id, post_id, parent_comment_id, content, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [commentId, postId, parentCommentId, content, user.employeeId]
      )

      // Parse and store mentions
      try {
        const mentions = await parseMentions(content)
        if (mentions.length > 0) {
          await storeMentions(mentions, null, commentId, user.employeeId)
          console.log(`✅ [createFeedComment] Stored ${mentions.length} mentions for comment ${commentId}`)
        }
      } catch (error) {
        console.error('[createFeedComment] Error parsing/storing mentions:', error)
        // Don't fail the comment creation if mention parsing fails
      }

      // Create notification for post author (if not commenting on own post)
      try {
        const postResult = await getPoolInstance().query(
          'SELECT created_by FROM feed_posts WHERE post_id = $1',
          [postId]
        )
        const postAuthorId = postResult.rows[0]?.created_by

        if (postAuthorId && postAuthorId !== user.employeeId) {
          await createCommentNotification(
            postAuthorId,
            user.employeeId,
            postId,
            commentId,
            user.name
          )
          console.log(`✅ [createFeedComment] Created notification for post author ${postAuthorId}`)
        }
      } catch (notifError) {
        console.error('[createFeedComment] Error creating notification:', notifError)
        // Don't fail the comment creation if notification fails
      }

      const result = await getPoolInstance().query(
        'SELECT * FROM feed_comments WHERE comment_id = $1',
        [commentId]
      )
      return result.rows[0]
    },

    deleteFeedComment: async (_: any, { commentId }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      await getPoolInstance().query(
        'UPDATE feed_comments SET deleted_at = NOW(), deleted_by = $1 WHERE comment_id = $2',
        [user.employeeId, commentId]
      )
      return true
    },

    toggleFeedReaction: async (_: any, { postId, emoji }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const existing = await getPoolInstance().query(
        'SELECT * FROM feed_reactions WHERE post_id = $1 AND user_id = $2 AND emoji = $3 AND deleted_at IS NULL',
        [postId, user.employeeId, emoji]
      )

      if (existing.rows.length > 0) {
        await getPoolInstance().query(
          'UPDATE feed_reactions SET deleted_at = NOW() WHERE post_id = $1 AND user_id = $2 AND emoji = $3',
          [postId, user.employeeId, emoji]
        )
        return { action: 'removed', message: 'Reaction removed' }
      } else {
        await getPoolInstance().query(
          'INSERT INTO feed_reactions (post_id, user_id, emoji, created_at) VALUES ($1, $2, $3, NOW())',
          [postId, user.employeeId, emoji]
        )

        // Create notification for post author (if not reacting to own post)
        try {
          const postResult = await getPoolInstance().query(
            'SELECT created_by FROM feed_posts WHERE post_id = $1',
            [postId]
          )
          const postAuthorId = postResult.rows[0]?.created_by

          if (postAuthorId && postAuthorId !== user.employeeId) {
            await createReactionNotification(
              postAuthorId,
              user.employeeId,
              postId,
              emoji,
              user.name
            )
            console.log(`✅ [toggleFeedReaction] Created notification for post author ${postAuthorId}`)
          }
        } catch (notifError) {
          console.error('[toggleFeedReaction] Error creating notification:', notifError)
          // Don't fail the reaction if notification fails
        }

        return { action: 'added', message: 'Reaction added' }
      }
    },

    trackFeedView: async (_: any, { postId }: any, { user }: any) => {
      if (!user) return false

      try {
        // Use ON CONFLICT to handle race conditions (idempotent)
        await getPoolInstance().query(
          'INSERT INTO feed_views (post_id, user_id, viewed_at) VALUES ($1, $2, NOW()) ON CONFLICT (post_id, user_id) DO NOTHING',
          [postId, user.employeeId]
        )
        return true
      } catch (error) {
        console.error('[trackFeedView] Error tracking view:', error)
        return false
      }
    },

    toggleFeedSave: async (_: any, { postId }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      // Get user's "Saved Posts" topic
      const savedTopic = await getPoolInstance().query(
        'SELECT id FROM feed_topics WHERE is_saved = true AND owner_user_id = $1 AND deleted_at IS NULL',
        [user.employeeId]
      )

      if (savedTopic.rows.length === 0) {
        throw new Error('Saved Posts topic not found. Please initialize personal topics first.')
      }

      const savedTopicId = savedTopic.rows[0].id

      // Check if already saved
      const existing = await getPoolInstance().query(
        'SELECT * FROM feed_post_topics WHERE post_id = $1 AND topic_id = $2',
        [postId, savedTopicId]
      )

      if (existing.rows.length > 0) {
        await getPoolInstance().query(
          'DELETE FROM feed_post_topics WHERE post_id = $1 AND topic_id = $2',
          [postId, savedTopicId]
        )
        return { action: 'removed', message: 'Post removed from Saved Posts' }
      } else {
        await getPoolInstance().query(
          'INSERT INTO feed_post_topics (post_id, topic_id) VALUES ($1, $2)',
          [postId, savedTopicId]
        )
        return { action: 'added', message: 'Post saved successfully' }
      }
    },

    createFeedTopic: async (_: any, { input }: any, { user }: any) => {
      if (!user) throw new Error('Unauthorized')

      const result = await getPoolInstance().query(
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
        const existing = await getPoolInstance().query(
          'SELECT * FROM feed_topics WHERE is_personal = true AND owner_user_id = $1 AND deleted_at IS NULL',
          [user.employeeId]
        )

        // Find existing topics by type
        let personalNotes = existing.rows.find((t: any) => !t.is_saved)
        let savedPosts = existing.rows.find((t: any) => t.is_saved)

        // If both exist, return them
        if (personalNotes && savedPosts) {
          console.log(`[initPersonalTopics] Both personal topics already exist for user ${user.employeeId}`)
          return {
            personalNotes,
            savedPosts
          }
        }

        console.log(`[initPersonalTopics] Creating missing personal topics for user ${user.employeeId}`, {
          hasPersonalNotes: !!personalNotes,
          hasSavedPosts: !!savedPosts
        })

        // Create Personal Notes topic if it doesn't exist
        if (!personalNotes) {
          try {
            const result = await getPoolInstance().query(
              `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, is_saved, owner_user_id, created_by, created_at)
               VALUES ($1, $2, $3, $4, true, false, $5, $6, NOW())
               RETURNING *`,
              [`${user.name}'s Personal Notes`, 'Your private notes and thoughts', '📝', 1000, user.employeeId, user.employeeId]
            )
            personalNotes = result.rows[0]
            console.log(`[initPersonalTopics] Created Personal Notes topic for user ${user.employeeId}`)
          } catch (err: any) {
            // If duplicate key error, fetch the existing record
            // The unique constraint is on (owner_user_id, is_personal) WHERE is_personal = true
            if (err.code === '23505') {
              console.log(`[initPersonalTopics] Personal Notes topic already exists for user ${user.employeeId}, fetching it`)

              // Try multiple queries to find the record (race condition handling)
              let result = await getPoolInstance().query(
                'SELECT * FROM feed_topics WHERE is_personal = true AND owner_user_id = $1 AND deleted_at IS NULL AND (is_saved = false OR is_saved IS NULL) LIMIT 1',
                [user.employeeId]
              )
              personalNotes = result.rows[0]

              // If not found, try without deleted_at filter (might be soft-deleted)
              if (!personalNotes) {
                console.log(`[initPersonalTopics] Trying to find soft-deleted Personal Notes topic for user ${user.employeeId}`)
                result = await getPoolInstance().query(
                  'SELECT * FROM feed_topics WHERE is_personal = true AND owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
                  [user.employeeId]
                )
                personalNotes = result.rows[0]

                // If found but soft-deleted, restore it
                if (personalNotes && personalNotes.deleted_at) {
                  console.log(`[initPersonalTopics] Restoring soft-deleted Personal Notes topic for user ${user.employeeId}`)
                  result = await getPoolInstance().query(
                    'UPDATE feed_topics SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING *',
                    [personalNotes.id]
                  )
                  personalNotes = result.rows[0]
                }
              }

              // If still not found, wait a bit and retry (race condition with concurrent request)
              if (!personalNotes) {
                console.log(`[initPersonalTopics] Waiting 100ms and retrying for user ${user.employeeId} (possible race condition)`)
                await new Promise(resolve => setTimeout(resolve, 100))
                result = await getPoolInstance().query(
                  'SELECT * FROM feed_topics WHERE is_personal = true AND owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
                  [user.employeeId]
                )
                personalNotes = result.rows[0]
              }

              // If STILL not found, use INSERT ... ON CONFLICT
              if (!personalNotes) {
                console.warn(`[initPersonalTopics] Could not find existing Personal Notes topic for user ${user.employeeId}, creating new one`)
                result = await getPoolInstance().query(
                  `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, is_saved, owner_user_id, created_by, created_at)
                   VALUES ($1, $2, $3, $4, true, false, $5, $6, NOW())
                   ON CONFLICT DO NOTHING
                   RETURNING *`,
                  [`${user.name}'s Personal Notes`, 'Your private notes and thoughts', '📝', 1000, user.employeeId, user.employeeId]
                )
                personalNotes = result.rows[0]

                // If ON CONFLICT DO NOTHING returned nothing, fetch one more time
                if (!personalNotes) {
                  result = await getPoolInstance().query(
                    'SELECT * FROM feed_topics WHERE is_personal = true AND owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
                    [user.employeeId]
                  )
                  personalNotes = result.rows[0]
                }
              }

              // Last resort: log error but don't throw
              if (!personalNotes) {
                console.error(`[initPersonalTopics] CRITICAL: Failed to fetch or create Personal Notes topic for user ${user.employeeId} after multiple attempts`)
                console.error(`[initPersonalTopics] This indicates a database constraint or data integrity issue`)
                // Don't throw - continue with Saved Posts
              }
            } else {
              throw err
            }
          }
        }

        // Create Saved Posts topic if it doesn't exist
        if (!savedPosts) {
          try {
            const result = await getPoolInstance().query(
              `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, is_saved, owner_user_id, created_by, created_at)
               VALUES ($1, $2, $3, $4, true, true, $5, $6, NOW())
               RETURNING *`,
              [`${user.name}'s Saved Posts`, 'Posts you want to save for later', '🔖', 1001, user.employeeId, user.employeeId]
            )
            savedPosts = result.rows[0]
            console.log(`[initPersonalTopics] Created Saved Posts topic for user ${user.employeeId}`)
          } catch (err: any) {
            // If duplicate key error, fetch the existing record
            // The unique constraint is on (owner_user_id, is_saved) WHERE is_saved = true
            if (err.code === '23505') {
              console.log(`[initPersonalTopics] Saved Posts topic already exists for user ${user.employeeId}, fetching it`)

              // Try multiple queries to find the record (race condition handling)
              let result = await getPoolInstance().query(
                'SELECT * FROM feed_topics WHERE is_saved = true AND owner_user_id = $1 AND deleted_at IS NULL LIMIT 1',
                [user.employeeId]
              )
              savedPosts = result.rows[0]

              // If not found, try without deleted_at filter (might be soft-deleted)
              if (!savedPosts) {
                console.log(`[initPersonalTopics] Trying to find soft-deleted Saved Posts topic for user ${user.employeeId}`)
                result = await getPoolInstance().query(
                  'SELECT * FROM feed_topics WHERE is_saved = true AND owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
                  [user.employeeId]
                )
                savedPosts = result.rows[0]

                // If found but soft-deleted, restore it
                if (savedPosts && savedPosts.deleted_at) {
                  console.log(`[initPersonalTopics] Restoring soft-deleted Saved Posts topic for user ${user.employeeId}`)
                  result = await getPoolInstance().query(
                    'UPDATE feed_topics SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING *',
                    [savedPosts.id]
                  )
                  savedPosts = result.rows[0]
                }
              }

              // If still not found, wait a bit and retry (race condition with concurrent request)
              if (!savedPosts) {
                console.log(`[initPersonalTopics] Waiting 100ms and retrying for user ${user.employeeId} (possible race condition)`)
                await new Promise(resolve => setTimeout(resolve, 100))
                result = await getPoolInstance().query(
                  'SELECT * FROM feed_topics WHERE is_saved = true AND owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
                  [user.employeeId]
                )
                savedPosts = result.rows[0]
              }

              // If STILL not found, create it anyway (ignore the duplicate key error)
              if (!savedPosts) {
                console.warn(`[initPersonalTopics] Could not find existing Saved Posts topic for user ${user.employeeId}, creating new one`)
                // Use INSERT ... ON CONFLICT to handle race condition
                result = await getPoolInstance().query(
                  `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, is_saved, owner_user_id, created_by, created_at)
                   VALUES ($1, $2, $3, $4, true, true, $5, $6, NOW())
                   ON CONFLICT DO NOTHING
                   RETURNING *`,
                  [`${user.name}'s Saved Posts`, 'Posts you want to save for later', '🔖', 1001, user.employeeId, user.employeeId]
                )
                savedPosts = result.rows[0]

                // If ON CONFLICT DO NOTHING returned nothing, fetch the existing record one more time
                if (!savedPosts) {
                  result = await getPoolInstance().query(
                    'SELECT * FROM feed_topics WHERE is_saved = true AND owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
                    [user.employeeId]
                  )
                  savedPosts = result.rows[0]
                }
              }

              // Last resort: if we still don't have it, log detailed error but don't throw
              if (!savedPosts) {
                console.error(`[initPersonalTopics] CRITICAL: Failed to fetch or create Saved Posts topic for user ${user.employeeId} after multiple attempts`)
                console.error(`[initPersonalTopics] This indicates a database constraint or data integrity issue`)
                // Don't throw - return what we have (Personal Notes only)
              }
            } else {
              throw err
            }
          }
        }

        // Ensure we have both topics (create fallback if needed)
        if (!personalNotes) {
          console.error(`[initPersonalTopics] CRITICAL: Personal Notes topic is null for user ${user.employeeId}, creating fallback`)
          const fallbackResult = await getPoolInstance().query(
            `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, is_saved, owner_user_id, created_by, created_at)
             VALUES ($1, $2, $3, $4, true, false, $5, $6, NOW())
             ON CONFLICT DO NOTHING
             RETURNING *`,
            [`${user.name}'s Personal Notes`, 'Your private notes and thoughts', '📝', 1000, user.employeeId, user.employeeId]
          )
          personalNotes = fallbackResult.rows[0]

          // If still null, fetch any personal topic for this user
          if (!personalNotes) {
            const anyResult = await getPoolInstance().query(
              'SELECT * FROM feed_topics WHERE is_personal = true AND owner_user_id = $1 LIMIT 1',
              [user.employeeId]
            )
            personalNotes = anyResult.rows[0]
          }
        }

        if (!savedPosts) {
          console.error(`[initPersonalTopics] CRITICAL: Saved Posts topic is null for user ${user.employeeId}, creating fallback`)
          const fallbackResult = await getPoolInstance().query(
            `INSERT INTO feed_topics (topic_name, description, icon, display_order, is_personal, is_saved, owner_user_id, created_by, created_at)
             VALUES ($1, $2, $3, $4, true, true, $5, $6, NOW())
             ON CONFLICT DO NOTHING
             RETURNING *`,
            [`${user.name}'s Saved Posts`, 'Posts you want to save for later', '🔖', 1001, user.employeeId, user.employeeId]
          )
          savedPosts = fallbackResult.rows[0]

          // If still null, fetch any saved topic for this user
          if (!savedPosts) {
            const anyResult = await getPoolInstance().query(
              'SELECT * FROM feed_topics WHERE is_saved = true AND owner_user_id = $1 LIMIT 1',
              [user.employeeId]
            )
            savedPosts = anyResult.rows[0]
          }
        }

        console.log(`[initPersonalTopics] Successfully initialized personal topics for user ${user.employeeId}`)

        return {
          personalNotes: personalNotes || null,
          savedPosts: savedPosts || null
        }
      } catch (error: any) {
        console.error(`[initPersonalTopics] Error for user ${user?.employeeId}:`, error)
        throw new Error(`Failed to initialize personal topics: ${error.message}`)
      }
    },

    // Mention Mutations
    ...mentionMutations,

    // Notification Mutations
    ...notificationMutations
  },

  // Field Resolvers
  ...mentionFieldResolvers,

  // Notification Field Resolvers
  FeedNotification: FeedNotificationFieldResolvers
}

