import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

const POINTS = [
  {
    index: '01',
    title: 'Signed assessments',
    text: 'When attestation signing is available, a pre-trade check can carry an EIP-712 receipt over the issued assessment.',
  },
  {
    index: '02',
    title: 'Verifiable by anyone',
    text: 'Check signed bytes locally using independently confirmed keys. At v3, quorum and independence gates can be recomputed from signed counts and thresholds.',
  },
  {
    index: '03',
    title: 'Separate trust checks',
    text: 'Key provenance and any registry anchoring require their own checks. A signed assessment alone does not establish independent timestamp evidence.',
  },
] as const;

export function VerifiabilityBanner() {
  return (
    <section className="receipt-instrument home-view-reveal" aria-labelledby="receipt-title">
      <div className="receipt-instrument-copy">
        <p className="instrument-label">Evidence instrument 05 / portable proof</p>
        <h3 id="receipt-title">Preserve the assessment. Verify its signed evidence locally.</h3>
        <p>
          A valid signature establishes the issuer and integrity of the signed fields using keys you
          independently trust. It does not establish price correctness or economic safety. Schema v1
          remains the service default; v3 is opt-in.
        </p>
        <Link href="/verify">
          Try local receipt verification <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>

      <div className="receipt-instrument-seal" aria-hidden="true">
        <span>Signed</span>
        <i />
        <strong>
          EIP
          <br />
          712
        </strong>
        <i />
        <span>Portable</span>
      </div>

      <ol className="receipt-instrument-points">
        {POINTS.map(({ index, title, text }) => (
          <li key={title}>
            <span>{index}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
