'use client'

import Link from 'next/link'
import { ArrowLeft, Mail, MapPin } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </Link>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">
            Last updated: 9 May 2026 · Effective: 9 May 2026
          </p>
        </header>

        <article className="prose max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <p>
              This Privacy Policy explains how <strong>Amtariksha Tech Pvt Ltd</strong>{' '}
              (&ldquo;Amtariksha&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects,
              uses, discloses, and protects information in connection with the
              <strong> Karmayog</strong> web and mobile application
              (the &ldquo;Service&rdquo;). It applies to employees of
              Amtariksha and to external collaborators (clients, vendors,
              contractors) who are granted access to the Service.
            </p>
            <p>
              By accessing or using the Service, you acknowledge that you have
              read and understood this Privacy Policy. Where required by
              applicable law, your continued use constitutes your consent to
              the collection and processing described below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Information We Collect</h2>

            <h3 className="text-base font-semibold mt-4 mb-2">1.1 Information you provide</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account credentials: employee ID, email address, password (stored hashed in a future update; currently encrypted in transit and access-restricted).</li>
              <li>Profile information: name, role, department, manager, phone number, photo.</li>
              <li>Work content: tasks, bugs, comments, attachments, timesheets, leave / WFH applications, feed posts, project assignments.</li>
              <li>Communications you send us (e.g., support emails).</li>
            </ul>

            <h3 className="text-base font-semibold mt-4 mb-2">1.2 Information collected automatically</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Usage data: page views, feature interactions, API requests, error reports.</li>
              <li>Device data: IP address, browser type, operating system, device model, app version, time-zone.</li>
              <li>Authentication tokens stored locally on your device (HTTP-only cookie on web; secure storage on mobile).</li>
              <li>If you enable it: biometric template hashes (on-device only — never transmitted) for fingerprint / Face ID login on the mobile app.</li>
              <li>Push notification tokens (mobile) so we can deliver in-app notifications.</li>
            </ul>

            <h3 className="text-base font-semibold mt-4 mb-2">1.3 Information from third parties</h3>
            <p>
              We do not buy personal data from third parties. If your employer
              (Amtariksha or a client organisation) creates your account on your
              behalf, we receive the information they provide.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. How We Use Information</h2>
            <p>We process the above data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Service delivery</strong> — authenticate users, render dashboards, persist tasks and bugs, route notifications.</li>
              <li><strong>Project access control</strong> — enforce which users can see which projects, tasks, and bugs.</li>
              <li><strong>Communication</strong> — send transactional emails (assignments, comments, credentials) and in-app notifications.</li>
              <li><strong>Security &amp; integrity</strong> — detect abuse, debug crashes, audit changes, prevent unauthorised access.</li>
              <li><strong>Product improvement</strong> — analyse aggregated usage to improve features. Where personally identifiable, this is restricted to employees within Amtariksha&apos;s engineering team.</li>
              <li><strong>Legal compliance</strong> — comply with applicable laws (including the Information Technology Act 2000, the SPDI Rules 2011, and the Digital Personal Data Protection Act 2023) and respond to lawful requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. Legal Basis for Processing</h2>
            <p>
              Under the Digital Personal Data Protection Act 2023 (India), we
              rely on the following grounds:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Consent</strong> — for optional features (e.g., biometric login, push notifications) you can withdraw at any time from your device settings.</li>
              <li><strong>Performance of contract</strong> — to provide the Service you signed up for.</li>
              <li><strong>Legitimate interest of the employer</strong> — to manage work assignments, attendance, and internal communication, provided this does not override your fundamental rights.</li>
              <li><strong>Legal obligation</strong> — where the law requires retention or disclosure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. Sharing &amp; Disclosure</h2>
            <p>
              We do not sell your personal information. We share data only in
              the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Service providers (Data Processors)</strong> — we use
                the following sub-processors to operate the Service. Each is
                contractually required to handle data only on our instructions
                and to meet equivalent security standards:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><strong>Vercel Inc.</strong> (USA) — web application hosting.</li>
                  <li><strong>Supabase Inc.</strong> (USA, with EU/AP infrastructure) — PostgreSQL database hosting. Our database is in the <code>ap-south-1</code> (Mumbai) region.</li>
                  <li><strong>Amazon Web Services</strong> (S3, ap-south-1 / Mumbai) — file attachment storage.</li>
                  <li><strong>Google LLC</strong> — Gmail SMTP for outbound transactional email; Firebase / Expo push notification services (mobile).</li>
                  <li><strong>Expo (650 Industries Inc.)</strong> — over-the-air update channel and crash reporting (mobile).</li>
                </ul>
              </li>
              <li>
                <strong>Within your organisation</strong> — your work content
                is visible to colleagues, managers, and project members per the
                access-control rules administered by your organisation&apos;s
                admin.
              </li>
              <li>
                <strong>External collaborators</strong> — if you are an
                external collaborator (client / vendor), your contributions are
                visible to other authorised members of the projects you join.
              </li>
              <li>
                <strong>Legal &amp; safety</strong> — we may disclose data when
                required by law, court order, or regulatory authority, and to
                protect the rights, property, or safety of Amtariksha,
                our users, or the public.
              </li>
              <li>
                <strong>Business transfers</strong> — in case of merger,
                acquisition, or asset sale, data may be transferred to the
                acquiring entity under equivalent confidentiality obligations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. International Transfers</h2>
            <p>
              Some of our sub-processors are located outside India. Where data
              is transferred internationally, we rely on the recipient&apos;s
              contractual commitments and applicable legal mechanisms to ensure
              your information receives a level of protection equivalent to
              Indian law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Active accounts</strong> — retained for the duration of your engagement with Amtariksha or your authorising organisation.</li>
              <li><strong>Deactivated accounts</strong> — historical work data (tasks, bugs, attendance) is retained for as long as legitimately required (typically 7 years for finance/audit purposes), then anonymised or deleted.</li>
              <li><strong>Backups</strong> — encrypted backups are retained on a rolling 30-day basis.</li>
              <li><strong>Audit logs</strong> — retained for 1 year for security investigation purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Security</h2>
            <p>We take reasonable technical and organisational measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>HTTPS (TLS 1.2+) for all data in transit.</li>
              <li>Database access restricted to backend service accounts. Row-Level Security is enabled on the application database to prevent unauthorised direct access.</li>
              <li>Role-based and project-based access control at the application layer.</li>
              <li>JWT-based session tokens with a 7-day expiry, stored in HTTP-only cookies (web) or platform-secure storage (mobile).</li>
              <li>Application secrets and database credentials stored in environment-variable secret stores, not in source code.</li>
              <li>Regular dependency and vulnerability scanning.</li>
            </ul>
            <p className="mt-3 italic text-gray-500">
              No system is 100% secure. If you suspect a security incident
              affecting your account, please contact us immediately (see §11).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Your Rights</h2>
            <p>Subject to applicable law, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access</strong> — request a copy of personal data we hold about you.</li>
              <li><strong>Correction</strong> — ask us to correct inaccurate or incomplete information.</li>
              <li><strong>Erasure</strong> — request deletion of your account and associated personal data, subject to overriding legal or contractual obligations (e.g., your employer&apos;s record-keeping requirements).</li>
              <li><strong>Withdraw consent</strong> — disable biometric login, push notifications, etc., at any time.</li>
              <li><strong>Grievance</strong> — lodge a complaint with us (see §11). Under the DPDP Act 2023, you may also approach the Data Protection Board of India.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <a className="text-primary hover:underline" href="mailto:contactus@amtariksha.com">contactus@amtariksha.com</a>.
              We aim to respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Cookies &amp; Local Storage</h2>
            <p>
              We use a small number of essential cookies and browser local
              storage to keep you signed in and remember preferences (filters,
              theme). We do not use third-party advertising cookies or
              behavioural tracking. The mobile app uses platform-secure storage
              for the same purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Children</h2>
            <p>
              The Service is not intended for individuals under the age of 18.
              We do not knowingly collect data from children. If you believe a
              minor has been granted access, please contact us so we can
              investigate and remove the data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">11. Contact &amp; Grievance Officer</h2>
            <p>For any privacy questions, requests, or complaints:</p>
            <div className="mt-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p><strong>Amtariksha Tech Pvt Ltd</strong></p>
              <p className="flex items-center gap-2 mt-1 text-gray-500">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Bangalore, Karnataka, India
              </p>
              <p className="flex items-center gap-2 mt-1 text-gray-500">
                <Mail className="h-4 w-4" aria-hidden="true" />
                <a className="text-primary hover:underline" href="mailto:contactus@amtariksha.com">contactus@amtariksha.com</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">12. Changes to this Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material
              changes will be communicated through the app or by email at
              least 7 days before they take effect. The &ldquo;Last updated&rdquo; date at
              the top of this page reflects the most recent revision.
            </p>
          </section>

          <section className="pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              This policy is governed by the laws of India. Disputes shall be
              subject to the exclusive jurisdiction of the courts in Bangalore,
              Karnataka.
            </p>
          </section>
        </article>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400">
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="hover:text-primary">Sign in</Link>
            <Link href="/terms" className="hover:text-primary">Terms &amp; Conditions</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
