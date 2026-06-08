import React, { useEffect, useState, Component, ErrorInfo, ReactNode, useRef } from 'react'
import { NavigationContainer, NavigationContainerRef, DefaultTheme as NavigationLightTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ApolloProvider, useQuery } from '@apollo/client/react'
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
import NotificationSettingsScreen from './screens/NotificationSettingsScreen'
import LeaveListScreen from './screens/LeaveListScreen'
import LeaveDetailsScreen from './screens/LeaveDetailsScreen'
import CreateLeaveScreen from './screens/CreateLeaveScreen'
import WFHListScreen from './screens/WFHListScreen'
import WFHDetailsScreen from './screens/WFHDetailsScreen'
import CreateWFHScreen from './screens/CreateWFHScreen'
import AttendanceDashboardScreen from './screens/AttendanceDashboardScreen'
import AttendanceApprovalsScreen from './screens/AttendanceApprovalsScreen'
import AttendanceCalendarScreen from './screens/AttendanceCalendarScreen'
import YourWorkScreen from './screens/YourWorkScreen'
import TeamTasksScreen from './screens/TeamTasksScreen'
import ProjectsScreen from './screens/ProjectsScreen'
import ProjectDetailsScreen from './screens/ProjectDetailsScreen'
import UsersScreen from './screens/UsersScreen'
import FeedTopicsScreen from './screens/FeedTopicsScreen'
import DeletedItemsScreen from './screens/DeletedItemsScreen'
import ReportsScreen from './screens/ReportsScreen'
import NotificationBell from './components/NotificationBell'
import CustomDrawerContent from './components/CustomDrawerContent'
import { OfflineBanner } from './components/OfflineBanner'
import { ActivityIndicator, View, LogBox, Text, ScrollView, TouchableOpacity } from 'react-native'
import { IconButton, Provider as PaperProvider } from 'react-native-paper'
import { apolloClient, initializeApollo } from './config/apollo'
import { getUserToken, saveUserToken, saveUserData, clearSecureData, getUserData } from './utils/secureStorage'
import { LOGIN_MUTATION, REGISTER_PUSH_TOKEN, UNREGISTER_PUSH_TOKEN, GET_FEED_POSTS, GET_FEED_TOPICS } from './config/graphql-queries'
import { ThemeProvider, useTheme, lightColors, darkColors } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { registerForPushNotifications, setupNotificationListeners } from './services/pushNotificationService'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { materialColors, lightTheme, darkTheme } from './config/materialTheme'
import { TabBarProvider } from './context/TabBarContext'
import AnimatedTabBar from './components/AnimatedTabBar'

// Disable dev tools warnings in production builds
if (!__DEV__) {
  LogBox.ignoreAllLogs(true)
  // Suppress console warnings about devtools in production
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (
      args[0]?.includes?.('devtools') ||
      args[0]?.includes?.('websocket') ||
      args[0]?.includes?.('runtime not ready')
    ) {
      return
    }
    originalWarn(...args)
  }

  const originalError = console.error
  console.error = (...args) => {
    if (
      args[0]?.includes?.('devtools') ||
      args[0]?.includes?.('websocket') ||
      args[0]?.includes?.('runtime not ready')
    ) {
      return
    }
    originalError(...args)
  }
}

const Tab = createBottomTabNavigator()

// FeedScreen component moved to src/screens/FeedScreen.tsx

// Bottom Tab Navigator with 5 tabs
function BottomTabNavigator({ toggleDrawer }: { toggleDrawer: () => void }) {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={props => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons name="rss" size={25} color={focused ? materialColors.primary : '#748c94'} />
          )
        }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TaskListScreen}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={25} color={focused ? materialColors.primary : '#748c94'} />
          )
        }}
      />
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons name="home" size={25} color={focused ? materialColors.primary : '#748c94'} />
          )
        }}
      />
      <Tab.Screen
        name="DevTab"
        component={BugListScreen}
        options={{
          tabBarLabel: 'Dev',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons name="bug" size={25} color={focused ? materialColors.primary : '#748c94'} />
          )
        }}
      />
      <Tab.Screen
        name="MenuTab"
        component={View}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons name="menu" size={25} color={focused ? materialColors.primary : '#748c94'} />
          )
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            toggleDrawer();
          },
        }}
      />
    </Tab.Navigator>
  )
}

const Stack = createNativeStackNavigator()

// Error Boundary to catch and log component errors
interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log detailed error information
    console.error('🔴 ERROR BOUNDARY CAUGHT ERROR:')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Component stack:', errorInfo.componentStack)

    // Try to identify which component failed
    const componentStack = errorInfo.componentStack
    if (componentStack) {
      const lines = componentStack.split('\n')
      console.error('🎯 Component hierarchy (top to bottom):')
      lines.forEach((line, index) => {
        if (line.trim()) {
          console.error(`  ${index}: ${line.trim()}`)
        }
      })
    }

    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#d32f2f', marginBottom: 10 }}>
            Component Error Detected
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
            Check console logs for detailed error information
          </Text>
        </View>
      )
    }

    return this.props.children
  }
}

const navLightTheme = {
  ...NavigationLightTheme,
  colors: {
    ...NavigationLightTheme.colors,
    primary: lightColors.primary,
    background: lightColors.background,
    card: lightColors.card,
    text: lightColors.text,
    border: lightColors.border,
  },
}

const navDarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.card,
    text: darkColors.text,
    border: darkColors.border,
  },
}

function AppContent() {
  const { theme } = useTheme()
  const paperTheme = theme === 'dark' ? darkTheme : lightTheme
  const navigationTheme = theme === 'dark' ? navDarkTheme : navLightTheme

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

  const [menuVisible, setMenuVisible] = React.useState(false)
  const [pushToken, setPushToken] = React.useState<string | null>(null)
  const navigationRef = useRef<NavigationContainerRef<any>>(null)

  // Helper function to handle notification navigation
  const handleNotificationNavigation = (data: any) => {
    if (!navigationRef.current) {
      console.warn('Navigation ref not ready')
      return
    }

    const { type, taskId, bugId, leaveId, wfhId, postId } = data

    try {
      switch (type) {
        case 'task':
          if (taskId) {
            navigationRef.current.navigate('TaskDetails' as any, { taskId })
          }
          break
        case 'bug':
          if (bugId) {
            navigationRef.current.navigate('BugDetails' as any, { bugId })
          }
          break
        case 'leave':
          if (leaveId) {
            navigationRef.current.navigate('LeaveDetails' as any, { leaveId })
          }
          break
        case 'wfh':
          if (wfhId) {
            navigationRef.current.navigate('WFHDetails' as any, { wfhId })
          }
          break
        case 'feed':
        case 'mention':
        case 'comment':
        case 'reaction':
          if (postId) {
            navigationRef.current.navigate('FeedPostDetails' as any, { postId })
          } else {
            navigationRef.current.navigate('FeedTab' as any)
          }
          break
        default:
          // Navigate to notifications screen if type is unknown
          navigationRef.current.navigate('Notifications' as any)
      }
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }

  useEffect(() => {
    const bootstrapAsync = async () => {
      let userToken
      try {
        // Initialize Apollo cache persistence
        await initializeApollo()

        // Use SecureStore instead of AsyncStorage for token
        userToken = await getUserToken()
      } catch (e) {
        console.error('Failed to restore token', e)
      }

      dispatch({ type: 'RESTORE_TOKEN', payload: userToken })
    }

    bootstrapAsync()
  }, [])

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!state.userToken) {
      return
    }

    let cleanupListeners: (() => void) | undefined

    const initPushNotifications = async () => {
      try {
        // Get user data to get employee ID
        const userData = await getUserData()
        if (!userData?.employeeId) {
          console.warn('No user data found, skipping push notification registration')
          return
        }

        // Register for push notifications and get token
        const token = await registerForPushNotifications()
        if (token) {
          setPushToken(token)
          console.log('Push token obtained:', token.substring(0, 20) + '...')

          // Send token to backend
          try {
            await apolloClient.mutate({
              mutation: REGISTER_PUSH_TOKEN,
              variables: {
                userId: userData.employeeId,
                pushToken: token,
                deviceType: Platform.OS,
                deviceId: Constants.deviceName || Platform.OS
              }
            })
            console.log('Push token registered with backend')
          } catch (error) {
            console.error('Failed to register push token with backend:', error)
          }
        }

        // Setup notification listeners
        cleanupListeners = setupNotificationListeners(
          // Foreground notification handler
          (notification) => {
            console.log('Foreground notification:', notification)
            // Notification is automatically shown by Notifications.setNotificationHandler
          },
          // Notification tap handler
          (response) => {
            console.log('Notification tapped:', response)
            const data = response.notification.request.content.data
            if (data) {
              handleNotificationNavigation(data)
            }
          }
        )
      } catch (error) {
        console.error('Failed to initialize push notifications:', error)
      }
    }

    initPushNotifications()

    // Cleanup listeners on unmount or logout
    return () => {
      if (cleanupListeners) {
        cleanupListeners()
      }
    }
  }, [state.userToken])

  const authContext = React.useMemo(
    () => ({
      signIn: async (employeeId: string, password: string) => {
        try {
          // Use GraphQL mutation for login
          const result = await apolloClient.mutate({
            mutation: LOGIN_MUTATION,
            variables: { employeeId, password },
          })

          if ((result.data as any)?.login?.token) {
            const { token, user } = (result.data as any).login

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
          // Unregister push token from backend
          if (pushToken) {
            try {
              const userData = await getUserData()
              if (userData?.employeeId) {
                await apolloClient.mutate({
                  mutation: UNREGISTER_PUSH_TOKEN,
                  variables: {
                    userId: userData.employeeId,
                    pushToken: pushToken
                  }
                })
                console.log('Push token unregistered from backend')
              }
            } catch (error) {
              console.error('Failed to unregister push token:', error)
            }
          }

          // Clear push token state
          setPushToken(null)

          // Cancel all scheduled notifications
          await Notifications.cancelAllScheduledNotificationsAsync()

          // Clear badge count
          await Notifications.setBadgeCountAsync(0)

          // Clear all secure data
          await clearSecureData()

          // Clear Apollo Client cache
          await apolloClient.clearStore()

          // Close the drawer if open
          setMenuVisible(false)

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
    [pushToken]
  )

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <ApolloProvider client={apolloClient}>
      <PaperProvider theme={paperTheme}>
        <ToastProvider>
          <AuthContext.Provider value={authContext}>
          <TabBarProvider>
            <NavigationContainer ref={navigationRef} theme={navigationTheme}>
              <OfflineBanner />
              <Stack.Navigator
                screenOptions={{
                  headerShown: true,
                  animation: 'slide_from_right',
                  animationDuration: 250,
                }}
              >
                {state.userToken == null ? (
                  <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{
                      headerShown: false,
                      animation: 'none',
                    }}
                  />
                ) : (
                  <>
                    <Stack.Screen name="Main" options={{ headerShown: false }}>
                      {() => <BottomTabNavigator toggleDrawer={() => setMenuVisible(true)} />}
                    </Stack.Screen>

                    {/* Task Screens */}
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

                    {/* Bug Screens */}
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

                    {/* Feed Screens */}
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

                    {/* Notification Screen */}
                    <Stack.Screen
                      name="Notifications"
                      component={NotificationsScreen}
                      options={{
                        headerTitle: 'Notifications',
                      }}
                    />

                    {/* Leave Screens */}
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

                    {/* WFH Screens */}
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

                    {/* Notification Settings Screen */}
                    <Stack.Screen
                      name="NotificationSettings"
                      component={NotificationSettingsScreen}
                      options={{
                        headerTitle: 'Notification Settings',
                      }}
                    />

                    {/* Settings Screen */}
                    <Stack.Screen
                      name="Settings"
                      component={SettingsScreen}
                      options={{
                        headerTitle: 'Settings',
                      }}
                    />
                    <Stack.Screen
                      name="AttendanceDashboard"
                      component={AttendanceDashboardScreen}
                      options={{
                        headerTitle: 'Attendance Dashboard',
                      }}
                    />
                    <Stack.Screen
                      name="AttendanceApprovals"
                      component={AttendanceApprovalsScreen}
                      options={{
                        headerTitle: 'Attendance Approvals',
                      }}
                    />
                    <Stack.Screen
                      name="AttendanceCalendar"
                      component={AttendanceCalendarScreen}
                      options={{
                        headerTitle: 'My Attendance',
                      }}
                    />
                    <Stack.Screen
                      name="YourWork"
                      component={YourWorkScreen}
                      options={{
                        headerTitle: 'Your Work Report',
                      }}
                    />
                    <Stack.Screen
                      name="TeamTasks"
                      component={TeamTasksScreen}
                      options={{
                        headerTitle: 'Team Tasks',
                      }}
                    />
                    <Stack.Screen
                      name="Projects"
                      component={ProjectsScreen}
                      options={{
                        headerTitle: 'Projects',
                      }}
                    />
                    <Stack.Screen
                      name="ProjectDetails"
                      component={ProjectDetailsScreen}
                      options={{
                        headerTitle: 'Project Details',
                      }}
                    />
                    <Stack.Screen
                      name="Users"
                      component={UsersScreen}
                      options={{
                        headerTitle: 'User Management',
                      }}
                    />
                    <Stack.Screen
                      name="FeedTopics"
                      component={FeedTopicsScreen}
                      options={{
                        headerTitle: 'Feed Topics',
                      }}
                    />
                    <Stack.Screen
                      name="DeletedItems"
                      component={DeletedItemsScreen}
                      options={{
                        headerTitle: 'Deleted Items',
                      }}
                    />
                    <Stack.Screen
                      name="Reports"
                      component={ReportsScreen}
                      options={{
                        headerTitle: 'Reports & Analytics',
                      }}
                    />
                  </>
                )}
              </Stack.Navigator>
              <CustomDrawerContent
                visible={menuVisible}
                onClose={() => setMenuVisible(false)}
              />
            </NavigationContainer>
          </TabBarProvider>
        </AuthContext.Provider>
        </ToastProvider>
      </PaperProvider>
    </ApolloProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  )
}
