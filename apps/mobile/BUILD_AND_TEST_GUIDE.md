# 📱 Mobile App Build and Test Guide

## ✅ Successfully Tested Build Process (November 11, 2025)

This guide documents the working build process for creating a standalone APK that can be tested on physical devices or emulators.

---

## 🚀 Quick Build and Install (Recommended)

### **Prerequisites**
- Android device connected via USB with USB debugging enabled
- OR Android emulator running
- Node.js and npm installed
- Android SDK and Gradle installed

### **Step 1: Bundle JavaScript**

```bash
cd apps/mobile

# Export JavaScript bundle for Android
npx expo export:embed --platform android --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
```

**What this does:**
- Bundles all JavaScript code into `index.android.bundle`
- Copies assets to the Android resources directory
- Creates a standalone bundle that doesn't need Metro bundler

### **Step 2: Build APK**

```bash
# Clean previous builds (optional but recommended)
cd android
./gradlew clean
cd ..

# Build debug APK
cd android
./gradlew assembleDebug --no-daemon
cd ..
```

**Build output:**
- APK location: `android/app/build/outputs/apk/debug/app-debug.apk`
- Size: ~188MB (includes all native libraries for multiple architectures)
- Build time: ~2-3 minutes (first build), ~10-15 seconds (subsequent builds)

### **Step 3: Install on Device**

```bash
# List connected devices
adb devices

# Uninstall old version (if exists)
adb uninstall com.jsr.taskmanagement

# Install new APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Launch the app
adb shell am start -n com.jsr.taskmanagement/.MainActivity
```

**For specific device:**
```bash
# If multiple devices connected, specify device ID
adb -s DEVICE_ID install android/app/build/outputs/apk/debug/app-debug.apk
adb -s DEVICE_ID shell am start -n com.jsr.taskmanagement/.MainActivity
```

---

## 🔍 Monitoring and Debugging

### **View Real-time Logs**

```bash
# Clear previous logs
adb logcat -c

# View app-specific logs
adb logcat -s ReactNativeJS:* | grep -E "(JSR|taskmanagement)"

# View all React Native logs
adb logcat | grep -E "(ReactNative|JSR|taskmanagement)"

# View errors only
adb logcat *:E | grep -E "(ReactNative|JSR|taskmanagement)"
```

### **Check if App is Running**

```bash
# Check running processes
adb shell ps | grep taskmanagement

# Check app info
adb shell dumpsys package com.jsr.taskmanagement | grep -A 5 "versionName"
```

---

## 📝 Build Configurations

### **Current Configuration**
- **Package Name:** `com.jsr.taskmanagement`
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 36 (Android 14)
- **Compile SDK:** 36 (Android 14)
- **React Native:** 0.81.5
- **Expo SDK:** 54.0.23
- **New Architecture:** Enabled
- **Hermes:** Enabled

### **Network Security**
- **Production API:** `https://task.amtariksha.com/api/graphql` (default)
- **Local Dev API:** `http://192.168.0.13:3000/api/graphql` (requires `USE_LOCAL_DEV = true`)
- **Network Security Config:** Allows HTTP for local IPs, enforces HTTPS for production

---

## ⚠️ Common Issues and Solutions

### **Issue 1: "Unable to load script" Error**

**Symptom:** App crashes with "Make sure you're running Metro or that your bundle is packaged correctly"

**Solution:** You forgot to bundle the JavaScript. Run Step 1 again:
```bash
npx expo export:embed --platform android --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
```

### **Issue 2: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"**

**Symptom:** Installation fails with signature mismatch error

**Solution:** Uninstall the old version first:
```bash
adb uninstall com.jsr.taskmanagement
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### **Issue 3: App Hangs on Splash Screen**

**Symptom:** App shows splash screen but doesn't load

**Possible causes:**
1. JavaScript bundle not included (see Issue 1)
2. Network connectivity issue (check API URL in `src/config/apollo.ts`)
3. Missing permissions (check AndroidManifest.xml)

**Debug:**
```bash
adb logcat -s ReactNativeJS:* ReactNative:*
```

---

## 🎯 Testing Checklist

After installing the app, verify:

- [ ] App launches successfully (no crash)
- [ ] Login screen appears
- [ ] Can enter credentials
- [ ] Can login with valid credentials
- [ ] Dashboard loads after login
- [ ] Can navigate to Bugs list
- [ ] Can navigate to Tasks list
- [ ] Can create a new bug
- [ ] Can view bug details
- [ ] Network requests work (check with production API)

---

## 📊 Build Performance

**First Build (Clean):**
- Time: ~2 minutes 37 seconds
- Tasks: 544 actionable tasks (459 executed, 85 up-to-date)

**Subsequent Builds (Incremental):**
- Time: ~10-15 seconds
- Tasks: 544 actionable tasks (66 executed, 478 up-to-date)

**APK Size:**
- Debug APK: ~188MB
- Includes native libraries for: armeabi-v7a, arm64-v8a, x86, x86_64

---

## 🔧 Advanced: Building for Specific Architecture

To reduce APK size, build for specific architecture:

```bash
cd android

# Build for ARM64 only (most modern devices)
./gradlew assembleDebug -Pandroid.injected.abi=arm64-v8a

# Build for ARM32 (older devices)
./gradlew assembleDebug -Pandroid.injected.abi=armeabi-v7a
```

---

## ✅ Verified Working Setup

**Tested on:**
- Device: Nokia 5.4 (Android 12)
- Build Date: November 11, 2025
- Result: ✅ App launches successfully, no crashes

**Includes fixes for:**
- ✅ Android 12 network security configuration
- ✅ Bundled JavaScript (no Metro dependency)
- ✅ Production HTTPS API by default
- ✅ All required permissions

---

## 📚 Next Steps

1. **Test all features** on the device
2. **Build release APK** for production deployment
3. **Set up CI/CD** for automated builds
4. **Create signed APK** for Play Store submission

For release builds, see: `ANDROID_12_FIX_GUIDE.md`

