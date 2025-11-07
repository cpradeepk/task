export const typeDefs = `#graphql
  type User {
    employeeId: ID!
    name: String!
    email: String!
    phone: String
    department: String
    role: String!
    status: String!
    managerEmail: String
    isTodayTask: Boolean
    warningCount: Int
    createdAt: String!
    updatedAt: String!
    tasks: [Task!]!
    bugs: [Bug!]!
  }

  type Task {
    id: ID!
    taskId: String!
    selectType: String!
    recursiveType: String
    name: String
    description: String!
    assignedTo: [String!]!
    assignedBy: String!
    support: [String!]!
    startDate: String!
    endDate: String!
    priority: String!
    estimatedHours: Float!
    actualHours: Float
    dailyHours: String
    status: String!
    remarks: String
    difficulties: String
    relatedTasks: String
    projectId: String
    subprojectId: String
    parentTaskId: String
    department: String
    timerState: String
    deletedAt: String
    deletedBy: String
    createdAt: String!
    updatedAt: String!
    assignedToUser: User
    assignedToUsers: [User!]!
    assignedByUser: User
    supportUsers: [User!]!
    subtasks: [SubTask!]!
    project: Project
  }

  type SubTask {
    id: ID!
    subTaskId: String!
    parentTaskId: String!
    description: String!
    assignedTo: String!
    assignedBy: String
    startDate: String
    endDate: String
    priority: String
    estimatedHours: Float
    actualHours: Float
    status: String
    remarks: String
    deletedAt: String
    deletedBy: String
    createdAt: String
    updatedAt: String
    assignedToUser: User
    assignedByUser: User
    parentTask: Task
  }

  type Bug {
    id: ID!
    bugId: String!
    description: String!
    category: String!
    severity: String!
    status: String!
    assignedTo: String!
    assignedBy: String!
    reportedBy: String!
    reportedDate: String!
    resolvedDate: String
    estimatedHours: Float
    actualHours: Float
    remarks: String
    attachments: [String!]
    projectId: String
    subprojectId: String
    relatedBugs: String
    platform: String
    environment: String
    bugType: String
    criticality: String
    parentDevId: String
    timerState: String
    timerStartTime: String
    timerPausedTime: Int
    timerTotalTime: Int
    timerSessions: String
    deletedAt: String
    deletedBy: String
    createdAt: String!
    updatedAt: String!
    assignedToUser: User
    assignedByUser: User
    reportedByUser: User
    subtasks: [BugSubTask!]!
  }

  type BugSubTask {
    id: ID!
    subTaskId: String!
    parentBugId: String!
    description: String!
    assignedTo: String!
    assignedBy: String!
    startDate: String
    endDate: String
    priority: String
    estimatedHours: Float
    actualHours: Float
    status: String!
    remarks: String
    isCompleted: Boolean
    displayOrder: Int
    deletedAt: String
    deletedBy: String
    createdAt: String!
    updatedAt: String!
    createdBy: String
    assignedToUser: User
    assignedByUser: User
    parentBug: Bug
  }

  type Project {
    id: ID!
    projectId: String!
    projectName: String!
    description: String
    parentProjectId: String
    deletedAt: String
    deletedBy: String
    createdAt: String!
    updatedAt: String!
    tasks: [Task!]!
  }

  type Setting {
    id: ID!
    key: String!
    value: String!
    type: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    # Users
    users: [User!]!
    user(employeeId: ID!): User
    
    # Tasks
    tasks(
      assignedTo: String
      assignedBy: String
      status: String
      priority: String
    ): [Task!]!
    task(taskId: ID!): Task
    
    # Subtasks
    subtasks(parentTaskId: ID!): [SubTask!]!
    
    # Bugs
    bugs(
      assignedTo: String
      reportedBy: String
      status: String
      severity: String
      category: String
    ): [Bug!]!
    bug(bugId: ID!): Bug
    
    # Bug Subtasks
    bugSubtasks(parentBugId: ID!): [BugSubTask!]!
    
    # Projects
    projects: [Project!]!
    project(projectId: ID!): Project
    
    # Settings
    settings(activeOnly: Boolean): [Setting!]!
    setting(key: String!): Setting
    
    # Dashboard
    dashboard(employeeId: String!, role: String!): DashboardData!
  }

  type DashboardData {
    tasks: [Task!]!
    bugs: [Bug!]!
    users: [User!]!
    settings: [Setting!]!
  }

  type Mutation {
    # Tasks
    createTask(input: CreateTaskInput!): Task!
    updateTask(taskId: ID!, input: UpdateTaskInput!): Task!
    deleteTask(taskId: ID!): Boolean!
    
    # Bugs
    createBug(input: CreateBugInput!): Bug!
    updateBug(bugId: ID!, input: UpdateBugInput!): Bug!
    deleteBug(bugId: ID!): Boolean!
    
    # Users
    createUser(input: CreateUserInput!): User!
    updateUser(employeeId: ID!, input: UpdateUserInput!): User!
  }

  input CreateTaskInput {
    description: String!
    assignedTo: String!
    assignedBy: String!
    support: [String!]
    startDate: String!
    endDate: String!
    priority: String!
    estimatedHours: Float!
    selectType: String!
    recursiveType: String
    projectId: String
  }

  input UpdateTaskInput {
    description: String
    assignedTo: String
    support: [String!]
    startDate: String
    endDate: String
    priority: String
    estimatedHours: Float
    actualHours: Float
    status: String
    remarks: String
    difficulties: String
  }

  input CreateBugInput {
    description: String!
    category: String!
    severity: String!
    assignedTo: String!
    assignedBy: String!
    reportedBy: String!
    reportedDate: String!
    estimatedHours: Float
  }

  input UpdateBugInput {
    description: String
    category: String
    severity: String
    status: String
    assignedTo: String
    estimatedHours: Float
    actualHours: Float
    remarks: String
    resolvedDate: String
  }

  input CreateUserInput {
    employeeId: String!
    name: String!
    email: String!
    phone: String
    department: String
    role: String!
    password: String!
  }

  input UpdateUserInput {
    name: String
    email: String
    phone: String
    department: String
    role: String
    status: String
    isTodayTask: Boolean
  }
`

