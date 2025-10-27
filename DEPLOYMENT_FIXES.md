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
- Created `vercel.json` with explicit build configuration:
  - `buildCommand`: `npm run build:web && cp -r apps/web/.next .next && cp -r apps/web/public ./public`
  - `outputDirectory`: `.next` (root directory)
  - `framework`: `nextjs`
  - Copies build artifacts from `apps/web` to root for Vercel to find them
  - Proper environment variable configuration

### 4. Turbo Cache Issues
**Problem**: Turbo cache was interfering with Vercel builds
**Solution**:
- Updated `turbo.json` to exclude `.next/cache` from outputs
- Added `.turbo/` to `.gitignore` to prevent cache commits
- Ensured proper output configuration for monorepo

## Files Modified

1. `.npmrc` - Created
2. `vercel.json` - Created
3. `apps/mobile/package.json` - Updated dependencies
4. `apps/web/next.config.js` - Cleaned up configuration
5. `turbo.json` - Updated output configuration
6. `.gitignore` - Added .turbo/

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

