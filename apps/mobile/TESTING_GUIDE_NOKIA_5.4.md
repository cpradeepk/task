# 📱 Mobile App Testing Guide - Nokia 5.4

## ✅ Pre-Test Checklist

**APK Status:** ✅ Ready  
**APK Location:** `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`  
**APK Size:** 193 MB  
**Build Date:** Nov 11, 2025 20:47 IST  
**Includes Fix:** ✅ GraphQL login mutation (commit 456f1f2)

---

## 📲 Installation Steps

### Step 1: Transfer APK to Nokia 5.4

**Option A: USB Cable**
```bash
# Connect your Nokia 5.4 via USB cable
# Enable USB file transfer on phone
# Copy APK to phone's Download folder
adb install apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

**Option B: File Sharing**
- Email the APK to yourself
- Use Google Drive/Dropbox
- Use Bluetooth file transfer
- Use a file sharing app (ShareIt, etc.)

### Step 2: Enable Installation from Unknown Sources

1. Open **Settings** on Nokia 5.4
2. Go to **Apps & notifications** → **Advanced** → **Special app access**
3. Tap **Install unknown apps**
4. Select your file manager or browser
5. Enable **Allow from this source**

### Step 3: Install the APK

1. Open **Files** app or **Downloads** folder
2. Tap on **app-debug.apk**
3. Tap **Install**
4. Wait for installation to complete
5. Tap **Open** or find "JSR Task Management" in app drawer

---

## 🧪 Test Scenarios

### Test 1: Login with Valid Credentials ✅

**Test Data:**
- Employee ID: `AM-0001`
- Password: `12345678`

**Steps:**
1. Open JSR Task Management app
2. Enter Employee ID: `AM-0001`
3. Enter Password: `12345678`
4. Tap **Login** button

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to Dashboard
- ✅ User name displayed in header
- ✅ No error messages

**What to Check:**
- [ ] Login button shows loading state
- [ ] No GraphQL errors in console
- [ ] JWT token stored successfully
- [ ] Dashboard loads with user data

---

### Test 2: Login with Invalid Credentials ❌

**Test Data:**
- Employee ID: `AM-0001`
- Password: `wrongpassword`

**Steps:**
1. Tap **Logout** (if logged in)
2. Enter Employee ID: `AM-0001`
3. Enter Password: `wrongpassword`
4. Tap **Login** button

**Expected Result:**
- ❌ Login fails
- ❌ Error message displayed: "Invalid credentials"
- ❌ User stays on login screen

---

### Test 3: Navigation and Basic Features

**After successful login, test:**

1. **Dashboard Screen**
   - [ ] User name displayed correctly
   - [ ] Navigation menu accessible
   - [ ] Stats/cards load properly

2. **Bug List Screen**
   - [ ] Navigate to Bugs section
   - [ ] Bug list loads
   - [ ] Can scroll through bugs
   - [ ] Can tap on a bug to view details

3. **Bug Details Screen**
   - [ ] Bug details display correctly
   - [ ] Attachments visible (if any)
   - [ ] Can navigate back to list

4. **Create Bug Screen**
   - [ ] Navigate to Create Bug
   - [ ] Form fields render correctly
   - [ ] Can fill in bug details
   - [ ] Can submit new bug

---

## 🐛 Known Issues to Watch For

### Critical Issues (Should NOT occur)
- ❌ App crashes on login
- ❌ GraphQL mutation error
- ❌ Infinite API request loop
- ❌ White screen after login

### Minor Issues (May occur)
- ⚠️ Slow initial load (first time)
- ⚠️ Image loading delays
- ⚠️ Keyboard covering input fields

---

## 📊 What to Report

### If Login Works ✅
Report:
- ✅ Login successful
- Device: Nokia 5.4
- Android version: [Check in Settings]
- Time taken to login: [seconds]
- Any UI glitches or delays

### If Login Fails ❌
Report:
- ❌ Error message shown
- Screenshot of error
- Check if internet connection is active
- Try restarting the app

---

## 🔍 Debugging Steps (If Issues Occur)

### Enable Developer Mode on Nokia 5.4
1. Go to **Settings** → **About phone**
2. Tap **Build number** 7 times
3. Go back to **Settings** → **System** → **Developer options**
4. Enable **USB debugging**

### View App Logs
```bash
# Connect phone via USB
# Run this command on your laptop
adb logcat | grep -i "jsr\|graphql\|apollo"
```

### Check Network Connectivity
- Ensure phone has internet (WiFi or mobile data)
- Try opening browser and visiting: `https://task.amtariksha.com`
- GraphQL endpoint: `https://task.amtariksha.com/api/graphql`

---

## ✅ Success Criteria

The test is **SUCCESSFUL** if:
- ✅ App installs without errors
- ✅ Login with AM-0001/12345678 works
- ✅ Dashboard loads after login
- ✅ No crashes or freezes
- ✅ Can navigate between screens
- ✅ Can view bug list and details

---

## 📝 Test Report Template

```
## Mobile App Test Report - Nokia 5.4

**Date:** [Date]
**Time:** [Time]
**Tester:** [Your Name]
**Device:** Nokia 5.4
**Android Version:** [Version]
**App Version:** 1.0.0 (debug)

### Test Results

**Login Test:**
- [ ] PASS / [ ] FAIL
- Notes: 

**Dashboard Test:**
- [ ] PASS / [ ] FAIL
- Notes:

**Bug List Test:**
- [ ] PASS / [ ] FAIL
- Notes:

**Overall Status:**
- [ ] All tests passed ✅
- [ ] Some tests failed ❌
- [ ] Critical issues found 🚨

**Additional Notes:**
[Any observations, screenshots, or issues]
```

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
1. Document success in test report
2. Consider building production APK
3. Test with other user accounts
4. Test additional features (Tasks, Leave, WFH)

### If Tests Fail ❌
1. Capture screenshots of errors
2. Save error logs using `adb logcat`
3. Report issues with details
4. Check HANDOFF_DOCUMENT.md for troubleshooting

---

**Ready to test! Good luck! 🎉**

