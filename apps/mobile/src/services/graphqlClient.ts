/**
 * GraphQL Client
 * Centralized GraphQL client with REST fallback for the mobile app
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { buildApiUrl } from '../config/api'
import { ApiResponse } from './apiClient'

export interface GraphQLResponse<T = any> {
  data?: T
  errors?: Array<{ message: string }>
}

/**
 * Execute GraphQL query or mutation
 * @param query - GraphQL query or mutation string
 * @param variables - Variables for the query/mutation
 * @returns Promise with the data or throws error
 */
export const executeGraphQLQuery = async <T = any>(
  query: string,
  variables: any = {}
): Promise<T> => {
  try {
    // Get auth token
    const token = await AsyncStorage.getItem('userToken')
    
    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    // Make GraphQL request
    const response = await fetch(buildApiUrl('/api/graphql'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    })
    
    const result: GraphQLResponse<T> = await response.json()
    
    // Check for GraphQL errors
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors[0].message || 'GraphQL query failed')
    }
    
    if (!result.data) {
      throw new Error('No data returned from GraphQL query')
    }
    
    return result.data
  } catch (error) {
    console.error('GraphQL Query Error:', error)
    throw error
  }
}

/**
 * Execute GraphQL query with REST fallback
 * @param query - GraphQL query string
 * @param variables - Variables for the query
 * @param restFallback - Function to call if GraphQL fails
 * @param componentName - Name of the component for logging
 * @returns Promise with the data
 */
export const executeGraphQLWithFallback = async <T = any>(
  query: string,
  variables: any,
  restFallback: () => Promise<ApiResponse<T>>,
  componentName: string = 'Component'
): Promise<ApiResponse<T>> => {
  try {
    // Try GraphQL first
    console.log(`🔵 [${componentName}] Attempting GraphQL query...`)
    const data = await executeGraphQLQuery<T>(query, variables)
    console.log(`✅ [${componentName}] GraphQL query successful`)
    
    return {
      success: true,
      data: data as T,
    }
  } catch (graphqlError) {
    console.warn(`⚠️ [${componentName}] GraphQL failed, falling back to REST:`, graphqlError)
    
    // Fallback to REST API
    const restResult = await restFallback()
    
    if (restResult.success) {
      console.log(`✅ [${componentName}] REST API successful`)
    } else {
      console.error(`❌ [${componentName}] REST API also failed:`, restResult.error)
    }
    
    return restResult
  }
}

/**
 * Execute GraphQL mutation with error handling
 * @param mutation - GraphQL mutation string
 * @param variables - Variables for the mutation
 * @param componentName - Name of the component for logging
 * @returns Promise with the data
 */
export const executeGraphQLMutation = async <T = any>(
  mutation: string,
  variables: any,
  componentName: string = 'Component'
): Promise<ApiResponse<T>> => {
  try {
    console.log(`🔵 [${componentName}] Attempting GraphQL mutation...`)
    const data = await executeGraphQLQuery<T>(mutation, variables)
    console.log(`✅ [${componentName}] GraphQL mutation successful`)
    
    return {
      success: true,
      data: data as T,
    }
  } catch (error) {
    console.error(`❌ [${componentName}] GraphQL mutation failed:`, error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'GraphQL mutation failed',
    }
  }
}

