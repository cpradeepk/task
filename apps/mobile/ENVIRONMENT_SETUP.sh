#!/bin/bash
# Environment Setup Script for JSR Mobile App Local Builds
# This script sets up the required environment variables for Android development

echo "🔧 Setting up Android development environment..."

# Detect shell
SHELL_CONFIG=""
if [ -f "$HOME/.bashrc" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
elif [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
else
    echo "❌ Could not find .bashrc or .zshrc"
    exit 1
fi

echo "📝 Detected shell config: $SHELL_CONFIG"

# Check if ANDROID_HOME is already set
if grep -q "ANDROID_HOME" "$SHELL_CONFIG"; then
    echo "✅ ANDROID_HOME already configured in $SHELL_CONFIG"
else
    echo "➕ Adding ANDROID_HOME to $SHELL_CONFIG"
    
    cat >> "$SHELL_CONFIG" << 'EOF'

# Android SDK Environment Variables (Added by JSR Mobile App setup)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
EOF
    
    echo "✅ Environment variables added to $SHELL_CONFIG"
fi

# Apply changes to current session
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "📋 Verification:"
echo "   ANDROID_HOME: $ANDROID_HOME"
echo "   ADB: $(which adb 2>/dev/null || echo 'Not found in PATH')"
echo ""
echo "⚠️  To apply changes to your current shell, run:"
echo "   source $SHELL_CONFIG"
echo ""
echo "🚀 You can now build the mobile app locally:"
echo "   cd apps/mobile"
echo "   npm run build:local"
echo "   npm run install:local"

