import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthContext } from './contexts/AuthContext'
import LoginScreen from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import BugListScreen from './screens/BugListScreen'
import BugDetailsScreen from './screens/BugDetailsScreen'
import CreateBugScreen from './screens/CreateBugScreen'
import TaskListScreen from './screens/TaskListScreen'
import TaskDetailsScreen from './screens/TaskDetailsScreen'
import CreateTaskScreen from './screens/CreateTaskScreen'
import { ActivityIndicator, View } from 'react-native'
import { buildApiUrl, API_ENDPOINTS } from './config/api'

const Stack = createNativeStackNavigator()

export default function App() {
  const [state, dispatch] = React.useReducer(
    (prevState: any, action: any) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.payload,
            isLoading: false,
          }
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.payload,
          }
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          }
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  )

  useEffect(() => {
    const bootstrapAsync = async () => {
      let userToken
      try {
        userToken = await AsyncStorage.getItem('userToken')
      } catch (e) {
        console.error('Failed to restore token', e)
      }

      dispatch({ type: 'RESTORE_TOKEN', payload: userToken })
    }

    bootstrapAsync()
  }, [])

  const authContext = React.useMemo(
    () => ({
      signIn: async (employeeId: string, password: string) => {
        try {
          const response = await fetch(buildApiUrl(API_ENDPOINTS.LOGIN), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, password }),
          })

          const data = await response.json()
          if (data.token) {
            await AsyncStorage.setItem('userToken', data.token)
            await AsyncStorage.setItem('user', JSON.stringify(data.data))
            dispatch({ type: 'SIGN_IN', payload: data.token })
            return { success: true }
          }
          return { success: false, error: data.error }
        } catch (error) {
          return { success: false, error: 'Network error' }
        }
      },
      signOut: async () => {
        await AsyncStorage.removeItem('userToken')
        await AsyncStorage.removeItem('user')
        dispatch({ type: 'SIGN_OUT' })
      },
      signUp: async () => {
        // Not implemented yet
      },
    }),
    []
  )

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: true,
            animationEnabled: true,
          }}
        >
          {state.userToken == null ? (
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
                animationEnabled: false,
              }}
            />
          ) : (
            <>
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                  headerTitle: 'JSR Task Management',
                }}
              />
              <Stack.Screen
                name="BugList"
                component={BugListScreen}
                options={{
                  headerTitle: 'Bugs',
                }}
              />
              <Stack.Screen
                name="BugDetails"
                component={BugDetailsScreen}
                options={{
                  headerTitle: 'Bug Details',
                }}
              />
              <Stack.Screen
                name="CreateBug"
                component={CreateBugScreen}
                options={{
                  headerTitle: 'Create Bug',
                }}
              />
              <Stack.Screen
                name="TaskList"
                component={TaskListScreen}
                options={{
                  headerTitle: 'Tasks',
                }}
              />
              <Stack.Screen
                name="TaskDetails"
                component={TaskDetailsScreen}
                options={{
                  headerTitle: 'Task Details',
                }}
              />
              <Stack.Screen
                name="CreateTask"
                component={CreateTaskScreen}
                options={{
                  headerTitle: 'Create Task',
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  )
}
