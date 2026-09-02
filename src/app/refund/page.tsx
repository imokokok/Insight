import Link from 'next/link';

import { type Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy - Insight',
  description: 'Refund policy for Insight Oracle API subscriptions paid via crypto',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Refund Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: July 2026</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Overview</h2>
              <p className="text-slate-700 leading-relaxed">
                Insight processes all subscription payments through NOWPayments in cryptocurrency
                (USDC-denominated invoices, settleable in any supported coin). Because blockchain
                transactions are irreversible by design, our refund policy differs from traditional
                card-based services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                2. Crypto Payments Are Irreversible
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Once a payment is confirmed on-chain and your subscription is activated, the
                transaction cannot be reversed automatically. We do not offer an automated
                self-service refund flow. This is a fundamental property of cryptocurrency payments,
                not a policy choice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Requesting a Refund</h2>
              <p className="text-slate-700 leading-relaxed">
                If you believe you were charged in error, or experienced a significant service issue
                within the first 14 days of your subscription, contact us at{' '}
                <a
                  href="mailto:contact@oracleinsight.xyz"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  contact@oracleinsight.xyz
                </a>{' '}
                with your account email, invoice ID, and a description of the issue. We will review
                each case individually.
              </p>
              <p className="text-slate-700 leading-relaxed mt-3">
                Approved refunds are issued manually from our NOWPayments merchant balance back to
                the original payment address. You are responsible for ensuring the refund address is
                correct and accessible. Refund processing may take 5–10 business days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Non-Refundable Cases</h2>
              <p className="text-slate-700 leading-relaxed">Refunds are not provided for:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4 mt-2">
                <li>Subscriptions past the 14-day review window</li>
                <li>Partial usage of credits within the current billing cycle</li>
                <li>Abuse of service or violations of our Terms of Service</li>
                <li>Accounts terminated for misconduct</li>
                <li>Loss of access to the wallet used for payment</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                5. Managing Your Subscription
              </h2>
              <p className="text-slate-700 leading-relaxed">
                Subscriptions do not auto-renew. You retain access until the end of your current
                billing period, after which your keys revert to the base Developer tier and any
                remaining credit-wallet balance keeps working on a pay-as-you-go basis. To continue
                at the subscribed allowance, manually renew from{' '}
                <Link
                  href="/settings?tab=billing"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Settings → Billing
                </Link>{' '}
                before the period ends.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Enterprise Plans</h2>
              <p className="text-slate-700 leading-relaxed">
                Enterprise and custom plans are handled on a per-contract basis. Refund terms, if
                any, are specified in the applicable service agreement.
              </p>
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
        </div>
      </div>
    </div>
  );
}
