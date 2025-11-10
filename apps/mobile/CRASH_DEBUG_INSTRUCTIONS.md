# 🔍 Mobile App Crash Debugging Instructions

## Current Status
The crash log was captured but shows no errors, which means the crash happened before logging started. We need to capture logs in real-time while you open the app.

---

## 🚀 Quick Start - Capture Crash Logs

### **Option 1: Interactive Debug Script (Recommended)**
```bash
cd apps/mobile
./debug-crash.sh
```

This will show you a menu with options:
1. View real-time logs (filtered for JSR app)
2. View crash logs only (errors and fatal)
3. Capture full crash log to file
4. Clear logcat buffer and start fresh
5. View React Native logs only
6. View all logs (unfiltered)

**Recommended workflow:**
1. Run `./debug-crash.sh`
2. Select option **4** to clear logcat buffer
3. Select option **2** to view crash logs only
4. **Open the app on your device**
5. Watch for crash errors in real-time
6. Press Ctrl+C when you see the crash
7. Select option **3** to save the crash log to a file

---

### **Option 2: Manual Commands**

#### **Step 1: Clear previous logs**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
adb logcat -c
```

#### **Step 2: Start real-time crash monitoring**
```bash
# View only errors and fatal crashes
adb logcat *:E *:F

# Or view all app-related logs
adb logcat | grep -i "com.jsr.taskmanagement\|ReactNative\|ReactNativeJS\|AndroidRuntime"
```

#### **Step 3: Open the app on your device**
While the logcat is running, open the JSR Task Management app on your Android device.

#### **Step 4: Capture the crash log**
When you see the crash, press Ctrl+C to stop logcat, then run:
```bash
adb logcat -d -t 5000 > apps/mobile/crash-logs/crash_$(date +%Y%m%d_%H%M%S).log
```

---

## 📋 Useful ADB Logcat Commands

### **Filter by log level**
```bash
# Errors only
adb logcat *:E

# Errors and Fatal
adb logcat *:E *:F

# Warnings, Errors, and Fatal
adb logcat *:W *:E *:F
```

### **Filter by tag/package**
```bash
# JSR app only
adb logcat | grep "com.jsr.taskmanagement"

# React Native only
adb logcat | grep -i "ReactNative\|ReactNativeJS"

# Android crashes
adb logcat | grep "AndroidRuntime"
```

### **Save logs to file**
```bash
# Save last 5000 lines
adb logcat -d -t 5000 > crash.log

# Save real-time logs (press Ctrl+C to stop)
adb logcat > realtime.log
```

### **Clear logcat buffer**
```bash
adb logcat -c
```

---

## 🔍 Common Crash Patterns to Look For

### **1. JavaScript Errors**
```
ReactNativeJS: Error: ...
ReactNativeJS: Invariant Violation: ...
```

### **2. Native Crashes**
```
FATAL EXCEPTION: main
AndroidRuntime: FATAL EXCEPTION
```

### **3. Network Errors**
```
Failed to connect to task.amtariksha.com
Network request failed
```

### **4. Permission Errors**
```
Permission denied
SecurityException
```

### **5. Module Not Found**
```
Unable to resolve module
Module not found
```

---

## 🎯 Next Steps After Capturing Crash Log

1. **Share the crash log** - Send me the contents of the crash log file
2. **Look for stack traces** - The error will usually include a stack trace showing where the crash occurred
3. **Check for common issues**:
   - Missing dependencies
   - Network connectivity issues
   - Permission problems
   - JavaScript bundle loading failures
   - Native module initialization errors

---

## 📱 Alternative: Use Android Studio Logcat

If you have Android Studio installed:
1. Open Android Studio
2. Go to **View > Tool Windows > Logcat**
3. Select your device from the dropdown
4. Filter by package name: `com.jsr.taskmanagement`
5. Open the app and watch for crashes
6. Right-click on the log and select **Copy** to save the crash log

---

## ⚡ Quick Test Commands

### **Check if app is installed**
```bash
adb shell pm list packages | grep jsr
```

### **Launch the app from command line**
```bash
adb shell am start -n com.jsr.taskmanagement/.MainActivity
```

### **Force stop the app**
```bash
adb shell am force-stop com.jsr.taskmanagement
```

### **Clear app data**
```bash
adb shell pm clear com.jsr.taskmanagement
```

---

## 🆘 If You're Stuck

If you can't capture the crash log, try:

1. **Use the interactive script**: `./debug-crash.sh` (easiest option)
2. **Check device connection**: `adb devices`
3. **Restart ADB server**: `adb kill-server && adb start-server`
4. **Enable USB debugging** on your Android device
5. **Check Android version** - Some logs require developer options enabled

---

## 📝 What I Need From You

To help debug the crash, please provide:

1. **The crash log** (from `apps/mobile/crash-logs/` or captured via logcat)
2. **When does it crash?**
   - On app launch?
   - After login?
   - When clicking a specific button?
3. **Any error messages** you see on the device screen
4. **Device information**:
   - Android version
   - Device model
   - Available storage/memory

---

**Let me know when you're ready to capture the crash log, and I'll guide you through the process!**

