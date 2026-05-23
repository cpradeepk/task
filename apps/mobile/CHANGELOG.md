# Karmayog — Changelog

This file tracks user-facing changes to the mobile app. The text in each
version section can be copy-pasted into Play Console's "What's new in
this version" field on release.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- Convert test cases to bugs directly from the bug detail screen
- Display Expected Behavior, Actual Behavior, Server Logs, Frontend Logs
  on bug detail screens when populated
- Sign in with email address in addition to employee ID

### Changed
- App branded as **Karmayog** (was "JSR Task Management")
- New "Energetic Startup" theme: Vibrant Purple primary, dark mode by
  default
- Status / priority / severity badges now use a consistent semantic
  color system with icons for colorblind accessibility

### Fixed
- Graceful "No Access" message when a user has lost access to a bug or
  task's project (previously showed a generic error)

---

## [1.0.0] — Initial release

First release of Karmayog. Includes:

- Task and bug tracking with project assignment
- Attendance, leave, and WFH application flow
- Team feed with posts, mentions, and reactions
- Biometric login + email/employee ID sign in
- Push notifications
- Offline-aware data layer
