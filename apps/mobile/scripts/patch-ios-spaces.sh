#!/usr/bin/env bash
# patch-ios-spaces.sh
# Fixes Xcode build script phases that break when the project path contains spaces.
# Must be run AFTER `pod install` completes.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
IOS_DIR="$MOBILE_DIR/ios"

echo "🔧 Patching iOS project files for paths with spaces..."

# 1. Fix EXConstants script phase in Pods.xcodeproj
PODS_PBXPROJ="$IOS_DIR/Pods/Pods.xcodeproj/project.pbxproj"
if [ -f "$PODS_PBXPROJ" ]; then
  if grep -q 'bash -l -c \\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"' "$PODS_PBXPROJ"; then
    sed -i '' 's|bash -l -c \\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"|bash -l -c '\''\\"\$PODS_TARGET_SRCROOT\\"/../scripts/get-app-config-ios.sh'\''|g' "$PODS_PBXPROJ"
    echo "  ✓ Fixed EXConstants script phase in Pods.xcodeproj"
  else
    echo "  ✓ EXConstants script phase already patched or not found"
  fi
fi

# 2. Fix unquoted $PROJECT_DIR in get-app-config-ios.sh
CONFIG_SCRIPT="$MOBILE_DIR/node_modules/expo-constants/scripts/get-app-config-ios.sh"
if [ -f "$CONFIG_SCRIPT" ]; then
  if grep -q 'basename $PROJECT_DIR)' "$CONFIG_SCRIPT"; then
    sed -i '' 's|basename $PROJECT_DIR)|basename "$PROJECT_DIR")|g' "$CONFIG_SCRIPT"
    echo "  ✓ Fixed unquoted \$PROJECT_DIR in get-app-config-ios.sh"
  else
    echo "  ✓ get-app-config-ios.sh already patched"
  fi
fi

# 3. Fix "Bundle React Native code and images" backtick execution in main project
MAIN_PBXPROJ="$IOS_DIR/Karmayog.xcodeproj/project.pbxproj"
if [ -f "$MAIN_PBXPROJ" ]; then
  # Check if the problematic backtick pattern exists
  if grep -q '`\\"$NODE_BINARY\\" --print \\"require' "$MAIN_PBXPROJ"; then
    # Replace backtick execution with properly quoted /bin/sh -c invocation
    sed -i '' 's|`\\"$NODE_BINARY\\" --print \\"require('\''path'\'').dirname(require.resolve('\''react-native/package.json'\'')) + '\''/scripts/react-native-xcode.sh'\''\\"`|WITH_ENVIRONMENT=\\"$(\\"$NODE_BINARY\\" --print \\"require('\''path'\'').dirname(require.resolve('\''react-native/package.json'\'')) + '\''/scripts/react-native-xcode.sh'\''\\")\\"\\\n/bin/sh -c '\''\\"$0\\" \\"$@\\"'\'' \\"$WITH_ENVIRONMENT\\"|g' "$MAIN_PBXPROJ"
    echo "  ✓ Fixed Bundle RN script phase in Karmayog.xcodeproj"
  else
    echo "  ✓ Bundle RN script phase already patched or not found"
  fi
fi

echo "✅ iOS space-in-path patches applied successfully!"
