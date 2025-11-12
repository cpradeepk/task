---
type: "always_apply"
---

# Development Logging Protocol & Documentation Requirements

## Part 1: Automatic Session Logging

### When to Log
At the end of EVERY interaction where you complete work or make progress, automatically append a summary to `agent_history.md` in the repository root.

### Log Entry Format
Each log entry MUST include all of the following sections:

1. **Timestamp**: Date and time in ISO 8601 format (YYYY-MM-DD HH:MM:SS)
2. **Session Summary**: Brief 1-2 sentence description of what was accomplished
3. **Files Modified**: Categorized list of all files:
   - Created: New files added
   - Modified: Existing files changed
   - Deleted: Files removed
4. **Commands Executed**: Key terminal commands run (include working directory if not repository root)
5. **Commits**: Git commit hashes and messages (if any commits were made)
6. **Issues Fixed**: Specific bugs or problems resolved with brief description
7. **Performance Impact**: If changes affect performance (positive, negative, or none)
8. **Breaking Changes**: If API/schema changes break compatibility
9. **Testing Status**: What was tested, what needs testing
10. **Next Steps**: Outstanding tasks or follow-up items that remain

### Example Log Entry Structure
```markdown
## Session: 2025-11-12 14:30:00

### Summary
Fixed mobile app GraphQL queries and UI discrepancies with web app. Added project names and user info to task/bug lists.

### Files Modified
**Modified:**
- apps/mobile/src/screens/FeedScreen.tsx
- apps/mobile/src/config/graphql-queries.ts

**Created:**
- None

**Deleted:**
- None

### Commands Executed
- `cd apps/mobile/android && ./gradlew assembleDebug --no-daemon`
- `adb install -r app/build/outputs/apk/debug/app-debug.apk`

### Commits
- b05a825: "Fix mobile app discrepancies with web app"

### Issues Fixed
- Feed posts not displaying topics (fixed data mapping from posts.posts array)
- Missing project names in task/bug lists (added project field to GraphQL queries)

### Performance Impact
- None - Changes are UI and data mapping fixes only

### Breaking Changes
- None - All changes are backward compatible

### Testing Status
- ✅ APK built successfully
- ⏳ Pending: Manual testing on Nokia 5.4 device

### Next Steps
- Test all fixes on Nokia 5.4 device
- Verify feed screen shows topics correctly
```

---

## Part 2: Living Documentation

### Documentation Files
The repository maintains four core documentation files in the root directory:

1. **SRS.md** - System Requirements Specification (user-facing requirements)
2. **ARCHITECTURE.md** - System architecture, database schema, GraphQL API
3. **DEVELOPER_GUIDE.md** - Code patterns, setup instructions, conventions
4. **QUICK_REFERENCE.md** - Common commands, key file locations, troubleshooting

### When to Update Documentation

**Update Incrementally:**
- When a feature's behavior changes
- When new API endpoints are added
- When database schema is modified
- When business rules change
- When new patterns or conventions are established

**Add "Last Updated" Timestamp:**
- Each section should have a timestamp when modified
- Format: `**Last Updated:** YYYY-MM-DD`

**Include Changelog:**
- Each documentation file should have a changelog at the top
- Format:
  ```markdown
  ## Changelog
  - **2025-11-12**: Added pagination support to GraphQL queries
  - **2025-11-10**: Updated timer system documentation
  ```

---

## Part 3: Documentation Precedence Rules

When implementing changes, follow this precedence order:

1. **User's Direct Request** (HIGHEST PRIORITY)
   - If user explicitly asks for something, do it
   - User's request always takes precedence

2. **System Requirements Specification (SRS.md)**
   - Refer to this before making autonomous changes
   - Follow documented business rules and workflows

3. **Architecture Documentation (ARCHITECTURE.md)**
   - Follow established patterns and conventions
   - Maintain consistency with existing architecture

4. **Ask When in Doubt**
   - If user request conflicts with documentation, STOP and ASK
   - If documentation is unclear or missing, ASK before proceeding
   - If multiple valid approaches exist, ASK for preference

---

## Part 4: Best Practices

1. **Be Concise**: Session logs should be scannable, not essays
2. **Be Specific**: "Fixed bug" is bad, "Fixed infinite loop in bug creation API" is good
3. **Be Honest**: If something wasn't tested, mark it as pending
4. **Be Forward-Looking**: Always include next steps
5. **Be Consistent**: Use the same format every time

---

**This protocol ensures continuity across agent sessions and maintains a clear history of all changes to the system.**

