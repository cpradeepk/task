#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

# Go to the script's directory (project root)
cd "$(dirname "$0")"

# Auto-configure JAVA_HOME if not already set, using the Homebrew OpenJDK 17 path
if [ -z "$JAVA_HOME" ]; then
  BREW_JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  if [ -d "$BREW_JAVA_HOME" ]; then
    export JAVA_HOME="$BREW_JAVA_HOME"
    export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
    echo "☕ Auto-configured JAVA_HOME to Homebrew OpenJDK 17:"
    echo "   $JAVA_HOME"
  fi
fi

# Auto-configure ANDROID_HOME if not already set, using the macOS default path
if [ -z "$ANDROID_HOME" ]; then
  DEFAULT_SDK="$HOME/Library/Android/sdk"
  if [ -d "$DEFAULT_SDK" ]; then
    export ANDROID_HOME="$DEFAULT_SDK"
    export PATH="$ANDROID_HOME/platform-tools:$PATH"
    echo "🤖 Auto-configured ANDROID_HOME to:"
    echo "   $ANDROID_HOME"
  fi
fi

show_help() {
  echo "📦 Karmayog Local Build Tool"
  echo "Usage: ./build_local.sh [command]"
  echo ""
  echo "Commands:"
  echo "  apk         - Build local release Android APK"
  echo "  aab         - Build local release Android App Bundle (AAB)"
  echo "  ios         - Build local release iOS App"
  echo "  run-android - Build and run on a connected physical Android device"
  echo "  run-ios     - Build and run on a connected physical iOS device"
  echo "  clean       - Clean android and ios build caches"
  echo "  help        - Show this help message"
  echo ""
}

# Check argument
COMMAND=${1:-"help"}

case "$COMMAND" in
  apk)
    echo "🤖 Staging and building Android Release APK..."
    pushd apps/mobile > /dev/null
    
    # 1. Run prebuild to sync versions and generate native android directory
    echo "⚙️ Running Expo prebuild..."
    npx expo prebuild --platform android --no-install
    
    # Apply space-in-path patches (required because project path has spaces)
    echo "🔧 Applying Android space-in-path patches..."
    python3 scripts/patch-android-spaces.py
    
    # 2. Regenerate branding assets and patch build.gradle dynamically
    echo "🎨 Regenerating branding assets..."
    python3 "/Users/eassylife/.gemini/antigravity-ide/brain/1e9e45f8-f2b8-41f9-a0ca-db43d5d84536/scratch/update_all_assets.py"
    
    # 3. Build signed APK locally using EAS CLI to automatically pull production credentials
    echo "🔨 Running EAS local build for APK with auto-signing..."
    JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    ANDROID_HOME="/Users/eassylife/Library/Android/sdk" \
    PATH="/opt/homebrew/opt/openjdk@17/bin:/Users/eassylife/Library/Android/sdk/platform-tools:$PATH" \
    npx eas-cli build --platform android --profile preview --local --non-interactive
    
    popd > /dev/null
    
    # 4. Find latest generated APK and copy to root
    LATEST_APK=$(ls -t apps/mobile/build-*.apk 2>/dev/null | head -n 1 || true)
    if [ -n "$LATEST_APK" ]; then
      VERSION=$(python3 -c "import json; print(json.load(open('apps/mobile/app.json'))['expo']['version'])" 2>/dev/null || echo "1.0.0")
      OUTPUT_NAME="Karmayog-$VERSION-release.apk"
      cp "$LATEST_APK" "$OUTPUT_NAME"
      echo "✅ Android Release APK Built & Signed Successfully!"
      echo "📦 Location: $OUTPUT_NAME"
    else
      echo "❌ Error: Could not find built APK file in apps/mobile/"
      exit 1
    fi
    ;;
    
  aab)
    echo "🤖 Staging and building Android Release AAB..."
    pushd apps/mobile > /dev/null
    
    # 1. Run prebuild to sync versions and generate native android directory
    echo "⚙️ Running Expo prebuild..."
    npx expo prebuild --platform android --no-install
    
    # Apply space-in-path patches (required because project path has spaces)
    echo "🔧 Applying Android space-in-path patches..."
    python3 scripts/patch-android-spaces.py
    
    # 2. Regenerate branding assets and patch build.gradle dynamically
    echo "🎨 Regenerating branding assets..."
    python3 "/Users/eassylife/.gemini/antigravity-ide/brain/1e9e45f8-f2b8-41f9-a0ca-db43d5d84536/scratch/update_all_assets.py"
    
    # 3. Build signed AAB locally using EAS CLI to automatically pull production credentials
    echo "🔨 Running EAS local build for AAB with auto-signing..."
    JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    ANDROID_HOME="/Users/eassylife/Library/Android/sdk" \
    PATH="/opt/homebrew/opt/openjdk@17/bin:/Users/eassylife/Library/Android/sdk/platform-tools:$PATH" \
    npx eas-cli build --platform android --profile production --local --non-interactive
    
    popd > /dev/null
    
    # 4. Find latest generated AAB and copy to root
    LATEST_AAB=$(ls -t apps/mobile/build-*.aab 2>/dev/null | head -n 1 || true)
    if [ -n "$LATEST_AAB" ]; then
      VERSION=$(python3 -c "import json; print(json.load(open('apps/mobile/app.json'))['expo']['version'])" 2>/dev/null || echo "1.0.0")
      OUTPUT_NAME="Karmayog-$VERSION-release.aab"
      cp "$LATEST_AAB" "$OUTPUT_NAME"
      echo "✅ Android Release AAB Built & Signed Successfully!"
      echo "📦 Location: $OUTPUT_NAME"
    else
      echo "❌ Error: Could not find built AAB file in apps/mobile/"
      exit 1
    fi
    ;;
    
  ios)
    echo "🍎 Staging and building iOS Release App..."
    
    # 1. Ensure Xcode is available (macOS only)
    if [[ "$OSTYPE" != "darwin"* ]]; then
      echo "❌ Error: iOS builds can only be performed on macOS."
      exit 1
    fi
    
    pushd apps/mobile > /dev/null
    
    # 2. Run prebuild to sync versions and generate native ios directory
    echo "⚙️ Running Expo prebuild..."
    npx expo prebuild --platform ios --no-install
    
    # 3. Regenerate branding assets
    echo "🎨 Regenerating branding assets..."
    python3 "/Users/eassylife/.gemini/antigravity-ide/brain/1e9e45f8-f2b8-41f9-a0ca-db43d5d84536/scratch/update_all_assets.py"
    
    # 4. Install Pod dependencies
    echo "📦 Installing CocoaPods dependencies..."
    cd ios
    pod install
    cd ..
    
    # 5. Apply space-in-path patches (required because project path has spaces)
    echo "🔧 Applying iOS space-in-path patches..."
    bash scripts/patch-ios-spaces.sh
    
    # 6. Sync version from app.json into Xcode project
    echo "🔢 Syncing version into Xcode project..."
    APP_VERSION=$(python3 -c "import json; print(json.load(open('app.json'))['expo']['version'])" 2>/dev/null || echo "1.0.0")
    BUILD_NUMBER=$(python3 -c "import json; print(json.load(open('app.json'))['expo']['ios']['buildNumber'])" 2>/dev/null || echo "1")
    sed -i '' "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $APP_VERSION/g" ios/Karmayog.xcodeproj/project.pbxproj
    sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*/CURRENT_PROJECT_VERSION = $BUILD_NUMBER/g" ios/Karmayog.xcodeproj/project.pbxproj
    echo "   Version: $APP_VERSION (build $BUILD_NUMBER)"
    
    # 7. Compile iOS Build (simulator release or archive)
    echo "🔨 Building iOS app..."
    echo "Choose build target:"
    echo "  1) Archive (.xcarchive for App Store/Device - requires codesigning)"
    echo "  2) Simulator (Builds Release app for iOS Simulator - no signing required)"
    
    # Using portable read
    echo -n "Enter selection (1 or 2): "
    read -r SELECTION
    echo ""

    
    if [[ "$SELECTION" == "1" ]]; then
      echo "📦 Creating Xcode Release Archive..."
      cd ios
      xcodebuild -workspace Karmayog.xcworkspace \
                 -scheme Karmayog \
                 -configuration Release \
                 -sdk iphoneos \
                 archive \
                 -archivePath build/Karmayog.xcarchive \
                 -allowProvisioningUpdates
      echo "✅ iOS Archive Built Successfully!"
      echo "📦 Location: apps/mobile/ios/build/Karmayog.xcarchive"
    else
      echo "📱 Building Release App for Simulator..."
      cd ios
      xcodebuild -workspace Karmayog.xcworkspace \
                 -scheme Karmayog \
                 -configuration Release \
                 -sdk iphonesimulator \
                 build \
                 CODE_SIGNING_ALLOWED=NO
      echo "✅ iOS Simulator Release App Built Successfully!"
      echo "📦 Location: apps/mobile/ios/build/Build/Products/Release-iphonesimulator/Karmayog.app"
    fi
    
    popd > /dev/null
    ;;

  run-android)
    echo "🤖 Staging and running on connected Android device..."
    pushd apps/mobile > /dev/null
    
    # 1. Run prebuild to sync versions and generate native android directory
    echo "⚙️ Running Expo prebuild..."
    npx expo prebuild --platform android --no-install
    
    # Apply space-in-path patches (required because project path has spaces)
    echo "🔧 Applying Android space-in-path patches..."
    python3 scripts/patch-android-spaces.py
    
    # 2. Regenerate branding assets and patch build.gradle dynamically
    echo "🎨 Regenerating branding assets..."
    python3 "/Users/eassylife/.gemini/antigravity-ide/brain/1e9e45f8-f2b8-41f9-a0ca-db43d5d84536/scratch/update_all_assets.py"
    
    # 3. Detect connected devices using adb and extract the model name
    export ANDROID_HOME="/Users/eassylife/Library/Android/sdk"
    export PATH="$ANDROID_HOME/platform-tools:$PATH"
    DEVICE_NAME=$(adb devices -l | grep "device " | sed -n 's/.*model:\([^ ]*\).*/\1/p' | head -n 1 || true)
    
    EXPO_RUN_ARGS=""
    if [ -n "$DEVICE_NAME" ]; then
      echo "📱 Auto-detected connected physical device: $DEVICE_NAME"
      EXPO_RUN_ARGS="--device $DEVICE_NAME"
    else
      echo "⚠️ No physical device detected via adb. Expo will prompt/use default emulator."
      EXPO_RUN_ARGS="--device"
    fi
    
    # 4. Compile and run on device
    echo "🚀 Building and running on physical device..."
    JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" \
    ANDROID_HOME="/Users/eassylife/Library/Android/sdk" \
    PATH="/opt/homebrew/opt/openjdk@17/bin:/Users/eassylife/Library/Android/sdk/platform-tools:$PATH" \
    npx expo run:android $EXPO_RUN_ARGS
    
    popd > /dev/null
    ;;

  run-ios)
    echo "🍎 Staging and running on connected iOS device..."
    
    # 1. Ensure Xcode is available (macOS only)
    if [[ "$OSTYPE" != "darwin"* ]]; then
      echo "❌ Error: iOS runs can only be performed on macOS."
      exit 1
    fi
    
    pushd apps/mobile > /dev/null
    
    # 2. Run prebuild to sync versions and generate native ios directory
    echo "⚙️ Running Expo prebuild..."
    npx expo prebuild --platform ios --no-install
    
    # 3. Regenerate branding assets
    echo "🎨 Regenerating branding assets..."
    python3 "/Users/eassylife/.gemini/antigravity-ide/brain/1e9e45f8-f2b8-41f9-a0ca-db43d5d84536/scratch/update_all_assets.py"
    
    # 4. Install Pod dependencies
    echo "📦 Installing CocoaPods dependencies..."
    cd ios
    pod install
    cd ..
    
    # 5. Apply space-in-path patches (required because project path has spaces)
    echo "🔧 Applying iOS space-in-path patches..."
    bash scripts/patch-ios-spaces.sh
    
    # 6. Sync version from app.json into Xcode project
    echo "🔢 Syncing version into Xcode project..."
    APP_VERSION=$(python3 -c "import json; print(json.load(open('app.json'))['expo']['version'])" 2>/dev/null || echo "1.0.0")
    BUILD_NUMBER=$(python3 -c "import json; print(json.load(open('app.json'))['expo']['ios']['buildNumber'])" 2>/dev/null || echo "1")
    sed -i '' "s/MARKETING_VERSION = [^;]*/MARKETING_VERSION = $APP_VERSION/g" ios/Karmayog.xcodeproj/project.pbxproj
    sed -i '' "s/CURRENT_PROJECT_VERSION = [^;]*/CURRENT_PROJECT_VERSION = $BUILD_NUMBER/g" ios/Karmayog.xcodeproj/project.pbxproj
    echo "   Version: $APP_VERSION (build $BUILD_NUMBER)"
    
    # 7. Compile and run on device
    echo "🚀 Building and running on physical iOS device..."
    npx expo run:ios --device
    
    popd > /dev/null
    ;;
    
  clean)
    echo "🧹 Cleaning builds..."
    if [ -d "apps/mobile/android" ]; then
      echo "🔧 Applying Android space-in-path patches..."
      python3 apps/mobile/scripts/patch-android-spaces.py
      echo "Cleaning Android Gradle cache..."
      pushd apps/mobile/android > /dev/null
      ./gradlew clean || echo "⚠️ gradlew clean failed, performing manual folder cleanup..."
      popd > /dev/null
      echo "🧹 Cleaning Android build directories manually..."
      rm -rf apps/mobile/android/.gradle
      rm -rf apps/mobile/android/build
      rm -rf apps/mobile/android/app/build
      rm -rf apps/mobile/android/app/.cxx
    fi
    if [ -d "apps/mobile/ios" ]; then
      echo "Cleaning iOS build folder..."
      rm -rf apps/mobile/ios/build
      rm -rf apps/mobile/ios/DerivedData
    fi
    echo "✅ Clean finished."
    ;;
    
  help|*)
    show_help
    ;;
esac
