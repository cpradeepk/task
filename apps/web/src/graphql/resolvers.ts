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

export const createContext = () => ({
  loaders: {
    user: createUserLoader(),
    task: createTaskLoader(),
    bug: createBugLoader(),
    subtasks: createSubtaskLoader(),
    bugSubtasks: createBugSubtaskLoader()
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

        // Fetch tasks
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
        const dbStart1 = logDatabaseQuery(tasksQuery, tasksParams, 'dashboard.tasks')
        const tasksResult = await pool.query(tasksQuery, tasksParams)
        logDatabaseResult(tasksResult.rows.length, dbStart1.startTime, 'dashboard.tasks')
        const tasks = tasksResult.rows

        // Fetch bugs
        let bugsQuery = 'SELECT * FROM bugs WHERE deleted_at IS NULL'
        if (!isManagement) {
          bugsQuery += ' AND (assigned_to = $1 OR reported_by = $2)'
        }
        bugsQuery += ' ORDER BY created_at DESC'

        const bugsParams = isManagement ? [] : [employeeId, employeeId]
        const dbStart2 = logDatabaseQuery(bugsQuery, bugsParams, 'dashboard.bugs')
        const bugsResult = await pool.query(bugsQuery, bugsParams)
        logDatabaseResult(bugsResult.rows.length, dbStart2.startTime, 'dashboard.bugs')
        const bugs = bugsResult.rows

        // Fetch users and settings
        const dbStart3 = logDatabaseQuery(
          'SELECT * FROM users ORDER BY name',
          [],
          'dashboard.users'
        )
        const usersResult = await pool.query(
          'SELECT * FROM users ORDER BY name'
        )
        logDatabaseResult(usersResult.rows.length, dbStart3.startTime, 'dashboard.users')
        const users = usersResult.rows

        const dbStart4 = logDatabaseQuery(
          'SELECT * FROM settings WHERE is_active = true ORDER BY key',
          [],
          'dashboard.settings'
        )
        const settingsResult = await pool.query(
          'SELECT * FROM settings WHERE is_active = true ORDER BY key'
        )
        logDatabaseResult(settingsResult.rows.length, dbStart4.startTime, 'dashboard.settings')
        const settings = settingsResult.rows

        const result = { tasks, bugs, users, settings }
        logResolverSuccess('dashboard', result, startTime)

        return result
      } catch (error) {
        logResolverError('dashboard', error, startTime)
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

    assignedToUser: (task: any, _: any, { loaders }: any) => {
      // ✅ FIXED: assignedTo is now an array, return first user for backward compatibility
      const assignedToArray = Array.isArray(task.assigned_to) ? task.assigned_to : []
      return assignedToArray.length > 0 ? loaders.user.load(assignedToArray[0]) : null
    },

    assignedToUsers: async (task: any, _: any, { loaders }: any) => {
      // ✅ NEW: Return all assigned users
      const assignedToArray = Array.isArray(task.assigned_to) ? task.assigned_to : []
      if (assignedToArray.length === 0) return []

      // loadMany can return Error objects in the array, filter them out
      const results = await loaders.user.loadMany(assignedToArray)
      return results.filter((result: any) => !(result instanceof Error))
    },

    assignedByUser: (task: any, _: any, { loaders }: any) => {
      return loaders.user.load(task.assigned_by)
    },

    supportUsers: async (task: any, _: any, { loaders }: any) => {
      if (!task.support) return []
      // Support is stored as JSONB array in PostgreSQL
      const supportIds = Array.isArray(task.support) ? task.support : []
      return Promise.all(supportIds.map((id: string) => loaders.user.load(id)))
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
    subTaskId: (subtask: any) => subtask.sub_task_id,
    parentTaskId: (subtask: any) => subtask.parent_task_id,
    description: (subtask: any) => subtask.description,
    assignedTo: (subtask: any) => subtask.assigned_to,
    assignedBy: (subtask: any) => subtask.assigned_by,
    startDate: (subtask: any) => subtask.start_date,
    endDate: (subtask: any) => subtask.end_date,
    priority: (subtask: any) => subtask.priority,
    estimatedHours: (subtask: any) => subtask.estimated_hours,
    actualHours: (subtask: any) => subtask.actual_hours,
    status: (subtask: any) => subtask.status,
    remarks: (subtask: any) => subtask.remarks,
    deletedAt: (subtask: any) => subtask.deleted_at,
    deletedBy: (subtask: any) => subtask.deleted_by,
    createdAt: (subtask: any) => subtask.created_at,
    updatedAt: (subtask: any) => subtask.updated_at,

    assignedToUser: (subtask: any, _: any, { loaders }: any) => {
      return loaders.user.load(subtask.assigned_to)
    },

    assignedByUser: (subtask: any, _: any, { loaders }: any) => {
      return loaders.user.load(subtask.assigned_by)
    },

    parentTask: (subtask: any, _: any, { loaders }: any) => {
      return loaders.task.load(subtask.parent_task_id)
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

    assignedToUser: (bug: any, _: any, { loaders }: any) => {
      return loaders.user.load(bug.assigned_to)
    },

    assignedByUser: (bug: any, _: any, { loaders }: any) => {
      return loaders.user.load(bug.assigned_by)
    },

    reportedByUser: (bug: any, _: any, { loaders }: any) => {
      return loaders.user.load(bug.reported_by)
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
    subTaskId: (subtask: any) => subtask.sub_task_id,
    parentBugId: (subtask: any) => subtask.parent_bug_id,
    description: (subtask: any) => subtask.description,
    assignedTo: (subtask: any) => subtask.assigned_to,
    assignedBy: (subtask: any) => subtask.assigned_by,
    startDate: (subtask: any) => subtask.start_date,
    endDate: (subtask: any) => subtask.end_date,
    priority: (subtask: any) => subtask.priority,
    estimatedHours: (subtask: any) => subtask.estimated_hours,
    actualHours: (subtask: any) => subtask.actual_hours,
    status: (subtask: any) => subtask.status,
    remarks: (subtask: any) => subtask.remarks,
    isCompleted: (subtask: any) => subtask.is_completed,
    displayOrder: (subtask: any) => subtask.display_order,
    deletedAt: (subtask: any) => subtask.deleted_at,
    deletedBy: (subtask: any) => subtask.deleted_by,
    createdAt: (subtask: any) => subtask.created_at,
    updatedAt: (subtask: any) => subtask.updated_at,
    createdBy: (subtask: any) => subtask.created_by,

    assignedToUser: (subtask: any, _: any, { loaders }: any) => {
      return loaders.user.load(subtask.assigned_to)
    },

    assignedByUser: (subtask: any, _: any, { loaders }: any) => {
      return loaders.user.load(subtask.assigned_by)
    },

    parentBug: (subtask: any, _: any, { loaders }: any) => {
      return loaders.bug.load(subtask.parent_bug_id)
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
    }
  }
}

