import Link from 'next/link';

import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Insight',
  description: 'Privacy Policy for Insight Oracle Data Analytics Platform',
};

export default function PrivacyPage() {
  return (
    <div className="editorial-workspace min-h-screen px-5 py-10 sm:px-8 sm:py-14">
      <article className="editorial-frame mx-auto max-w-5xl">
        <header className="mb-12 grid gap-6 border-b border-slate-900/15 pb-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="editorial-index">15 — Governance</p>
            <p className="mt-5 text-sm text-slate-500">Last updated: July 2026</p>
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl">
              Privacy Policy
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
              What Insight collects, why it is used, where it is processed, and the controls
              available to you.
            </p>
          </div>
        </header>

        <div className="prose prose-slate max-w-none bg-white/35 px-0 py-2 sm:px-8">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Introduction</h2>
            <p className="text-slate-700 leading-relaxed">
              Insight (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our oracle data analytics platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
            <div className="text-slate-700 leading-relaxed space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Account Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Email address</li>
                  <li>Password (hashed with salt, never stored in plaintext)</li>
                  <li>Display name (optional)</li>
                  <li>Profile avatar (optional)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">User Preferences and Settings</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Default oracle provider preferences</li>
                  <li>Default trading pair preferences</li>
                  <li>Chart display settings</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Usage Data</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Pages visited and features used</li>
                  <li>Query history (oracle data requests)</li>
                  <li>Export history</li>
                  <li>Session duration and frequency</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Technical Data</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>IP address (for security purposes)</li>
                  <li>Cookies and similar technologies</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              3. How We Use Your Information
            </h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              We use the collected information to:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Provide, operate, and maintain the Platform</li>
              <li>Process your account registration and authentication</li>
              <li>Save and display your preferences and configurations</li>
              <li>Improve the Platform&apos;s functionality and user experience</li>
              <li>Analyze usage patterns to optimize features</li>
              <li>Protect against unauthorized access and abuse</li>
              <li>Communicate with you about updates or changes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              4. Data Storage and Security
            </h2>
            <div className="text-slate-700 leading-relaxed space-y-3">
              <p>
                Your data is stored securely using Supabase (PostgreSQL database) with Row Level
                Security (RLS) enabled. We implement industry-standard security measures including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure password hashing</li>
                <li>Row-level access controls</li>
                <li>Regular security updates and observability</li>
              </ul>
              <p>
                However, no method of transmission over the Internet or electronic storage is 100%
                secure. While we strive to protect your personal data, we cannot guarantee its
                absolute security.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Third-Party Services</h2>
            <div className="text-slate-700 leading-relaxed space-y-3">
              <p>The Platform integrates with the following third-party services:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Oracle Providers:</strong> Chainlink, API3, RedStone, DIA, WINkLink,
                  Supra, TWAP, Reflector, Flare, Switchboard - to fetch price data
                </li>
                <li>
                  <strong>Supabase:</strong> For database storage, authentication, and real-time
                  features
                </li>
                <li>
                  <strong>Sentry:</strong> For error tracking and performance observability
                </li>
                <li>
                  <strong>Vercel Analytics &amp; Speed Insights:</strong> For aggregated,
                  privacy-preserving traffic and performance metrics. These only load after you opt
                  in to the &quot;Analytics&quot; cookie category.
                </li>
                <li>
                  <strong>NOWPayments:</strong> For crypto payment processing of paid subscriptions
                  (USDC-denominated). NOWPayments receives your transaction details (invoice ID,
                  payment amount, settlement currency) needed to process payments. We never store
                  your wallet private keys or seed phrases.
                </li>
              </ul>
              <p>
                These third-party services have their own privacy policies, and we encourage you to
                review them. We do not share your personal information with oracle providers beyond
                what is necessary to fetch price data.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Cookies and Tracking</h2>
            <div className="text-slate-700 leading-relaxed space-y-3">
              <p>
                We use cookies and similar tracking technologies, organized into three categories:
              </p>
              <div className="space-y-2">
                <p>
                  <strong>Essential cookies</strong> — Required for authentication, session
                  management, and security. These cannot be disabled, as the Platform cannot operate
                  without them.
                </p>
                <p>
                  <strong>Analytics cookies</strong> — Vercel Analytics, Speed Insights, and Sentry.
                  These help us understand usage patterns and diagnose errors. They are
                  <em> off by default</em> and only load after you opt in.
                </p>
                <p>
                  <strong>Functional cookies</strong> — Remember your preferences and personalize
                  your experience (e.g. default oracle provider, chart display settings).
                </p>
              </div>
              <p>
                On your first visit, the Platform displays a cookie consent banner that lets you
                choose which categories to allow. You may (i) accept all categories, (ii) reject all
                non-essential cookies, or (iii) customize your preferences per category. We will not
                set any non-essential cookies until you have made a choice.
              </p>
              <p>
                To change your cookie preferences later, clear your browser&apos;s local storage for
                this site (which will re-display the banner) or contact us at{' '}
                <a
                  href="mailto:contact@oracleinsight.xyz"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  contact@oracleinsight.xyz
                </a>
                . You can also control cookies through your browser settings; note that disabling
                essential cookies will prevent you from logging in or using the Platform.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              7. Data Sharing and Disclosure
            </h2>
            <p className="text-slate-700 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may
              share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4 mt-3">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Your Rights</h2>
            <p className="text-slate-700 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-4">
              <li>Access your personal data stored on the Platform</li>
              <li>Update or correct your account information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of certain communications</li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              To exercise these rights, you can use the Platform&apos;s settings page or contact us
              through the Platform&apos;s support channels.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Data Retention</h2>
            <p className="text-slate-700 leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to
              provide you services. Price data from oracle providers is stored with a time-to-live
              (TTL) and automatically cleaned up after expiration. You can request deletion of your
              account and data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              10. Children&apos;s Privacy
            </h2>
            <p className="text-slate-700 leading-relaxed">
              The Platform is not intended for children under the age of 13. We do not knowingly
              collect personal information from children under 13. If we become aware that a child
              under 13 has provided us with personal information, we will take steps to delete such
              information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">
              11. Changes to This Policy
            </h2>
            <p className="text-slate-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the &quot;Last
              updated&quot; date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Contact Us</h2>
            <div className="text-slate-700 leading-relaxed space-y-2">
              <p>
                If you have any questions about this Privacy Policy or our data practices, you can
                reach us at:
              </p>
              <p>
                Email:{' '}
                <a
                  href="mailto:contact@oracleinsight.xyz"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  contact@oracleinsight.xyz
                </a>
              </p>
              <p>
                You can also submit feedback through the in-app Feedback button, or open an issue on
                our{' '}
                <a
                  href="https://github.com/imokokok/Insight/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  GitHub repository
                </a>
                .
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </article>
    </div>
  );
}
