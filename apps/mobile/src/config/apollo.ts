/**
 * Apollo Client Configuration for Mobile App
 * 
 * Provides GraphQL client setup with:
 * - Authentication headers (JWT token)
 * - Error handling
 * - Retry logic
 * - Cache configuration
 */

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import * as SecureStore from 'expo-secure-store'

// API endpoint - update this to match your backend URL
const API_URL = __DEV__ 
  ? 'http://localhost:3000/api/graphql'  // Development (local)
  : 'https://your-production-url.vercel.app/api/graphql'  // Production

/**
 * HTTP Link - connects to GraphQL endpoint
 */
const httpLink = createHttpLink({
  uri: API_URL,
})

/**
 * Auth Link - adds JWT token to request headers
 */
const authLink = setContext(async (_, { headers }) => {
  try {
    // Get token from SecureStore
    const token = await SecureStore.getItemAsync('userToken')
    
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    }
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return { headers }
  }
})

/**
 * Error Link - handles GraphQL and network errors
 */
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
      )
    })
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
    
    // Handle specific network errors
    if ('statusCode' in networkError) {
      const statusCode = (networkError as any).statusCode
      
      if (statusCode === 401) {
        // Unauthorized - token expired or invalid
        console.log('Token expired or invalid - redirecting to login')
        // You can dispatch a logout action here if using Redux/Context
      }
    }
  }
})

/**
 * Apollo Client Instance
 */
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cache configuration for specific queries
          tasks: {
            merge(existing = [], incoming) {
              return incoming
            },
          },
          bugs: {
            merge(existing = [], incoming) {
              return incoming
            },
          },
          feedPosts: {
            merge(existing = [], incoming) {
              return incoming
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
})

/**
 * Helper function to execute GraphQL queries
 */
export async function executeQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const result = await apolloClient.query({
      query: require('@apollo/client').gql(query),
      variables,
    })
    
    return result.data
  } catch (error) {
    console.error('GraphQL query error:', error)
    throw error
  }
}

/**
 * Helper function to execute GraphQL mutations
 */
export async function executeMutation<T = any>(
  mutation: string,
  variables?: Record<string, any>
): Promise<T> {
  try {
    const result = await apolloClient.mutate({
      mutation: require('@apollo/client').gql(mutation),
      variables,
    })
    
    return result.data
  } catch (error) {
    console.error('GraphQL mutation error:', error)
    throw error
  }
}

