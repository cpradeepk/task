'use client'

import Link from 'next/link'
import { ArrowLeft, Mail, MapPin } from 'lucide-react'

export default function TermsAndConditionsPage() {
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
          <h1 className="text-3xl font-bold mb-2">Terms &amp; Conditions</h1>
          <p className="text-sm text-gray-500">
            Last updated: 9 May 2026 · Effective: 9 May 2026
          </p>
        </header>

        <article className="prose max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <p>
              These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your
              access to and use of <strong>Karmayog</strong>
              {' '}(the &ldquo;Service&rdquo;), operated by{' '}
              <strong>Amtariksha Tech Pvt Ltd</strong> (&ldquo;Amtariksha&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;), a company incorporated under
              the laws of India and headquartered in Bangalore, Karnataka.
            </p>
            <p>
              By signing in to or otherwise using the Service, you agree to be
              bound by these Terms and by our{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              If you do not agree, you must not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Eligibility &amp; Accounts</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You must be at least 18 years old and legally able to enter into a binding contract.</li>
              <li>Accounts are created by Amtariksha or by an authorising client / vendor organisation. You may not create an account through self-signup.</li>
              <li>You are responsible for safeguarding your credentials. Do not share your password. Notify us immediately if you suspect unauthorised access.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>One person, one account. Accounts are not transferable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
              <li>Attempt to gain unauthorised access to any portion of the Service, accounts, systems, or networks.</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service except to the limited extent permitted by law.</li>
              <li>Upload viruses, malware, or otherwise harmful code.</li>
              <li>Impersonate another person or misrepresent your affiliation with any person or organisation.</li>
              <li>Use the Service to harass, defame, or harm other users.</li>
              <li>Scrape, crawl, or use automated means to access the Service beyond the documented APIs available to you.</li>
              <li>Bypass access controls, including the project-access restrictions enforced by the Service.</li>
              <li>Use the Service to store data that is illegal, infringes third-party rights, or contains sensitive personal data of others (e.g., medical or financial data of non-employees) without lawful basis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. Intellectual Property</h2>
            <h3 className="text-base font-semibold mt-4 mb-2">3.1 Our IP</h3>
            <p>
              The Service, including its software, design, trademarks, and
              all related intellectual property, is owned by Amtariksha Tech
              Pvt Ltd. We grant you a limited, non-exclusive, non-transferable,
              revocable licence to use the Service for its intended purpose
              during your engagement with Amtariksha or the authorising client
              organisation.
            </p>
            <h3 className="text-base font-semibold mt-4 mb-2">3.2 Your content</h3>
            <p>
              You retain ownership of any original work you create in the
              Service. However, you grant Amtariksha and your authorising
              organisation a worldwide, royalty-free licence to host, process,
              display, and back up that content for the purpose of operating
              the Service.
            </p>
            <h3 className="text-base font-semibold mt-4 mb-2">3.3 Work product</h3>
            <p>
              Tasks, bugs, project data, designs, code references, and other
              work-product created in connection with your employment or
              contractual engagement remain the property of the employer /
              client organisation as set out in your employment or services
              agreement. The Service is only the vehicle in which this content
              is stored.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. Confidentiality</h2>
            <p>
              The Service contains confidential business information of
              Amtariksha and its clients (project details, internal bugs,
              employee performance data, financial information). You must:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Keep all information accessed through the Service strictly confidential.</li>
              <li>Not disclose, reproduce, or distribute any content outside the Service except where expressly authorised.</li>
              <li>Use information only to perform your authorised duties.</li>
              <li>Notify us promptly of any unauthorised disclosure.</li>
            </ul>
            <p>
              Confidentiality obligations survive the termination of your
              access to the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Privacy &amp; Data Processing</h2>
            <p>
              Our handling of personal data is described in the{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
              which forms part of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Suspension &amp; Termination</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>We may suspend or terminate your access at any time, without prior notice, if you breach these Terms or if your employment / engagement with Amtariksha or the authorising organisation ends.</li>
              <li>You may stop using the Service at any time. Your authorising organisation controls deletion of your account; contact them or write to <a className="text-primary hover:underline" href="mailto:contactus@amtariksha.com">contactus@amtariksha.com</a> for assistance.</li>
              <li>Upon termination, your right to use the Service ceases immediately. Sections that by their nature should survive (e.g., Confidentiality, IP, Indemnification, Limitation of Liability, Governing Law) will continue to apply.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Service Availability &amp; Modifications</h2>
            <p>
              We strive to keep the Service available 24×7 but do not
              guarantee uninterrupted operation. The Service may be temporarily
              unavailable due to maintenance, updates, or factors beyond our
              control (including those of our sub-processors).
            </p>
            <p>
              We may modify, add, or remove features of the Service at any
              time. We will provide reasonable notice of changes that
              materially reduce functionality you rely on.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Disclaimers</h2>
            <p className="uppercase text-xs font-semibold tracking-wider">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
            </p>
            <p>
              To the maximum extent permitted by law, Amtariksha disclaims all
              warranties, express or implied, including warranties of
              merchantability, fitness for a particular purpose,
              non-infringement, accuracy, and quiet enjoyment. We do not
              warrant that the Service will be uninterrupted, error-free,
              secure against every attack, or that defects will be corrected.
            </p>
            <p>
              The Service is a tool to manage work; the results obtained from
              using it are your responsibility. Do not rely on the Service as
              the sole record of legally-significant transactions; keep
              independent records where appropriate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, in no event will
              Amtariksha (or its directors, officers, employees, or
              sub-processors) be liable for:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Indirect, incidental, special, consequential, or punitive damages;</li>
              <li>Loss of profits, revenue, goodwill, business opportunities, data, or content;</li>
              <li>Damage caused by your breach of these Terms; or</li>
              <li>Damage caused by factors outside our reasonable control (force majeure, third-party network outages, government actions).</li>
            </ul>
            <p>
              Our total aggregate liability arising out of or relating to
              these Terms or your use of the Service will not exceed
              <strong> INR 10,000</strong> (Indian Rupees Ten Thousand)
              or the amount your authorising organisation paid us for the
              Service in the twelve (12) months preceding the claim, whichever
              is greater.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Amtariksha and its
              officers, directors, employees, and sub-processors from any
              claim, loss, damage, liability, or expense (including reasonable
              legal fees) arising out of:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your breach of these Terms;</li>
              <li>Your violation of any law or third-party right;</li>
              <li>Content you upload or share through the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">11. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms are governed by and construed in accordance with the
              laws of India. Subject to applicable law, any dispute,
              controversy, or claim arising out of or relating to these Terms
              shall be subject to the exclusive jurisdiction of the courts in
              Bangalore, Karnataka.
            </p>
            <p>
              Before initiating any formal proceeding, you agree to first
              attempt to resolve the dispute by writing to us at the address
              below; we will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">12. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes
              will be communicated through the app or by email at least 7 days
              before they take effect. Continued use of the Service after the
              effective date constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">13. Miscellaneous</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Entire agreement.</strong> These Terms and the Privacy Policy constitute the entire agreement between you and Amtariksha regarding the Service.</li>
              <li><strong>Severability.</strong> If any provision is held unenforceable, the remaining provisions remain in effect.</li>
              <li><strong>No waiver.</strong> Our failure to enforce any provision does not waive our right to enforce it later.</li>
              <li><strong>Assignment.</strong> You may not assign these Terms. We may assign them to an affiliate or successor in connection with a merger, acquisition, or sale of assets.</li>
              <li><strong>Notices.</strong> We may give notice through the Service or to the email address on your account. You should give notice to the address below.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">14. Contact</h2>
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
        </article>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-400">
          <div className="flex flex-wrap gap-4">
            <Link href="/" className="hover:text-primary">Sign in</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
