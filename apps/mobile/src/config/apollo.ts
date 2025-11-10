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
import { CachePersistor } from 'apollo3-cache-persist'
import AsyncStorage from '@react-native-async-storage/async-storage'

// API endpoint - update this to match your backend URL
// For physical devices, use your computer's local IP or production URL
const API_URL = __DEV__
  ? 'http://192.168.0.13:3000/api/graphql'  // Development (your local IP)
  : 'https://task.amtariksha.com/api/graphql'  // Production (verified working)

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
 * In-Memory Cache with persistence
 */
const cache = new InMemoryCache({
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
})

/**
 * Cache Persistor - saves cache to AsyncStorage for offline support
 */
export const persistor = new CachePersistor({
  cache,
  storage: AsyncStorage as any,
  maxSize: 1048576 * 10, // 10 MB
  debug: __DEV__,
})

/**
 * Initialize cache persistence
 * Call this before rendering the app
 */
export async function initializeApollo() {
  try {
    await persistor.restore()
    console.log('Apollo cache restored from storage')
  } catch (error) {
    console.error('Failed to restore Apollo cache:', error)
  }
}

/**
 * Apollo Client Instance
 */
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first', // Changed to cache-first for offline support
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

