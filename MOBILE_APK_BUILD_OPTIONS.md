# Mobile APK Build Options for JSR Task Management

**Date:** 2025-01-09  
**Status:** Expo SDK 54 local builds have Gradle compatibility issues  
**Recommended:** Use EAS Build or downgrade to SDK 51

---

## 🚨 **CURRENT ISSUE**

Local Android builds with Expo SDK 54 are failing due to a known Gradle configuration issue:
- Error: `compileSdkVersion is not specified` in expo-application module
- Root cause: Expo modules trying to access build properties before they're defined
- This is a known issue with Expo SDK 54 + React Native 0.74.5

---

## ✅ **OPTION 1: EAS Build (Cloud Build) - RECOMMENDED**

Build your APK in the cloud using Expo's official build service.

### **Advantages:**
- ✅ No local Android SDK setup required
- ✅ Works reliably with Expo SDK 54
- ✅ Produces production-ready APK
- ✅ Handles all dependencies automatically
- ✅ You're already logged in (`amtariksha`)

### **How to Build:**

```bash
cd apps/mobile

# Build preview APK (for testing)
eas build --platform android --profile preview

# OR build development APK (with dev tools)
eas build --platform android --profile development
```

### **Build Time:**
- First build: ~15-20 minutes
- Subsequent builds: ~10-15 minutes

### **Download APK:**
- EAS will provide a download link when build completes
- You can also view builds at: https://expo.dev/accounts/amtariksha/projects/jsr-task-management/builds

### **Install on Device:**
1. Download APK from EAS build link
2. Transfer to your Android device (USB, email, cloud storage)
3. Enable "Install from Unknown Sources" in Android settings
4. Tap the APK file to install

---

## 🔧 **OPTION 2: Downgrade to Expo SDK 51**

Expo SDK 51 has better local build support.

### **Advantages:**
- ✅ Local builds work reliably
- ✅ Faster iteration (no cloud build wait time)
- ✅ Full control over build process

### **Disadvantages:**
- ❌ Need to downgrade from SDK 54
- ❌ Expo Go app version mismatch (your Expo Go is SDK 54)
- ❌ May need to update Expo Go or use development build

### **How to Downgrade:**

```bash
cd apps/mobile

# Downgrade Expo and all packages
npx expo install expo@~51.0.0 --fix

# Regenerate native folders
npx expo prebuild --clean

# Build APK
cd android && ./gradlew assembleDebug

# APK location
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📱 **OPTION 3: Use Expo Go (Current Setup)**

Continue using Expo Go for testing (no APK needed).

### **Advantages:**
- ✅ Instant testing (no build time)
- ✅ Hot reload works
- ✅ Already set up and working

### **Disadvantages:**
- ❌ QR code scanning not working for you
- ❌ Limited to Expo Go features
- ❌ Can't test native modules outside Expo Go

### **Alternative Connection Methods:**

If QR code isn't working, try:

```bash
cd apps/mobile
npx expo start

# Then in Expo Go app:
# 1. Go to "Enter URL manually"
# 2. Enter: exp://192.168.0.13:8082
```

---

## 🎯 **MY RECOMMENDATION**

**For immediate testing:** Use **Option 1 (EAS Build)**

**Why:**
1. Most reliable for Expo SDK 54
2. You're already set up with EAS account
3. Produces installable APK you can use on any device
4. No need to downgrade or change SDK versions

**Steps:**
```bash
cd apps/mobile
eas build --platform android --profile preview --non-interactive
```

Wait 10-15 minutes, download APK, install on your device!

---

## 📝 **INSTALLATION INSTRUCTIONS (After Getting APK)**

### **Method 1: USB Transfer**
1. Connect Android device to computer via USB
2. Copy APK to device (e.g., Downloads folder)
3. On device: Open file manager → Downloads → Tap APK
4. Allow "Install from Unknown Sources" if prompted
5. Tap "Install"

### **Method 2: Cloud Transfer**
1. Upload APK to Google Drive / Dropbox / Email
2. Download on Android device
3. Tap downloaded APK file
4. Allow "Install from Unknown Sources" if prompted
5. Tap "Install"

### **Method 3: ADB Install**
```bash
# If device is connected via USB with USB debugging enabled
adb install path/to/app.apk
```

---

## 🐛 **TROUBLESHOOTING**

### **"App not installed" error:**
- Uninstall any previous version first
- Check if APK is corrupted (re-download)
- Ensure enough storage space

### **"Install blocked" error:**
- Go to Settings → Security → Enable "Unknown Sources"
- OR Settings → Apps → Special Access → Install Unknown Apps → Enable for your file manager

### **Build fails on EAS:**
- Check build logs at expo.dev
- Ensure all dependencies are compatible
- Try cleaning node_modules and rebuilding

---

## 📊 **COMPARISON TABLE**

| Option | Build Time | Reliability | SDK Version | Requires |
|--------|-----------|-------------|-------------|----------|
| EAS Build | 10-15 min | ⭐⭐⭐⭐⭐ | SDK 54 ✅ | Internet, EAS account |
| Local Build SDK 51 | 5-10 min | ⭐⭐⭐⭐ | SDK 51 | Android SDK, Downgrade |
| Expo Go | Instant | ⭐⭐⭐ | SDK 54 ✅ | Expo Go app |

---

## 🚀 **NEXT STEPS**

Choose your preferred option and let me know! I can help you with:
- Running EAS build command
- Downgrading to SDK 51
- Troubleshooting Expo Go connection
- Installing the APK on your device

