# APK Build Guide for JSR Task Management Mobile App

## ⚠️ Current Status

**Local compilation is currently blocked** due to Gradle/Kotlin compatibility issues between:
- Expo SDK 54 modules
- React Native 0.74.5
- Gradle 8.x

The Expo autolinking plugin has unresolved references that prevent successful compilation.

---

## 🎯 Recommended Solutions

### **Option 1: EAS Build Cloud (RECOMMENDED)**

This is the official and most reliable way to build Expo apps.

#### Steps:
```bash
# 1. Navigate to mobile app directory
cd apps/mobile

# 2. Login to Expo (if not already logged in)
eas login

# 3. Build APK using EAS cloud service
eas build --platform android --profile preview

# 4. Wait for build to complete (usually 10-20 minutes)
# 5. Download APK from the provided URL
```

**Advantages:**
- ✅ No local Android SDK/Gradle setup required
- ✅ Handles all dependency compatibility automatically
- ✅ Reliable and tested build environment
- ✅ Can build for both Android and iOS
- ✅ Free tier available (limited builds per month)

**Disadvantages:**
- ❌ Requires internet connection
- ❌ Build happens on Expo servers (not local)
- ❌ Takes 10-20 minutes per build

---

### **Option 2: Update Dependencies First**

Update all Expo packages to match SDK 54 requirements, then try local build.

#### Steps:
```bash
# 1. Navigate to mobile app directory
cd apps/mobile

# 2. Update all Expo dependencies
npx expo install --check --fix

# 3. Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# 4. Try prebuild again
npx expo prebuild --platform android --clean

# 5. Build APK
cd android && ./gradlew assembleRelease
```

**Current Dependency Issues:**
- `react`: 18.2.0 → 19.1.0 (major version mismatch)
- `react-native`: 0.74.5 → 0.81.5 (major version mismatch)
- `expo-camera`: 15.0.16 → 17.0.9 (major version mismatch)
- `expo-image-picker`: 15.1.0 → 17.0.8 (major version mismatch)
- And 13 more packages...

**⚠️ Warning:** Updating React Native from 0.74.5 to 0.81.5 is a major upgrade that may break existing code.

---

### **Option 3: Downgrade Expo SDK**

Downgrade to an older, more stable Expo SDK version.

#### Steps:
```bash
# 1. Update package.json to use Expo SDK 51
# Change: "expo": "~54.0.23"
# To: "expo": "~51.0.0"

# 2. Update all Expo packages
npx expo install --fix

# 3. Clean and reinstall
rm -rf node_modules package-lock.json android ios
npm install

# 4. Prebuild
npx expo prebuild --platform android

# 5. Build
cd android && ./gradlew assembleRelease
```

---

## 🚀 Quick Start: EAS Build Cloud (Easiest)

Since you already have EAS CLI installed and configured, here's the fastest way to get an APK:

```bash
cd apps/mobile
eas build --platform android --profile preview
```

This will:
1. Upload your project to EAS servers
2. Build the APK in a clean environment
3. Provide a download link when complete

**Build profiles** (from `eas.json`):
- `development`: Debug build with development client
- `preview`: Release APK for testing (recommended)
- `production`: Production-ready APK

---

## 📱 Testing the APK

Once you have the APK file:

### On Physical Device:
1. Transfer APK to your Android device
2. Enable "Install from Unknown Sources" in Settings
3. Tap the APK file to install
4. Open the app

### On Emulator:
```bash
# Install APK on running emulator
adb install path/to/app-release.apk

# Or drag and drop APK onto emulator window
```

---

## 🔧 Troubleshooting

### If EAS Build fails:
- Check that all environment variables are set in `eas.json`
- Ensure your Expo account has build credits
- Review build logs for specific errors

### If local build fails:
- Ensure Android SDK is installed and `ANDROID_HOME` is set
- Use Java 17 (not Java 8 or 21)
- Clear Gradle cache: `cd android && ./gradlew clean`

---

## 📊 Current Project Configuration

**Expo SDK:** 54.0.23  
**React Native:** 0.74.5  
**React:** 18.2.0  
**Package:** com.jsr.taskmanagement  
**App Name:** JSR Task Management  
**Version:** 1.0.0  

**EAS Project ID:** d5eaa1b3-d1a5-4f59-836b-814831a766dd

---

## ✅ Next Steps

**Recommended approach:**

1. **Use EAS Build Cloud** to create APK immediately:
   ```bash
   cd apps/mobile
   eas build --platform android --profile preview
   ```

2. **Download and test** the APK on your device

3. **Later, if needed**, update dependencies and set up local builds

This approach gets you a working APK fastest while avoiding dependency conflicts.

