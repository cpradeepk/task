# React Native Mobile App - Testing & Deployment Guide

## 📱 **Testing on Android (ADB)**

### Prerequisites
1. **Install Android Studio** - Download from https://developer.android.com/studio
2. **Enable USB Debugging** on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

### Setup & Run

```bash
# Navigate to mobile app directory
cd apps/mobile

# Install dependencies (if not already done)
npm install

# Start Metro bundler
npm start

# In a new terminal, run on Android
npm run android

# OR use Expo CLI
npx expo start
# Then press 'a' for Android
```

### ADB Commands

```bash
# Check connected devices
adb devices

# Install APK manually
adb install path/to/app.apk

# View live logs
adb logcat

# Filter logs for React Native
adb logcat *:S ReactNative:V ReactNativeJS:V

# Clear app data
adb shell pm clear com.yourapp.package

# Uninstall app
adb uninstall com.yourapp.package

# Take screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Record screen
adb shell screenrecord /sdcard/demo.mp4
# Stop with Ctrl+C, then pull the file
adb pull /sdcard/demo.mp4
```

### Push APK to Device

```bash
# Build APK for Android
cd apps/mobile
eas build --platform android --profile preview

# OR build locally
cd android
./gradlew assembleRelease

# APK will be at: android/app/build/outputs/apk/release/app-release.apk

# Install on device
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 🍎 **Testing & Deployment for iOS**

### Prerequisites
1. **Mac with Xcode** - Required for iOS development
2. **Apple Developer Account** - $99/year for App Store distribution
3. **Install Xcode** from Mac App Store
4. **Install CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```

### Setup & Run

```bash
# Navigate to mobile app directory
cd apps/mobile

# Install dependencies
npm install

# Install iOS pods
cd ios
pod install
cd ..

# Run on iOS simulator
npm run ios

# OR use Expo
npx expo start
# Then press 'i' for iOS
```

### Build for Physical iPhone

```bash
# Using EAS Build (Recommended)
npm install -g eas-cli
eas login
eas build:configure

# Build for iOS
eas build --platform ios --profile preview

# For App Store submission
eas build --platform ios --profile production
eas submit --platform ios
```

### Manual Xcode Build

1. Open `apps/mobile/ios/YourApp.xcworkspace` in Xcode
2. Select your development team in Signing & Capabilities
3. Connect your iPhone via USB
4. Select your device from the device dropdown
5. Click the Play button to build and run

### TestFlight Distribution

1. Build production version:
   ```bash
   eas build --platform ios --profile production
   ```

2. Submit to TestFlight:
   ```bash
   eas submit --platform ios
   ```

3. In App Store Connect:
   - Go to TestFlight tab
   - Add internal/external testers
   - Testers receive email with TestFlight link

---

## 📊 **Live Logs & Debugging**

### React Native Debugger

```bash
# Install React Native Debugger
brew install --cask react-native-debugger

# OR download from: https://github.com/jhen0409/react-native-debugger/releases

# Start debugger
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

### Metro Bundler Logs

```bash
# Start with verbose logging
npx expo start --verbose

# Clear cache and restart
npx expo start --clear
```

### Android Logs (Like Flutter)

```bash
# Real-time logs with filtering
adb logcat | grep -i "ReactNativeJS"

# Save logs to file
adb logcat > app-logs.txt

# Filter by tag
adb logcat -s ReactNative:V ReactNativeJS:V

# Clear logs
adb logcat -c
```

### iOS Logs

```bash
# Using Xcode
# Window → Devices and Simulators → Select device → View Device Logs

# Using terminal
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "YourApp"'

# OR use Console.app
# Open Console.app → Select your device → Filter by process name
```

### Flipper (Advanced Debugging)

```bash
# Install Flipper
brew install --cask flipper

# Flipper provides:
# - Network inspector
# - Layout inspector
# - Database viewer
# - Crash reporter
# - Performance monitor
```

### Remote Debugging

1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Debug" from menu
3. Opens Chrome DevTools at http://localhost:8081/debugger-ui
4. Use Console, Network, Sources tabs

---

## 🔧 **Environment Configuration**

### Development vs Production

Create `.env` files:

```bash
# .env.development
API_URL=http://localhost:3000
ENV=development

# .env.production
API_URL=https://your-production-url.vercel.app
ENV=production
```

Install `react-native-dotenv`:

```bash
npm install react-native-dotenv
```

Update `babel.config.js`:

```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
    }]
  ]
}
```

Use in code:

```typescript
import { API_URL } from '@env'
```

---

## 📦 **Build Profiles (EAS)**

Create `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      }
    }
  }
}
```

---

## 🚀 **Quick Commands Reference**

```bash
# Development
npm start                    # Start Metro bundler
npm run android             # Run on Android
npm run ios                 # Run on iOS
npx expo start              # Start Expo dev server

# Building
eas build -p android        # Build Android APK/AAB
eas build -p ios            # Build iOS IPA
eas build --profile preview # Build preview version

# Deployment
eas submit -p android       # Submit to Google Play
eas submit -p ios           # Submit to App Store

# Debugging
adb logcat                  # Android logs
npx react-native log-android # RN Android logs
npx react-native log-ios    # RN iOS logs

# Utilities
adb devices                 # List Android devices
xcrun simctl list          # List iOS simulators
adb shell input text "Hello" # Type text on Android
```

---

## 🐛 **Common Issues & Solutions**

### Metro Bundler Issues
```bash
# Clear cache
npx expo start --clear
rm -rf node_modules
npm install
```

### Android Build Fails
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### iOS Build Fails
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Port Already in Use
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
```

---

## 📱 **App Distribution**

### Android (Google Play)
1. Create app bundle: `eas build -p android --profile production`
2. Go to Google Play Console
3. Create new app
4. Upload AAB file
5. Fill in store listing
6. Submit for review

### iOS (App Store)
1. Create IPA: `eas build -p ios --profile production`
2. Submit: `eas submit -p ios`
3. Go to App Store Connect
4. Fill in app information
5. Submit for review

### Internal Testing (Faster)
- **Android**: Use Firebase App Distribution or Google Play Internal Testing
- **iOS**: Use TestFlight (up to 10,000 testers)

---

**Next Steps**: See `.dev-logs/037_2025-01-08_mobile-phases-5-6-implementation-status.md` for remaining implementation tasks.

