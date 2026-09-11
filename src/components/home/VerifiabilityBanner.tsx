import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

const POINTS = [
  {
    index: '01',
    title: 'Signed every time',
    text: 'Every pre-trade check is signed as an EIP-712 receipt against a published attester key.',
  },
  {
    index: '02',
    title: 'Verifiable by anyone',
    text: 'The gates are recomputable from the bytes alone at v3, and the policy constants live in a public declaration.',
  },
  {
    index: '03',
    title: 'Anchored to Bitcoin',
    text: 'Key records are anchored on-chain, so a check can be proven to have existed in that form before a given block.',
  },
] as const;

export function VerifiabilityBanner() {
  return (
    <section className="receipt-instrument home-view-reveal" aria-labelledby="receipt-title">
      <div className="receipt-instrument-copy">
        <p className="instrument-label">Evidence instrument 05 / portable proof</p>
        <h3 id="receipt-title">
          Every check is signed. Every receipt can be verified without trusting us.
        </h3>
        <p>
          Verification proves a record is authentic and unaltered. It is not an endorsement of a
          verdict; schema v1 remains the service default while v3 is opt-in.
        </p>
        <Link href="/verify">
          Verify a real receipt <ArrowUpRight aria-hidden="true" />
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
