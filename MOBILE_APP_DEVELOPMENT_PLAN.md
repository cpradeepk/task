# Mobile App Development Plan - JSR Task Management System

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Application Architecture](#current-application-architecture)
3. [Technology Stack Comparison](#technology-stack-comparison)
4. [Recommended Architecture](#recommended-architecture)
5. [Repository Structure](#repository-structure)
6. [Backend Architecture](#backend-architecture)
7. [Implementation Phases](#implementation-phases)
8. [Timeline and Cost Estimates](#timeline-and-cost-estimates)
9. [Code Sharing Strategy](#code-sharing-strategy)
10. [Database Schema Overview](#database-schema-overview)

---

## Executive Summary

This document outlines the complete plan for developing native mobile applications (Android and iOS) for the JSR Task Management System. The recommended approach is to use **React Native + Expo** in a **Turborepo monorepo** structure, leveraging the existing Next.js backend.

### Key Decisions:
- ✅ **Mobile Framework:** React Native + Expo
- ✅ **Repository Structure:** Monorepo with Turborepo
- ✅ **Backend:** Continue using Next.js API routes (no separate backend needed)
- ✅ **Code Sharing:** 70-90% of business logic shared between web and mobile
- ✅ **Authentication:** JWT token-based authentication
- ✅ **Estimated Timeline:** 3-4 months
- ✅ **Estimated Cost:** $15,000 - $25,000

---

## Current Application Architecture

### Tech Stack
- **Frontend Framework:** Next.js 16.0.0 (App Router with Turbopack)
- **React Version:** 19.2
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS with custom utility classes
- **Database:** MySQL 2 (mysql2 driver)
- **Database Host:** AWS RDS MySQL
  - Host: `ls-2c38665177f03573f3e3e1c02d6c69b301466b75.crq8gq4ka0rw.ap-south-1.rds.amazonaws.com`
  - User: `u806435594_swarg`
  - Database: `task`
- **Deployment:** Vercel (assumed based on Next.js setup)
- **State Management:** React hooks (useState, useEffect, useMemo, useCallback)
- **File Uploads:** AWS S3 or local storage for bug attachments

### Current Features
1. **User Management**
   - Role-based access control (admin, top_management, management, employee)
   - User creation, editing, deletion
   - Warning system
   - Send credentials via email

2. **Task Management**
   - Create, edit, delete tasks
   - Multi-user assignment (owner + support team)
   - Related tasks linking
   - SubTask functionality
   - Status tracking (Yet to Start, In Progress, Done, Delayed, etc.)
   - Priority levels
   - Project association

3. **Bug Tracking**
   - Create, edit, delete bugs
   - File attachments with image lightbox
   - Severity levels (Critical, Major, Minor)
   - Status tracking (New, In Progress, Resolved, Closed, Reopened)
   - Category, platform, bug type classification

4. **Projects Management**
   - Full CRUD operations
   - Project hierarchy
   - Modal-based creation/editing

5. **Settings Management**
   - Database-driven dropdown values
   - Admin UI for managing settings (task_status, bug_status, bug_type, departments, etc.)
   - 107+ default settings

6. **Leave & WFH Management**
   - Application submission
   - Approval workflow
   - Status tracking

7. **Approvals System**
   - Leave approvals
   - WFH approvals
   - Task approvals

8. **Dashboard**
   - Unified work items list (tasks and bugs)
   - Statistics cards
   - Type filter (All/Tasks/Bugs)
   - Status filter
   - User management (admin view)

9. **Reports & Analytics**
   - Task analytics
   - Bug analytics
   - User performance metrics

### Authentication & Authorization
- **Current Auth Pattern:** Session-based (likely using cookies)
- **Roles:**
  - `admin` - Full system access
  - `top_management` - Full access (same as admin except context-dependent delete operations)
  - `management` - Team management access
  - `employee` - Basic user access
- **Access Control:** Role-based checks in components and API routes

### File Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/
│   ├── tasks/
│   ├── bugs/
│   ├── projects/
│   ├── users/
│   ├── settings/
│   ├── approvals/
│   ├── profile/
│   └── ...
├── components/            # React components
│   ├── layout/
│   ├── dashboard/
│   ├── tasks/
│   ├── projects/
│   └── ...
├── lib/                   # Utility functions
│   ├── auth.ts
│   ├── data.ts
│   ├── types.ts
│   ├── db/
│   └── ...
├── contexts/              # React contexts
└── public/                # Static assets
database/
└── migrations/            # SQL migration files
```

---

## Technology Stack Comparison

### React Native vs Flutter vs Native vs PWA

| Feature | React Native + Expo | Flutter | Native (Kotlin/Swift) | PWA |
|---------|-------------------|---------|---------------------|-----|
| **Code Reusability** | 70-90% | 0% | 0% | 100% |
| **Learning Curve** | ⭐⭐ (Easy) | ⭐⭐⭐⭐ (Hard) | ⭐⭐⭐⭐⭐ (Very Hard) | ⭐ (Very Easy) |
| **Development Time** | 3-4 months | 4-5 months | 6-8 months | 1-2 months |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Native Features** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Maintenance Cost** | Low | Medium | High | Very Low |
| **Team Expertise** | ✅ Perfect fit | ❌ New skill | ❌ New skill | ✅ Perfect fit |
| **App Store Presence** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Offline Support** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Push Notifications** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ (iOS ❌) |
| **Development Cost** | $15K-$25K | $20K-$35K | $40K-$70K | $5K-$10K |

### Why React Native + Expo is Recommended

#### ✅ Advantages:
1. **Maximum Code Reusability (70-90%)**
   - Team already uses React and TypeScript
   - Business logic, API calls, state management can be shared
   - Component structure similar to React web

2. **Single Codebase for Both Platforms**
   - One codebase for Android and iOS
   - Reduces development time and cost
   - Easier maintenance

3. **Expo Framework Benefits**
   - Simplified development workflow
   - Over-the-air (OTA) updates
   - Easy access to native features
   - Built-in development tools

4. **Performance**
   - Near-native performance
   - Suitable for task management apps
   - Smooth UI animations

5. **Native Features Access**
   - Push notifications (critical for task reminders)
   - Offline storage
   - File uploads
   - Camera access
   - Biometric authentication

6. **Large Ecosystem**
   - Massive community support
   - Extensive third-party libraries
   - Regular updates from Meta

7. **Cost-Effective**
   - Lower development cost
   - Faster time to market
   - Reduced maintenance overhead

#### ⚠️ Disadvantages:
1. Slightly larger app size (20-30MB more)
2. JavaScript bridge can be bottleneck for complex animations (not relevant for this app)
3. Occasional need for platform-specific code (5-10%)

---

## Recommended Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel / AWS                         │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │         Next.js App (Backend + Web)        │         │
│  │                                             │         │
│  │  • Serves Web App (SSR/SSG)                │         │
│  │  • Serves API Routes (REST API)            │         │
│  │  • Connects to MySQL Database              │         │
│  │                                             │         │
│  │  URL: https://task.amtariksha.com          │         │
│  └────────────────────────────────────────────┘         │
│                       │                                  │
└───────────────────────┼──────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Browser │    │ Android │    │   iOS   │
   │  Users  │    │   App   │    │   App   │
   └─────────┘    └─────────┘    └─────────┘
```

### Why Use Next.js as Backend?

✅ **Advantages:**
- Single codebase for backend
- No duplication of API logic
- Easier maintenance
- Cost-effective (one server)
- Type safety with shared TypeScript types
- APIs already built and tested

❌ **No Separate Backend Needed** because:
- Current traffic doesn't require microservices
- Next.js API routes are RESTful and can serve mobile apps
- Simpler architecture is easier to maintain

---

## Repository Structure

### Recommended: Turborepo Monorepo

```
jsr_web_app-jsr_tool/
├── apps/
│   ├── web/                    # Next.js web app (current code)
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.js
│   └── mobile/                 # React Native + Expo app
│       ├── src/
│       │   ├── screens/       # Mobile screens
│       │   ├── components/    # Mobile components
│       │   ├── navigation/    # React Navigation
│       │   └── hooks/         # Custom hooks
│       ├── app.json
│       ├── package.json
│       └── App.tsx
├── packages/
│   ├── shared/                 # Shared code between web & mobile
│   │   ├── api/               # API client functions
│   │   │   ├── taskService.ts
│   │   │   ├── bugService.ts
│   │   │   ├── userService.ts
│   │   │   └── authService.ts
│   │   ├── types/             # TypeScript types
│   │   │   ├── task.ts
│   │   │   ├── bug.ts
│   │   │   ├── user.ts
│   │   │   └── index.ts
│   │   ├── utils/             # Utility functions
│   │   │   ├── validation.ts
│   │   │   ├── formatting.ts
│   │   │   └── date.ts
│   │   ├── constants/         # Constants
│   │   └── package.json
│   ├── ui/                    # Shared UI components (optional)
│   └── config/                # Shared configuration
├── database/                   # Database migrations (shared)
│   └── migrations/
├── package.json               # Root package.json
├── turbo.json                 # Turborepo config
└── tsconfig.json              # Base TypeScript config
```

### Turborepo Configuration

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Root package.json:**
```json
{
  "name": "jsr-task-management",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "turbo run dev --filter=@jsr/web",
    "dev:mobile": "turbo run dev --filter=@jsr/mobile",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^1.10.0"
  }
}
```

---

## Backend Architecture

### Current State: Session-Based Authentication
- Uses cookies for session management
- Works well for web browsers
- **Problem:** Doesn't work well for mobile apps

### Required Changes: JWT Token-Based Authentication

#### 1. Install Dependencies
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

#### 2. Update Login API
**File:** `src/app/api/auth/login/route.ts`
```typescript
import jwt from 'jsonwebtoken'

export async function POST(request: Request) {
  const { employeeId, password } = await request.json()
  
  // Validate credentials
  const user = await validateUser(employeeId, password)
  
  if (user) {
    // Generate JWT token
    const token = jwt.sign(
      { 
        employeeId: user.employeeId, 
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    
    return Response.json({ 
      token, 
      user: {
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
        email: user.email
      }
    })
  }
  
  return Response.json({ error: 'Invalid credentials' }, { status: 401 })
}
```

#### 3. Create Token Verification Middleware
**File:** `src/lib/auth.ts`
```typescript
import jwt from 'jsonwebtoken'

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    return decoded as { employeeId: string; role: string; name: string }
  } catch (error) {
    return null
  }
}

export function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.replace('Bearer ', '')
  return verifyToken(token)
}
```

#### 4. Update API Routes to Support Both Auth Methods
```typescript
// Support both session (web) and token (mobile) authentication
export async function GET(request: Request) {
  // Try token auth first (mobile)
  let user = getAuthUser(request)
  
  // Fall back to session auth (web)
  if (!user) {
    user = getCurrentUser() // existing session-based auth
  }
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Your existing logic...
}
```

#### 5. Enable CORS for Mobile App
**File:** `src/middleware.ts` (create if doesn't exist)
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Allow mobile app to access APIs
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers })
  }
  
  return response
}

export const config = {
  matcher: '/api/:path*',
}
```

#### 6. Environment Variables
Add to `.env.local`:
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

---

## Implementation Phases

### Phase 1: Monorepo Setup (Week 1 - 1-2 days)

**Tasks:**
1. Install Turborepo: `npm install turbo --save-dev`
2. Create folder structure:
   - `apps/web/` - Move current code here
   - `apps/mobile/` - Will create in Phase 3
   - `packages/shared/` - Create shared package
3. Update `package.json` files with workspace configuration
4. Create `turbo.json` configuration
5. Test build: `npm run build`

**Deliverables:**
- ✅ Monorepo structure in place
- ✅ Web app still works
- ✅ Build succeeds

### Phase 2: Backend Updates (Week 1-2 - 2-3 days)

**Tasks:**
1. Install JWT dependencies
2. Create JWT token generation in login API
3. Create token verification utility
4. Update all API routes to support both session and token auth
5. Add CORS middleware
6. Test APIs with Postman/Insomnia
7. Document API endpoints

**Deliverables:**
- ✅ JWT authentication working
- ✅ APIs accessible from external clients
- ✅ Web app still works with session auth
- ✅ API documentation

### Phase 3: Extract Shared Code (Week 2 - 3-4 days)

**Tasks:**
1. Create `packages/shared/types/` - Extract all TypeScript interfaces
2. Create `packages/shared/api/` - Extract API client functions
3. Create `packages/shared/utils/` - Extract utility functions
4. Create `packages/shared/constants/` - Extract constants
5. Update web app to import from shared package
6. Test web app thoroughly

**Example shared API client:**
```typescript
// packages/shared/api/taskService.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function getTasks(employeeId: string, token?: string) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/user/${employeeId}`,
    { headers }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch tasks')
  }
  
  return response.json()
}
```

**Deliverables:**
- ✅ Shared package with types, API clients, utils
- ✅ Web app using shared code
- ✅ No code duplication

### Phase 4: Mobile App Setup (Week 3 - 5-7 days)

**Tasks:**
1. Create Expo app: `npx create-expo-app apps/mobile --template`
2. Install dependencies:
   - React Navigation
   - AsyncStorage
   - Expo modules (camera, notifications, etc.)
3. Set up navigation structure
4. Create authentication flow
5. Implement login screen
6. Test authentication with Next.js backend

**Key Files:**
```typescript
// apps/mobile/src/navigation/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Tasks" component={TasksScreen} />
            {/* ... */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

**Deliverables:**
- ✅ Mobile app runs on iOS and Android
- ✅ Login working
- ✅ Navigation structure in place

### Phase 5: Core Features (Weeks 4-8 - 20-25 days)

**Tasks:**
1. **Dashboard** (3-4 days)
   - Statistics cards
   - Task/bug list
   - Filters

2. **Task Management** (5-6 days)
   - Task list
   - Task details
   - Create task
   - Edit task
   - Multi-user assignment

3. **Bug Tracking** (4-5 days)
   - Bug list
   - Bug details
   - Create bug
   - Edit bug
   - File attachments

4. **Profile** (2-3 days)
   - View profile
   - Edit profile
   - Change password

5. **Leave/WFH Applications** (3-4 days)
   - Apply for leave
   - Apply for WFH
   - View applications
   - Application status

6. **Approvals** (3-4 days)
   - Approve/reject leave
   - Approve/reject WFH
   - Approval history

**Deliverables:**
- ✅ All core features working on mobile
- ✅ Feature parity with web app

### Phase 6: Advanced Features (Weeks 9-10 - 10-12 days)

**Tasks:**
1. **Push Notifications** (3-4 days)
   - Set up Expo push notifications
   - Send notifications from backend
   - Handle notification taps

2. **Offline Support** (3-4 days)
   - Implement AsyncStorage caching
   - Queue actions when offline
   - Sync when back online

3. **File Uploads** (2-3 days)
   - Camera integration
   - Photo picker
   - Upload to backend

4. **Biometric Authentication** (2-3 days)
   - Fingerprint/Face ID
   - Secure token storage

**Deliverables:**
- ✅ Push notifications working
- ✅ Offline support
- ✅ File uploads
- ✅ Biometric auth

### Phase 7: Testing & Deployment (Weeks 11-12 - 10-12 days)

**Tasks:**
1. **Testing** (5-6 days)
   - Unit tests
   - Integration tests
   - E2E tests
   - Manual testing on real devices
   - Beta testing with users

2. **App Store Submission** (3-4 days)
   - Create app store accounts
   - Prepare screenshots
   - Write app descriptions
   - Submit to Google Play
   - Submit to Apple App Store

3. **Documentation** (2-3 days)
   - User guide
   - Admin guide
   - Developer documentation

**Deliverables:**
- ✅ Apps published on stores
- ✅ Documentation complete
- ✅ Beta testing feedback incorporated

---

## Timeline and Cost Estimates

### Timeline Breakdown

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Monorepo Setup | 1-2 days | Turborepo, folder structure |
| Phase 2: Backend Updates | 2-3 days | JWT auth, CORS, API updates |
| Phase 3: Extract Shared Code | 3-4 days | Types, API clients, utils |
| Phase 4: Mobile App Setup | 5-7 days | Expo setup, navigation, auth |
| Phase 5: Core Features | 20-25 days | Dashboard, tasks, bugs, profile |
| Phase 6: Advanced Features | 10-12 days | Push, offline, uploads, biometric |
| Phase 7: Testing & Deployment | 10-12 days | Testing, app store submission |
| **Total** | **51-65 days** | **~3-4 months** |

### Cost Estimates

**Assumptions:**
- 1 full-time React Native developer
- $50-80/hour rate
- 8 hours/day

| Scenario | Days | Hours | Rate | Total Cost |
|----------|------|-------|------|------------|
| Best Case | 51 days | 408 hours | $50/hr | $20,400 |
| Average Case | 58 days | 464 hours | $65/hr | $30,160 |
| Worst Case | 65 days | 520 hours | $80/hr | $41,600 |

**Recommended Budget:** $25,000 - $30,000

### Ongoing Costs

| Item | Monthly Cost |
|------|--------------|
| Apple Developer Account | $99/year ($8.25/month) |
| Google Play Developer Account | $25 one-time |
| Expo EAS Build (optional) | $0-$29/month |
| Push Notification Service | $0 (Expo free tier) |
| **Total** | ~$10-40/month |

---

## Code Sharing Strategy

### What Can Be Shared (70-90%)

#### 1. TypeScript Types (100% shared)
```typescript
// packages/shared/types/task.ts
export interface Task {
  taskId: string
  description: string
  status: string
  priority: string
  startDate: string
  endDate: string
  assignedTo: string
  supportTeam: string[]
  projectId: string
  // ...
}
```

#### 2. API Client Functions (100% shared)
```typescript
// packages/shared/api/taskService.ts
export async function getTasks(employeeId: string, token: string) {
  // Shared logic
}

export async function createTask(task: CreateTaskInput, token: string) {
  // Shared logic
}
```

#### 3. Business Logic (90% shared)
```typescript
// packages/shared/utils/validation.ts
export function validateTask(task: CreateTaskInput): ValidationResult {
  // Shared validation logic
}

// packages/shared/utils/formatting.ts
export function formatDate(date: string): string {
  // Shared formatting logic
}
```

#### 4. Constants (100% shared)
```typescript
// packages/shared/constants/index.ts
export const TASK_STATUSES = ['Yet to Start', 'In Progress', 'Done', ...]
export const BUG_SEVERITIES = ['Critical', 'Major', 'Minor']
```

### What Cannot Be Shared (10-30%)

#### 1. UI Components
- **Web:** `<div>`, `<button>`, `<input>`, Tailwind CSS
- **Mobile:** `<View>`, `<TouchableOpacity>`, `<TextInput>`, StyleSheet

#### 2. Navigation
- **Web:** Next.js App Router
- **Mobile:** React Navigation

#### 3. Storage
- **Web:** localStorage, cookies
- **Mobile:** AsyncStorage, SecureStore

#### 4. Platform-Specific Features
- **Web:** Browser APIs
- **Mobile:** Camera, biometrics, push notifications

---

## Database Schema Overview

### Core Tables

#### 1. users
```sql
CREATE TABLE users (
  employeeId VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'top_management', 'management', 'employee'),
  department VARCHAR(100),
  status ENUM('active', 'inactive'),
  warningCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

#### 2. tasks
```sql
CREATE TABLE tasks (
  taskId VARCHAR(50) PRIMARY KEY,
  description TEXT NOT NULL,
  subTask TEXT,
  status VARCHAR(50),
  priority VARCHAR(50),
  startDate DATE,
  endDate DATE,
  assignedTo VARCHAR(50),
  supportTeam JSON,
  relatedTasks JSON,
  projectId VARCHAR(50),
  createdBy VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignedTo) REFERENCES users(employeeId),
  FOREIGN KEY (createdBy) REFERENCES users(employeeId)
)
```

#### 3. bugs
```sql
CREATE TABLE bugs (
  bugId VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(50),
  status VARCHAR(50),
  priority VARCHAR(50),
  category VARCHAR(100),
  platform VARCHAR(100),
  bugType VARCHAR(100),
  assignedTo VARCHAR(50),
  reportedBy VARCHAR(50),
  attachments JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignedTo) REFERENCES users(employeeId),
  FOREIGN KEY (reportedBy) REFERENCES users(employeeId)
)
```

#### 4. projects
```sql
CREATE TABLE projects (
  projectId VARCHAR(50) PRIMARY KEY,
  projectName VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  startDate DATE,
  endDate DATE,
  createdBy VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

#### 5. settings
```sql
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  value VARCHAR(255) NOT NULL,
  displayOrder INT DEFAULT 0,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_type_value (type, value)
)
```

### Authentication Flow

#### Web (Session-Based)
```
1. User logs in → POST /api/auth/login
2. Server validates credentials
3. Server creates session (cookie)
4. Browser stores cookie
5. Subsequent requests include cookie automatically
6. Server validates session from cookie
```

#### Mobile (Token-Based)
```
1. User logs in → POST /api/auth/login
2. Server validates credentials
3. Server generates JWT token
4. Mobile app stores token in AsyncStorage/SecureStore
5. Subsequent requests include token in Authorization header
6. Server validates token
```

### Role-Based Access Control Pattern

```typescript
// Check in components
const currentUser = getCurrentUser()
if (currentUser.role !== 'admin' && currentUser.role !== 'top_management') {
  // Deny access
}

// Check in API routes
const user = getAuthUser(request)
if (!user || (user.role !== 'admin' && user.role !== 'top_management')) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## Next Steps

1. **Review this document** with the development team
2. **Get approval** for budget and timeline
3. **Set up development environment** (Phase 1)
4. **Begin implementation** following the phases outlined
5. **Regular check-ins** (weekly) to track progress
6. **Beta testing** with select users before public release

---

## Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [JWT Authentication](https://jwt.io/introduction)

---

**Document Version:** 1.0  
**Last Updated:** October 27, 2025  
**Author:** Development Team  
**Status:** Ready for Implementation

