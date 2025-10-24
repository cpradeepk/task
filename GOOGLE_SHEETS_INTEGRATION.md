# Google Sheets Database Integration

## Overview

This document describes the complete integration of Google Sheets as the primary database for the JSR Task Management System. The integration provides a cloud-based, scalable data storage solution with automatic fallback to localStorage when Google Sheets is unavailable.

## Features

- ✅ **Complete CRUD Operations** for all data entities
- ✅ **Automatic Fallback** to localStorage when Sheets unavailable
- ✅ **Data Migration** from localStorage to Google Sheets
- ✅ **Error Handling** with retry logic and comprehensive logging
- ✅ **Performance Optimization** with caching and batch operations
- ✅ **Production Ready** with proper authentication and security
- ✅ **Static Admin User** (admin-001) with fallback password
- ✅ **Comprehensive Testing** suite for validation

## Architecture

### Service Layer Structure
```
src/lib/sheets/
├── config.ts          # Configuration and constants
├── auth.ts            # Google Sheets authentication
├── base.ts            # Base CRUD operations class
├── schema.ts          # Data transformation utilities
├── users.ts           # User-specific operations
├── tasks.ts           # Task-specific operations
├── leaves.ts          # Leave application operations
├── wfh.ts             # WFH application operations
├── fallback.ts        # localStorage fallback service
├── migration.ts       # Data migration utilities
├── test.ts            # Comprehensive test suite
└── index.ts           # Main integration service
```

### Data Flow
1. **Client Request** → Integrated Data Service
2. **Service Layer** → Google Sheets API (primary) or localStorage (fallback)
3. **Error Handling** → Automatic fallback with logging
4. **Response** → Transformed data returned to client

## Google Sheets Schema

### Tab 1: UserDetails (15 columns)
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| Employee_ID | String | Primary Key | EL-0001 |
| Name | String | Full Name | Keval Shah |
| Email | String | Email Address | keval@eassy.life |
| Phone | String | Phone Number | +91-9876543210 |
| Telegram_Token | String | Optional | @keval_shah |
| Department | String | Department | Development |
| Manager_Email | String | Manager's Email | pradeep@eassy.life |
| Manager_ID | String | Manager's Employee ID | TM-0001 |
| Is_Today_Task | Boolean | Task Flag | TRUE/FALSE |
| Warning_Count | Number | Warning Count | 0 |
| Role | String | User Role | employee/top_management/admin |
| Password | String | User Password | password123 |
| Status | String | Account Status | active/inactive |
| Created_At | DateTime | Creation Timestamp | 2024-01-01T00:00:00.000Z |
| Updated_At | DateTime | Last Update | 2024-01-01T00:00:00.000Z |

### Tab 2: JSR (24 columns)
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| ID | String | Primary Key | task-1 |
| Task_ID | String | Display ID | JSR-001 |
| Select_Type | String | Task Type | Normal/Recursive |
| Recursive_Type | String | Recurrence | Daily/Weekly/Monthly/Annually |
| Description | String | Task Description | Implement user authentication |
| Assigned_To | String | Owner Employee ID | EL-0001 |
| Assigned_By | String | Creator Employee ID | TM-0001 |
| Support | String | Support Team (JSON Array) | ["EL-0002","EL-0003"] |
| Start_Date | Date | Start Date | 2024-06-15 |
| End_Date | Date | End Date | 2024-06-18 |
| Priority | String | Priority Level | U&I/NU&I/U&NI/NU&NI |
| Estimated_Hours | Number | Estimated Hours | 40 |
| Actual_Hours | Number | Actual Hours | 35 |
| Status | String | Current Status | Yet to Start/In Progress/Done |
| Remarks | String | Task Remarks | Authentication completed |
| Difficulties | String | Difficulties Faced | Token refresh issues |
| Sub_Task | String | Sub Task Details | JWT Token Management |
| Timer_State | String | Timer Status | stopped/running/paused |
| Timer_Start_Time | DateTime | Timer Start | 2024-06-15T09:00:00.000Z |
| Timer_Paused_Time | Number | Paused Duration (seconds) | 3600 |
| Timer_Total_Time | Number | Total Time (seconds) | 126000 |
| Timer_Sessions | String | Timer Sessions (JSON) | [{"id":"session-1",...}] |
| Created_At | DateTime | Creation Timestamp | 2024-06-15T08:00:00.000Z |
| Updated_At | DateTime | Last Update | 2024-06-18T17:00:00.000Z |

### Tab 3: Leave_Applications (16 columns)
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| ID | String | Primary Key | leave-1 |
| Employee_ID | String | Applicant ID | EL-0001 |
| Employee_Name | String | Applicant Name | Keval Shah |
| Leave_Type | String | Type of Leave | Annual Leave |
| Reason | String | Leave Reason | Family vacation |
| From_Date | Date | Start Date | 2024-06-25 |
| To_Date | Date | End Date | 2024-06-27 |
| Is_Half_Day | Boolean | Half Day Flag | FALSE |
| Emergency_Contact | String | Emergency Contact | +91-9876543210 |
| Status | String | Application Status | Pending/Approved/Rejected |
| Manager_ID | String | Approving Manager | TM-0001 |
| Approved_By | String | Approver ID | TM-0001 |
| Approval_Date | DateTime | Approval Date | 2024-06-16T14:00:00.000Z |
| Approval_Remarks | String | Approval Comments | Approved for vacation |
| Created_At | DateTime | Creation Timestamp | 2024-06-15T10:00:00.000Z |
| Updated_At | DateTime | Last Update | 2024-06-16T14:00:00.000Z |

### Tab 4: WFH_Applications (18 columns)
| Column | Type | Description | Example |
|--------|------|-------------|---------|
| ID | String | Primary Key | wfh-1 |
| Employee_ID | String | Applicant ID | EL-0001 |
| Employee_Name | String | Applicant Name | Keval Shah |
| WFH_Type | String | WFH Type | Full Day/Half Day/Flexible Hours |
| Reason | String | WFH Reason | Remote work for focus |
| From_Date | Date | Start Date | 2024-06-21 |
| To_Date | Date | End Date | 2024-06-21 |
| Work_Location | String | Work Location | Home Office |
| Available_From | Time | Available From | 09:00 |
| Available_To | Time | Available To | 18:00 |
| Contact_Number | String | Contact Number | +91-9876543210 |
| Status | String | Application Status | Pending/Approved/Rejected |
| Manager_ID | String | Approving Manager | TM-0001 |
| Approved_By | String | Approver ID | TM-0001 |
| Approval_Date | DateTime | Approval Date | 2024-06-19T11:00:00.000Z |
| Approval_Remarks | String | Approval Comments | Approved for WFH |
| Created_At | DateTime | Creation Timestamp | 2024-06-18T09:00:00.000Z |
| Updated_At | DateTime | Last Update | 2024-06-19T11:00:00.000Z |

## Setup Instructions

### 1. Google Cloud Setup
1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a Service Account
4. Download the JSON credentials file
5. Note the service account email

### 2. Google Sheets Setup
1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1EqjZQRGBIvZPwAoHWpPlE9K83wlpuSuyEvU1WNw3M98/edit
2. Share the sheet with the service account email (Editor access)
3. Create tabs: UserDetails, JSR, Leave_Applications, WFH_Applications

### 3. Environment Configuration
Create `.env.local` file with the following variables:
```env
# Google Cloud Project Configuration
GOOGLE_PROJECT_ID=your-project-id

# Service Account Credentials
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
```

### 4. Installation
```bash
npm install googleapis
```

## Usage

### Basic Operations
```typescript
import { dataService } from '@/lib/sheets'

// Get all users
const users = await dataService.getAllUsers()

// Add a new task
const taskId = await dataService.addTask({
  taskId: 'JSR-001',
  description: 'New task',
  assignedTo: 'EL-0001',
  assignedBy: 'TM-0001',
  support: ['EL-0002'],
  startDate: '2024-06-20',
  endDate: '2024-06-25',
  priority: 'U&I',
  estimatedHours: 40,
  status: 'Yet to Start',
  selectType: 'Normal'
})

// Update a task
await dataService.updateTask(taskId, {
  status: 'In Progress',
  actualHours: 10
})
```

### Authentication
```typescript
// Authenticate user
const user = await dataService.authenticateUser('admin-001', '1234')

// Static admin user always available
const adminUser = await dataService.getUserByEmployeeId('admin-001')
```

## Testing

### Run Tests
Visit `/test-sheets` page in the application to run comprehensive tests:
- Basic connectivity
- User operations (CRUD)
- Task operations (CRUD)
- Leave application operations
- WFH application operations
- Error handling
- Data consistency
- Performance benchmarks

### Manual Testing
```typescript
import { sheetsTestSuite } from '@/lib/sheets/test'

// Run all tests
const results = await sheetsTestSuite.runAllTests()

// Run performance tests
const performance = await sheetsTestSuite.testPerformance()

// Test data consistency
const consistency = await sheetsTestSuite.testDataConsistency()
```

## Error Handling

### Automatic Fallback
- If Google Sheets is unavailable, the system automatically falls back to localStorage
- All operations continue to work seamlessly
- Error logging helps identify issues

### Retry Logic
- Failed operations are retried up to 3 times with exponential backoff
- Configurable retry settings in `config.ts`

### Error Logging
- Comprehensive error logging for debugging
- Performance monitoring for optimization

## Migration

### Automatic Migration
- System automatically detects if migration is needed
- Migrates data from localStorage to Google Sheets
- Validates data integrity during migration

### Manual Migration
```typescript
import { migrationService } from '@/lib/sheets/migration'

// Check if migration is needed
const needsMigration = await migrationService.isMigrationNeeded()

// Perform migration
const result = await migrationService.performMigration()
```

## Production Deployment

### Security Checklist
- ✅ Service account credentials properly secured
- ✅ Environment variables configured
- ✅ Google Sheet permissions set correctly
- ✅ Error handling implemented
- ✅ Fallback mechanisms tested

### Performance Optimization
- ✅ Caching implemented
- ✅ Batch operations for multiple updates
- ✅ Retry logic with exponential backoff
- ✅ Performance monitoring

### Monitoring
- Check application logs for Google Sheets errors
- Monitor API usage and quotas
- Test fallback mechanisms regularly

## Troubleshooting

### Common Issues
1. **Authentication Failed**: Check service account credentials and permissions
2. **Sheet Not Found**: Verify spreadsheet ID and sharing permissions
3. **API Quota Exceeded**: Monitor usage and implement rate limiting
4. **Data Inconsistency**: Run consistency tests and check for race conditions

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed operation logs.

## API Reference

### Main Service (`dataService`)
- `getAllUsers()`: Get all users
- `getUserByEmployeeId(id)`: Get user by ID
- `addUser(user)`: Add new user
- `updateUser(user)`: Update existing user
- `authenticateUser(id, password)`: Authenticate user
- `getAllTasks()`: Get all tasks
- `getTasksByUser(id)`: Get tasks for user
- `addTask(task)`: Add new task
- `updateTask(id, updates)`: Update task
- `deleteTask(id)`: Delete task
- `getAllLeaveApplications()`: Get all leave applications
- `addLeaveApplication(app)`: Add leave application
- `updateLeaveApplication(id, updates)`: Update leave application
- `getAllWFHApplications()`: Get all WFH applications
- `addWFHApplication(app)`: Add WFH application
- `updateWFHApplication(id, updates)`: Update WFH application

### Configuration
All configuration is centralized in `src/lib/sheets/config.ts`:
- Spreadsheet ID
- Sheet names and ranges
- Column headers
- Retry settings
- Cache configuration

## Support

For issues or questions:
1. Check the troubleshooting section
2. Run the test suite to identify problems
3. Check application logs for detailed error information
4. Verify Google Cloud and Sheets configuration
