import Link from 'next/link';

import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Insight',
  description: 'Privacy Policy for Insight Oracle Data Analytics Platform',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Insight (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) is committed
                to protecting your privacy. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you use our oracle data analytics
                platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                2. Information We Collect
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Email address</li>
                    <li>Password (encrypted and securely stored)</li>
                    <li>Display name (optional)</li>
                    <li>Profile avatar (optional)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    User Preferences and Settings
                  </h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Default oracle provider preferences</li>
                    <li>Default trading pair preferences</li>
                    <li>Chart display settings</li>
                    <li>Notification preferences</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">User-Generated Content</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Price alert configurations</li>
                    <li>Saved price snapshots</li>
                    <li>Favorite oracle configurations</li>
                    <li>Alert history and events</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Usage Data</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Pages visited and features used</li>
                    <li>Query history (oracle data requests)</li>
                    <li>Export history</li>
                    <li>Session duration and frequency</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Technical Data</h3>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                We use the collected information to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Provide, operate, and maintain the Platform</li>
                <li>Process your account registration and authentication</li>
                <li>Save and display your preferences and configurations</li>
                <li>Send price alert notifications based on your settings</li>
                <li>Improve the Platform&apos;s functionality and user experience</li>
                <li>Analyze usage patterns to optimize features</li>
                <li>Protect against unauthorized access and abuse</li>
                <li>Communicate with you about updates or changes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                4. Data Storage and Security
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-3">
                <p>
                  Your data is stored securely using Supabase (PostgreSQL database) with Row Level
                  Security (RLS) enabled. We implement industry-standard security measures
                  including:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Encrypted data transmission (HTTPS/TLS)</li>
                  <li>Secure password hashing</li>
                  <li>Row-level access controls</li>
                  <li>Regular security updates and monitoring</li>
                </ul>
                <p>
                  However, no method of transmission over the Internet or electronic storage is 100%
                  secure. While we strive to protect your personal data, we cannot guarantee its
                  absolute security.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Third-Party Services</h2>
              <div className="text-gray-700 leading-relaxed space-y-3">
                <p>The Platform integrates with the following third-party services:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Oracle Providers:</strong> Chainlink, Pyth, API3, RedStone, DIA,
                    WINkLink, Supra, TWAP, Reflector, Flare - to fetch price data
                  </li>
                  <li>
                    <strong>Supabase:</strong> For database storage, authentication, and real-time
                    features
                  </li>
                  <li>
                    <strong>Sentry:</strong> For error tracking and performance monitoring
                  </li>
                </ul>
                <p>
                  These third-party services have their own privacy policies, and we encourage you
                  to review them. We do not share your personal information with oracle providers
                  beyond what is necessary to fetch price data.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Cookies and Tracking</h2>
              <div className="text-gray-700 leading-relaxed space-y-3">
                <p>We use cookies and similar tracking technologies to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Authenticate your session</li>
                  <li>Remember your preferences</li>
                  <li>Analyze Platform usage</li>
                  <li>Improve performance</li>
                </ul>
                <p>
                  You can control cookie settings through your browser. However, disabling cookies
                  may affect some Platform functionality.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                7. Data Sharing and Disclosure
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We do not sell, trade, or rent your personal information to third parties. We may
                share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-3">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights, privacy, safety, or property</li>
                <li>In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-3">You have the right to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Access your personal data stored on the Platform</li>
                <li>Update or correct your account information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of certain communications</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                To exercise these rights, you can use the Platform&apos;s settings page or contact
                us through the Platform&apos;s support channels.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your personal data for as long as your account is active or as needed to
                provide you services. Price data from oracle providers is stored with a time-to-live
                (TTL) and automatically cleaned up after expiration. You can request deletion of
                your account and data at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                10. Children&apos;s Privacy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                The Platform is not intended for children under the age of 13. We do not knowingly
                collect personal information from children under 13. If we become aware that a child
                under 13 has provided us with personal information, we will take steps to delete
                such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                11. Changes to This Policy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page and updating the &quot;Last
                updated&quot; date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please
                contact us through the Platform&apos;s support channels.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/"
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
