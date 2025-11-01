import DataLoader from 'dataloader'
import { getPool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

const pool = getPool()

// DataLoader for batching user queries
const createUserLoader = () => new DataLoader(async (employeeIds: readonly string[]) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM users WHERE employeeId IN (?) AND deletedAt IS NULL',
    [employeeIds]
  )
  
  const userMap = new Map(rows.map(user => [user.employeeId, user]))
  return employeeIds.map(id => userMap.get(id) || null)
})

// DataLoader for batching task queries
const createTaskLoader = () => new DataLoader(async (taskIds: readonly string[]) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM tasks WHERE taskId IN (?) AND deletedAt IS NULL',
    [taskIds]
  )
  
  const taskMap = new Map(rows.map(task => [task.taskId, task]))
  return taskIds.map(id => taskMap.get(id) || null)
})

// DataLoader for batching bug queries
const createBugLoader = () => new DataLoader(async (bugIds: readonly string[]) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM bugs WHERE bugId IN (?) AND deletedAt IS NULL',
    [bugIds]
  )
  
  const bugMap = new Map(rows.map(bug => [bug.bugId, bug]))
  return bugIds.map(id => bugMap.get(id) || null)
})

// DataLoader for batching subtask queries
const createSubtaskLoader = () => new DataLoader(async (parentTaskIds: readonly string[]) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM subtasks WHERE parentTaskId IN (?) AND deletedAt IS NULL',
    [parentTaskIds]
  )
  
  const subtaskMap = new Map<string, any[]>()
  rows.forEach(subtask => {
    if (!subtaskMap.has(subtask.parentTaskId)) {
      subtaskMap.set(subtask.parentTaskId, [])
    }
    subtaskMap.get(subtask.parentTaskId)!.push(subtask)
  })
  
  return parentTaskIds.map(id => subtaskMap.get(id) || [])
})

// DataLoader for batching bug subtask queries
const createBugSubtaskLoader = () => new DataLoader(async (parentBugIds: readonly string[]) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM bug_subtasks WHERE parentBugId IN (?) AND deletedAt IS NULL',
    [parentBugIds]
  )
  
  const subtaskMap = new Map<string, any[]>()
  rows.forEach(subtask => {
    if (!subtaskMap.has(subtask.parentBugId)) {
      subtaskMap.set(subtask.parentBugId, [])
    }
    subtaskMap.get(subtask.parentBugId)!.push(subtask)
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
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE deletedAt IS NULL ORDER BY name'
      )
      return rows
    },
    
    user: async (_: any, { employeeId }: any, { loaders }: any) => {
      return loaders.user.load(employeeId)
    },
    
    // Tasks
    tasks: async (_: any, filters: any) => {
      let query = 'SELECT * FROM tasks WHERE deletedAt IS NULL'
      const params: any[] = []
      
      if (filters.assignedTo) {
        query += ' AND assignedTo = ?'
        params.push(filters.assignedTo)
      }
      if (filters.assignedBy) {
        query += ' AND assignedBy = ?'
        params.push(filters.assignedBy)
      }
      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.priority) {
        query += ' AND priority = ?'
        params.push(filters.priority)
      }
      
      query += ' ORDER BY createdAt DESC'
      
      const [rows] = await pool.query<RowDataPacket[]>(query, params)
      return rows
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
      let query = 'SELECT * FROM bugs WHERE deletedAt IS NULL'
      const params: any[] = []
      
      if (filters.assignedTo) {
        query += ' AND assignedTo = ?'
        params.push(filters.assignedTo)
      }
      if (filters.reportedBy) {
        query += ' AND reportedBy = ?'
        params.push(filters.reportedBy)
      }
      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.severity) {
        query += ' AND severity = ?'
        params.push(filters.severity)
      }
      if (filters.category) {
        query += ' AND category = ?'
        params.push(filters.category)
      }
      
      query += ' ORDER BY createdAt DESC'
      
      const [rows] = await pool.query<RowDataPacket[]>(query, params)
      return rows
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
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM projects WHERE deletedAt IS NULL ORDER BY projectName'
      )
      return rows
    },
    
    project: async (_: any, { projectId }: any) => {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM projects WHERE projectId = ? AND deletedAt IS NULL',
        [projectId]
      )
      return rows[0] || null
    },
    
    // Settings
    settings: async (_: any, { activeOnly }: any) => {
      let query = 'SELECT * FROM settings'
      if (activeOnly) {
        query += ' WHERE isActive = 1'
      }
      query += ' ORDER BY key'
      
      const [rows] = await pool.query<RowDataPacket[]>(query)
      return rows
    },
    
    setting: async (_: any, { key }: any) => {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM settings WHERE key = ?',
        [key]
      )
      return rows[0] || null
    },
    
    // Dashboard
    dashboard: async (_: any, { employeeId, role }: any) => {
      const isManagement = ['management', 'top_management', 'admin'].includes(role)
      
      // Fetch tasks
      let tasksQuery = 'SELECT * FROM tasks WHERE deletedAt IS NULL'
      if (!isManagement) {
        tasksQuery += ' AND (assignedTo = ? OR assignedBy = ? OR FIND_IN_SET(?, support) > 0)'
      }
      tasksQuery += ' ORDER BY createdAt DESC'
      
      const tasksParams = isManagement ? [] : [employeeId, employeeId, employeeId]
      const [tasks] = await pool.query<RowDataPacket[]>(tasksQuery, tasksParams)
      
      // Fetch bugs
      let bugsQuery = 'SELECT * FROM bugs WHERE deletedAt IS NULL'
      if (!isManagement) {
        bugsQuery += ' AND (assignedTo = ? OR reportedBy = ?)'
      }
      bugsQuery += ' ORDER BY createdAt DESC'
      
      const bugsParams = isManagement ? [] : [employeeId, employeeId]
      const [bugs] = await pool.query<RowDataPacket[]>(bugsQuery, bugsParams)
      
      // Fetch users and settings
      const [users] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE deletedAt IS NULL ORDER BY name'
      )
      const [settings] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM settings WHERE isActive = 1 ORDER BY key'
      )
      
      return { tasks, bugs, users, settings }
    }
  },
  
  // Field resolvers for User
  User: {
    tasks: async (user: any, _: any, { loaders }: any) => {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tasks WHERE assignedTo = ? AND deletedAt IS NULL',
        [user.employeeId]
      )
      return rows
    },
    
    bugs: async (user: any, _: any, { loaders }: any) => {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM bugs WHERE assignedTo = ? AND deletedAt IS NULL',
        [user.employeeId]
      )
      return rows
    }
  },
  
  // Field resolvers for Task
  Task: {
    assignedToUser: (task: any, _: any, { loaders }: any) => {
      return loaders.user.load(task.assignedTo)
    },
    
    assignedByUser: (task: any, _: any, { loaders }: any) => {
      return loaders.user.load(task.assignedBy)
    },
    
    supportUsers: async (task: any, _: any, { loaders }: any) => {
      if (!task.support) return []
      const supportIds = task.support.split(',').filter(Boolean)
      return Promise.all(supportIds.map((id: string) => loaders.user.load(id)))
    },
    
    subtasks: (task: any, _: any, { loaders }: any) => {
      return loaders.subtasks.load(task.taskId)
    },
    
    project: async (task: any) => {
      if (!task.projectId) return null
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM projects WHERE projectId = ? AND deletedAt IS NULL',
        [task.projectId]
      )
      return rows[0] || null
    }
  },

  // Field resolvers for SubTask
  SubTask: {
    assignedToUser: (subtask: any, _: any, { loaders }: any) => {
      return loaders.user.load(subtask.assignedTo)
    },

    assignedByUser: (subtask: any, _: any, { loaders }: any) => {
      return loaders.user.load(subtask.assignedBy)
    },

    parentTask: (subtask: any, _: any, { loaders }: any) => {
      return loaders.task.load(subtask.parentTaskId)
    }
  },

  // Field resolvers for Bug
  Bug: {
    assignedToUser: (bug: any, _: any, { loaders }: any) => {
      return loaders.user.load(bug.assignedTo)
    },

    assignedByUser: (bug: any, _: any, { loaders }: any) => {
      return loaders.user.load(bug.assignedBy)
    },

    reportedByUser: (bug: any, _: any, { loaders }: any) => {
      return loaders.user.load(bug.reportedBy)
    },

    subtasks: (bug: any, _: any, { loaders }: any) => {
      return loaders.bugSubtasks.load(bug.bugId)
    },

    attachments: (bug: any) => {
      if (!bug.attachments) return []
      try {
        return JSON.parse(bug.attachments)
      } catch {
        return []
      }
    }
  },

  // Field resolvers for BugSubTask
  BugSubTask: {
    assignedToUser: (subtask: any, _: any, { loaders }: any) => {
      return loaders.user.load(subtask.assignedTo)
    },

    assignedByUser: (subtask: any, _: any, { loaders }: any) => {
      return loaders.user.load(subtask.assignedBy)
    },

    parentBug: (subtask: any, _: any, { loaders }: any) => {
      return loaders.bug.load(subtask.parentBugId)
    }
  },

  // Field resolvers for Project
  Project: {
    tasks: async (project: any) => {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tasks WHERE projectId = ? AND deletedAt IS NULL',
        [project.projectId]
      )
      return rows
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(), NOW())`,
        [taskId, input.description, input.assignedTo, input.assignedBy, support, input.startDate,
         input.endDate, input.priority, input.estimatedHours, input.selectType, input.recursiveType, input.projectId]
      )

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tasks WHERE taskId = ?',
        [taskId]
      )
      return rows[0]
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
        `UPDATE tasks SET ${updates.join(', ')} WHERE taskId = ?`,
        params
      )

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM tasks WHERE taskId = ?',
        [taskId]
      )
      return rows[0]
    },

    deleteTask: async (_: any, { taskId }: any) => {
      await pool.query(
        'UPDATE tasks SET deletedAt = NOW() WHERE taskId = ?',
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
         VALUES (?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, NOW(), NOW())`,
        [bugId, input.description, input.category, input.severity, input.assignedTo, input.assignedBy,
         input.reportedBy, input.reportedDate, input.estimatedHours]
      )

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM bugs WHERE bugId = ?',
        [bugId]
      )
      return rows[0]
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
        `UPDATE bugs SET ${updates.join(', ')} WHERE bugId = ?`,
        params
      )

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM bugs WHERE bugId = ?',
        [bugId]
      )
      return rows[0]
    },

    deleteBug: async (_: any, { bugId }: any) => {
      await pool.query(
        'UPDATE bugs SET deletedAt = NOW() WHERE bugId = ?',
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
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [input.employeeId, input.name, input.email, input.phone, input.department, input.role, hashedPassword]
      )

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE employeeId = ?',
        [input.employeeId]
      )
      return rows[0]
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
        `UPDATE users SET ${updates.join(', ')} WHERE employeeId = ?`,
        params
      )

      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE employeeId = ?',
        [employeeId]
      )
      return rows[0]
    }
  }
}

