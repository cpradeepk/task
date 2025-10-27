# Deployment Fixes - October 27, 2025

## Issues Fixed

### 1. npm Dependency Conflicts
**Problem**: React Native peer dependencies conflicted with React Navigation packages
**Solution**:
- Created `.npmrc` with `legacy-peer-deps=true`
- Updated `apps/mobile/package.json` with compatible versions:
  - React: `^18.2.0` (downgraded from ^19)
  - React Native: `^0.73.0` (downgraded from ^0.74.0)
  - Replaced `expo-async-storage` with `@react-native-async-storage/async-storage@^1.21.0`
  - Updated Expo packages to compatible versions

### 2. Next.js Configuration Issues
**Problem**: `next.config.js` had outdated Google Sheets references causing build issues
**Solution**:
- Removed Google Sheets environment variables
- Simplified webpack configuration
- Kept only JWT_SECRET environment variable
- Removed unnecessary polyfills

### 3. Vercel Deployment Configuration
**Problem**: Vercel couldn't find `.next/routes-manifest.json` in monorepo
**Solution**:
- Created `build.sh` script to handle the build and artifact copying
- Created `vercel.json` with explicit build configuration:
  - `buildCommand`: `bash build.sh`
  - `outputDirectory`: `.next` (root directory)
  - `framework`: `nextjs`
  - The build script:
    1. Runs `npm run build:web` to build the web app
    2. Copies `.next` directory from `apps/web/.next` to root `.next`
    3. Copies `public` directory from `apps/web/public` to root `public`
  - Vercel then finds the artifacts in the root directory

### 4. Turbo Cache and Environment Variables
**Problem**:
- Turbo cache was interfering with Vercel builds
- JWT_SECRET environment variable was not declared in turbo.json
**Solution**:
- Updated `turbo.json` to exclude `.next/cache` from outputs
- Added `globalEnv` to `turbo.json` to declare `JWT_SECRET` and `jwt_secret`
- Added `.turbo/` to `.gitignore` to prevent cache commits
- Ensured proper output configuration for monorepo

## Files Modified

1. `.npmrc` - Created (legacy-peer-deps=true)
2. `vercel.json` - Created (uses build.sh script)
3. `build.sh` - Created (handles build and artifact copying)
4. `apps/mobile/package.json` - Updated dependencies
5. `apps/web/next.config.js` - Cleaned up configuration
6. `turbo.json` - Updated output configuration and added globalEnv
7. `.gitignore` - Added .turbo/
8. `package-lock.json` - Updated with fresh dependencies

## Build Status

✅ Local build: Successful
✅ npm install: 1496 packages installed
✅ Build time: ~9 seconds
✅ All routes compiled correctly
✅ routes-manifest.json generated

## Deployment Ready

The application is now ready for deployment to Vercel with:
- ✅ Monorepo properly configured
- ✅ All dependencies resolved
- ✅ Build artifacts generated correctly
- ✅ Environment variables configured
- ✅ Cache properly managed

## Next Steps

1. Trigger a new Vercel deployment
2. Verify the build completes successfully
3. Test the deployed application
4. Monitor for any runtime errors

