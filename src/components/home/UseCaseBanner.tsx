import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

export function UseCaseBanner() {
  return (
    <section className="risk-threshold home-view-reveal" aria-labelledby="risk-threshold-title">
      <div className="risk-threshold-scale" aria-hidden="true">
        <span>Signal</span>
        <i />
        <strong>Threshold</strong>
        <i />
        <span>Execution</span>
      </div>
      <div className="risk-threshold-statement">
        <p className="instrument-label">Evidence instrument 04 / risk threshold</p>
        <div>
          <span>Before</span>
          <span>not after</span>
        </div>
      </div>
      <div className="risk-threshold-copy">
        <h3 id="risk-threshold-title">
          A small oracle deviation can become a large execution outcome.
        </h3>
        <p>
          Model deviation against your protocol&apos;s thresholds and see how a changed oracle value
          could affect a position before a risk engine has to react.
        </p>
        <Link href="/safety-check">
          Run Safety Check <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
