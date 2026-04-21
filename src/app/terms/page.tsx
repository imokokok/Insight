import Link from 'next/link';

import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Insight',
  description: 'Terms of Service for Insight Oracle Data Analytics Platform',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: January 2025</p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using Insight (&quot;the Platform&quot;), you accept and agree to
                be bound by these Terms of Service. If you do not agree to these terms, please do
                not use the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                2. Description of Service
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Insight is an oracle data analytics platform that provides:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Real-time price monitoring from multiple oracle providers</li>
                <li>Cross-oracle price comparison and analysis</li>
                <li>Cross-chain performance analysis</li>
                <li>Price alerts and notifications</li>
                <li>Data export functionality (CSV, JSON, Excel, PDF, PNG)</li>
                <li>User preferences and saved configurations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
              <div className="text-gray-700 leading-relaxed space-y-3">
                <p>
                  To access certain features of the Platform, you must create an account. You are
                  responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Providing accurate and complete registration information</li>
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized use of your account</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                4. Data Accuracy Disclaimer
              </h2>
              <p className="text-gray-700 leading-relaxed">
                The Platform aggregates and displays data from third-party oracle providers. While
                we strive for accuracy, we cannot guarantee that all data is accurate, complete, or
                current. The data provided through the Platform is for informational purposes only
                and should not be considered as financial or investment advice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Acceptable Use</h2>
              <p className="text-gray-700 leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>Use the Platform for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Platform</li>
                <li>Interfere with or disrupt the Platform&apos;s operation</li>
                <li>
                  Use automated systems to access the Platform in a manner that sends more requests
                  than a human can reasonably produce
                </li>
                <li>
                  Reproduce, duplicate, copy, sell, or exploit any portion of the Platform without
                  express permission
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                The Platform, including its original content, features, and functionality, is owned
                by Insight and is protected by international copyright, trademark, and other
                intellectual property laws. Oracle data and logos are property of their respective
                providers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-700 leading-relaxed">
                To the maximum extent permitted by law, Insight shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages, including without
                limitation, loss of profits, data, use, goodwill, or other intangible losses,
                resulting from your access to or use of or inability to access or use the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Service Modifications</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any part of the Platform at
                any time without prior notice. We shall not be liable to you or to any third party
                for any modification, suspension, or discontinuance of the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Your use of the Platform is also governed by our{' '}
                <Link
                  href="/privacy"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Privacy Policy
                </Link>
                . Please review our Privacy Policy to understand our practices regarding the
                collection and use of your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. We will notify
                users of any material changes by posting the new Terms of Service on this page and
                updating the &quot;Last updated&quot; date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us through
                the Platform&apos;s support channels.
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
