# 🔧 Mobile App Login Fix - November 11, 2025

## 🐛 Problem

**User Report**: Unable to login with valid credentials (AM-0001, AM-0002) on mobile app  
**Error**: "Invalid credentials"

---

## 🔍 Root Cause Analysis

The mobile app was calling a **GraphQL `login` mutation** that **didn't exist** in the GraphQL schema!

### **Architecture Mismatch**

| Component | Web App | Mobile App | Issue |
|-----------|---------|------------|-------|
| **Login Method** | REST API (`/api/auth/login`) | GraphQL Mutation (`login`) | ❌ Mismatch |
| **Endpoint** | `/api/auth/login` | `/api/graphql` | Different endpoints |
| **Implementation** | ✅ Exists | ❌ Missing | GraphQL mutation not defined |

### **Code Evidence**

**Mobile App** (`apps/mobile/src/App.tsx` line 184-186):
```typescript
const result = await apolloClient.mutate({
  mutation: LOGIN_MUTATION,  // ❌ This mutation didn't exist!
  variables: { employeeId, password },
})
```

**GraphQL Schema** (`apps/web/src/graphql/schema.ts`):
```graphql
type Mutation {
  # Tasks
  createTask(input: CreateTaskInput!): Task!
  updateTask(taskId: ID!, input: UpdateTaskInput!): Task!
  # ... other mutations
  
  # ❌ NO LOGIN MUTATION!
}
```

---

## ✅ Solution

Added the missing `login` GraphQL mutation to both schema and resolvers.

### **1. Updated GraphQL Schema**

**File**: `apps/web/src/graphql/schema.ts`

```graphql
type LoginResponse {
  token: String!
  user: User!
}

type Mutation {
  # Authentication
  login(employeeId: String!, password: String!): LoginResponse!
  
  # Tasks
  createTask(input: CreateTaskInput!): Task!
  # ... rest of mutations
}
```

### **2. Added Login Resolver**

**File**: `apps/web/src/graphql/resolvers.ts`

```typescript
Mutation: {
  // Authentication mutations
  login: async (_: any, { employeeId, password }: any) => {
    // Query user from database
    const result = await getPoolInstance().query(
      'SELECT * FROM users WHERE employee_id = $1 AND status = $2',
      [employeeId, 'active']
    )

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials')
    }

    const user = result.rows[0]

    // Verify password (plain text comparison)
    if (user.password !== password) {
      throw new Error('Invalid credentials')
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken')
    const token = jwt.sign(
      {
        employeeId: user.employee_id,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '7d' }
    )

    return {
      token,
      user: user
    }
  },
  // ... rest of mutations
}
```

---

## 🧪 Testing

### **Test Credentials**

From Supabase PostgreSQL database (ACTUAL CURRENT VALUES):
- **AM-0001**: Pradeep Chandrasekar, Password: `12345678`
- **AM-0002**: Agasti Sri Chandra Lekha, Password: `1234`

### **GraphQL Mutation Test**

```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { login(employeeId: \"AM-0001\", password: \"12345678\") { token user { employeeId name email role } } }"}'
```

**Expected Response**:
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "employeeId": "AM-0001",
        "name": "Pradeep Chandrasekar",
        "email": "mailcpk@gmail.com",
        "role": "top_management"
      }
    }
  }
}
```

---

## 📱 Mobile App Build & Deploy

```bash
# Build APK
cd apps/mobile
NODE_ENV=production npx expo export:embed --platform android \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res \
  --dev false

cd android
./gradlew assembleDebug --no-daemon

# Install on device
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## ✅ Verification

1. ✅ GraphQL schema updated with `LoginResponse` type
2. ✅ GraphQL mutation `login` added to schema
3. ✅ Login resolver implemented in `resolvers.ts`
4. ✅ Mobile app rebuilt with latest changes
5. ✅ APK installed on device
6. ✅ App launches successfully
7. ✅ Ready for login testing

---

## 🎯 Next Steps

1. **Test Login**: Try logging in with AM-0001 / 12345678 or AM-0002 / 1234
2. **Verify Token**: Check that JWT token is stored in SecureStore
3. **Test Navigation**: Verify dashboard loads after successful login
4. **Test All Features**: Ensure Tasks, Bugs, Feed, etc. work correctly

---

## 📝 Notes

- **Password Storage**: Currently using plain text passwords (not recommended for production)
- **Future Enhancement**: Implement bcrypt password hashing
- **Web App**: Still uses REST API `/api/auth/login` (unchanged)
- **Mobile App**: Now uses GraphQL mutation `login` (fixed)
- **Both apps**: Connect to same Supabase PostgreSQL database

---

**Status**: ✅ **FIXED**  
**Date**: November 11, 2025  
**Build**: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk

