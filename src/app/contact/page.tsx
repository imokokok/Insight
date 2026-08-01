import Link from 'next/link';

import { ArrowUpRight, Mail, MessageCircle } from 'lucide-react';
import { type Metadata } from 'next';

import { GitHubIcon, TwitterIcon } from '@/components/icons/SocialIcons';

export const metadata: Metadata = {
  title: 'Contact - Insight',
  description: 'Get in touch with the Insight Oracle Data Analytics Platform team',
};

const contactMethods = [
  {
    title: 'Email',
    description: 'General inquiries, partnerships, and support',
    value: 'contact@oracleinsight.xyz',
    href: 'mailto:contact@oracleinsight.xyz',
    icon: Mail,
  },
  {
    title: 'GitHub',
    description: 'Open-source code, issues, and contributions',
    value: 'github.com/imokokok/Insight',
    href: 'https://github.com/imokokok/Insight',
    icon: GitHubIcon,
  },
  {
    title: 'X (Twitter)',
    description: 'Product updates and oracle risk research',
    value: '@imokokok27',
    href: 'https://x.com/imokokok27',
    icon: TwitterIcon,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/20 blur-[120px] rounded-full" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-5">
            Contact
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-5">
            Get in touch
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Have questions about oracle risk data, API access, or integrations? We&apos;re here to
            help.
          </p>
        </div>
      </section>

      {/* Contact cards */}
      <section className="px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-4 md:grid-cols-3">
            {contactMethods.map((method) => (
              <a
                key={method.title}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group relative flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-blue-200 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <method.icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <h2 className="text-base font-bold text-slate-900 mb-1">{method.title}</h2>
                <p className="text-sm text-slate-500 mb-4 flex-1">{method.description}</p>
                <p className="text-sm font-semibold text-blue-600 break-all">{method.value}</p>
              </a>
            ))}
          </div>

          {/* FAQ / context card */}
          <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">
                  What can we help you with?
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Insight provides independent oracle transparency and risk infrastructure for DeFi.
                  Whether you need help interpreting deviation signals, integrating the API, or
                  understanding protocol-level exposure, reach out and we&apos;ll get back to you
                  within 48 hours.
                </p>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Browse documentation
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
