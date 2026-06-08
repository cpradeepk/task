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
#    The unpatched line looks like:
#      shellScript = "bash -l -c \"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\"";
#    We need to quote $PODS_TARGET_SRCROOT so paths with spaces work:
#      shellScript = "bash -l -c '\"$PODS_TARGET_SRCROOT\"/../scripts/get-app-config-ios.sh'";
PODS_PBXPROJ="$IOS_DIR/Pods/Pods.xcodeproj/project.pbxproj"
if [ -f "$PODS_PBXPROJ" ]; then
  # Use perl for reliable matching of the exact unpatched pattern
  if grep -q 'bash -l -c \\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"' "$PODS_PBXPROJ"; then
    perl -i -pe 's|bash -l -c \\"\\$PODS_TARGET_SRCROOT/\.\./scripts/get-app-config-ios\.sh\\"|bash -l -c '\''\\"\$PODS_TARGET_SRCROOT\\"/../scripts/get-app-config-ios.sh'\''|g' "$PODS_PBXPROJ"
    echo "  ✓ Fixed EXConstants script phase in Pods.xcodeproj"
  else
    echo "  ✓ EXConstants script phase already patched or not found"
  fi
fi

# 2. Fix unquoted $PROJECT_DIR in get-app-config-ios.sh (if present)
CONFIG_SCRIPT="$MOBILE_DIR/node_modules/expo-constants/scripts/get-app-config-ios.sh"
if [ -f "$CONFIG_SCRIPT" ]; then
  if grep -q 'basename $PROJECT_DIR)' "$CONFIG_SCRIPT"; then
    sed -i '' 's|basename $PROJECT_DIR)|basename "$PROJECT_DIR")|g' "$CONFIG_SCRIPT"
    echo "  ✓ Fixed unquoted \$PROJECT_DIR in get-app-config-ios.sh"
  else
    echo "  ✓ get-app-config-ios.sh already patched"
  fi
fi

# 3. Fix AppDelegate.swift to read ip.txt directly on physical iOS devices
APP_DELEGATE="$IOS_DIR/Karmayog/AppDelegate.swift"
if [ -f "$APP_DELEGATE" ]; then
  python3 -c '
import sys
file_path = sys.argv[1]
with open(file_path, "r") as f:
    content = f.read()

target = """  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: \".expo/.virtual-metro-entry\")
#else
    return Bundle.main.url(forResource: \"main\", withExtension: \"jsbundle\")
#endif
  }"""

replacement = """  override func bundleURL() -> URL? {
#if DEBUG
    if let ipPath = Bundle.main.path(forResource: \"ip\", ofType: \"txt\"),
       let ipString = try? String(contentsOfFile: ipPath, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines),
       !ipString.isEmpty {
      return RCTBundleURLProvider.jsBundleURL(
        forBundleRoot: \".expo/.virtual-metro-entry\",
        packagerHost: ipString,
        enableDev: true,
        enableMinification: false,
        inlineSourceMap: false
      )
    }
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: \".expo/.virtual-metro-entry\")
#else
    return Bundle.main.url(forResource: \"main\", withExtension: \"jsbundle\")
#endif
  }"""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, "w") as f:
        f.write(content)
    print("  ✓ Patched AppDelegate.swift for physical device bundle loading")
else:
    print("  ✓ AppDelegate.swift already patched or target not found")
' "$APP_DELEGATE"
fi

echo "✅ iOS space-in-path patches applied successfully!"
