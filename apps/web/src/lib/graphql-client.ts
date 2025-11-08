import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import gql from 'graphql-tag'
import {
  logOperationStart,
  logOperationSuccess,
  logOperationError
} from './graphql-logger'

// Re-export queries and mutations from the separate file
export { QUERIES, MUTATIONS } from './graphql-queries'

// Create Apollo Client only on client side
let apolloClientInstance: any | null = null

function createApolloClient() {
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

  // Create logging link for development
  const loggingLink = new ApolloLink((operation, forward) => {
    // Log operation start
    const { startTime, opName, opType } = logOperationStart(
      operation.query.loc?.source.body || '',
      operation.variables,
      operation.operationName
    )

    // Store metadata for later use
    operation.setContext({
      _logMetadata: { startTime, opName, opType }
    })

    return forward(operation).map((response: any) => {
      // Log successful response
      logOperationSuccess(opName, opType, response.data, startTime)
      return response
    })
  })

  // Create error link for error logging
  const errorLink = onError(({ graphQLErrors, networkError, operation }: any) => {
    const context = operation.getContext()
    const metadata = context._logMetadata || {
      startTime: Date.now(),
      opName: operation.operationName || 'Unknown',
      opType: 'query' as const
    }

    // Log the error with full details
    logOperationError(
      metadata.opName,
      metadata.opType,
      { graphQLErrors, networkError },
      metadata.startTime
    )
  })

  // Create Apollo Client with logging links
  return new ApolloClient({
    link: ApolloLink.from([
      errorLink,
      authLink,
      loggingLink,
      httpLink
    ]),
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
}

// Export a function that returns the Apollo Client instance
export function getApolloClient() {
  if (typeof window === 'undefined') {
    // Server-side: return null or throw error
    throw new Error('Apollo Client can only be used on the client side')
  }
  
  if (!apolloClientInstance) {
    apolloClientInstance = createApolloClient()
  }
  
  return apolloClientInstance
}

// For backward compatibility
export const apolloClient = typeof window !== 'undefined' ? getApolloClient() : null as any

/**
 * Helper function to execute GraphQL queries
 * @param query GraphQL query string
 * @param variables Query variables
 * @returns Query result data
 */
export async function executeQuery(query: string, variables: any = {}) {
  const client = getApolloClient()
  const { startTime, opName, opType } = logOperationStart(query, variables)

  try {
    const result = await client.query({
      query: gql(query),
      variables,
      fetchPolicy: 'network-only'
    })
    logOperationSuccess(opName, opType, result.data, startTime)
    return result.data
  } catch (error) {
    logOperationError(opName, opType, error, startTime)
    throw error
  }
}

/**
 * Helper function to execute GraphQL mutations
 * @param mutation GraphQL mutation string
 * @param variables Mutation variables
 * @returns Mutation result data
 */
export async function executeMutation(mutation: string, variables: any = {}) {
  const client = getApolloClient()
  const { startTime, opName, opType } = logOperationStart(mutation, variables)

  try {
    const result = await client.mutate({
      mutation: gql(mutation),
      variables
    })
    logOperationSuccess(opName, opType, result.data, startTime)
    return result.data
  } catch (error) {
    logOperationError(opName, opType, error, startTime)
    throw error
  }
}
