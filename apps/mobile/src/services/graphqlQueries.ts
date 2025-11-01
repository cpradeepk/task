/**
 * GraphQL Queries and Mutations
 * Centralized GraphQL queries for the mobile app
 * Mirrors the web app's GraphQL implementation
 */

export const QUERIES = {
  // Dashboard query
  GET_DASHBOARD: `
    query GetDashboard($employeeId: String!, $role: String!) {
      dashboard(employeeId: $employeeId, role: $role) {
        tasks {
          id
          taskId
          description
          assignedTo
          assignedBy
          support
          startDate
          endDate
          priority
          status
          estimatedHours
          actualHours
          projectId
          subprojectId
          timerTotalTime
          createdAt
          updatedAt
        }
        bugs {
          id
          bugId
          title
          description
          severity
          status
          category
          platform
          reportedBy
          assignedTo
          projectId
          subprojectId
          timerTotalTime
          actualHours
          createdAt
          updatedAt
        }
        users {
          employeeId
          name
          email
          department
          role
          status
        }
        settings {
          key
          value
          type
          isActive
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
        projectId
        subprojectId
        status
        attachments
        relatedTasks
        remarks
        difficulties
        timerTotalTime
        createdAt
        updatedAt
      }
    }
  `,

  // Get single task by ID
  GET_TASK: `
    query GetTask($taskId: String!) {
      task(taskId: $taskId) {
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
        projectId
        subprojectId
        status
        attachments
        relatedTasks
        remarks
        difficulties
        timerTotalTime
        createdAt
        updatedAt
        subtasks {
          id
          parentTaskId
          description
          assignedTo
          status
          isCompleted
          displayOrder
          createdAt
          updatedAt
          createdBy
        }
      }
    }
  `,

  // Get all bugs with optional filters
  GET_BUGS: `
    query GetBugs($assignedTo: String, $status: String, $severity: String, $category: String) {
      bugs(assignedTo: $assignedTo, status: $status, severity: $severity, category: $category) {
        id
        bugId
        title
        description
        severity
        status
        category
        platform
        reportedBy
        assignedTo
        projectId
        subprojectId
        environment
        browser
        device
        relatedBugs
        attachments
        videoUrl
        timerTotalTime
        actualHours
        createdAt
        updatedAt
        resolvedAt
        closedAt
      }
    }
  `,

  // Get single bug by ID
  GET_BUG: `
    query GetBug($bugId: ID!) {
      bug(bugId: $bugId) {
        id
        bugId
        title
        description
        severity
        status
        category
        platform
        reportedBy
        assignedTo
        projectId
        subprojectId
        environment
        browser
        device
        relatedBugs
        attachments
        videoUrl
        timerTotalTime
        actualHours
        createdAt
        updatedAt
        resolvedAt
        closedAt
        subtasks {
          id
          parentBugId
          description
          assignedTo
          status
          isCompleted
          displayOrder
          createdAt
          updatedAt
          createdBy
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
  // Task mutations
  CREATE_TASK: `
    mutation CreateTask($input: TaskInput!) {
      createTask(input: $input) {
        id
        taskId
        description
        assignedTo
        assignedBy
        status
        priority
        startDate
        endDate
        createdAt
      }
    }
  `,

  UPDATE_TASK: `
    mutation UpdateTask($taskId: String!, $input: TaskInput!) {
      updateTask(taskId: $taskId, input: $input) {
        id
        taskId
        description
        status
        priority
        updatedAt
      }
    }
  `,

  DELETE_TASK: `
    mutation DeleteTask($taskId: String!) {
      deleteTask(taskId: $taskId) {
        success
        message
      }
    }
  `,

  // Bug mutations
  CREATE_BUG: `
    mutation CreateBug($input: BugInput!) {
      createBug(input: $input) {
        id
        bugId
        title
        description
        severity
        status
        category
        assignedTo
        reportedBy
        createdAt
      }
    }
  `,

  UPDATE_BUG: `
    mutation UpdateBug($bugId: String!, $input: BugInput!) {
      updateBug(bugId: $bugId, input: $input) {
        id
        bugId
        title
        status
        severity
        updatedAt
      }
    }
  `,

  DELETE_BUG: `
    mutation DeleteBug($bugId: String!) {
      deleteBug(bugId: $bugId) {
        success
        message
      }
    }
  `
}


