# Debugging and Fixing Web App Issues

- [ ] Fix `Query.bugs` returning null error <!-- id: 0 -->
    - [ ] Analyze `bugs` resolver in `resolvers.ts`
    - [ ] Ensure it returns `[]` on error or no data
- [ ] Fix `Query.settings` returning null error <!-- id: 1 -->
    - [ ] Verify `settings` resolver implementation
    - [ ] Ensure it returns `[]` on error
- [ ] Fix Duplicate Tasks in Task List <!-- id: 2 -->
    - [ ] Analyze `tasks` resolver in `resolvers.ts`
    - [ ] Check for missing `DISTINCT` or improper Joins
- [ ] Verify Fixes <!-- id: 3 -->
