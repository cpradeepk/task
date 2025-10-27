# Deployment Fixes - October 27, 2025

## Final Solution: Deploy from apps/web Directory

The simplest and most reliable solution for monorepo deployment on Vercel is to set `apps/web` as the root directory. This avoids all the complexity of trying to build from the monorepo root.

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
**Problem**: Vercel couldn't find `.next/routes-manifest.json` and had dependency resolution issues in monorepo
**Solution**:
- Set `apps/web` as the root directory using `"root": "apps/web"` in `vercel.json`
- This tells Vercel to treat the web app as a standalone project
- Vercel will:
  1. Install dependencies from `apps/web/package.json`
  2. Run `npm run build` from `apps/web` directory
  3. Find `.next` directory in `apps/web/.next`
- This avoids all monorepo complexity and dependency resolution issues

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
2. `vercel.json` - Created with `"root": "apps/web"` to deploy from web app directory
3. `apps/mobile/package.json` - Updated dependencies
4. `apps/web/next.config.js` - Cleaned up configuration
5. `turbo.json` - Updated output configuration and added globalEnv
6. `.gitignore` - Added .turbo/
7. `package-lock.json` - Updated with fresh dependencies

## Build Status

✅ Local build from `apps/web`: Successful
✅ Dependencies resolve correctly with legacy-peer-deps
✅ Build time: ~9 seconds
✅ All routes compiled correctly
✅ routes-manifest.json generated in `apps/web/.next`
✅ Vercel configuration validated

## Deployment Ready

The application is now ready for deployment to Vercel with:
- ✅ Web app deployed from `apps/web` directory
- ✅ All dependencies resolved correctly
- ✅ Build artifacts generated in correct location
- ✅ Environment variables configured
- ✅ No monorepo complexity issues

## Next Steps

1. Trigger a new Vercel deployment
2. Verify the build completes successfully
3. Test the deployed application
4. Monitor for any runtime errors

