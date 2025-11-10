# Local Android Build Guide for JSR Mobile App

## ✅ Successfully Configured!

This guide documents the **working local build setup** for the JSR Task Management mobile app. Local builds are **5-10x faster** than EAS cloud builds (4-5 minutes vs 10-20 minutes).

---

## 📋 Prerequisites

### Required Software
- ✅ **Java 17 (LTS)** - Installed at: `openjdk version "17.0.17-ea"`
- ✅ **Android SDK** - Installed at: `/home/pradeep/Android/Sdk`
- ✅ **Gradle 8.6** - Included in project (`apps/mobile/android/gradlew`)
- ✅ **ADB (Android Debug Bridge)** - Installed at: `/usr/bin/adb`

### Environment Variables
Add to `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Apply changes:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

---

## 🚀 Quick Start - Build & Install

### Option 1: Using NPM Scripts (Recommended)
```bash
cd apps/mobile

# Build debug APK locally (4-5 minutes)
npm run build:local

# Install on connected device
npm run install:local

# Or uninstall old version and install new one
npm run reinstall:local
```

### Option 2: Using Gradle Directly
```bash
cd apps/mobile/android

# Clean previous builds
./gradlew clean

# Build debug APK
./gradlew assembleDebug --no-daemon

# Build release APK (production-ready, optimized)
./gradlew assembleRelease --no-daemon
```

### Option 3: Install APK Manually
```bash
# Uninstall old version (if signature mismatch)
adb uninstall com.jsr.taskmanagement

# Install debug APK
adb install apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Or install with -r flag to replace existing
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📦 Build Outputs

### Debug Build
- **Location**: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- **Size**: ~188 MB
- **Use Case**: Development and testing
- **Signing**: Debug keystore (auto-generated)
- **Build Time**: 4-5 minutes

### Release Build
- **Location**: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- **Size**: ~50-80 MB (optimized)
- **Use Case**: Production deployment
- **Signing**: Requires release keystore configuration
- **Build Time**: 5-7 minutes

---

## 🔧 Available NPM Scripts

```bash
# Local builds (fast, 4-5 minutes)
npm run build:local              # Build debug APK
npm run build:local:release      # Build release APK

# Cloud builds (slow, 10-20 minutes)
npm run build:cloud              # EAS production build
npm run build:cloud:preview      # EAS preview build

# Installation
npm run install:local            # Install debug APK
npm run install:local:release    # Install release APK
npm run uninstall                # Uninstall app from device
npm run reinstall:local          # Uninstall + install debug APK
```

---

## 🐛 Troubleshooting

### Issue: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
**Cause**: APK signature mismatch (local build vs EAS cloud build)

**Solution**:
```bash
npm run uninstall
npm run install:local
```

### Issue: "ANDROID_HOME not set"
**Solution**:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Issue: "Gradle build fails"
**Solution**:
```bash
cd apps/mobile/android
./gradlew clean
./gradlew assembleDebug --no-daemon --stacktrace
```

### Issue: "No devices found"
**Solution**:
```bash
# Check connected devices
adb devices

# If device not listed, enable USB debugging on Android device
# Settings > Developer Options > USB Debugging
```

---

## ⚡ Performance Comparison

| Build Method | Time | Use Case |
|--------------|------|----------|
| **Local Debug Build** | 4-5 min | Development, fast iteration |
| **Local Release Build** | 5-7 min | Production testing |
| **EAS Cloud Build** | 10-20 min | CI/CD, team collaboration |

**Recommendation**: Use local builds for development and debugging. Use EAS cloud builds for production releases and team distribution.

---

## 📝 Build Configuration

### Expo SDK Version
- **Expo**: ~54.0.23
- **React Native**: 0.81.5
- **React**: 19.1.0

### Gradle Configuration
- **Gradle Version**: 8.6
- **Build Tools**: 36.0.0
- **Compile SDK**: 36
- **Target SDK**: 36
- **Min SDK**: 24
- **Kotlin**: 2.1.20

### API Endpoints
- **Development**: `http://192.168.0.13:3000/api/graphql` (local IP for physical devices)
- **Production**: `https://task.amtariksha.com/api/graphql`

---

## ✅ Verified Working Setup

**Last Successful Build**: November 10, 2025
- ✅ Java 17 installed
- ✅ Android SDK configured
- ✅ Gradle 8.6 working
- ✅ Debug APK built successfully (188 MB)
- ✅ APK installed on physical device
- ✅ All Expo modules detected and configured
- ✅ Build time: 4 minutes 7 seconds

**Build Output**: `BUILD SUCCESSFUL in 4m 7s` (544 actionable tasks: 520 executed, 24 up-to-date)

