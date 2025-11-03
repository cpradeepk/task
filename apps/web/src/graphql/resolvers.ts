import DataLoader from 'dataloader'
import { getPool } from '@/lib/db'
const pool = getPool()

// DataLoader for batching user queries
const createUserLoader = () => new DataLoader(async (employeeIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE employee_id = ANY($1) AND deleted_at IS NULL',
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
const createSubtaskLoader = () => new DataLoader(async (parentTaskIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM subtasks WHERE parent_task_id = ANY($1) AND deleted_at IS NULL',
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
const createBugSubtaskLoader = () => new DataLoader(async (parentBugIds: readonly string[]) => {
  const result = await pool.query(
    'SELECT * FROM bug_subtasks WHERE parent_bug_id = ANY($1) AND deleted_at IS NULL',
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
      const result = await pool.query(
        'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY name'
      )
      return result.rows
    },

    user: async (_: any, { employeeId }: any, { loaders }: any) => {
      return loaders.user.load(employeeId)
    },

    // Tasks
    tasks: async (_: any, filters: any) => {
      let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL'
      const params: any[] = []
      let paramIndex = 1

      if (filters.assignedTo) {
        query += ` AND assigned_to = $${paramIndex++}`
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

      const result = await pool.query(query, params)
      return result.rows
    },

    task: async (_: any, { taskId }: any, { loaders }: any) => {
      return loaders.task.load(taskId)
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
      const isManagement = ['management', 'top_management', 'admin'].includes(role)

      // Fetch tasks
      let tasksQuery = 'SELECT * FROM tasks WHERE deleted_at IS NULL'
      if (!isManagement) {
        tasksQuery += ' AND (assigned_to = $1 OR assigned_by = $2 OR $3 = ANY(string_to_array(support::text, ',')))'
      }
      tasksQuery += ' ORDER BY created_at DESC'

      const tasksParams = isManagement ? [] : [employeeId, employeeId, employeeId]
      const tasksResult = await pool.query(tasksQuery, tasksParams)
      const tasks = tasksResult.rows

      // Fetch bugs
      let bugsQuery = 'SELECT * FROM bugs WHERE deleted_at IS NULL'
      if (!isManagement) {
        bugsQuery += ' AND (assigned_to = $1 OR reported_by = $2)'
      }
      bugsQuery += ' ORDER BY created_at DESC'

      const bugsParams = isManagement ? [] : [employeeId, employeeId]
      const bugsResult = await pool.query(bugsQuery, bugsParams)
      const bugs = bugsResult.rows

      // Fetch users and settings
      const usersResult = await pool.query(
        'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY name'
      )
      const users = usersResult.rows

      const settingsResult = await pool.query(
        'SELECT * FROM settings WHERE is_active = true ORDER BY key'
      )
      const settings = settingsResult.rows
      
      return { tasks, bugs, users, settings }
    }
  },
  
  // Field resolvers for User
  User: {
    tasks: async (user: any, _: any, { loaders }: any) => {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE assigned_to = $1 AND deleted_at IS NULL',
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
    assignedToUser: (task: any, _: any, { loaders }: any) => {
      return loaders.user.load(task.assigned_to)
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
    tasks: async (project: any) => {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE project_id = $1 AND deleted_at IS NULL',
        [project.project_id]
      )
      return result.rows
    }
  },

  // Mutations
  Mutation: {
    // Task mutations
    createTask: async (_: any, { input }: any) => {
      const taskId = `TSK-${Date.now()}`
      const support = input.support ? input.support.join(',') : ''

      await pool.query(
        `INSERT INTO tasks (taskId, description, assignedTo, assignedBy, support, startDate, endDate,
         priority, estimatedHours, selectType, recursiveType, projectId, status, createdAt, updatedAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending', NOW(), NOW())`,
        [taskId, input.description, input.assignedTo, input.assignedBy, support, input.startDate,
         input.endDate, input.priority, input.estimatedHours, input.selectType, input.recursiveType, input.projectId]
      )

      const result = await pool.query(
        'SELECT * FROM tasks WHERE taskId = $1',
        [taskId]
      )
      return result.rows[0]
    },

    updateTask: async (_: any, { taskId, input }: any) => {
      const updates: string[] = []
      const params: any[] = []

      Object.keys(input).forEach(key => {
        if (key === 'support' && Array.isArray(input[key])) {
          updates.push(`${key} = ?`)
          params.push(input[key].join(','))
        } else if (input[key] !== undefined) {
          updates.push(`${key} = ?`)
          params.push(input[key])
        }
      })

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      updates.push('updatedAt = NOW()')
      params.push(taskId)

      await pool.query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE taskId = $1`,
        params
      )

      const result = await pool.query(
        'SELECT * FROM tasks WHERE taskId = $1',
        [taskId]
      )
      return result.rows[0]
    },

    deleteTask: async (_: any, { taskId }: any) => {
      await pool.query(
        'UPDATE tasks SET deletedAt = NOW() WHERE taskId = $1',
        [taskId]
      )
      return true
    },

    // Bug mutations
    createBug: async (_: any, { input }: any) => {
      const bugId = `BUG-${Date.now()}`

      await pool.query(
        `INSERT INTO bugs (bugId, description, category, severity, status, assignedTo, assignedBy,
         reportedBy, reportedDate, estimatedHours, createdAt, updatedAt)
         VALUES ($1, $2, $3, $4, 'Open', $5, $6, $7, $8, $9, NOW(), NOW())`,
        [bugId, input.description, input.category, input.severity, input.assignedTo, input.assignedBy,
         input.reportedBy, input.reportedDate, input.estimatedHours]
      )

      const result = await pool.query(
        'SELECT * FROM bugs WHERE bugId = $1',
        [bugId]
      )
      return result.rows[0]
    },

    updateBug: async (_: any, { bugId, input }: any) => {
      const updates: string[] = []
      const params: any[] = []

      Object.keys(input).forEach(key => {
        if (input[key] !== undefined) {
          updates.push(`${key} = ?`)
          params.push(input[key])
        }
      })

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      updates.push('updatedAt = NOW()')
      params.push(bugId)

      await pool.query(
        `UPDATE bugs SET ${updates.join(', ')} WHERE bugId = $1`,
        params
      )

      const result = await pool.query(
        'SELECT * FROM bugs WHERE bugId = $1',
        [bugId]
      )
      return result.rows[0]
    },

    deleteBug: async (_: any, { bugId }: any) => {
      await pool.query(
        'UPDATE bugs SET deletedAt = NOW() WHERE bugId = $1',
        [bugId]
      )
      return true
    },

    // User mutations
    createUser: async (_: any, { input }: any) => {
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(input.password, 10)

      await pool.query(
        `INSERT INTO users (employeeId, name, email, phone, department, role, password, status, createdAt, updatedAt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())`,
        [input.employeeId, input.name, input.email, input.phone, input.department, input.role, hashedPassword]
      )

      const result = await pool.query(
        'SELECT * FROM users WHERE employeeId = $1',
        [input.employeeId]
      )
      return result.rows[0]
    },

    updateUser: async (_: any, { employeeId, input }: any) => {
      const updates: string[] = []
      const params: any[] = []

      Object.keys(input).forEach(key => {
        if (input[key] !== undefined) {
          updates.push(`${key} = ?`)
          params.push(input[key])
        }
      })

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      updates.push('updatedAt = NOW()')
      params.push(employeeId)

      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE employeeId = $1`,
        params
      )

      const result = await pool.query(
        'SELECT * FROM users WHERE employeeId = $1',
        [employeeId]
      )
      return result.rows[0]
    }
  }
}

