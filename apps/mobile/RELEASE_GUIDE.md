# Amtariksha Tasks — Android Release Guide

> **For:** the developer responsible for cutting a release to the Google Play Store.
> **App package:** `com.amtariksha.tasks`
> **Build platform:** Expo + EAS Build (cloud)
> **Last updated:** 2026-05-09

This guide is end-to-end. Follow it top to bottom for a first release. For subsequent releases, skip to **§5 Cutting a new release**.

---

## 1. Prerequisites

### Accounts & access you must have
| Item | How to get it |
|------|---------------|
| **Expo account** | `npm i -g eas-cli && eas login` — uses an email/Expo password. Ask the project owner to add you to the `amtariksha` Expo org if needed. |
| **Google Play Developer account** | https://play.google.com/console — one-time $25 USD fee. The org should already have this; ask the owner to add you as **Admin** or **Release manager**. |
| **GitHub repo access** | Read access to `amtariksha/task` so you can pull the code. |
| **Service account JSON** | Used by `eas submit` to upload to Play. See §3.2. |

### Tools on your machine
```bash
node --version    # 20.x or 24.x (LTS)
git --version
npm --version     # 10.x+

# Install EAS CLI globally
npm install -g eas-cli

# Verify
eas --version     # should be 14.x or newer

# (Optional, for local testing) Android SDK — only needed if you want to
# run the dev build on an emulator. Not required to ship to Play.
```

### Repo setup
```bash
git clone https://github.com/amtariksha/task.git
cd task/apps/mobile
npm install
```

---

## 2. One-time setup (skip if already done for this app)

### 2.1 Link the Expo project

The `app.json` already declares `extra.eas.projectId`. Just sign in:

```bash
cd apps/mobile
eas login
eas whoami           # should print your Expo username
```

If the project hasn't been linked yet on your machine, EAS will detect the existing `projectId` automatically. If you ever need to re-init:

```bash
eas init --id d5eaa1b3-d1a5-4f59-836b-814831a766dd
```

### 2.2 Android signing key

Google Play apps must be signed with a stable key. **Let EAS manage it** — that's the recommended path and avoids losing the keystore.

```bash
eas credentials
# Select: Android
# Select: Production
# When prompted "Generate new keystore?" → Yes
```

EAS stores the keystore server-side. To back it up locally (do this — losing the key means you can never update the app):

```bash
eas credentials
# Select: Android → Production → Keystore: Manage everything needed to build your project
# Choose: "Download Credentials" and save the file somewhere safe (1Password, bitwarden, encrypted backup).
```

### 2.3 Create the Play Console app

1. Go to https://play.google.com/console
2. **Create app**
   - App name: **Amtariksha Tasks**
   - Default language: English (en-US)
   - App or game: App
   - Free or paid: Free (or paid if charging)
   - Accept declarations
3. After creation, set the **package name** to `com.amtariksha.tasks` (Play Console will lock it forever after the first upload, so double-check).

Fill in the mandatory listing fields before your first upload:
- **App access** (declare if any features are gated behind login — for us: yes, all features behind login)
- **Ads** (does the app contain ads — no)
- **Content rating** (fill questionnaire)
- **Target audience** (18+ recommended for a work tool)
- **News app** (no)
- **COVID-19 contact-tracing** (no)
- **Data safety** (declare what data is collected — at minimum: email, name, IP for auth)
- **Privacy policy URL** ← **required**. If you don't have one yet, host a simple one at `https://task.amtariksha.com/privacy` first.

### 2.4 Service account for EAS submit

The `eas submit` command uploads builds to Play directly. To do that it needs a service account key.

1. **Play Console** → Setup → API access → **Choose service account: Create new service account**
2. You'll be sent to Google Cloud. Create a service account named `eas-submit`. No roles needed in Google Cloud itself — Play handles permissions.
3. Generate a JSON key for that account. Download it.
4. Back in **Play Console** → API access → grant the new service account these permissions:
   - **App-level access** for `com.amtariksha.tasks`:
     - Release to production
     - Release to testing tracks
     - Manage store presence
5. Save the JSON file to `apps/mobile/google-service-account.json`. This path is referenced in `eas.json` and is gitignored — **never commit it**.

---

## 3. Version & changelog management

Before every release, bump versions in two places:

### `app.json` (Expo)
```json
{
  "expo": {
    "version": "1.0.1",          // ← user-facing version
    "android": {
      "versionCode": 2,           // ← internal integer, MUST increase every release
      ...
    }
  }
}
```

Rules:
- **`version`** — semver-ish. Users see this in Play Store. Bump for any release: `1.0.0 → 1.0.1` for a patch, `1.1.0` for features, `2.0.0` for breaking changes.
- **`versionCode`** — Google Play uses this internally. It **must strictly increase** every time you upload. Conventionally `+1` per release.

Forgetting to bump `versionCode` is the #1 reason `eas submit` fails. The Play Store rejects builds with a versionCode equal to or lower than an existing one.

### Changelog
Maintain `apps/mobile/CHANGELOG.md` with a short user-facing summary for each release. Paste the same text into the Play Console "What's new in this version" field on upload.

Example:
```
## 1.0.1 — 2026-05-15
- Convert test cases to bugs in one tap
- Better handling when you lose access to a project
- Sign in with email address (in addition to employee ID)
```

---

## 4. First release (the slow path)

This walks you through the very first Play Store upload. It's slower than subsequent releases because of one-time setup steps.

### 4.1 Build the AAB

```bash
cd apps/mobile
eas build --platform android --profile production
```

What happens:
- EAS uploads the source to its build cloud
- A build VM runs `gradlew :app:bundleRelease`
- ~15–25 min later you get an `.aab` file (Android App Bundle)
- Download link printed at the end (also visible at https://expo.dev → your project → Builds)

Common first-build hiccups:
- "No keystore configured" → run §2.2
- "Cannot find project" → run `eas init` (see §2.1)
- "versionCode already used" → bump in `app.json` (see §3)

### 4.2 First upload: do it manually to Play Console

For the very first upload, use the Play Console UI directly (so you can verify everything looks right):

1. Play Console → your app → **Production** track → **Create new release**
2. **Choose signing key** → "Use Play App Signing" (recommended) → Continue
3. **Upload** the `.aab` from EAS
4. Fill in release name (e.g., `1.0.0 (1)`) and release notes (paste from your CHANGELOG)
5. **Review release** → fix any warnings (usually metadata)
6. Roll out to: **Internal testing track first**, not Production. (Internal is invite-only, available in minutes.)

### 4.3 Internal testing

Internal testing track lets up to 100 invited testers install the app via a private Play Store link, with no review.

1. Play Console → Testing → **Internal testing** → **Testers** tab
2. Create or pick an email list, add tester Gmail addresses
3. Go back to **Releases**, click on your draft → **Start rollout to Internal testing**
4. Copy the **opt-in URL** from the testers tab and send it to your team. They click → install.

Test all critical flows. When you're happy, promote to production:
- Play Console → Internal testing → **Promote release** → To **Production**

Production releases trigger a Google review (usually 1–3 days for new apps, hours for updates).

---

## 5. Cutting a new release (the fast path)

Once §2 is done, every subsequent release is just:

```bash
# 1. Bump versions
#    Edit apps/mobile/app.json — bump expo.version and android.versionCode
#    Add entry to apps/mobile/CHANGELOG.md
git add apps/mobile/app.json apps/mobile/CHANGELOG.md
git commit -m "chore(mobile): release vX.Y.Z"
git push

# 2. Build
cd apps/mobile
eas build --platform android --profile production
# wait ~20 min, link to AAB appears

# 3. Submit
eas submit --platform android --profile production
# uses google-service-account.json automatically
# upload goes to the 'internal' track in 'draft' status
# (configured in eas.json — see §6)

# 4. Promote on Play Console
#    Once you've tested via internal testing, promote to Production
#    via the Play Console UI (Promote release → Production).
```

That's it. End-to-end: ~30 minutes of waiting, ~5 minutes of clicking.

---

## 6. EAS configuration reference

`apps/mobile/eas.json` is already configured. Key bits:

```jsonc
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"   // AAB for Play Store (not APK)
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal",         // upload to internal track by default
        "releaseStatus": "draft"     // don't auto-publish — you click in Play Console
      }
    }
  }
}
```

To change defaults:
- Want submissions to go straight to **production**: change `track` to `"production"` and `releaseStatus` to `"completed"`. **Don't do this until you're confident in the release flow.**
- Want a **preview APK** for ad-hoc testing (not Play Store): use `eas build -p android --profile preview`. That profile builds an installable APK.

---

## 7. Working with the backend

The mobile app talks to the production web/API at `https://task.amtariksha.com`. There's no separate "mobile backend" — same Vercel deployment serves the GraphQL endpoint at `/api/graphql`.

- Mobile API base URL is set in `apps/mobile/src/config/api.ts`. Don't change unless you're pointing to a staging environment.
- All schema/permission changes ship with the web deploy. Run the web's database migrations (`scripts/run-migration-XXX.js`) before releasing a mobile version that depends on new fields.

---

## 8. Troubleshooting

### `eas submit` fails with "versionCode XX already used"
Bump `android.versionCode` in `app.json` to a higher integer and rebuild. Play Store keeps every versionCode you've ever uploaded forever — you can't reuse them.

### `eas build` fails with "No keystore configured"
Run `eas credentials` and follow §2.2.

### Build succeeds, app installs, crashes on launch
Most common cause: missing/incorrect environment variables. Check that the GraphQL endpoint is reachable from the device.

```bash
# Tail the device log while launching
adb logcat *:E ReactNativeJS:V
```

Look for stack traces from `AppRegistry` or `Apollo`.

### "Your APK or Android App Bundle is signed with a different signature key"
You generated a new keystore but Play Console expects the original. **You must use the same keystore that was used for the first upload.** Recover it from EAS (`eas credentials` → Download). If genuinely lost, you must publish as a brand-new app (different package name).

### `eas submit` rejected by Play with "Privacy policy required"
Add the privacy policy URL in Play Console → App content → Privacy policy. Re-submit.

### Production review stuck for days
Open the Play Console → Policy and programs → check for messages. Common causes: data safety form incomplete, content rating mismatch, target audience missing.

### Internal testers don't see the update
Make sure they:
1. Opted in via the link
2. Are signed in to Play Store with the same Gmail
3. Wait ~30 min after rollout

---

## 9. Folder & file reference

| File | Purpose |
|------|---------|
| `apps/mobile/app.json` | Expo + Android config (name, version, package, icon, permissions). The single source of truth. |
| `apps/mobile/eas.json` | EAS Build + Submit profiles. |
| `apps/mobile/google-service-account.json` | Play service account key (gitignored). Required for `eas submit`. |
| `apps/mobile/assets/icon.png` | App icon (1024×1024). Regenerate if rebranding. |
| `apps/mobile/assets/adaptive-icon.png` | Android adaptive icon foreground. Background color is set in `app.json` → `android.adaptiveIcon.backgroundColor` (`#8B5CF6`). |
| `apps/mobile/assets/splash.png` | Splash screen. |
| `apps/mobile/CHANGELOG.md` | User-facing release notes (create if missing). |

---

## 10. Checklist before every release

Copy this into your PR description or task tracker:

```
[ ] Bumped expo.version in app.json
[ ] Bumped android.versionCode in app.json
[ ] Added entry to apps/mobile/CHANGELOG.md
[ ] Tested critical flows in dev:
    [ ] Login (employee ID + email)
    [ ] Create + edit task
    [ ] Create + edit bug
    [ ] Convert test case to bug
    [ ] Push notifications
    [ ] Offline mode
[ ] Database migrations (if any) deployed to production
[ ] Web deploy is healthy (mobile depends on it)
[ ] eas build -p android --profile production succeeded
[ ] eas submit -p android --profile production succeeded
[ ] Internal testers received the update
[ ] All testers verified critical flows
[ ] Promoted to Production track in Play Console
[ ] Posted release notes to team channel
```

---

## Quick command cheat sheet

```bash
# Login
eas login

# Build production AAB
eas build -p android --profile production

# Build internal APK for sideload testing (faster)
eas build -p android --profile preview

# Submit latest production build to Play Internal track
eas submit -p android --profile production

# Check build status
eas build:list

# View / manage credentials
eas credentials

# Update over-the-air (JS-only updates, no Play review needed)
# Only works if you've set up EAS Update — not currently configured.
# Future: eas update --branch production --message "..."
```
