# JSR Task Management - Quick Reference

**Last Updated:** 2025-11-12

## Changelog
- **2025-11-12**: Initial creation - Common commands, file locations, troubleshooting

---

## Common Commands

### Web App (Next.js 16)
```bash
# Development
cd apps/web
npm run dev                    # Start dev server (http://localhost:3000)
npm run build                  # Production build
npm run start                  # Start production server

# Database
npm run db:push                # Push schema changes to Supabase
npm run db:pull                # Pull schema from Supabase
```

### Mobile App (React Native + Expo)
```bash
# Development
cd apps/mobile
npm start                      # Start Expo dev server
npm run android                # Run on Android emulator
npm run ios                    # Run on iOS simulator

# Build APK
cd apps/mobile/android
./gradlew assembleDebug --no-daemon    # Build debug APK
./gradlew assembleRelease              # Build release APK

# Install on Device
adb devices                            # List connected devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Git Workflow
```bash
git status                     # Check status
git add -A                     # Stage all changes
git commit -m "message"        # Commit with message
git push origin main           # Push to remote
git pull origin main           # Pull latest changes
```

---

## Key File Locations

### Configuration
- `apps/web/.env.local` - Web app environment variables (DO NOT COMMIT)
- `apps/web/next.config.js` - Next.js configuration
- `apps/mobile/app.json` - Expo configuration
- `apps/mobile/.env` - Mobile app environment variables (DO NOT COMMIT)
- `turbo.json` - Turborepo configuration

### GraphQL
- `apps/web/src/graphql/schema.ts` - GraphQL type definitions
- `apps/web/src/graphql/resolvers.ts` - GraphQL resolvers
- `apps/mobile/src/config/graphql-queries.ts` - Mobile GraphQL queries
- `apps/mobile/src/services/apolloClient.ts` - Apollo Client configuration

### Database
- Supabase Project: `rbckjkdohzbclomrufrx`
- Region: `ap-south-1` (AWS Mumbai)
- Connection: Via GraphQL API at `task.amtariksha.com/api/graphql`

### Key Components
- `apps/web/src/components/` - Shared web components
- `apps/web/src/app/` - Next.js App Router pages
- `apps/mobile/src/screens/` - Mobile screens
- `apps/mobile/src/components/` - Mobile components
- `packages/shared/` - Shared TypeScript types and utilities

---

## Troubleshooting

### Web App Issues

**Port 3000 already in use:**
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

**GraphQL errors:**
- Check `apps/web/src/graphql/resolvers.ts` for resolver implementation
- Verify database connection in `.env.local`
- Check Supabase connection pool (max 50 connections)

**Build errors:**
- Clear Next.js cache: `rm -rf apps/web/.next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Mobile App Issues

**Metro bundler cache:**
```bash
cd apps/mobile
npm start -- --reset-cache
```

**Apollo Client 4.x import errors:**
- Use `@apollo/client/react` for hooks (useQuery, useMutation)
- Use `@apollo/client` for core (ApolloClient, InMemoryCache, HttpLink)

**APK build fails:**
```bash
cd apps/mobile/android
./gradlew clean
./gradlew assembleDebug --no-daemon
```

**ADB device not found:**
```bash
adb kill-server
adb start-server
adb devices
```

### Database Issues

**Connection pool exhausted:**
- Check for unclosed connections in resolvers
- Current limit: 50 connections
- Monitor via Supabase dashboard

**Schema out of sync:**
- Pull latest schema: `npm run db:pull`
- Check for pending migrations

---

## Environment Variables

### Web App (.env.local)
```bash
DATABASE_URL=<supabase-connection-string>
JWT_SECRET=<your-jwt-secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=amtariksha@gmail.com
SMTP_PASS=<app-password>
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_REGION=ap-south-1
AWS_S3_BUCKET=amtariksha
```

### Mobile App (.env)
```bash
EXPO_PUBLIC_API_URL=https://task.amtariksha.com/api/graphql
```

---

## Quick Links

- **Production Web:** https://task.amtariksha.com
- **GraphQL API:** https://task.amtariksha.com/api/graphql
- **Supabase Dashboard:** https://supabase.com/dashboard/project/rbckjkdohzbclomrufrx
- **GitHub Repo:** https://github.com/cpradeepk/task.git
- **Vercel Dashboard:** (Auto-deployment enabled)

---

## Test Credentials

**Admin User:**
- Employee ID: `AM-0001`
- Password: `12345678`

---

## Common Patterns

### Adding a New GraphQL Query
1. Define type in `apps/web/src/graphql/schema.ts`
2. Implement resolver in `apps/web/src/graphql/resolvers.ts`
3. Add query to mobile: `apps/mobile/src/config/graphql-queries.ts`
4. Use in component with `useQuery` from `@apollo/client/react`

### Adding a New Database Table
1. Create table in Supabase dashboard
2. Update GraphQL schema with new type
3. Implement resolvers for CRUD operations
4. Add queries/mutations to mobile app
5. Update documentation (ARCHITECTURE.md)

---

**For detailed information, see:**
- `SRS.md` - System requirements and business rules
- `ARCHITECTURE.md` - Technical architecture and database schema
- `DEVELOPER_GUIDE.md` - Development patterns and conventions

