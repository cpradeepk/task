# ✅ Mobile App Debugging Setup Complete

## 🎯 Priority 1: Crash Debugging - READY

### **Real-Time Crash Monitor Running**
✅ **Terminal 76** is now monitoring crash logs in real-time!

**What's happening:**
- Logcat buffer has been cleared
- Real-time monitor is filtering for errors and fatal crashes
- Watching for: JSR app, React Native, and Android Runtime errors

### **Next Steps for You:**

1. **Open the JSR Task Management app** on your Android device
2. **Watch Terminal 76** for crash logs (or check the output below)
3. **When the crash occurs**, the error will be captured automatically

### **If Terminal 76 doesn't show the crash:**

Run the interactive debug script:
```bash
cd apps/mobile
./debug-crash.sh
```

Then:
1. Select option **4** (Clear logcat buffer)
2. Select option **2** (View crash logs only)
3. **Open the app on your device**
4. Watch for the crash in real-time
5. Press Ctrl+C when you see the error
6. Select option **3** (Capture full crash log to file)

### **Manual Crash Capture:**
```bash
# Clear logs
adb logcat -c

# Start monitoring (errors and fatal only)
adb logcat *:E *:F

# Open the app on your device and watch for crashes
# Press Ctrl+C when you see the crash

# Save the crash log
adb logcat -d -t 5000 > apps/mobile/crash-logs/crash_$(date +%Y%m%d_%H%M%S).log
```

---

## 🎯 Priority 2: Permanent Environment Variables - COMPLETE ✅

### **What Was Done:**
✅ Ran `ENVIRONMENT_SETUP.sh` script  
✅ Added Android SDK environment variables to `~/.bashrc`  
✅ Verified ANDROID_HOME is set correctly  
✅ Verified ADB is accessible in PATH  

### **Environment Variables Added:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### **Verification:**
```
ANDROID_HOME: /home/pradeep/Android/Sdk
ADB: /usr/bin/adb
```

### **To Apply in Current Terminal:**
```bash
source ~/.bashrc
```

**Note:** All new terminal sessions will automatically have these environment variables set.

---

## 📋 Available Debugging Tools

### **1. Interactive Debug Script**
```bash
cd apps/mobile
./debug-crash.sh
```

**Features:**
- Real-time log viewing (filtered for JSR app)
- Crash logs only (errors and fatal)
- Capture full crash log to file
- Clear logcat buffer
- View React Native logs only
- View all logs (unfiltered)

### **2. Crash Log Directory**
```bash
apps/mobile/crash-logs/
```

All captured crash logs are saved here with timestamps.

### **3. Quick Commands**
```bash
# View real-time app logs
adb logcat | grep -i "com.jsr.taskmanagement\|ReactNative"

# View errors only
adb logcat *:E *:F

# Clear logcat
adb logcat -c

# Check if app is installed
adb shell pm list packages | grep jsr

# Launch app from command line
adb shell am start -n com.jsr.taskmanagement/.MainActivity

# Force stop app
adb shell am force-stop com.jsr.taskmanagement
```

---

## 🔍 What to Look For in Crash Logs

### **Common Crash Patterns:**

1. **JavaScript Errors**
   ```
   ReactNativeJS: Error: ...
   ReactNativeJS: Invariant Violation: ...
   ```

2. **Native Crashes**
   ```
   FATAL EXCEPTION: main
   AndroidRuntime: FATAL EXCEPTION
   ```

3. **Network Errors**
   ```
   Failed to connect to task.amtariksha.com
   Network request failed
   ```

4. **Module Loading Errors**
   ```
   Unable to resolve module
   Module not found
   ```

5. **Permission Errors**
   ```
   Permission denied
   SecurityException
   ```

---

## 📱 Current App Configuration

- **Package Name**: `com.jsr.taskmanagement`
- **Production API**: `https://task.amtariksha.com/api/graphql`
- **Development API**: `http://192.168.0.13:3000/api/graphql`
- **APK Location**: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- **APK Size**: 188 MB
- **Build Type**: Debug (locally built)

---

## 🆘 Troubleshooting

### **If you can't see crash logs:**

1. **Check device connection**
   ```bash
   adb devices
   ```

2. **Restart ADB server**
   ```bash
   adb kill-server
   adb start-server
   ```

3. **Enable USB debugging** on your Android device
   - Settings > Developer Options > USB Debugging

4. **Check logcat permissions**
   - Some Android versions restrict logcat access
   - Try running: `adb logcat` to see if you get any output

### **If the app won't install:**

1. **Uninstall old version**
   ```bash
   adb uninstall com.jsr.taskmanagement
   ```

2. **Reinstall**
   ```bash
   cd apps/mobile
   npm run install:local
   ```

---

## 📝 Next Steps

1. **Capture the crash log** using one of the methods above
2. **Share the crash log** with me so I can analyze it
3. **Provide additional context**:
   - When does the crash occur? (on launch, after login, etc.)
   - Any error messages on the device screen?
   - Device model and Android version?

---

## 🎯 Priority 3 & 4 (For Later)

### **Priority 3: Release Build Configuration**
- Set up release signing keystore
- Configure ProGuard/R8 optimization
- Generate production-ready APK

### **Priority 4: Automated Build Scripts**
- Watch for code changes and auto-build
- One-command build + install workflow
- Integration with development workflow

**These will be addressed after we fix the current crash issue.**

---

## ✅ Summary

**COMPLETED:**
- ✅ Real-time crash monitoring set up (Terminal 76)
- ✅ Interactive debug script created (`debug-crash.sh`)
- ✅ Crash log directory created (`crash-logs/`)
- ✅ Permanent environment variables configured
- ✅ ANDROID_HOME added to ~/.bashrc
- ✅ Comprehensive debugging documentation

**READY FOR YOU:**
- 🔴 **Open the app on your device** to capture the crash
- 🔴 **Check Terminal 76** for real-time crash logs
- 🔴 **Or use `./debug-crash.sh`** for interactive debugging

**Let me know what you see in the crash logs, and I'll help you fix the issue!**

