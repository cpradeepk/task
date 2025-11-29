# Android React Version Mismatch Crash Fix

## Problem Description
The Android app crashes immediately on startup or during bundle loading with a "FATAL EXCEPTION".

**Error Message in Logcat:**
```
FATAL EXCEPTION: mqt_v_native
Process: com.jsr.taskmanagement, PID: 18819
com.facebook.react.common.JavascriptException: Error: Incompatible React versions: The "react" and "react-native-renderer" packages must have the exact same version. Instead got:
  - react:                  19.2.0
  - react-native-renderer:  19.1.0
```

## Root Cause
This occurs when `package.json` specifies `react` with a caret (e.g., `"react": "^19.1.0"`).
- `react-native` 0.81.x expects `react` 19.1.0 (which matches `react-native-renderer` 19.1.0).
- The caret (`^`) allows npm/yarn to install the latest minor version, which might be `19.2.0`.
- This mismatch causes the crash.

## Solution

### 1. Pin React Version
Update `apps/mobile/package.json` to remove the caret (`^`) and pin the exact version.

**Before:**
```json
"dependencies": {
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  ...
}
```

**After:**
```json
"dependencies": {
  "react": "19.1.0",
  "react-dom": "19.1.0",
  ...
}
```

### 2. Deep Clean and Reinstall
Merely changing `package.json` is often not enough because of caching. You must perform a deep clean.

Run the following commands in `apps/mobile`:

```bash
# 1. Remove node_modules and lock file
rm -rf node_modules package-lock.json

# 2. Clear npm cache (optional but recommended if issues persist)
npm cache clean --force

# 3. Reinstall dependencies
npm install

# 4. Verify installed version
npm list react
# Output should show: react@19.1.0
```

### 3. Clear Build Caches & Rebuild
The Android build system and Metro bundler also cache the old bundle.

```bash
# 1. Clear Metro cache
rm -rf /tmp/metro-*

# 2. Clear Expo cache
rm -rf .expo

# 3. Clear Android build cache
cd android
./gradlew clean
cd ..

# 4. Rebuild Release APK (ensure no build cache is used)
npx expo run:android --variant release --no-build-cache
```

## Quick Fix Script
You can run this sequence to fix it automatically:

```bash
cd apps/mobile
sed -i 's/"react": "\^19.1.0"/"react": "19.1.0"/' package.json
sed -i 's/"react-dom": "\^19.1.0"/"react-dom": "19.1.0"/' package.json
rm -rf node_modules package-lock.json .expo android/.gradle android/app/build /tmp/metro-*
npm install
cd android && ./gradlew clean && cd ..
npx expo run:android --variant release --no-build-cache
```
