/**
 * GraphQL Queries and Mutations
 * 
 * This file contains all GraphQL queries and mutations used in the application.
 * Separated from graphql-client.ts to avoid importing Apollo Client on the server side.
 */

export const QUERIES = {
  // Dashboard query - gets all data needed for the dashboard
  GET_DASHBOARD: `
    query GetDashboard($employeeId: String!, $role: String!) {
      dashboard(employeeId: $employeeId, role: $role) {
        tasks {
          id
          taskId
          selectType
          recursiveType
          description
          assignedTo
          assignedBy
          support
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          dailyHours
          status
          remarks
          difficulties
          relatedTasks
          projectId
          createdAt
          updatedAt
          assignedToUser {
            employeeId
            name
            email
            role
          }
          assignedByUser {
            employeeId
            name
            email
            role
          }
          supportUsers {
            employeeId
            name
            email
            role
          }
          subtasks {
            id
            subTaskId
            description
            assignedTo
            startDate
            endDate
            priority
            estimatedHours
            actualHours
            status
            remarks
          }
        }
        bugs {
          id
          bugId
          description
          category
          severity
          status
          assignedTo
          assignedBy
          reportedBy
          reportedDate
          resolvedDate
          estimatedHours
          actualHours
          remarks
          attachments
          createdAt
          updatedAt
          assignedToUser {
            employeeId
            name
            email
            role
          }
          assignedByUser {
            employeeId
            name
            email
            role
          }
          reportedByUser {
            employeeId
            name
            email
            role
          }
          subtasks {
            id
            subTaskId
            description
            assignedTo
            startDate
            endDate
            priority
            estimatedHours
            actualHours
            status
            remarks
          }
        }
        users {
          employeeId
          name
          email
          phone
          department
          role
          status
          managerEmail
          isTodayTask
          warningCount
          createdAt
          updatedAt
        }
        settings {
          id
          settingKey
          settingValue
          description
          createdAt
          updatedAt
        }
      }
    }
  `,

  // Get all tasks with optional filters
  GET_TASKS: `
    query GetTasks($assignedTo: String, $status: String, $priority: String) {
      tasks(assignedTo: $assignedTo, status: $status, priority: $priority) {
        id
        taskId
        selectType
        recursiveType
        description
        assignedTo
        assignedBy
        support
        startDate
        endDate
        priority
        estimatedHours
        actualHours
        dailyHours
        status
        remarks
        difficulties
        relatedTasks
        projectId
        createdAt
        updatedAt
        assignedToUser {
          employeeId
          name
          email
          role
        }
        assignedByUser {
          employeeId
          name
          email
          role
        }
        supportUsers {
          employeeId
          name
          email
          role
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          status
          remarks
        }
      }
    }
  `,

  // Get single task by ID
  GET_TASK: `
    query GetTask($taskId: String!) {
      tasks(taskId: $taskId) {
        id
        taskId
        selectType
        recursiveType
        description
        assignedTo
        assignedBy
        support
        startDate
        endDate
        priority
        estimatedHours
        actualHours
        dailyHours
        status
        remarks
        difficulties
        relatedTasks
        projectId
        createdAt
        updatedAt
        assignedToUser {
          employeeId
          name
          email
          role
        }
        assignedByUser {
          employeeId
          name
          email
          role
        }
        supportUsers {
          employeeId
          name
          email
          role
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          status
          remarks
        }
      }
    }
  `,

  // Get all bugs with optional filters
  GET_BUGS: `
    query GetBugs($assignedTo: String, $status: String, $severity: String) {
      bugs(assignedTo: $assignedTo, status: $status, severity: $severity) {
        id
        bugId
        description
        category
        severity
        status
        assignedTo
        assignedBy
        reportedBy
        reportedDate
        resolvedDate
        estimatedHours
        actualHours
        remarks
        attachments
        createdAt
        updatedAt
        assignedToUser {
          employeeId
          name
          email
          role
        }
        assignedByUser {
          employeeId
          name
          email
          role
        }
        reportedByUser {
          employeeId
          name
          email
          role
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          status
          remarks
        }
      }
    }
  `,

  // Get single bug by ID
  GET_BUG: `
    query GetBug($bugId: ID!) {
      bug(bugId: $bugId) {
        id
        bugId
        description
        category
        severity
        status
        assignedTo
        assignedBy
        reportedBy
        reportedDate
        resolvedDate
        estimatedHours
        actualHours
        remarks
        attachments
        projectId
        subprojectId
        relatedBugs
        platform
        environment
        bugType
        criticality
        createdAt
        updatedAt
        assignedToUser {
          employeeId
          name
          email
          role
        }
        assignedByUser {
          employeeId
          name
          email
          role
        }
        reportedByUser {
          employeeId
          name
          email
          role
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          startDate
          endDate
          priority
          estimatedHours
          actualHours
          status
          remarks
        }
      }
    }
  `,

  // Get all users
  GET_USERS: `
    query GetUsers {
      users {
        employeeId
        name
        email
        phone
        department
        role
        status
        managerEmail
        isTodayTask
        warningCount
        createdAt
        updatedAt
      }
    }
  `,

  // Get all projects
  GET_PROJECTS: `
    query GetProjects {
      projects {
        id
        projectId
        projectName
        description
        deletedAt
        deletedBy
        createdAt
        updatedAt
      }
    }
  `,

  // Get single project by ID
  GET_PROJECT: `
    query GetProject($projectId: ID!) {
      project(projectId: $projectId) {
        id
        projectId
        projectName
        description
        deletedAt
        deletedBy
        createdAt
        updatedAt
        tasks {
          id
          taskId
          description
          status
          assignedTo
          assignedBy
          startDate
          endDate
          priority
        }
      }
    }
  `,

  // Get all settings
  GET_SETTINGS: `
    query GetSettings($activeOnly: Boolean) {
      settings(activeOnly: $activeOnly) {
        id
        key
        value
        type
        isActive
        createdAt
        updatedAt
      }
    }
  `,

  // Get single setting by key
  GET_SETTING: `
    query GetSetting($key: String!) {
      setting(key: $key) {
        id
        key
        value
        type
        isActive
        createdAt
        updatedAt
      }
    }
  `
}

export const MUTATIONS = {
  // Create a new task
  CREATE_TASK: `
    mutation CreateTask($input: TaskInput!) {
      createTask(input: $input) {
        id
        taskId
        description
        status
      }
    }
  `,

  // Update an existing task
  UPDATE_TASK: `
    mutation UpdateTask($taskId: String!, $input: TaskInput!) {
      updateTask(taskId: $taskId, input: $input) {
        id
        taskId
        description
        status
      }
    }
  `,

  // Delete a task
  DELETE_TASK: `
    mutation DeleteTask($taskId: String!) {
      deleteTask(taskId: $taskId)
    }
  `,

  // Create a new bug
  CREATE_BUG: `
    mutation CreateBug($input: BugInput!) {
      createBug(input: $input) {
        id
        bugId
        description
        status
      }
    }
  `,

  // Update an existing bug
  UPDATE_BUG: `
    mutation UpdateBug($bugId: String!, $input: BugInput!) {
      updateBug(bugId: $bugId, input: $input) {
        id
        bugId
        description
        status
      }
    }
  `,

  // Delete a bug
  DELETE_BUG: `
    mutation DeleteBug($bugId: String!) {
      deleteBug(bugId: $bugId)
    }
  `
}

