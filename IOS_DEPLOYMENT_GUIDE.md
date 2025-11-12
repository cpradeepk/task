# iOS Deployment Guide for JSR Task Management Mobile App

**Last Updated:** 2025-11-12  
**Platform:** iOS (iPhone, iPad)  
**Framework:** React Native + Expo  
**Target:** macOS development environment

---

## Table of Contents

1. [Prerequisites and Installation](#1-prerequisites-and-installation)
2. [Project Configuration for iOS](#2-project-configuration-for-ios)
3. [Code Signing and Certificates](#3-code-signing-and-certificates)
4. [Building and Testing](#4-building-and-testing)
5. [App Store Deployment](#5-app-store-deployment)
6. [Platform-Specific Considerations](#6-platform-specific-considerations)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites and Installation

### 1.1 Hardware Requirements

**Minimum:**
- MacBook (Intel or Apple Silicon)
- macOS 12.0 (Monterey) or later
- 8GB RAM (16GB recommended)
- 50GB free disk space

**Recommended:**
- MacBook Pro with Apple Silicon (M1/M2/M3)
- macOS 14.0 (Sonoma) or later
- 16GB+ RAM
- 100GB+ free disk space

### 1.2 Software Requirements

#### Install Xcode

1. **Download Xcode from App Store:**
   ```bash
   # Open App Store and search for "Xcode"
   # Or use command line:
   open "macappstore://apps.apple.com/app/xcode/id497799835"
   ```

2. **Install Xcode Command Line Tools:**
   ```bash
   xcode-select --install
   ```

3. **Accept Xcode License:**
   ```bash
   sudo xcodebuild -license accept
   ```

4. **Verify Installation:**
   ```bash
   xcode-select -p
   # Should output: /Applications/Xcode.app/Contents/Developer
   
   xcodebuild -version
   # Should output: Xcode 15.x
   ```

#### Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Install Node.js and npm

```bash
# Using Homebrew
brew install node

# Verify installation
node --version  # Should be 18.x or later
npm --version   # Should be 9.x or later
```

#### Install Watchman (for React Native)

```bash
brew install watchman
```

#### Install CocoaPods (iOS dependency manager)

```bash
sudo gem install cocoapods

# Verify installation
pod --version  # Should be 1.12.x or later
```

#### Install Expo CLI

```bash
npm install -g expo-cli eas-cli

# Verify installation
expo --version
eas --version
```

---

## 2. Project Configuration for iOS

### 2.1 Navigate to Mobile App Directory

```bash
cd /path/to/jsr_web_app-jsr_tool/apps/mobile
```

### 2.2 Install Dependencies

```bash
# Install npm packages
npm install

# Install iOS pods
cd ios
pod install
cd ..
```

### 2.3 Configure app.json for iOS

**File:** `apps/mobile/app.json`

```json
{
  "expo": {
    "name": "JSR Task Management",
    "slug": "jsr-task-management",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.amtariksha.jsrtaskmanagement",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to capture bug attachments.",
        "NSPhotoLibraryUsageDescription": "This app accesses your photo library to attach images to bugs.",
        "NSMicrophoneUsageDescription": "This app uses the microphone for voice notes."
      },
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "plugins": [
      "expo-secure-store",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "13.0"
          }
        }
      ]
    ]
  }
}
```

### 2.4 Create iOS-Specific Assets

#### App Icon

**Requirements:**
- 1024x1024px PNG (no transparency)
- Place in `apps/mobile/assets/icon.png`

**Generate all sizes:**
```bash
# Use online tool or Expo's asset generation
npx expo prebuild --platform ios
```

#### Splash Screen

**Requirements:**
- 2048x2048px PNG (centered logo)
- Place in `apps/mobile/assets/splash.png`

---

## 3. Code Signing and Certificates

### 3.1 Apple Developer Account

1. **Enroll in Apple Developer Program:**
   - Visit: https://developer.apple.com/programs/
   - Cost: $99/year (USD)
   - Enrollment takes 24-48 hours

2. **Create App ID:**
   - Go to: https://developer.apple.com/account/resources/identifiers/list
   - Click "+" to create new identifier
   - Select "App IDs" → "App"
   - Description: "JSR Task Management"
   - Bundle ID: `com.amtariksha.jsrtaskmanagement` (Explicit)
   - Capabilities: Enable required capabilities (Push Notifications, etc.)

### 3.2 Certificates and Provisioning Profiles

#### Option A: Automatic Signing (Recommended for Beginners)

1. **Open Xcode:**
   ```bash
   cd apps/mobile/ios
   open JSRTaskManagement.xcworkspace
   ```

2. **Configure Signing:**
   - Select project in navigator
   - Select target "JSRTaskManagement"
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Team (Apple Developer account)
   - Xcode will automatically create certificates and profiles

#### Option B: Manual Signing (Advanced)

1. **Create Certificates:**
   ```bash
   # Development Certificate
   # Go to: https://developer.apple.com/account/resources/certificates/list
   # Click "+" → "iOS App Development" → Continue
   # Upload Certificate Signing Request (CSR)
   
   # Distribution Certificate
   # Click "+" → "iOS Distribution" → Continue
   # Upload CSR
   ```

2. **Create Provisioning Profiles:**
   ```bash
   # Development Profile
   # Go to: https://developer.apple.com/account/resources/profiles/list
   # Click "+" → "iOS App Development" → Continue
   # Select App ID → Select Certificates → Select Devices → Generate
   
   # Distribution Profile (App Store)
   # Click "+" → "App Store" → Continue
   # Select App ID → Select Distribution Certificate → Generate
   ```

3. **Download and Install:**
   ```bash
   # Double-click downloaded .cer files to install in Keychain
   # Double-click downloaded .mobileprovision files to install in Xcode
   ```

### 3.3 Register Test Devices (for Development)

1. **Get Device UDID:**
   - Connect iPhone to Mac
   - Open Finder → Select iPhone
   - Click on device info to reveal UDID
   - Copy UDID

2. **Register Device:**
   - Go to: https://developer.apple.com/account/resources/devices/list
   - Click "+" → Enter Name and UDID → Continue

---

## 4. Building and Testing

### 4.1 Development Build (Local Testing)

#### Using Expo Development Client

```bash
# Navigate to mobile app directory
cd apps/mobile

# Start Expo development server
npx expo start --ios

# This will:
# 1. Start Metro bundler
# 2. Open iOS Simulator
# 3. Install Expo Go or development build
# 4. Load your app
```

#### Using Xcode (Native Build)

```bash
# Prebuild iOS project
npx expo prebuild --platform ios

# Open in Xcode
cd ios
open JSRTaskManagement.xcworkspace

# In Xcode:
# 1. Select target device (Simulator or connected iPhone)
# 2. Click "Run" button (⌘R)
# 3. App will build and launch
```

### 4.2 Production Build (TestFlight/App Store)

#### Using EAS Build (Recommended)

```bash
# Install EAS CLI (if not already installed)
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS Build
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# This will:
# 1. Upload code to Expo servers
# 2. Build .ipa file in the cloud
# 3. Provide download link when complete
```

**eas.json Configuration:**
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

#### Using Xcode Archive (Manual)

```bash
# Open project in Xcode
cd apps/mobile/ios
open JSRTaskManagement.xcworkspace

# In Xcode:
# 1. Select "Any iOS Device (arm64)" as target
# 2. Product → Archive
# 3. Wait for archive to complete
# 4. Organizer window will open
# 5. Select archive → "Distribute App"
# 6. Choose distribution method (App Store Connect, Ad Hoc, Enterprise)
# 7. Follow wizard to upload
```

### 4.3 Testing on Physical Device

#### Via Xcode

```bash
# 1. Connect iPhone to Mac via USB
# 2. Trust computer on iPhone
# 3. Open project in Xcode
# 4. Select your iPhone as target device
# 5. Click "Run" (⌘R)
# 6. App will install and launch on device
```

#### Via TestFlight (Beta Testing)

```bash
# After uploading build to App Store Connect:
# 1. Go to: https://appstoreconnect.apple.com
# 2. Select your app
# 3. Go to "TestFlight" tab
# 4. Add internal/external testers
# 5. Testers receive email invitation
# 6. Install TestFlight app on iPhone
# 7. Accept invitation and install app
```

---

## 5. App Store Deployment

### 5.1 Prepare App Store Connect

#### Create App Record

1. **Go to App Store Connect:**
   - Visit: https://appstoreconnect.apple.com
   - Sign in with Apple Developer account

2. **Create New App:**
   - Click "My Apps" → "+" → "New App"
   - Platform: iOS
   - Name: "JSR Task Management"
   - Primary Language: English
   - Bundle ID: Select `com.amtariksha.jsrtaskmanagement`
   - SKU: `jsr-task-management-001` (unique identifier)
   - User Access: Full Access

3. **Fill App Information:**
   - **Category:** Productivity
   - **Subcategory:** Business
   - **Content Rights:** Check if you own rights
   - **Age Rating:** Complete questionnaire (likely 4+)

#### Prepare App Metadata

1. **App Information:**
   - **Name:** JSR Task Management (max 30 characters)
   - **Subtitle:** Manage tasks, bugs, and team collaboration (max 30 characters)
   - **Privacy Policy URL:** https://task.amtariksha.com/privacy
   - **Support URL:** https://task.amtariksha.com/support
   - **Marketing URL:** https://task.amtariksha.com (optional)

2. **Description:**
   ```
   JSR Task Management is a comprehensive project management solution designed for teams to efficiently manage tasks, track bugs, and collaborate seamlessly.

   KEY FEATURES:
   • Task Management: Create, assign, and track tasks with priorities and deadlines
   • Bug Tracking: Report and monitor bugs with attachments and status updates
   • Social Feed: Stay connected with team updates and announcements
   • Leave & WFH Management: Apply for and approve leave/work-from-home requests
   • Real-time Notifications: Get instant updates on task assignments and changes
   • Offline Support: View cached data when offline
   • Dark Mode: Comfortable viewing in any lighting condition

   PERFECT FOR:
   • Development teams
   • Project managers
   • QA testers
   • Remote teams

   Download now and streamline your team's workflow!
   ```

3. **Keywords:**
   ```
   task management, project management, bug tracking, team collaboration, productivity, agile, scrum, kanban, workflow, remote work
   ```
   (Max 100 characters, comma-separated)

4. **Screenshots:**
   **Requirements:**
   - 6.7" Display (iPhone 15 Pro Max): 1290 x 2796 pixels
   - 6.5" Display (iPhone 11 Pro Max): 1242 x 2688 pixels
   - 5.5" Display (iPhone 8 Plus): 1242 x 2208 pixels
   - iPad Pro (12.9"): 2048 x 2732 pixels (if supporting iPad)

   **Recommended Screenshots:**
   1. Login screen
   2. Dashboard with statistics
   3. Task list
   4. Task details
   5. Bug tracking
   6. Social feed
   7. Leave management
   8. Dark mode example

   **Tools to Generate Screenshots:**
   ```bash
   # Using iOS Simulator
   # 1. Run app in simulator
   # 2. Navigate to screen
   # 3. Press ⌘S to save screenshot
   # 4. Screenshots saved to Desktop

   # Or use Xcode's screenshot tool
   # Window → Devices and Simulators → Select device → Take Screenshot
   ```

5. **App Preview Video (Optional):**
   - Max 30 seconds
   - Show key features
   - No audio required
   - Same dimensions as screenshots

### 5.2 Upload Build to App Store Connect

#### Using EAS Submit

```bash
# After building with EAS
eas submit --platform ios --latest

# Or specify build ID
eas submit --platform ios --id <build-id>

# Follow prompts:
# - Apple ID
# - App-specific password
# - App Store Connect API key (recommended)
```

#### Using Xcode Organizer

```bash
# After archiving in Xcode:
# 1. Window → Organizer
# 2. Select archive
# 3. Click "Distribute App"
# 4. Select "App Store Connect"
# 5. Click "Upload"
# 6. Select signing options
# 7. Review and upload
# 8. Wait for processing (10-30 minutes)
```

### 5.3 Submit for Review

1. **Select Build:**
   - Go to App Store Connect → Your App → "App Store" tab
   - Click "+" next to "Build"
   - Select uploaded build
   - Wait for processing to complete

2. **Complete Version Information:**
   - **What's New in This Version:**
     ```
     Initial release of JSR Task Management!

     • Comprehensive task management
     • Bug tracking with attachments
     • Team collaboration features
     • Leave and WFH management
     • Real-time notifications
     • Offline support
     • Dark mode
     ```

3. **App Review Information:**
   - **Contact Information:**
     - First Name: [Your Name]
     - Last Name: [Your Last Name]
     - Phone: [Your Phone]
     - Email: amtariksha@gmail.com

   - **Demo Account (Required):**
     - Username: demo@amtariksha.com
     - Password: [Create demo account password]
     - Notes: "Demo account with sample data for testing"

4. **Version Release:**
   - **Automatic:** Release immediately after approval
   - **Manual:** Release manually after approval
   - **Scheduled:** Release on specific date

5. **Submit for Review:**
   - Review all information
   - Click "Submit for Review"
   - Wait for Apple's review (typically 24-48 hours)

---

## 6. Platform-Specific Considerations

### 6.1 iOS vs Android Differences

#### UI/UX Differences

| Feature | iOS | Android |
|---------|-----|---------|
| **Navigation** | Bottom tab bar, modal sheets | Bottom navigation, drawer |
| **Back Button** | Swipe from left edge | Hardware/software back button |
| **Status Bar** | Integrated, notch support | Separate, various heights |
| **Haptic Feedback** | Taptic Engine (precise) | Vibration motor (varies) |
| **Typography** | San Francisco font | Roboto font |
| **Icons** | SF Symbols | Material Icons |
| **Gestures** | Swipe gestures common | Tap-focused |

#### Code Differences

**Platform-Specific Code:**
```typescript
import { Platform } from 'react-native'

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
})
```

**Safe Area Handling (iOS Notch):**
```typescript
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Screen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Content */}
    </SafeAreaView>
  )
}
```

---

## 7. Troubleshooting

### 7.1 Common Build Errors

#### Error: "No provisioning profile found"

**Solution:**
```bash
# 1. Open Xcode
cd apps/mobile/ios
open JSRTaskManagement.xcworkspace

# 2. Select project → Target → Signing & Capabilities
# 3. Enable "Automatically manage signing"
# 4. Select your Team
# 5. Clean build folder: Product → Clean Build Folder (⇧⌘K)
# 6. Rebuild
```

#### Error: "Pod install failed"

**Solution:**
```bash
# 1. Clean CocoaPods cache
cd apps/mobile/ios
rm -rf Pods Podfile.lock
pod cache clean --all

# 2. Reinstall pods
pod install --repo-update

# 3. If still fails, update CocoaPods
sudo gem install cocoapods
pod install
```

#### Error: "Command PhaseScriptExecution failed"

**Solution:**
```bash
# 1. Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# 2. Clean build folder in Xcode
# Product → Clean Build Folder (⇧⌘K)

# 3. Rebuild
```

---

## 8. Resources

### Official Documentation
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Expo iOS Documentation](https://docs.expo.dev/workflow/ios-simulator/)
- [React Native iOS Guide](https://reactnative.dev/docs/running-on-device)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

### Tools
- [Xcode](https://developer.apple.com/xcode/)
- [TestFlight](https://developer.apple.com/testflight/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

## 9. Checklist

### Pre-Deployment Checklist

- [ ] Xcode installed and configured
- [ ] Apple Developer account enrolled ($99/year)
- [ ] App ID created in Developer Portal
- [ ] Certificates and provisioning profiles configured
- [ ] App icon and splash screen created (all sizes)
- [ ] App tested on physical iOS device
- [ ] All features working correctly
- [ ] No crashes or critical bugs
- [ ] Privacy policy and support URLs ready
- [ ] Screenshots and app preview prepared
- [ ] App metadata written (description, keywords)
- [ ] Demo account created for App Review
- [ ] Build uploaded to App Store Connect
- [ ] Version information completed
- [ ] Submitted for review

### Post-Deployment Checklist

- [ ] Monitor App Store Connect for review status
- [ ] Respond to any rejection messages promptly
- [ ] Test app after approval (download from App Store)
- [ ] Monitor crash reports and user feedback
- [ ] Plan for updates and bug fixes
- [ ] Set up analytics and monitoring
- [ ] Prepare marketing materials
- [ ] Announce launch to users

---

**End of iOS Deployment Guide**

For Android deployment, refer to `DEPLOYMENT_GUIDE.md` in the repository root.

For questions or issues, contact: amtariksha@gmail.com


