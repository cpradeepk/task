# Apollo Client 4.x Import Fix

## 🐛 Problem

After implementing the GraphQL login mutation, the mobile app crashed with:

```
TypeError: 0,u.useQuery is not a function (it is undefined)
```

**Root Cause:** Apollo Client 4.x changed the import structure. React hooks like `useQuery`, `useMutation`, and `useLazyQuery` must now be imported from `@apollo/client/react` instead of `@apollo/client`.

---

## ✅ Solution

### Changed Imports

**Before (Apollo Client 3.x style):**
```typescript
import { useQuery, useMutation } from '@apollo/client'
```

**After (Apollo Client 4.x style):**
```typescript
import { useQuery, useMutation } from '@apollo/client/react'
```

### Files Updated

1. **`src/components/NotificationBell.tsx`**
   - Changed: `useQuery` import

2. **`src/screens/BugListScreen.tsx`**
   - Changed: `useQuery` import

3. **`src/screens/TaskListScreen.tsx`**
   - Changed: `useQuery` import

4. **`src/screens/FeedScreen.tsx`**
   - Changed: `useQuery` import

5. **`src/screens/NotificationsScreen.tsx`**
   - Changed: `useQuery`, `useMutation` imports

6. **`src/screens/FeedPostDetailsScreen.tsx`**
   - Changed: `useQuery`, `useMutation` imports

7. **`src/screens/CreateFeedPostScreen.tsx`**
   - Changed: `useQuery`, `useMutation` imports

---

## 📋 What Stays the Same

These imports remain from `@apollo/client`:

```typescript
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client'
import { gql } from '@apollo/client'
```

**Note:** `ApolloProvider` should be imported from `@apollo/client/react` (already correct in `App.tsx`).

---

## 🔍 How to Identify This Issue

### Symptoms
- App crashes on screens using GraphQL queries
- Error message: `useQuery is not a function (it is undefined)`
- Error occurs after upgrading to Apollo Client 4.x

### Debugging Steps

1. **Check logs:**
   ```bash
   adb logcat | grep -i "usequery\|graphql\|apollo"
   ```

2. **Look for error:**
   ```
   TypeError: 0,u.useQuery is not a function (it is undefined)
   ```

3. **Find incorrect imports:**
   ```bash
   grep -r "from '@apollo/client'" apps/mobile/src --include="*.tsx" --include="*.ts" | grep -E "useQuery|useMutation|useLazyQuery"
   ```

---

## 🚀 Testing the Fix

### Before Testing
1. Rebuild the APK:
   ```bash
   cd apps/mobile/android
   ./gradlew assembleDebug
   ```

2. Install on device:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

### Test Cases

**Test 1: Login Screen**
- Open app
- Enter credentials (AM-0001 / 12345678)
- Tap Login
- ✅ Should login successfully without errors

**Test 2: Bug List Screen**
- Navigate to Bugs
- ✅ Should load bug list using GraphQL query
- ✅ No "useQuery is not a function" error

**Test 3: Task List Screen**
- Navigate to Tasks
- ✅ Should load task list using GraphQL query
- ✅ No errors in console

**Test 4: Notifications**
- Navigate to Notifications
- ✅ Should load notifications
- ✅ Notification bell should show unread count

---

## 📚 Apollo Client 4.x Migration Guide

### Key Changes in Apollo Client 4.x

1. **React Hooks Import Path**
   - Old: `import { useQuery } from '@apollo/client'`
   - New: `import { useQuery } from '@apollo/client/react'`

2. **ApolloProvider Import Path**
   - Old: `import { ApolloProvider } from '@apollo/client'`
   - New: `import { ApolloProvider } from '@apollo/client/react'`

3. **Core Imports (Unchanged)**
   - `gql`, `ApolloClient`, `InMemoryCache`, `createHttpLink`, etc.
   - Still from: `@apollo/client`

### Why This Change?

Apollo Client 4.x separated React-specific code into a separate entry point to:
- Reduce bundle size for non-React users
- Improve tree-shaking
- Better support for other frameworks (Vue, Angular, etc.)

---

## 🔗 References

- [Apollo Client 4.0 Migration Guide](https://www.apollographql.com/docs/react/migrating/apollo-client-3-migration/)
- [Apollo Client React Hooks](https://www.apollographql.com/docs/react/api/react/hooks/)
- [GitHub Issue: useQuery is not a function](https://github.com/apollographql/apollo-client/issues/10974)

---

## ✅ Verification Checklist

After applying this fix:

- [x] All 7 files updated with correct imports
- [x] APK rebuilt successfully
- [x] APK installed on Nokia 5.4
- [x] No build errors
- [x] No runtime errors in logs
- [ ] Login works (pending user test)
- [ ] Bug list loads (pending user test)
- [ ] Task list loads (pending user test)
- [ ] Notifications work (pending user test)

---

## 📝 Commit Information

**Commit:** c850b2d  
**Date:** 2025-11-11  
**Message:** Fix Apollo Client 4.x imports - useQuery/useMutation from @apollo/client/react

**Files Changed:** 7 TypeScript files  
**Lines Changed:** +7 imports updated

---

## 🎯 Next Steps

1. **Test the app** on Nokia 5.4 with credentials:
   - Employee ID: `AM-0001`
   - Password: `12345678`

2. **Verify all screens** that use GraphQL:
   - Login ✅
   - Dashboard
   - Bug List
   - Bug Details
   - Task List
   - Feed
   - Notifications

3. **Monitor logs** for any remaining errors:
   ```bash
   adb logcat | grep -i "error\|exception"
   ```

4. **If successful**, consider:
   - Building production APK
   - Testing with other user accounts
   - Deploying to production

---

**Status:** ✅ Fix applied, APK installed, ready for testing

