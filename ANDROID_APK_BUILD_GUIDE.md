# Android APK Build Guide

## Overview
This guide provides step-by-step instructions for building the Android APK from the React Native mobile app.

---

## 📋 Prerequisites

### 1. System Requirements
- **Operating System**: macOS, Linux, or Windows
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: Minimum 20GB free space
- **Internet Connection**: Required for downloading dependencies

### 2. Required Software

#### Node.js and npm
```bash
# Check if installed
node --version  # Should be v18.x or higher
npm --version   # Should be v9.x or higher

# Install if not present (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Java Development Kit (JDK)
```bash
# Check if installed
java -version  # Should be JDK 17 or higher

# Install JDK 17 (Ubuntu/Debian)
sudo apt update
sudo apt install openjdk-17-jdk

# Install JDK 17 (macOS with Homebrew)
brew install openjdk@17

# Set JAVA_HOME environment variable
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # Linux
export JAVA_HOME=/opt/homebrew/opt/openjdk@17        # macOS
```

#### Android Studio and Android SDK
1. Download Android Studio from https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio → SDK Manager
4. Install the following:
   - Android SDK Platform 33 (Android 13)
   - Android SDK Build-Tools 33.0.0
   - Android SDK Command-line Tools
   - Android SDK Platform-Tools
   - Android Emulator (optional, for testing)

#### Set Android Environment Variables
```bash
# Add to ~/.bashrc or ~/.zshrc

# Android SDK path (adjust based on your installation)
export ANDROID_HOME=$HOME/Android/Sdk  # Linux
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc
```

#### Verify Android Setup
```bash
# Check Android SDK
adb --version

# Check Android build tools
sdkmanager --list | grep "build-tools"
```

---

## 🔧 Project Setup

### 1. Navigate to Mobile App Directory
```bash
cd /media/pradeep/Work/projects/jsr_web_app-jsr_tool/apps/mobile
```

### 2. Install Dependencies
```bash
# Install npm dependencies
npm install --legacy-peer-deps

# Or if using yarn
yarn install
```

### 3. Verify React Native Setup
```bash
# Check React Native environment
npx react-native doctor

# This will check:
# - Node.js
# - JDK
# - Android SDK
# - Android Studio
```

---

## 🏗️ Building the APK

### Method 1: Debug APK (For Testing)

#### Step 1: Clean Previous Builds
```bash
cd android
./gradlew clean
cd ..
```

#### Step 2: Build Debug APK
```bash
# Build debug APK
cd android
./gradlew assembleDebug
cd ..
```

#### Step 3: Locate Debug APK
```bash
# APK location
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Method 2: Release APK (For Production)

#### Step 1: Generate Signing Key
```bash
# Navigate to android/app directory
cd android/app

# Generate keystore (only needed once)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore my-release-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You will be prompted for:
# - Keystore password (remember this!)
# - Key password (remember this!)
# - Your name, organization, etc.

cd ../..
```

#### Step 2: Configure Gradle for Signing
Create or edit `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

**⚠️ IMPORTANT**: Add `gradle.properties` to `.gitignore` to avoid committing passwords!

#### Step 3: Update android/app/build.gradle
Add signing config (if not already present):
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
        }
    }
}
```

#### Step 4: Build Release APK
```bash
# Clean previous builds
cd android
./gradlew clean

# Build release APK
./gradlew assembleRelease

cd ..
```

#### Step 5: Locate Release APK
```bash
# APK location
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 📦 APK Variants

### Debug APK
- **Purpose**: Testing and development
- **Size**: Larger (includes debug symbols)
- **Performance**: Slower
- **Security**: Not signed for production
- **Location**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK
- **Purpose**: Production deployment
- **Size**: Smaller (optimized and minified)
- **Performance**: Faster
- **Security**: Signed with release key
- **Location**: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🧪 Testing the APK

### Install on Physical Device
```bash
# Enable USB debugging on your Android device
# Connect device via USB

# Install debug APK
adb install apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Install release APK
adb install apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

### Install on Emulator
```bash
# Start emulator
emulator -avd Pixel_5_API_33

# Install APK
adb install apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "ANDROID_HOME is not set"
```bash
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### 2. "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=/home/username/Android/Sdk
```

#### 3. "Gradle build failed"
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

#### 4. "Out of memory" during build
Edit `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

#### 5. "Unable to find bundled Java version"
```bash
# Install JDK 17
sudo apt install openjdk-17-jdk

# Set JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

---

## 📊 Build Optimization

### Reduce APK Size
Edit `android/app/build.gradle`:
```gradle
android {
    ...
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Enable Hermes (JavaScript Engine)
Edit `android/app/build.gradle`:
```gradle
project.ext.react = [
    enableHermes: true
]
```

---

## 🚀 Distribution

### Google Play Store
1. Build release APK (signed)
2. Create Google Play Developer account
3. Upload APK to Google Play Console
4. Fill in app details and screenshots
5. Submit for review

### Direct Distribution
1. Build release APK
2. Upload to your server or file hosting
3. Share download link with users
4. Users must enable "Install from Unknown Sources"

---

## 📝 Quick Reference

```bash
# Complete build process (Debug)
cd apps/mobile
npm install --legacy-peer-deps
cd android && ./gradlew clean && ./gradlew assembleDebug && cd ..

# Complete build process (Release)
cd apps/mobile
npm install --legacy-peer-deps
cd android && ./gradlew clean && ./gradlew assembleRelease && cd ..

# Install on device
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📞 Support

For build issues, check:
- React Native documentation: https://reactnative.dev/docs/signed-apk-android
- Android developer guide: https://developer.android.com/studio/build
- Project README: `/apps/mobile/README.md`


