#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

# Go to the script's directory (project root)
cd "$(dirname "$0")"

# Verify we are in a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Error: Not a git repository."
  exit 1
fi

APP_JSON="apps/mobile/app.json"

if [ ! -f "$APP_JSON" ]; then
  echo "❌ Error: apps/mobile/app.json not found. Make sure you run this from the project root."
  exit 1
fi

# 1. Parse current version and build code using Python
echo "🔍 Reading current mobile configuration..."
CURRENT_VERSION=$(python3 -c "import json; print(json.load(open('$APP_JSON'))['expo']['version'])" 2>/dev/null || echo "1.1.4")
CURRENT_BUILD=$(python3 -c "import json; print(json.load(open('$APP_JSON'))['expo']['android']['versionCode'])" 2>/dev/null || echo "13")

echo "📦 Current Version: $CURRENT_VERSION"
echo "🔢 Current Build: $CURRENT_BUILD"
echo ""

# 2. Calculate next logical defaults
# Increment the patch version (e.g. 1.1.4 -> 1.1.5)
if [[ "$CURRENT_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  MAJOR="${BASH_REMATCH[1]}"
  MINOR="${BASH_REMATCH[2]}"
  PATCH="${BASH_REMATCH[3]}"
  NEXT_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
else
  NEXT_VERSION="$CURRENT_VERSION"
fi

NEXT_BUILD=$((CURRENT_BUILD + 1))

# 3. Prompt user for new version and build code
read -p "Enter new version [$NEXT_VERSION]: " INPUT_VERSION
NEW_VERSION=${INPUT_VERSION:-$NEXT_VERSION}

read -p "Enter new build number [$NEXT_BUILD]: " INPUT_BUILD
NEW_BUILD=${INPUT_BUILD:-$NEXT_BUILD}

echo ""
echo "🚀 Upgrading to version $NEW_VERSION (Build $NEW_BUILD)..."
echo "------------------------------------------------"

# 4. Perform atomic updates across all configuration files using Python
python3 -c "
import json, re

# Update apps/mobile/app.json
app_json_path = 'apps/mobile/app.json'
with open(app_json_path, 'r') as f:
    app_data = json.load(f)
app_data['expo']['version'] = '$NEW_VERSION'
app_data['expo']['ios']['buildNumber'] = '$NEW_BUILD'
app_data['expo']['android']['versionCode'] = $NEW_BUILD
with open(app_json_path, 'w') as f:
    json.dump(app_data, f, indent=2)
print('✅ Updated apps/mobile/app.json')

# Update apps/mobile/package.json
pkg_json_path = 'apps/mobile/package.json'
with open(pkg_json_path, 'r') as f:
    pkg_data = json.load(f)
pkg_data['version'] = '$NEW_VERSION'
with open(pkg_json_path, 'w') as f:
    json.dump(pkg_data, f, indent=2)
print('✅ Updated apps/mobile/package.json')

# Update apps/mobile/android/app/build.gradle
gradle_path = 'apps/mobile/android/app/build.gradle'
with open(gradle_path, 'r') as f:
    content = f.read()
content = re.sub(r'versionCode\s+\d+', 'versionCode $NEW_BUILD', content)
content = re.sub(r'versionName\s+\"[^\"]+\"', 'versionName \"$NEW_VERSION\"', content)
with open(gradle_path, 'w') as f:
    f.write(content)
print('✅ Updated apps/mobile/android/app/build.gradle')

# Update apps/mobile/ios/Karmayog/Info.plist
plist_path = 'apps/mobile/ios/Karmayog/Info.plist'
with open(plist_path, 'r') as f:
    content = f.read()
content = re.sub(r'(<key>CFBundleShortVersionString</key>\s*<string>)[^<]+(</string>)', r'\g<1>$NEW_VERSION\g<2>', content)
content = re.sub(r'(<key>CFBundleVersion</key>\s*<string>)[^<]+(</string>)', r'\g<1>$NEW_BUILD\g<2>', content)
with open(plist_path, 'w') as f:
    f.write(content)
print('✅ Updated apps/mobile/ios/Karmayog/Info.plist')

# Update apps/mobile/ios/Karmayog.xcodeproj/project.pbxproj
pbxproj_path = 'apps/mobile/ios/Karmayog.xcodeproj/project.pbxproj'
with open(pbxproj_path, 'r') as f:
    content = f.read()
content = re.sub(r'MARKETING_VERSION\s*=\s*[^;]+;', 'MARKETING_VERSION = $NEW_VERSION;', content)
content = re.sub(r'CURRENT_PROJECT_VERSION\s*=\s*[^;]+;', 'CURRENT_PROJECT_VERSION = $NEW_BUILD;', content)
with open(pbxproj_path, 'w') as f:
    f.write(content)
print('✅ Updated apps/mobile/ios/Karmayog.xcodeproj/project.pbxproj')
"

# 5. Run Expo prebuild to regenerate native configuration
echo ""
echo "⚙️ Running Expo prebuild to synchronize native folders..."
cd apps/mobile
npx expo prebuild --no-install
cd ../..

# 6. Offer to commit the changes locally
echo ""
echo "📝 Git status of changes:"
git status -s
echo ""

read -p "Do you want to stage and commit these changes locally? (y/n) [n]: " COMMIT_CHOICE
if [[ "$COMMIT_CHOICE" =~ ^[Yy]$ ]]; then
  git add .
  git commit -m "chore(mobile): upgrade version to $NEW_VERSION (build $NEW_BUILD)"
  echo "💾 Changes committed locally!"
else
  echo "⚠️ Changes left in the working directory."
fi

echo ""
echo "✨ Version upgrade completed successfully!"
