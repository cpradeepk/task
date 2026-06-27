/**
 * Default release checklist template (Swarg Food Flutter app).
 *
 * Seeded into a sub-project via the "Load default template" action in the
 * ProjectModal release config. Sections are scoped per platform:
 *   - common  : shown on every platform's release checklist
 *   - android : Play Store specific
 *   - ios     : App Store specific
 *
 * SECURITY: the `API_ENCRYPTION_KEY` value is intentionally the placeholder
 * `<API_ENCRYPTION_KEY from secrets>`. NEVER commit the real key here — it is
 * supplied at build time from the secret store / env vars.
 */
import { ReleaseChecklistTemplate } from '@/lib/types'

const API_KEY_PLACEHOLDER = '<API_ENCRYPTION_KEY from secrets>'

export const DEFAULT_RELEASE_CHECKLIST: ReleaseChecklistTemplate = {
  sections: [
    {
      id: 'sec-git',
      title: 'Get New Features from Git',
      platform: 'common',
      items: [
        {
          id: 'git-1',
          label: 'Step 1',
          text:
            'Run: git log <last-release-tag>..HEAD --oneline | Read every commit. For each feat:/fix: entry note which screen/flow it touched. These become the New Feature Test Cases below.',
        },
      ],
    },
    {
      id: 'sec-mandatory',
      title: 'Mandatory Test Cases',
      platform: 'common',
      items: [
        {
          id: 'mand-tc01',
          label: 'TC-01',
          text:
            'Login flow: open app → enter mobile number → Verify OTP (use WhatsApp OTP) → land on Home screen successfully.',
        },
        {
          id: 'mand-tc02',
          label: 'TC-02',
          text:
            'New user flow: open app → enter mobile number → Verify OTP (use WhatsApp OTP) → complete Sign Up → land on Home screen successfully.',
        },
        {
          id: 'mand-tc03',
          label: 'TC-03',
          text:
            'WhatsApp OTP delivery: confirm the OTP for TC-01 and TC-02 is received over WhatsApp and verification succeeds.',
        },
        {
          id: 'mand-tc04',
          label: 'TC-04',
          text:
            'Buy-once order: place a buy-once order → complete payment via Razorpay → confirm amount is deducted from wallet/Razorpay and the order appears under My Orders.',
        },
        {
          id: 'mand-tc05',
          label: 'TC-05',
          text:
            'Subscription: purchase a subscription → complete payment → verify holiday marking and date-change on the subscription work correctly.',
        },
        {
          id: 'mand-tc06',
          label: 'TC-06',
          text:
            'Account lifecycle: delete account → sign up again with the same number → log in successfully.',
        },
      ],
    },
    {
      id: 'sec-newfeatures',
      title: 'New Feature Test Cases',
      platform: 'common',
      items: [
        { id: 'feat-tc01', label: 'TC-01', text: '' },
        { id: 'feat-tc02', label: 'TC-02', text: '' },
        { id: 'feat-tc03', label: 'TC-03', text: '' },
        { id: 'feat-tc04', label: 'TC-04', text: '' },
        { id: 'feat-tc05', label: 'TC-05', text: '' },
        { id: 'feat-tc06', label: 'TC-06', text: '' },
        { id: 'feat-tc07', label: 'TC-07', text: '' },
        { id: 'feat-tc08', label: 'TC-08', text: '' },
        { id: 'feat-tc09', label: 'TC-09', text: '' },
      ],
    },
    {
      id: 'sec-version',
      title: 'Update the version',
      platform: 'common',
      items: [
        {
          id: 'ver-1',
          label: 'Step 1',
          text: 'Update the version (and build number) in pubspec.yaml.',
        },
        {
          id: 'ver-2',
          label: 'Step 2',
          text: 'Run: flutter clean && flutter pub get.',
        },
      ],
    },
    {
      id: 'sec-playstore',
      title: 'Release Process on Play Store',
      platform: 'android',
      items: [
        {
          id: 'play-1',
          label: 'Step 1',
          text: `Build the release AAB: flutter build appbundle --release --dart-define=API_ENCRYPTION_KEY=${API_KEY_PLACEHOLDER}`,
        },
        {
          id: 'play-2',
          label: 'Step 2',
          text:
            'Open Play Console → Swarg Food (com.swargfood.app) → Test and Release → Production → Create new release.',
        },
        {
          id: 'play-3',
          label: 'Step 3',
          text: 'Upload the generated .aab to the release.',
        },
        {
          id: 'play-4',
          label: 'Step 4',
          text: 'Click Next → Save → Submit for review.',
        },
      ],
    },
    {
      id: 'sec-appstore',
      title: 'Release Process on App Store',
      platform: 'ios',
      items: [
        {
          id: 'app-1',
          label: 'Step 1',
          text: `Build the iOS release: flutter build ipa --release --dart-define=API_ENCRYPTION_KEY=${API_KEY_PLACEHOLDER}`,
        },
        {
          id: 'app-2',
          label: 'Step 2',
          text: 'Open the project in Xcode (ios/Runner.xcworkspace).',
        },
        {
          id: 'app-3',
          label: 'Step 3',
          text: 'Select "Any iOS Device (arm64)" as the destination, then Product → Archive.',
        },
        {
          id: 'app-4',
          label: 'Step 4',
          text: 'In the Organizer window, select the new archive and click Distribute App.',
        },
        {
          id: 'app-5',
          label: 'Step 5',
          text: 'Choose App Store Connect → Upload, then complete the upload wizard.',
        },
        {
          id: 'app-6',
          label: 'Step 6',
          text:
            'Open App Store Connect → My Apps → Swarg Food → create / open the version to release.',
        },
        {
          id: 'app-7',
          label: 'Step 7',
          text: 'Under Build, select the uploaded build (wait for processing to finish).',
        },
        {
          id: 'app-8',
          label: 'Step 8',
          text: 'Fill in the release notes ("What\'s New in This Version").',
        },
        {
          id: 'app-9',
          label: 'Step 9',
          text: 'Click Save → Add for Review → Submit for review.',
        },
      ],
    },
    {
      id: 'sec-forceupdate',
      title: 'Force Update via Admin Panel',
      platform: 'common',
      items: [
        {
          id: 'force-1',
          label: 'Step 1',
          text:
            'Set the minimum required app version in the Admin Panel (e.g. 1.0.42) to match the new release.',
        },
        {
          id: 'force-2',
          label: 'Step 2',
          text:
            'Turn the Force Update flag ON to remove the Cancel button (users must update to continue).',
        },
        {
          id: 'force-3',
          label: 'Step 3',
          text:
            'Send a push notification with type=app_update and store_url so users are prompted to update.',
        },
      ],
    },
  ],
}
