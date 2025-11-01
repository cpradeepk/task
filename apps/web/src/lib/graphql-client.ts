import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client'

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

  // Create Apollo Client
  return new ApolloClient({
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
  try {
    const result = await client.query({
      query: require('graphql-tag')(query),
      variables,
      fetchPolicy: 'network-only'
    })
    return result.data
  } catch (error) {
    console.error('GraphQL query error:', error)
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
  try {
    const result = await client.mutate({
      mutation: require('graphql-tag')(mutation),
      variables
    })
    return result.data
  } catch (error) {
    console.error('GraphQL mutation error:', error)
    throw error
  }
}
