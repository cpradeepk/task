# Mobile App Completion Guide - Phases 5 & 6

## 📊 Current Status: 60% Complete

### ✅ Completed (Phase 5 - Leave Features)
- GraphQL queries for Leave/WFH
- LeaveListScreen (list, filtering, FAB)
- LeaveDetailsScreen (details, approve/reject, timeline)
- CreateLeaveScreen (form, date picker, validation)
- Mobile Testing & Deployment Guide

### ⏳ Remaining Work (40%)

---

## 🔧 Step 1: Create WFH Screens (Similar to Leave Screens)

### WFHListScreen.tsx
**Copy from**: `LeaveListScreen.tsx`
**Changes**:
- Replace `leave` with `wfh`
- API endpoint: `http://localhost:3000/api/wfh/user/${currentUser.employeeId}`
- Add WFH type badge (Full Day, Half Day, Flexible Hours)
- Show work location in card

### WFHDetailsScreen.tsx
**Copy from**: `LeaveDetailsScreen.tsx`
**Changes**:
- Replace `leave` with `wfh`
- API endpoints: `/api/wfh/${wfhId}`, `/api/wfh/${wfhId}/approve`, `/api/wfh/${wfhId}/reject`
- Add fields: wfhType, workLocation, availableFrom, availableTo, contactNumber

### CreateWFHScreen.tsx
**Copy from**: `CreateLeaveScreen.tsx`
**Changes**:
- WFH types: ['Full Day', 'Half Day', 'Flexible Hours']
- Add fields:
  - Work Location (text input)
  - Contact Number (phone input, required)
  - Available From/To (time pickers, for Flexible Hours only)
- API endpoint: `http://localhost:3000/api/wfh`

---

## 🔧 Step 2: Update Navigation (App.tsx)

Add imports:
```typescript
import LeaveListScreen from './screens/LeaveListScreen'
import LeaveDetailsScreen from './screens/LeaveDetailsScreen'
import CreateLeaveScreen from './screens/CreateLeaveScreen'
import WFHListScreen from './screens/WFHListScreen'
import WFHDetailsScreen from './screens/WFHDetailsScreen'
import CreateWFHScreen from './screens/CreateWFHScreen'
```

Add routes in Stack.Navigator (after Notifications screen):
```typescript
<Stack.Screen
  name="LeaveList"
  component={LeaveListScreen}
  options={{ headerTitle: 'Leave Applications' }}
/>
<Stack.Screen
  name="LeaveDetails"
  component={LeaveDetailsScreen}
  options={{ headerTitle: 'Leave Details' }}
/>
<Stack.Screen
  name="CreateLeave"
  component={CreateLeaveScreen}
  options={{ headerTitle: 'Apply for Leave' }}
/>
<Stack.Screen
  name="WFHList"
  component={WFHListScreen}
  options={{ headerTitle: 'WFH Applications' }}
/>
<Stack.Screen
  name="WFHDetails"
  component={WFHDetailsScreen}
  options={{ headerTitle: 'WFH Details' }}
/>
<Stack.Screen
  name="CreateWFH"
  component={CreateWFHScreen}
  options={{ headerTitle: 'Apply for WFH' }}
/>
```

---

## 🔧 Step 3: Update Dashboard (DashboardScreen.tsx)

Add Leave and WFH quick action buttons (after Feed button):

```typescript
<TouchableOpacity
  style={styles.actionCard}
  onPress={() => navigation.navigate('LeaveList' as never)}
>
  <Text style={styles.actionTitle}>🏖️ Leave</Text>
  <Text style={styles.actionDescription}>Apply for leave</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.actionCard}
  onPress={() => navigation.navigate('WFHList' as never)}
>
  <Text style={styles.actionTitle}>🏠 WFH</Text>
  <Text style={styles.actionDescription}>Work from home requests</Text>
</TouchableOpacity>
```

---

## 🎨 Step 4: Phase 6 - Dark Mode Support

### Create ThemeContext.tsx

```typescript
import React, { createContext, useState, useEffect, useContext } from 'react'
import { save, get } from '../utils/secureStorage'

const lightColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
}

const darkColors = {
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  border: '#374151',
  primary: '#60A5FA',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
}

interface ThemeContextType {
  theme: 'light' | 'dark'
  colors: typeof lightColors
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: lightColors,
  toggleTheme: () => {},
})

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    loadTheme()
  }, [])

  const loadTheme = async () => {
    const savedTheme = await get('themeMode')
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    await save('themeMode', newTheme)
  }

  const colors = theme === 'light' ? lightColors : darkColors

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

### Update App.tsx

Wrap entire app in ThemeProvider:
```typescript
import { ThemeProvider } from './contexts/ThemeContext'

// In App component:
return (
  <ThemeProvider>
    <ApolloProvider client={apolloClient}>
      <AuthContext.Provider value={authContext}>
        {/* ... rest of app */}
      </AuthContext.Provider>
    </ApolloProvider>
  </ThemeProvider>
)
```

### Update SettingsScreen

Add theme toggle:
```typescript
import { useTheme } from '../contexts/ThemeContext'

const { theme, toggleTheme } = useTheme()

// Add toggle button:
<TouchableOpacity
  style={styles.settingRow}
  onPress={toggleTheme}
>
  <Text style={styles.settingLabel}>Dark Mode</Text>
  <Text style={styles.settingValue}>{theme === 'dark' ? 'On' : 'Off'}</Text>
</TouchableOpacity>
```

### Update All Screens to Use Theme

Replace hardcoded colors with theme colors:
```typescript
import { useTheme } from '../contexts/ThemeContext'

const { colors } = useTheme()

// In StyleSheet:
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background, // instead of '#F9FAFB'
  },
  text: {
    color: colors.text, // instead of '#111827'
  },
})
```

---

## 📱 Step 5: Tablet/Landscape Optimization

Add to each screen:
```typescript
import { useWindowDimensions } from 'react-native'

const { width } = useWindowDimensions()
const isTablet = width >= 768

// Conditional rendering:
<View style={[styles.container, isTablet && styles.containerTablet]}>
  {/* content */}
</View>

// In StyleSheet:
containerTablet: {
  maxWidth: 1024,
  alignSelf: 'center',
  width: '100%',
},
```

---

## ⚡ Step 6: Performance Optimization

### Add Pagination to Lists

```typescript
const [page, setPage] = useState(1)
const [hasMore, setHasMore] = useState(true)

const loadMore = () => {
  if (!loading && hasMore) {
    setPage(page + 1)
    // Fetch more data
  }
}

<FlatList
  data={items}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  ListFooterComponent={loading ? <ActivityIndicator /> : null}
/>
```

### Memoize Expensive Components

```typescript
import React, { memo, useMemo, useCallback } from 'react'

const ExpensiveComponent = memo(({ data }) => {
  // Component logic
})

// In parent:
const memoizedData = useMemo(() => processData(rawData), [rawData])
const handlePress = useCallback(() => {
  // Handle press
}, [dependencies])
```

---

## 🌐 Step 7: Offline Support

Install packages:
```bash
npm install @react-native-community/netinfo apollo3-cache-persist
```

Update apollo.ts:
```typescript
import NetInfo from '@react-native-community/netinfo'
import { CachePersistor } from 'apollo3-cache-persist'
import AsyncStorage from '@react-native-async-storage/async-storage'

const cache = new InMemoryCache()

const persistor = new CachePersistor({
  cache,
  storage: AsyncStorage,
})

await persistor.restore()

// Network status
NetInfo.addEventListener(state => {
  console.log('Connection type', state.type)
  console.log('Is connected?', state.isConnected)
})
```

---

## ✅ Testing Checklist

### Leave/WFH Features
- [ ] Create leave application
- [ ] View leave list with filtering
- [ ] View leave details
- [ ] Approve leave (as manager)
- [ ] Reject leave (as manager)
- [ ] Delete pending leave
- [ ] Same tests for WFH

### Dark Mode
- [ ] Toggle dark mode in settings
- [ ] All screens render correctly in dark mode
- [ ] Theme persists after app restart

### Tablet/Landscape
- [ ] Test on tablet (or large screen)
- [ ] Test landscape orientation
- [ ] Layouts adapt correctly

### Performance
- [ ] Lists scroll smoothly
- [ ] Pagination works
- [ ] No memory leaks

### Offline
- [ ] App works offline (cached data)
- [ ] Mutations queue when offline
- [ ] Sync when back online

---

## 📝 Final Steps

1. Create development log: `.dev-logs/038_2025-01-08_mobile-phases-5-6-complete.md`
2. Update task list: Mark Phase 5 and Phase 6 as COMPLETE
3. Commit and push all changes
4. Test on physical device (Android + iOS)
5. Create APK/IPA for distribution

---

## 🚀 Estimated Time Remaining

- WFH screens: 1-2 hours
- Navigation updates: 15 minutes
- Dark mode: 1 hour
- Tablet optimization: 30 minutes
- Performance optimization: 30 minutes
- Offline support: 30 minutes
- Testing: 1 hour
- **Total: 4.5-5.5 hours**

---

**See MOBILE_TESTING_DEPLOYMENT_GUIDE.md for testing and deployment instructions.**

