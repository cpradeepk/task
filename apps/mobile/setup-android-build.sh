#!/bin/bash

# JSR Task Management - Android Build Environment Setup Script
# This script helps set up the required tools for building Android APK locally

set -e  # Exit on error

echo "=========================================="
echo "JSR Task Management - Android Build Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Java 17 is installed
echo "Checking Java installation..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
    if [ "$JAVA_VERSION" == "17" ]; then
        echo -e "${GREEN}✓ Java 17 is already installed${NC}"
    else
        echo -e "${YELLOW}⚠ Java $JAVA_VERSION found, but Java 17 is required${NC}"
        echo "Installing OpenJDK 17..."
        sudo apt update
        sudo apt install openjdk-17-jdk -y
        echo -e "${GREEN}✓ Java 17 installed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Java not found. Installing OpenJDK 17...${NC}"
    sudo apt update
    sudo apt install openjdk-17-jdk -y
    echo -e "${GREEN}✓ Java 17 installed${NC}"
fi

# Verify Java installation
java -version
echo ""

# Check if ANDROID_HOME is set
echo "Checking Android SDK..."
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${YELLOW}⚠ ANDROID_HOME not set${NC}"
    
    # Check if Android SDK exists in common locations
    if [ -d "$HOME/Android/Sdk" ]; then
        echo -e "${GREEN}✓ Found Android SDK at $HOME/Android/Sdk${NC}"
        ANDROID_SDK_PATH="$HOME/Android/Sdk"
    elif [ -d "$HOME/android-sdk" ]; then
        echo -e "${GREEN}✓ Found Android SDK at $HOME/android-sdk${NC}"
        ANDROID_SDK_PATH="$HOME/android-sdk"
    else
        echo -e "${RED}✗ Android SDK not found${NC}"
        echo ""
        echo "Please install Android SDK using one of these methods:"
        echo "1. Install Android Studio from: https://developer.android.com/studio"
        echo "2. Install command-line tools from: https://developer.android.com/studio#command-line-tools-only"
        echo ""
        echo "After installation, run this script again."
        exit 1
    fi
    
    # Add to bashrc/zshrc
    echo ""
    echo "Adding ANDROID_HOME to your shell configuration..."
    
    SHELL_RC="$HOME/.bashrc"
    if [ -f "$HOME/.zshrc" ]; then
        SHELL_RC="$HOME/.zshrc"
    fi
    
    # Check if already in config
    if grep -q "ANDROID_HOME" "$SHELL_RC"; then
        echo -e "${YELLOW}⚠ ANDROID_HOME already configured in $SHELL_RC${NC}"
    else
        echo "" >> "$SHELL_RC"
        echo "# Android SDK" >> "$SHELL_RC"
        echo "export ANDROID_HOME=$ANDROID_SDK_PATH" >> "$SHELL_RC"
        echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools" >> "$SHELL_RC"
        echo "export PATH=\$PATH:\$ANDROID_HOME/emulator" >> "$SHELL_RC"
        echo "export PATH=\$PATH:\$ANDROID_HOME/tools" >> "$SHELL_RC"
        echo "export PATH=\$PATH:\$ANDROID_HOME/tools/bin" >> "$SHELL_RC"
        echo -e "${GREEN}✓ Added ANDROID_HOME to $SHELL_RC${NC}"
        
        # Export for current session
        export ANDROID_HOME=$ANDROID_SDK_PATH
        export PATH=$PATH:$ANDROID_HOME/platform-tools
        export PATH=$PATH:$ANDROID_HOME/emulator
        export PATH=$PATH:$ANDROID_HOME/tools
        export PATH=$PATH:$ANDROID_HOME/tools/bin
    fi
else
    echo -e "${GREEN}✓ ANDROID_HOME is set to: $ANDROID_HOME${NC}"
fi

# Create local.properties if it doesn't exist
echo ""
echo "Creating android/local.properties..."
LOCAL_PROPS="android/local.properties"
if [ -f "$LOCAL_PROPS" ]; then
    echo -e "${YELLOW}⚠ local.properties already exists${NC}"
else
    echo "sdk.dir=${ANDROID_HOME:-$HOME/Android/Sdk}" > "$LOCAL_PROPS"
    echo -e "${GREEN}✓ Created local.properties${NC}"
fi

# Check if adb is available
echo ""
echo "Checking ADB (Android Debug Bridge)..."
if command -v adb &> /dev/null; then
    echo -e "${GREEN}✓ ADB is available${NC}"
    adb version
else
    echo -e "${YELLOW}⚠ ADB not found in PATH${NC}"
    echo "Make sure to run: source ~/.bashrc (or source ~/.zshrc)"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart your terminal or run: source ~/.bashrc"
echo "2. Build the APK:"
echo "   npm run build:local"
echo "3. Install on device:"
echo "   npm run install:local"
echo ""
echo "For detailed instructions, see LOCAL_BUILD_GUIDE.md"
