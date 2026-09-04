import Link from 'next/link';

import { ArrowUpRight, Mail, MessageCircle } from 'lucide-react';
import { type Metadata } from 'next';

import { EditorialWorkspaceHeader } from '@/components/editorial';
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
    <div className="editorial-workspace min-h-screen">
      {/* Hero */}
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="14"
          stage="Contact"
          eyebrow="Product questions, integration support, research discussion, and responsible issue reporting"
          title="Bring us the question behind the signal."
          description="Talk with Insight about oracle evidence, risk interpretation, API access, or production integrations. Choose the channel that best matches the work."
          evidence={['48-hour response', 'Public issue trail', 'Direct support']}
          action={
            <a
              href="mailto:contact@oracleinsight.xyz"
              className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" />
              Email Insight
            </a>
          }
        />
      </section>

      {/* Contact cards */}
      <section className="py-14 sm:py-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-6 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — Choose a channel</p>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              Use email for private account or integration context. Use GitHub when the question
              benefits from a public, reproducible technical record.
            </p>
          </div>
          <div className="grid border-y border-slate-900/15 md:grid-cols-3">
            {contactMethods.map((method) => (
              <a
                key={method.title}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group relative flex flex-col border-b border-r border-slate-900/10 bg-white/35 p-6 transition-colors hover:bg-blue-50/45"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center border border-slate-900/10 bg-slate-50 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50">
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
          <div className="mt-10 border-y border-slate-900/15 bg-white/45 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-blue-200 bg-blue-50">
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
