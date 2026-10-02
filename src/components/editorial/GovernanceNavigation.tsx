import Link from 'next/link';

export type GovernancePage = 'privacy' | 'terms' | 'refund';

const records: { key: GovernancePage; number: string; label: string; href: string }[] = [
  { key: 'privacy', number: '01', label: 'Privacy', href: '/privacy' },
  { key: 'terms', number: '02', label: 'Terms', href: '/terms' },
  { key: 'refund', number: '03', label: 'Refunds', href: '/refund' },
];

const governanceSections: Record<GovernancePage, readonly string[]> = {
  privacy: [
    'Introduction',
    'Information we collect',
    'How we use information',
    'Storage and security',
    'Third-party services',
    'Cookies and tracking',
    'Data sharing',
    'Your rights',
    'Data retention',
    'Children’s privacy',
    'Changes to this policy',
    'Contact us',
  ],
  terms: [
    'Acceptance of terms',
    'Description of service',
    'User accounts',
    'Data accuracy',
    'Acceptable use',
    'Intellectual property',
    'Limitation of liability',
    'Service modifications',
    'Privacy',
    'Changes to terms',
    'Contact information',
  ],
  refund: [
    'Overview',
    'Irreversible payments',
    'Requesting a refund',
    'Non-refundable cases',
    'Managing a subscription',
    'Enterprise plans',
  ],
};

export function GovernanceRecordNavigation({ current }: { current: GovernancePage }) {
  return (
    <nav className="governance-record-nav" aria-label="Governance documents">
      {records.map((record) => (
        <Link
          key={record.key}
          href={record.href}
          aria-current={record.key === current ? 'page' : undefined}
          className="governance-record-link"
        >
          <span>{record.number} /</span>
          <strong>{record.label}</strong>
        </Link>
      ))}
    </nav>
  );
}

function ClauseLinks({ sections }: { sections: readonly string[] }) {
  return (
    <ol>
      {sections.map((section, index) => (
        <li key={section}>
          <a href={`#clause-${index + 1}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {section}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function GovernanceSectionNavigation({ current }: { current: GovernancePage }) {
  const sections = governanceSections[current];
  return (
    <aside className="governance-section-rail">
      <nav className="governance-desktop-index" aria-label="On this page">
        <p className="governance-index-label">In this record</p>
        <ClauseLinks sections={sections} />
        <a className="governance-index-top" href="#record-top">
          ↑ Back to top
        </a>
      </nav>
      <details className="governance-mobile-index">
        <summary>
          <span>In this record</span>
          <span>{String(sections.length).padStart(2, '0')} clauses</span>
        </summary>
        <nav aria-label="On this page">
          <ClauseLinks sections={sections} />
        </nav>
      </details>
    </aside>
  );
}

export function GovernanceDocumentFooter({ current }: { current: GovernancePage }) {
  const next =
    records[(records.findIndex((record) => record.key === current) + 1) % records.length];

  return (
    <div className="legal-document-return governance-document-footer mt-12 border-t border-slate-200">
      <Link href="/" className="governance-home-link">
        <span>←</span> Back to home
      </Link>
      <Link href={next.href} className="governance-next-link">
        <span>Continue reading / {next.number}</span>
        <strong>
          {next.label} <span aria-hidden="true">↗</span>
        </strong>
      </Link>
    </div>
  );
}
