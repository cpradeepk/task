#!/bin/bash

# Mobile App Deployment Script
# Quick script to build and install the mobile app

set -e

echo "🚀 Mobile App Deployment Script"
echo "================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to build release APK
build_release() {
    echo "📦 Building release APK..."
    cd android
    ./gradlew assembleRelease --no-daemon
    cd ..
    echo "✅ Release APK built successfully!"
}

# Function to build debug APK
build_debug() {
    echo "📦 Building debug APK..."
    cd android
    ./gradlew assembleDebug --no-daemon
    cd ..
    echo "✅ Debug APK built successfully!"
}

# Function to install APK
install_apk() {
    local APK_PATH=$1
    echo "📱 Installing APK..."
    
    # Check if device is connected
    if ! adb devices | grep -q "device$"; then
        echo "❌ No Android device connected!"
        echo "   Please connect your device and enable USB debugging"
        exit 1
    fi
    
    adb install -r "$APK_PATH"
    echo "✅ APK installed successfully!"
}

# Main menu
echo "Select an option:"
echo "1) Build and install RELEASE APK"
echo "2) Build and install DEBUG APK"
echo "3) Install existing RELEASE APK"
echo "4) Install existing DEBUG APK"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        build_release
        install_apk "android/app/build/outputs/apk/release/app-release.apk"
        ;;
    2)
        build_debug
        install_apk "android/app/build/outputs/apk/debug/app-debug.apk"
        ;;
    3)
        install_apk "android/app/build/outputs/apk/release/app-release.apk"
        ;;
    4)
        install_apk "android/app/build/outputs/apk/debug/app-debug.apk"
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "🎉 Done! The app should now be installed on your device."
echo "   You can find it in your app drawer."
