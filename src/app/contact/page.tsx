import Link from 'next/link';

import { ArrowUpRight, BookOpen, FileText, Mail, ShieldCheck } from 'lucide-react';
import { type Metadata } from 'next';

import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';
import { GitHubIcon, TwitterIcon } from '@/components/icons/SocialIcons';

export const metadata: Metadata = {
  title: 'Contact - Insight',
  description:
    'Contact Insight about oracle transparency, risk intelligence, and application or agent integrations.',
};

const contactMethods = [
  {
    route: 'Private conversation',
    title: 'Email',
    description: 'Account context, integrations, partnerships, and sensitive reports.',
    value: 'contact@oracleinsight.xyz',
    href: 'mailto:contact@oracleinsight.xyz',
    action: 'Compose an email',
    icon: Mail,
  },
  {
    route: 'Public technical record',
    title: 'GitHub',
    description: 'Reproducible bugs, documentation corrections, and contributions.',
    value: 'github.com/imokokok/Insight',
    href: 'https://github.com/imokokok/Insight',
    action: 'Open repository',
    icon: GitHubIcon,
  },
  {
    route: 'Updates & research',
    title: 'X (Twitter)',
    description: 'Follow product releases and oracle risk research in public.',
    value: '@imokokok27',
    href: 'https://x.com/imokokok27',
    action: 'Follow updates',
    icon: TwitterIcon,
  },
];

export default function ContactPage() {
  return (
    <div className="editorial-workspace evidence-workbench community-workbench min-h-screen">
      {/* Hero */}
      <section className="editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12">
        <EditorialWorkspaceHeader
          index="15"
          stage="Contact"
          eyebrow="Product questions, integration support, research discussion, and responsible issue reporting"
          title="Bring us the question behind the signal."
          description="Talk with Insight about oracle evidence, risk interpretation, API access, or production integrations. Choose the channel that best matches the work."
          evidence={['Private by email', 'Public issue trail', 'Open resources']}
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
        <EvidenceProcessRail
          label="Conversation path"
          items={[
            { label: 'Choose a route', detail: 'Private · public · updates' },
            { label: 'Show the evidence', detail: 'Endpoint · asset · receipt' },
            { label: 'Continue the thread', detail: 'Reply · issue · resolution' },
          ]}
        />
      </section>

      <section className="pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="editorial-frame mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-6 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">01 — Choose the conversation</p>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              Send private account or integration context by email. Keep reproducible product issues
              in GitHub so others can follow the technical record. X is for updates.
            </p>
          </div>
          <div className="contact-channel-ledger grid border-y border-slate-900/15">
            {contactMethods.map((method, methodIndex) => (
              <a
                key={method.title}
                href={method.href}
                target={method.href.startsWith('http') ? '_blank' : undefined}
                rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="contact-channel-record group relative flex flex-col border-b border-r border-slate-900/10 bg-white/35 p-6 transition-colors hover:bg-blue-50/45"
              >
                <div className="contact-channel-topline">
                  <span className="contact-channel-index">
                    C—{String(methodIndex + 1).padStart(2, '0')}
                  </span>
                  <span>{method.route}</span>
                </div>
                <div className="contact-channel-icon-row">
                  <div className="contact-channel-icon">
                    <method.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h2 className="contact-channel-title">{method.title}</h2>
                <p className="contact-channel-description">{method.description}</p>
                <p className="contact-channel-value">{method.value}</p>
                <span className="contact-channel-action">
                  {method.action} <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </a>
            ))}
          </div>

          <div className="contact-context-heading mt-16 grid gap-4 border-b border-slate-900/15 pb-5 lg:grid-cols-[0.8fr_1.7fr]">
            <p className="editorial-index">02 — Make the signal actionable</p>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
              A little context helps us reproduce a problem or interpret the evidence without
              another round trip.
            </p>
          </div>
          <div className="contact-context-grid grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="contact-context-record border-y border-slate-900/15 bg-white/45 p-6 sm:p-8">
              <div className="contact-context-title-row">
                <FileText className="h-5 w-5" />
                <div>
                  <span>MESSAGE BRIEF</span>
                  <h2>What to include</h2>
                </div>
              </div>
              <ol className="contact-brief-list">
                <li>
                  <span>01</span>
                  <p>
                    <strong>The surface</strong> — product page, API endpoint, or integration.
                  </p>
                </li>
                <li>
                  <span>02</span>
                  <p>
                    <strong>The evidence</strong> — asset, provider, chain, time, or receipt ID if
                    relevant.
                  </p>
                </li>
                <li>
                  <span>03</span>
                  <p>
                    <strong>The gap</strong> — what you expected and what you observed.
                  </p>
                </li>
              </ol>
            </div>
            <aside className="contact-resource-record border-y border-slate-900/15 bg-[#edf3fb] p-6 sm:p-8">
              <div className="contact-context-title-row">
                <BookOpen className="h-5 w-5" />
                <div>
                  <span>SELF-SERVE EVIDENCE</span>
                  <h2>Keep investigating</h2>
                </div>
              </div>
              <p>
                Find the integration details or verify a receipt while your conversation continues.
              </p>
              <Link href="/docs" className="contact-resource-link">
                <BookOpen className="h-4 w-4" /> Documentation <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/verify" className="contact-resource-link">
                <ShieldCheck className="h-4 w-4" /> Verify a receipt{' '}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
