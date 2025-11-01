import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client'

// Create HTTP link
const httpLink = new HttpLink({
  uri: '/api/graphql',
  credentials: 'same-origin'
})

// Create auth link to add JWT token to requests
const authLink = new ApolloLink((operation, forward) => {
  // Get token from localStorage or cookie
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  // Add authorization header if token exists
  operation.setContext({
    headers: {
      authorization: token ? `Bearer ${token}` : '',
    }
  })
  
  return forward(operation)
})

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          tasks: {
            merge(existing = [], incoming) {
              return incoming
            }
          },
          bugs: {
            merge(existing = [], incoming) {
              return incoming
            }
          },
          users: {
            merge(existing = [], incoming) {
              return incoming
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all'
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    },
    mutate: {
      errorPolicy: 'all'
    }
  }
})

// Example GraphQL queries
export const QUERIES = {
  GET_DASHBOARD: `
    query GetDashboard($employeeId: String!, $role: String!) {
      dashboard(employeeId: $employeeId, role: $role) {
        tasks {
          id
          taskId
          description
          assignedTo
          assignedBy
          status
          priority
          startDate
          endDate
          estimatedHours
          actualHours
          assignedToUser {
            employeeId
            name
            email
          }
          assignedByUser {
            employeeId
            name
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
          reportedBy
          reportedDate
          assignedToUser {
            employeeId
            name
          }
          reportedByUser {
            employeeId
            name
          }
        }
        users {
          employeeId
          name
          email
          role
          department
          status
        }
        settings {
          id
          key
          value
          type
        }
      }
    }
  `,
  
  GET_TASKS: `
    query GetTasks($assignedTo: String, $status: String, $priority: String) {
      tasks(assignedTo: $assignedTo, status: $status, priority: $priority) {
        id
        taskId
        description
        assignedTo
        assignedBy
        status
        priority
        startDate
        endDate
        estimatedHours
        actualHours
        assignedToUser {
          employeeId
          name
          email
        }
        subtasks {
          id
          subTaskId
          description
          status
          assignedTo
        }
      }
    }
  `,
  
  GET_TASK: `
    query GetTask($taskId: ID!) {
      task(taskId: $taskId) {
        id
        taskId
        description
        assignedTo
        assignedBy
        support
        startDate
        endDate
        priority
        estimatedHours
        actualHours
        status
        remarks
        difficulties
        assignedToUser {
          employeeId
          name
          email
        }
        assignedByUser {
          employeeId
          name
        }
        supportUsers {
          employeeId
          name
        }
        subtasks {
          id
          subTaskId
          description
          assignedTo
          status
          startDate
          endDate
          estimatedHours
          actualHours
        }
      }
    }
  `,
  
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
        reportedBy
        reportedDate
        resolvedDate
        estimatedHours
        actualHours
        assignedToUser {
          employeeId
          name
        }
        reportedByUser {
          employeeId
          name
        }
      }
    }
  `,
  
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
        isTodayTask
        warningCount
      }
    }
  `
}

// Example GraphQL mutations
export const MUTATIONS = {
  CREATE_TASK: `
    mutation CreateTask($input: CreateTaskInput!) {
      createTask(input: $input) {
        id
        taskId
        description
        status
      }
    }
  `,
  
  UPDATE_TASK: `
    mutation UpdateTask($taskId: ID!, $input: UpdateTaskInput!) {
      updateTask(taskId: $taskId, input: $input) {
        id
        taskId
        description
        status
        actualHours
      }
    }
  `,
  
  DELETE_TASK: `
    mutation DeleteTask($taskId: ID!) {
      deleteTask(taskId: $taskId)
    }
  `,
  
  CREATE_BUG: `
    mutation CreateBug($input: CreateBugInput!) {
      createBug(input: $input) {
        id
        bugId
        description
        status
      }
    }
  `,
  
  UPDATE_BUG: `
    mutation UpdateBug($bugId: ID!, $input: UpdateBugInput!) {
      updateBug(bugId: $bugId, input: $input) {
        id
        bugId
        description
        status
      }
    }
  `
}

// Helper function to execute GraphQL queries
export async function executeQuery(query: string, variables?: any) {
  try {
    const result = await apolloClient.query({
      query: require('graphql-tag')(query),
      variables
    })
    return result.data
  } catch (error) {
    console.error('GraphQL query error:', error)
    throw error
  }
}

// Helper function to execute GraphQL mutations
export async function executeMutation(mutation: string, variables?: any) {
  try {
    const result = await apolloClient.mutate({
      mutation: require('graphql-tag')(mutation),
      variables
    })
    return result.data
  } catch (error) {
    console.error('GraphQL mutation error:', error)
    throw error
  }
}

