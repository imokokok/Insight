import Link from 'next/link';

import { type Metadata } from 'next';

import { GitHubIcon, TwitterIcon } from '@/components/icons/SocialIcons';

export const metadata: Metadata = {
  title: 'Contact - Insight',
  description: 'Get in touch with the Insight Oracle Data Analytics Platform team',
};

const contactMethods = [
  {
    title: 'Email',
    description: 'Send us an email for general inquiries',
    value: 'imokokok123@gmail.com',
    href: 'mailto:imokokok123@gmail.com',
    icon: EmailIcon,
  },
  {
    title: 'GitHub',
    description: 'Check out the source code or report issues',
    value: 'github.com/imokokok/Insight',
    href: 'https://github.com/imokokok/Insight',
    icon: GitHubIcon,
  },
  {
    title: 'X (Twitter)',
    description: 'Follow us for updates and announcements',
    value: '@imokokok27',
    href: 'https://x.com/imokokok27',
    icon: TwitterIcon,
  },
];

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-600 mb-8">
            Have questions about Insight? We&apos;d love to hear from you. Reach out through any of
            the channels below.
          </p>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {contactMethods.map((method) => (
              <a
                key={method.title}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group block p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <method.icon className="w-6 h-6 text-gray-600 group-hover:text-primary-600 transition-colors" />
                  <h2 className="text-lg font-semibold text-gray-900">{method.title}</h2>
                </div>
                <p className="text-sm text-gray-500 mb-2">{method.description}</p>
                <p className="text-primary-600 font-medium text-sm break-all">{method.value}</p>
              </a>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About Insight</h2>
            <p className="text-gray-600 leading-relaxed">
              Insight is a professional oracle data analytics platform that provides comprehensive
              analysis and comparison of mainstream oracle protocols including Chainlink, Pyth,
              API3, RedStone, DIA, WINkLink, Supra, TWAP, Reflector, and Flare. We help Web3
              developers and analysts make informed decisions with real-time price monitoring,
              cross-oracle comparisons, and cross-chain performance analysis.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
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
