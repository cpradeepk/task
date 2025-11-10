# Android Local Build Setup Guide

Complete guide for building and testing the JSR Task Management React Native mobile app locally on Android.

---

## Prerequisites

### 1. Install Java Development Kit (JDK)

**Required Version:** JDK 17 (LTS)

```bash
# Check if Java is installed
java -version

# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-17-jdk

# macOS (using Homebrew)
brew install openjdk@17

# Verify installation
java -version
# Should show: openjdk version "17.x.x"
```

### 2. Install Android Studio

1. Download Android Studio from: https://developer.android.com/studio
2. Install Android Studio with default settings
3. During first launch, install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

### 3. Configure Android SDK

**Required SDK Components:**
- Android SDK Platform 34 (Android 14)
- Android SDK Build-Tools 34.0.0
- Android SDK Command-line Tools
- Android Emulator
- Android SDK Platform-Tools

**Installation via Android Studio:**
1. Open Android Studio
2. Go to: `Settings` → `Appearance & Behavior` → `System Settings` → `Android SDK`
3. Select `SDK Platforms` tab → Check `Android 14.0 (API 34)`
4. Select `SDK Tools` tab → Check:
   - Android SDK Build-Tools 34
   - Android SDK Command-line Tools
   - Android Emulator
   - Android SDK Platform-Tools
5. Click `Apply` → `OK`

### 4. Set Environment Variables

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Java (if needed)
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Ubuntu
# export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home  # macOS
```

**Apply changes:**
```bash
source ~/.bashrc  # or source ~/.zshrc
```

**Verify:**
```bash
echo $ANDROID_HOME
# Should show: /home/your-username/Android/Sdk

adb version
# Should show: Android Debug Bridge version x.x.x
```

---

## Project Setup

### 1. Navigate to Mobile App Directory

```bash
cd /media/pradeep/Work/projects/jsr_web_app-jsr_tool/apps/mobile
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Verify Gradle Configuration

The project uses Gradle 8.8. Check `android/gradle/wrapper/gradle-wrapper.properties`:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.8-all.zip
```

---

## Building the APK

### Option 1: Debug APK (Fastest - for testing)

```bash
cd android
./gradlew assembleDebug
```

**Output Location:**
```
c
```

### Option 2: Release APK (Optimized - for distribution)

```bash
cd android
./gradlew assembleRelease
```

**Output Location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

**Note:** Release builds require signing configuration. For testing, use debug builds.

---

## Running on Physical Device

### 1. Enable Developer Options on Android Device

1. Go to `Settings` → `About Phone`
2. Tap `Build Number` 7 times
3. Go back to `Settings` → `Developer Options`
4. Enable `USB Debugging`

### 2. Connect Device via USB

```bash
# Check if device is connected
adb devices

# Should show:
# List of devices attached
# ABC123XYZ    device
```

**Troubleshooting:**
- If device shows as `unauthorized`, check phone for USB debugging prompt
- If no devices shown, try different USB cable or port
- On Linux, you may need udev rules (see below)

### 3. Run App on Device

**Method 1: Using Expo (Recommended)**
```bash
cd /media/pradeep/Work/projects/jsr_web_app-jsr_tool/apps/mobile
npm run android
```

**Method 2: Install APK Manually**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Running on Android Emulator

### 1. Create Virtual Device (AVD)

1. Open Android Studio
2. Go to: `Tools` → `Device Manager`
3. Click `Create Device`
4. Select: `Phone` → `Pixel 6` → `Next`
5. Select System Image: `API 34 (Android 14)` → `Next`
6. Name: `Pixel_6_API_34` → `Finish`

### 2. Start Emulator

**Via Android Studio:**
- Device Manager → Click ▶️ next to your AVD

**Via Command Line:**
```bash
emulator -avd Pixel_6_API_34
```

### 3. Run App on Emulator

```bash
cd /media/pradeep/Work/projects/jsr_web_app-jsr_tool/apps/mobile
npm run android
```

---

## Development Workflow

### 1. Start Metro Bundler

```bash
cd /media/pradeep/Work/projects/jsr_web_app-jsr_tool/apps/mobile
npm start
```

### 2. Run on Device/Emulator

In a new terminal:
```bash
npm run android
```

### 3. Live Reload

- **Fast Refresh:** Enabled by default - changes appear instantly
- **Manual Reload:** Shake device or press `R` twice in terminal

### 4. View Logs

```bash
# View all logs
adb logcat

# Filter for React Native logs
adb logcat | grep ReactNativeJS

# Clear logs
adb logcat -c
```

---

## Troubleshooting

### Issue: "SDK location not found"

**Solution:**
Create `android/local.properties`:
```properties
sdk.dir=/home/your-username/Android/Sdk
```

### Issue: "Gradle build failed"

**Solutions:**
```bash
# Clean Gradle cache
cd android
./gradlew clean

# Clear Gradle cache globally
rm -rf ~/.gradle/caches/

# Rebuild
./gradlew assembleDebug
```

### Issue: "Device not detected (Linux)"

**Solution:** Add udev rules
```bash
# Create udev rules file
sudo nano /etc/udev/rules.d/51-android.rules

# Add this line (replace XXXX with your device vendor ID from lsusb)
SUBSYSTEM=="usb", ATTR{idVendor}=="XXXX", MODE="0666", GROUP="plugdev"

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Restart adb
adb kill-server
adb start-server
```

### Issue: "Port 8081 already in use"

**Solution:**
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or use different port
npm start -- --port 8082
```

### Issue: "Build failed with unknown error"

**Solutions:**
1. Check Java version: `java -version` (should be 17)
2. Check Gradle version in `android/gradle/wrapper/gradle-wrapper.properties`
3. Clear Metro cache: `npm start -- --reset-cache`
4. Clear node_modules: `rm -rf node_modules && npm install`

---

## Build Variants

### Debug Build
- Faster build time
- Includes debugging symbols
- Larger APK size
- Not optimized

```bash
./gradlew assembleDebug
```

### Release Build
- Slower build time
- Optimized and minified
- Smaller APK size
- Requires signing

```bash
./gradlew assembleRelease
```

---

## Performance Tips

1. **Use Debug Builds for Development:** Much faster than release builds
2. **Enable Gradle Daemon:** Already enabled in project
3. **Increase Gradle Memory:** Edit `android/gradle.properties`:
   ```properties
   org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
   ```
4. **Use Physical Device:** Faster than emulator for testing
5. **Disable Animations:** Developer Options → Window/Transition/Animator scale → Off

---

## Next Steps

After successful local build:
1. Test all features (Login, Dashboard, Bugs, Tasks, Leave, WFH)
2. Test in light/dark mode
3. Test offline mode
4. Test on different screen sizes
5. Fix any issues found
6. Deploy to EAS Build for production APK

---

## Useful Commands

```bash
# List connected devices
adb devices

# Install APK
adb install path/to/app.apk

# Uninstall app
adb uninstall com.jsr.mobile

# View logs
adb logcat

# Take screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Record screen
adb shell screenrecord /sdcard/demo.mp4

# Clear app data
adb shell pm clear com.jsr.mobile

# Check app info
adb shell dumpsys package com.jsr.mobile
```

---

## Resources

- **Android Developer Docs:** https://developer.android.com/docs
- **React Native Docs:** https://reactnative.dev/docs/environment-setup
- **Expo Docs:** https://docs.expo.dev/
- **Gradle Docs:** https://docs.gradle.org/

---

**Last Updated:** 2025-01-09
**Expo SDK:** 51
**React Native:** 0.73
**Gradle:** 8.8
**Target Android API:** 34 (Android 14)

