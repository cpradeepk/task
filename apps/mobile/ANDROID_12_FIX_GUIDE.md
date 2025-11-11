# 🔧 Android 12 App Launch Fix - Rebuild & Testing Guide

## ✅ Issue Fixed

**Problem:** App was crashing/hanging on launch on Android 12 devices

**Root Cause:** 
- Android 9+ blocks cleartext HTTP traffic by default
- App was trying to connect to local dev server (HTTP) without network security configuration
- This caused connection timeout and app hang/crash on launch

**Solution Applied:**
1. ✅ Added `network_security_config.xml` to allow HTTP for local development
2. ✅ Updated `AndroidManifest.xml` to reference network security config
3. ✅ Changed Apollo config to use production HTTPS URL by default

---

## 🚀 How to Rebuild and Install the App

### **Option 1: Quick Rebuild (Recommended)**

```bash
cd apps/mobile

# Clean previous builds
cd android && ./gradlew clean && cd ..

# Build new APK with fixes
npm run build:local

# Install on connected Android device
npm run install:local
```

### **Option 2: Full Rebuild with Uninstall**

```bash
cd apps/mobile

# Uninstall old version first
npm run uninstall

# Clean and rebuild
cd android && ./gradlew clean && cd ..
npm run build:local

# Install new version
npm run install:local
```

### **Option 3: Manual Build Steps**

```bash
cd apps/mobile/android

# Clean previous builds
./gradlew clean

# Build debug APK
./gradlew assembleDebug --no-daemon

# Install on device
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 📱 Testing Steps

### **1. Launch the App**
- Open "JSR Task Management" app on your Android 12 device
- App should now launch successfully and show the login screen
- No more hanging or crashing!

### **2. Test Login**
- Enter your employee ID and password
- App should connect to production server: `https://task.amtariksha.com`
- Login should work and redirect to dashboard

### **3. Test Basic Features**
- Navigate to Bugs list
- Navigate to Tasks list
- Create a new bug
- View bug details
- Verify all screens load correctly

### **4. Test Network Connectivity**
- Turn off WiFi and use mobile data
- App should still work (uses HTTPS production URL)
- Turn WiFi back on
- App should continue working

---

## 🔍 Troubleshooting

### **If app still crashes:**

1. **Capture crash logs:**
   ```bash
   cd apps/mobile
   ./debug-crash.sh
   # Select option 4 to clear logs
   # Select option 2 to view crash logs
   # Open the app on your device
   # Watch for errors
   ```

2. **Check device connection:**
   ```bash
   adb devices
   # Should show your device as "device" (not "unauthorized")
   ```

3. **Clear app data and reinstall:**
   ```bash
   cd apps/mobile
   adb shell pm clear com.jsr.taskmanagement
   npm run reinstall:local
   ```

4. **Check Android version:**
   ```bash
   adb shell getprop ro.build.version.release
   # Should show 12 or higher
   ```

### **If build fails:**

1. **Check Java version:**
   ```bash
   java -version
   # Should be Java 17 or higher
   ```

2. **Check Gradle:**
   ```bash
   cd apps/mobile/android
   ./gradlew --version
   ```

3. **Clean Gradle cache:**
   ```bash
   cd apps/mobile/android
   ./gradlew clean --no-daemon
   rm -rf .gradle
   ./gradlew assembleDebug --no-daemon
   ```

---

## 🔧 Configuration Details

### **Network Security Config**
Location: `apps/mobile/android/app/src/main/res/xml/network_security_config.xml`

- ✅ Allows HTTP for local development IPs (192.168.x.x, 10.0.2.2, localhost)
- ✅ Enforces HTTPS for production domain (task.amtariksha.com)
- ✅ Secure by default for all other domains

### **API Configuration**
Location: `apps/mobile/src/config/apollo.ts`

- ✅ Uses production URL by default: `https://task.amtariksha.com/api/graphql`
- ✅ Can switch to local dev by setting `USE_LOCAL_DEV = true`
- ✅ Prevents connection timeout on physical devices

### **Android Compatibility**
- ✅ minSdkVersion: 24 (Android 7.0)
- ✅ targetSdkVersion: 36 (Android 14)
- ✅ compileSdkVersion: 36 (Android 14)
- ✅ **Android 12 (API 31) fully supported**

---

## 📝 Next Steps After Successful Launch

1. ✅ Verify login works with your credentials
2. ✅ Test creating and viewing bugs
3. ✅ Test creating and viewing tasks
4. ✅ Test leave and WFH applications
5. ✅ Test notifications
6. ✅ Test offline mode (turn off internet, app should show offline banner)

---

## 🆘 Need Help?

If you encounter any issues:

1. **Capture crash logs** using `./debug-crash.sh`
2. **Check the error message** in the crash log
3. **Share the crash log** for further debugging
4. **Verify device info**: Android version, available storage, RAM

---

## ✅ Expected Outcome

After rebuilding and installing:
- ✅ App launches successfully on Android 12
- ✅ Login screen appears immediately
- ✅ No hanging or crashing
- ✅ Can login and access all features
- ✅ Uses production HTTPS API (secure and fast)

**The app is now ready for testing on Android 12 devices!** 🎉

