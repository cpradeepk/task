#!/usr/bin/env bash

# Exit immediately if any command fails
set -e

# Go to the script's directory (project root)
cd "$(dirname "$0")"

# 1. Verify we are in a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Error: Not a git repository."
  exit 1
fi

# 2. Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "ℹ️ No changes to commit. Your repository is already clean."
  exit 0
fi

# 3. Dynamically parse version and versionCode from apps/mobile/app.json using Python
APP_JSON="apps/mobile/app.json"
VERSION="1.0.0"
VERSION_CODE="1"

if [ -f "$APP_JSON" ]; then
  VERSION=$(python3 -c "import json; print(json.load(open('$APP_JSON'))['expo']['version'])" 2>/dev/null || echo "1.0.0")
  VERSION_CODE=$(python3 -c "import json; print(json.load(open('$APP_JSON'))['expo']['android']['versionCode'])" 2>/dev/null || echo "1")
fi

DEFAULT_COMMIT_MSG="chore(mobile): release v$VERSION ($VERSION_CODE)"

# 4. Show current git status
echo "📦 Current Git Status:"
git status -s
echo ""

# 5. Prompt user before staging and committing
echo -n "Do you want to stage, commit, and push these changes? (y/n): "
read -r REPLY
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
  echo "⚠️ Cancelled by user."
  exit 0
fi

# 6. Prompt for custom commit message
echo -n "Enter commit message [Default: $DEFAULT_COMMIT_MSG]: "
read -r CUSTOM_MSG

if [ -z "$CUSTOM_MSG" ]; then
  COMMIT_MSG="$DEFAULT_COMMIT_MSG"
else
  COMMIT_MSG="$CUSTOM_MSG"
fi

# 7. Stage all changes
echo "➕ Staging files..."
git add .

# 8. Commit changes
echo "💾 Committing with message: '$COMMIT_MSG'..."
git commit -m "$COMMIT_MSG"

# 9. Push to current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🚀 Pushing changes to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

echo "✅ Success! Code pushed to GitHub."
