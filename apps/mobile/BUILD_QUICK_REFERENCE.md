# Android Build Quick Reference

## ✅ Build Status: SUCCESS (Fixed!)
- **APK Location:** `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- **APK Size:** 100 MB (optimized release build)
- **Build Time:** 10m 30s
- **Package:** com.jsr.taskmanagement
- **Status:** ✅ Installed and running successfully on device

---

## 🚀 Quick Commands

### Build APK (Recommended - Embeds JS Bundle)
```bash
cd /media/amtariksha/CCCEA6FACEA6DC48/project/task/apps/mobile

# Build release APK (optimized, 100MB)
npm run build:local:release

# Build debug APK (with debug symbols, 202MB)
npm run build:local
```

### Install on Device
```bash
# Connect device via USB, enable USB debugging
adb devices
npm run install:local
```

### Rebuild from Scratch
```bash
cd /media/amtariksha/CCCEA6FACEA6DC48/project/task/apps/mobile
cd android
./gradlew clean
./gradlew assembleDebug --no-daemon
```

### Uninstall App
```bash
npm run uninstall
```

---

## 🔧 Environment Setup (One-time)

```bash
# If Java or Android SDK not installed
cd /media/amtariksha/CCCEA6FACEA6DC48/project/task/apps/mobile
./install-android-sdk.sh
./setup-android-build.sh
source ~/.bashrc
```

---

## 📱 Install APK on Device

1. Enable USB Debugging on Android device
2. Connect via USB
3. Run: `npm run install:local`

---

## 🐛 Troubleshooting

### Build fails
```bash
cd android
./gradlew clean
./gradlew assembleDebug --no-daemon --stacktrace
```

### Can't install APK
```bash
npm run uninstall
npm run install:local
```

### View app logs
```bash
adb logcat | grep -i "jsr\|error"
```

---

## 📚 Documentation

- **Full Walkthrough:** `android_build_walkthrough.md`
- **Setup Guide:** `local_build_setup.md`
- **Project Guide:** `LOCAL_BUILD_GUIDE.md`
