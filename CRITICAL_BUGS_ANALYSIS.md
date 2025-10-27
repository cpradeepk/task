# Critical Bugs Analysis & Fixes

## Bug #1: Email Notifications Not Sending

### Root Cause
The email service is configured but may not be properly initialized or the environment variables are missing.

**Status**: Email service code exists in `/src/lib/email/service.ts` but needs verification that:
1. Email environment variables are set in production
2. Email service is properly initialized
3. Error handling is working correctly

### Fix Required
- Verify `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` are set in Vercel environment
- Add better error logging to email service
- Test email sending with test endpoint

---

## Bug #2: Bug Creation Form - Dropdowns Not Working

### Root Cause
The dropdowns are showing "Loading..." because:
1. Settings API returns empty arrays for dropdown options
2. The `getSettingsByType()` function returns an empty object `{}`
3. Database table `settings` may not have the required data

**Affected Dropdowns**:
- Severity
- Priority
- Category
- Platform
- Bug Type

### Fix Required
1. Check if `settings` table has data for these types
2. Ensure migration 006 was run to populate settings
3. Add fallback default options if database is empty
4. Fix the API response format

---

## Bug #3: Notification Preferences API Error (500)

### Root Cause
`GET /api/notification-preferences?employeeId=AM-0002` returns 500 error

**Possible Causes**:
1. `user_notification_preferences` table doesn't exist
2. Database connection issue
3. Missing error handling in `getNotificationPreferences()` function

### Fix Required
1. Verify table exists and has proper schema
2. Add try-catch error handling
3. Ensure default preferences are created for new users

---

## Bug #4: Leave Application API Error (500)

### Root Cause
`POST /api/leaves` returns 500 error

**Possible Causes**:
1. Missing required fields in request
2. Database constraint violation
3. Foreign key constraint issue with manager_id

### Fix Required
1. Add better error logging to `/api/leaves/route.ts`
2. Validate all required fields before database insert
3. Handle foreign key constraint errors gracefully

---

## Bug #5: Work From Home API Error (500)

### Root Cause
`POST /api/wfh` returns 500 error

**Possible Causes**:
1. Same as Leave Application API
2. Missing `contact_number` field validation
3. Database constraint issues

### Fix Required
1. Add better error logging
2. Validate all required fields
3. Handle database errors gracefully

---

## Implementation Plan

### Phase 1: Database Verification
- [ ] Verify all required tables exist
- [ ] Check if settings table has data
- [ ] Verify user_notification_preferences table schema

### Phase 2: API Error Handling
- [ ] Add detailed error logging to all APIs
- [ ] Improve error messages
- [ ] Add validation for required fields

### Phase 3: Dropdown Data
- [ ] Populate settings table with default values
- [ ] Add fallback options in frontend
- [ ] Test dropdown loading

### Phase 4: Testing
- [ ] Test each API endpoint
- [ ] Verify email sending
- [ ] Test all forms


