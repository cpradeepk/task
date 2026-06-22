param (
    [string]$Command = "help"
)

# Go to the script's directory (project root)
Set-Location -Path $PSScriptRoot

# Auto-configure JAVA_HOME and ANDROID_HOME for Windows
$DefaultJavaHome = "C:\Program Files\Android\Android Studio\jbr"
if (-not $env:JAVA_HOME -and (Test-Path $DefaultJavaHome)) {
    $env:JAVA_HOME = $DefaultJavaHome
    Write-Host "[*] Auto-configured JAVA_HOME to: $env:JAVA_HOME" -ForegroundColor Cyan
}

$DefaultAndroidHome = "$env:LOCALAPPDATA\Android\Sdk"
if (-not $env:ANDROID_HOME -and (Test-Path $DefaultAndroidHome)) {
    $env:ANDROID_HOME = $DefaultAndroidHome
    Write-Host "[*] Auto-configured ANDROID_HOME to: $env:ANDROID_HOME" -ForegroundColor Cyan
}

$PlatformTools = "$DefaultAndroidHome\platform-tools"
if ((Test-Path $PlatformTools) -and ($env:PATH -notmatch "platform-tools")) {
    $env:PATH = "$PlatformTools;$env:PATH"
    Write-Host "[*] Added ADB to system PATH" -ForegroundColor Cyan
}

function Show-Help {
    Write-Host "[*] Karmayog Local Build Tool (Windows - Native Mode)" -ForegroundColor Cyan
    Write-Host "Usage: .\build_local.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  apk         - Build local release Android APK using Gradle"
    Write-Host "  aab         - Build local release Android App Bundle (AAB) using Gradle"
    Write-Host "  run-android - Build, install, and run on device using Gradle and ADB"
    Write-Host "  clean       - Clean android build caches"
    Write-Host "  help        - Show this help message"
    Write-Host ""
}

switch ($Command) {
    "apk" {
        Write-Host "[*] Building Android Release APK using native Gradle..." -ForegroundColor Green
        Push-Location apps/mobile/android
        
        Write-Host "[-] Running Gradle assembleRelease..." -ForegroundColor Yellow
        .\gradlew assembleRelease
        
        Pop-Location
        
        # Copy to root
        $ApkPath = "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
        if (Test-Path $ApkPath) {
            $PackageJson = Get-Content "apps/mobile\package.json" | ConvertFrom-Json
            $Version = $PackageJson.version
            if (-not $Version) { $Version = "1.0.0" }
            $OutputName = "Karmayog-$Version-release.apk"
            Copy-Item $ApkPath -Destination $OutputName -Force
            Write-Host "[+] Android Release APK Built Successfully!" -ForegroundColor Green
            Write-Host "Location: $OutputName" -ForegroundColor Cyan
        } else {
            Write-Host "[!] Error: Could not find built APK file at $ApkPath" -ForegroundColor Red
        }
    }
    
    "aab" {
        Write-Host "[*] Building Android Release AAB using native Gradle..." -ForegroundColor Green
        Push-Location apps/mobile/android
        
        Write-Host "[-] Running Gradle bundleRelease..." -ForegroundColor Yellow
        .\gradlew bundleRelease
        
        Pop-Location
        
        # Copy to root
        $AabPath = "apps/mobile/android/app/build/outputs/bundle/release/app-release.aab"
        if (Test-Path $AabPath) {
            $PackageJson = Get-Content "apps/mobile\package.json" | ConvertFrom-Json
            $Version = $PackageJson.version
            if (-not $Version) { $Version = "1.0.0" }
            $OutputName = "Karmayog-$Version-release.aab"
            Copy-Item $AabPath -Destination $OutputName -Force
            Write-Host "[+] Android Release AAB Built Successfully!" -ForegroundColor Green
            Write-Host "Location: $OutputName" -ForegroundColor Cyan
        } else {
            Write-Host "[!] Error: Could not find built AAB file at $AabPath" -ForegroundColor Red
        }
    }

    "run-android" {
        Write-Host "[*] Building and running on connected Android device natively..." -ForegroundColor Green
        Push-Location apps/mobile/android
        
        Write-Host "[-] Building Debug APK with Gradle..." -ForegroundColor Yellow
        .\gradlew assembleDebug
        
        Write-Host "[-] Installing on physical device via ADB..." -ForegroundColor Yellow
        $ApkPath = "app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $ApkPath) {
            adb install -r $ApkPath
            
            Write-Host "[-] Reversing port 8081 for Metro bundler..." -ForegroundColor Yellow
            adb reverse tcp:8081 tcp:8081

            Write-Host "[-] Reversing port 3000 for Local Backend API..." -ForegroundColor Yellow
            adb reverse tcp:3000 tcp:3000

            Write-Host "[+] Starting the app..." -ForegroundColor Yellow
            adb shell am start -n "com.karmayog/com.karmayog.MainActivity"
        } else {
            Write-Host "[!] Error: Built APK not found at $ApkPath" -ForegroundColor Red
        }
        
        Pop-Location
        
        Write-Host "[*] Please ensure your Metro bundler is running in another terminal (cd apps/mobile and npx react-native start)." -ForegroundColor Cyan
    }

    "ios" {
        Write-Host "[!] Error: iOS builds can only be performed on macOS." -ForegroundColor Red
    }

    "run-ios" {
        Write-Host "[!] Error: iOS runs can only be performed on macOS." -ForegroundColor Red
    }

    "clean" {
        Write-Host "[*] Cleaning builds..." -ForegroundColor Green
        if (Test-Path "apps/mobile/android") {
            Write-Host "Cleaning Android Gradle cache..." -ForegroundColor Yellow
            Push-Location apps/mobile/android
            .\gradlew clean
            Pop-Location
        }
        Write-Host "[+] Clean finished." -ForegroundColor Green
    }

    default {
        Show-Help
    }
}
