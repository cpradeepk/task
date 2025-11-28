#!/bin/bash

# Android SDK Command-line Tools Installation Script
# This script downloads and installs Android SDK command-line tools

set -e  # Exit on error

echo "=========================================="
echo "Installing Android SDK Command-line Tools"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# SDK directory
ANDROID_SDK_ROOT="$HOME/Android/Sdk"
CMDLINE_TOOLS_VERSION="11076708"  # Latest version as of 2024
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"

echo "Creating Android SDK directory..."
mkdir -p "$ANDROID_SDK_ROOT"

echo "Downloading Android SDK command-line tools..."
cd /tmp
wget -q --show-progress "$CMDLINE_TOOLS_URL" -O commandlinetools.zip

echo "Extracting command-line tools..."
mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools"
unzip -q commandlinetools.zip -d "$ANDROID_SDK_ROOT/cmdline-tools"
mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest"

echo -e "${GREEN}✓ Command-line tools installed${NC}"
echo ""

# Set environment variables for this session
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

echo "Installing required SDK components..."
echo "This may take a few minutes..."
echo ""

# Install SDK components
yes | "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" --licenses || true
"$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" "platform-tools"
"$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" "platforms;android-36"
"$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" "build-tools;36.0.0"

echo ""
echo -e "${GREEN}✓ Android SDK installed successfully${NC}"
echo ""
echo "SDK location: $ANDROID_SDK_ROOT"
echo ""
echo "Next steps:"
echo "1. Run the setup script again: ./setup-android-build.sh"
echo "2. Restart your terminal or run: source ~/.bashrc"
echo "3. Build the APK: npm run build:local"
