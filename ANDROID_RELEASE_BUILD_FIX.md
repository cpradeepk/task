# Android Release Build Fix

## Problem
Release builds were failing with missing drawable resources:
- `splashscreen_logo` not found
- `notification_icon` not found

## Root Cause
The Expo asset bundling process doesn't automatically copy all required assets to the Android drawable folders for release builds.

## Permanent Fix for Release Builds

### Step 1: Copy Required Assets
Before building, ensure these assets are in the correct location:

```bash
# From apps/mobile directory
mkdir -p android/app/src/main/res/drawable

# Copy splash screen logo
cp assets/splash.png android/app/src/main/res/drawable/splashscreen_logo.png
```

### Step 2: Handle Notification Icon (Optional)
The notification icon reference has been commented out in `AndroidManifest.xml`. If you need it:

1. Create a proper notification icon (white icon on transparent background, 24x24dp)
2. Copy to drawable folder:
   ```bash
   cp assets/notification-icon.png android/app/src/main/res/drawable/notification_icon.png
   ```
3. Uncomment lines in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/notification_icon"/>
   <meta-data android:name="expo.modules.notifications.default_notification_icon" android:resource="@drawable/notification_icon"/>
   ```

### Step 3: Build Release APK

**Option A: Using Expo (Recommended)**
```bash
cd apps/mobile
npx expo run:android --variant release
```

**Option B: Using Gradle Directly**
```bash
cd apps/mobile

# Generate bundle
npx expo export:embed --entry-file index.js --platform android --dev false --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Build APK
cd android
./gradlew assembleRelease --no-build-cache

# Install
cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Quick Build Script
Create `scripts/build-android-release.sh`:

```bash
#!/bin/bash
set -e

echo "📱 Building Android Release APK..."

cd "$(dirname "$0")/../apps/mobile"

# Copy required assets
echo "📋 Copying required assets..."
mkdir -p android/app/src/main/res/drawable
cp assets/splash.png android/app/src/main/res/drawable/splashscreen_logo.png

# Build using Expo
echo "🔨 Building APK..."
npx expo run:android --variant release

echo "✅ Build complete!"
echo "📦 APK location: android/app/build/outputs/apk/release/app-release.apk"
```

Make it executable:
```bash
chmod +x scripts/build-android-release.sh
```

## Notes
- Debug builds work without these manual steps
- The `--no-build-cache` flag helps avoid Gradle cache issues
- Always ensure production API URL is set in `src/config/apollo.ts`
