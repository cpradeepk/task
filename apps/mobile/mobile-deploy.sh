#!/bin/bash

# Mobile Deployment Script
# Handles building the Android release APK with smart detection of changes.

APP_DIR="apps/mobile"
ANDROID_DIR="$APP_DIR/android"
OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"

# Function to print colored output
print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_warn() {
    echo -e "\033[1;33m[WARN]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# Navigate to project root if script is run from inside apps/mobile
if [[ "$(basename $(pwd))" == "mobile" ]]; then
    cd ../..
fi

# detailed help
show_help() {
    echo "Usage: ./apps/mobile/mobile-deploy.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --clean, -c      Force a clean build (./gradlew clean)"
    echo "  --smart, -s      (Default) Use Gradle's incremental build"
    echo "  --help, -h       Show this help message"
    echo ""
}

FORCE_CLEAN=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --clean|-c)
            FORCE_CLEAN=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

print_info "Starting Mobile Build Process..."

# Check for native changes to advise user (optional smartness)
# We look for changes in android/ directory since last commit or common native config files
if git diff --name-only HEAD | grep -q "$APP_DIR/android/\|package.json"; then
    print_warn "Native changes or dependency changes detected."
    if [ "$FORCE_CLEAN" = false ]; then
        print_info "Recommendation: If the build fails, try running with --clean."
    fi
fi

cd "$ANDROID_DIR" || { print_error "Could not find android directory at $ANDROID_DIR"; exit 1; }

# Build Command
BUILD_CMD="./gradlew assembleRelease"
if [ "$FORCE_CLEAN" = true ]; then
    print_info "Cleaning previous build..."
    ./gradlew clean
fi

print_info "Building Release APK..."
$BUILD_CMD

if [ $? -eq 0 ]; then
    print_success "Build Successful!"
    
    # Locate the APK
    APK_PATH=$(find app/build/outputs/apk/release -name "*.apk" | head -n 1)
    
    if [ -f "$APK_PATH" ]; then
        print_success "APK created at: $ANDROID_DIR/$APK_PATH"
        
        # Optional: Ask to install
        # Check if adb device is connected
        if command -v adb &> /dev/null; then
            DEVICES=$(adb devices | grep -v "List" | grep "device")
            if [ -n "$DEVICES" ]; then
                echo ""
                print_info "Device detected. Attempting to install..."
                adb install -r "$APK_PATH"
                print_success "App installed on device!"
            else
                print_warn "No device connected via ADB. Skipping installation."
            fi
        fi
    else
        print_error "APK file not found after build success."
    fi
else
    print_error "Build Failed."
    exit 1
fi
