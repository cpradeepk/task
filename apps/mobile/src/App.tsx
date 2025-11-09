import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ApolloProvider } from '@apollo/client'
import { AuthContext } from './contexts/AuthContext'
import LoginScreen from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import BugListScreen from './screens/BugListScreen'
import BugDetailsScreen from './screens/BugDetailsScreen'
import CreateBugScreen from './screens/CreateBugScreen'
import TaskListScreen from './screens/TaskListScreen'
import TaskDetailsScreen from './screens/TaskDetailsScreen'
import CreateTaskScreen from './screens/CreateTaskScreen'
import SettingsScreen from './screens/SettingsScreen'
import FeedScreen from './screens/FeedScreen'
import FeedPostDetailsScreen from './screens/FeedPostDetailsScreen'
import CreateFeedPostScreen from './screens/CreateFeedPostScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import LeaveListScreen from './screens/LeaveListScreen'
import LeaveDetailsScreen from './screens/LeaveDetailsScreen'
import CreateLeaveScreen from './screens/CreateLeaveScreen'
import WFHListScreen from './screens/WFHListScreen'
import WFHDetailsScreen from './screens/WFHDetailsScreen'
import CreateWFHScreen from './screens/CreateWFHScreen'
import NotificationBell from './components/NotificationBell'
import { ActivityIndicator, View } from 'react-native'
import { apolloClient } from './config/apollo'
import { getUserToken, saveUserToken, saveUserData, clearSecureData } from './utils/secureStorage'
import { LOGIN_MUTATION } from './config/graphql-queries'
import { ThemeProvider } from './contexts/ThemeContext'

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
        // Use SecureStore instead of AsyncStorage for token
        userToken = await getUserToken()
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
          // Use GraphQL mutation for login
          const result = await apolloClient.mutate({
            mutation: LOGIN_MUTATION,
            variables: { employeeId, password },
          })

          if (result.data?.login?.token) {
            const { token, user } = result.data.login

            // Save token and user data to SecureStore
            await saveUserToken(token)
            await saveUserData(user)

            dispatch({ type: 'SIGN_IN', payload: token })
            return { success: true, user }
          }

          return { success: false, error: 'Invalid credentials' }
        } catch (error: any) {
          console.error('Login error:', error)
          return {
            success: false,
            error: error.message || 'Network error. Please check your connection.'
          }
        }
      },
      signOut: async () => {
        try {
          // Clear all secure data
          await clearSecureData()

          // Clear Apollo Client cache
          await apolloClient.clearStore()

          dispatch({ type: 'SIGN_OUT' })
        } catch (error) {
          console.error('Logout error:', error)
          // Still dispatch sign out even if cleanup fails
          dispatch({ type: 'SIGN_OUT' })
        }
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
    <ThemeProvider>
      <ApolloProvider client={apolloClient}>
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
                    headerRight: () => <NotificationBell />,
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
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{
                    headerTitle: 'Settings',
                  }}
                />
                <Stack.Screen
                  name="Feed"
                  component={FeedScreen}
                  options={{
                    headerTitle: 'Feed',
                  }}
                />
                <Stack.Screen
                  name="FeedPostDetails"
                  component={FeedPostDetailsScreen}
                  options={{
                    headerTitle: 'Post Details',
                  }}
                />
                <Stack.Screen
                  name="CreateFeedPost"
                  component={CreateFeedPostScreen}
                  options={{
                    headerTitle: 'Create Post',
                  }}
                />
                <Stack.Screen
                  name="Notifications"
                  component={NotificationsScreen}
                  options={{
                    headerTitle: 'Notifications',
                  }}
                />
                <Stack.Screen
                  name="LeaveList"
                  component={LeaveListScreen}
                  options={{
                    headerTitle: 'Leave Applications',
                  }}
                />
                <Stack.Screen
                  name="LeaveDetails"
                  component={LeaveDetailsScreen}
                  options={{
                    headerTitle: 'Leave Details',
                  }}
                />
                <Stack.Screen
                  name="CreateLeave"
                  component={CreateLeaveScreen}
                  options={{
                    headerTitle: 'Apply for Leave',
                  }}
                />
                <Stack.Screen
                  name="WFHList"
                  component={WFHListScreen}
                  options={{
                    headerTitle: 'WFH Applications',
                  }}
                />
                <Stack.Screen
                  name="WFHDetails"
                  component={WFHDetailsScreen}
                  options={{
                    headerTitle: 'WFH Details',
                  }}
                />
                <Stack.Screen
                  name="CreateWFH"
                  component={CreateWFHScreen}
                  options={{
                    headerTitle: 'Apply for WFH',
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </AuthContext.Provider>
    </ApolloProvider>
    </ThemeProvider>
  )
}
