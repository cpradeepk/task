#!/bin/bash
# Crash Debugging Script for JSR Mobile App
# This script helps capture and analyze crash logs from the Android device

export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

APP_PACKAGE="com.jsr.taskmanagement"
LOG_DIR="apps/mobile/crash-logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "🔍 JSR Mobile App Crash Debugger"
echo "================================"
echo ""

# Check device connection
echo "📱 Checking device connection..."
DEVICE=$(adb devices | grep -w "device" | head -1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
    echo "❌ No device connected. Please connect your Android device and enable USB debugging."
    exit 1
fi
echo "✅ Device connected: $DEVICE"
echo ""

# Function to show menu
show_menu() {
    echo "Select an option:"
    echo "1) View real-time logs (filtered for JSR app)"
    echo "2) View crash logs only (errors and fatal)"
    echo "3) Capture full crash log to file"
    echo "4) Clear logcat buffer and start fresh"
    echo "5) View React Native logs only"
    echo "6) View all logs (unfiltered)"
    echo "7) Exit"
    echo ""
    read -p "Enter choice [1-7]: " choice
}

# Function to view real-time app logs
view_realtime_logs() {
    echo ""
    echo "📊 Viewing real-time logs for $APP_PACKAGE..."
    echo "Press Ctrl+C to stop"
    echo "================================"
    adb logcat | grep -i "$APP_PACKAGE\|ReactNative\|ReactNativeJS\|AndroidRuntime"
}

# Function to view crash logs only
view_crash_logs() {
    echo ""
    echo "💥 Viewing crash logs (errors and fatal)..."
    echo "Press Ctrl+C to stop"
    echo "================================"
    adb logcat *:E *:F | grep -i "$APP_PACKAGE\|ReactNative\|ReactNativeJS\|AndroidRuntime"
}

# Function to capture crash log to file
capture_crash_log() {
    LOG_FILE="$LOG_DIR/crash_$TIMESTAMP.log"
    echo ""
    echo "💾 Capturing crash log to: $LOG_FILE"
    echo "This will capture the last 5000 lines of logs..."
    adb logcat -d -t 5000 > "$LOG_FILE"
    echo "✅ Log saved to: $LOG_FILE"
    echo ""
    echo "📋 Analyzing crash log..."
    echo ""
    
    # Show fatal errors
    echo "=== FATAL ERRORS ==="
    grep -i "FATAL\|AndroidRuntime" "$LOG_FILE" | tail -50
    echo ""
    
    # Show React Native errors
    echo "=== REACT NATIVE ERRORS ==="
    grep -i "ReactNativeJS\|ReactNative.*Error" "$LOG_FILE" | tail -30
    echo ""
    
    # Show app-specific errors
    echo "=== APP-SPECIFIC ERRORS ==="
    grep -i "$APP_PACKAGE" "$LOG_FILE" | grep -i "error\|exception\|crash" | tail -30
    echo ""
    
    echo "Full log available at: $LOG_FILE"
}

# Function to clear logcat
clear_logcat() {
    echo ""
    echo "🧹 Clearing logcat buffer..."
    adb logcat -c
    echo "✅ Logcat buffer cleared"
    echo ""
    echo "Now open the app on your device to capture fresh logs."
}

# Function to view React Native logs
view_rn_logs() {
    echo ""
    echo "⚛️  Viewing React Native logs..."
    echo "Press Ctrl+C to stop"
    echo "================================"
    adb logcat | grep -i "ReactNative\|ReactNativeJS"
}

# Function to view all logs
view_all_logs() {
    echo ""
    echo "📜 Viewing all logs (unfiltered)..."
    echo "Press Ctrl+C to stop"
    echo "================================"
    adb logcat
}

# Main loop
while true; do
    show_menu
    
    case $choice in
        1)
            view_realtime_logs
            ;;
        2)
            view_crash_logs
            ;;
        3)
            capture_crash_log
            ;;
        4)
            clear_logcat
            ;;
        5)
            view_rn_logs
            ;;
        6)
            view_all_logs
            ;;
        7)
            echo "👋 Exiting..."
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please select 1-7."
            ;;
    esac
    
    echo ""
    echo "Press Enter to return to menu..."
    read
done

