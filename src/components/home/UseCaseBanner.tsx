import Link from 'next/link';

import { ArrowUpRight } from 'lucide-react';

export function UseCaseBanner() {
  return (
    <section className="risk-threshold home-view-reveal" aria-labelledby="risk-threshold-title">
      <div className="risk-threshold-scale" aria-hidden="true">
        <span>Oracle inputs</span>
        <i />
        <strong>Assessment</strong>
        <i />
        <span>Your policy</span>
      </div>
      <div className="risk-threshold-statement">
        <p className="instrument-label">Example workflow / Base lending</p>
        <div>
          <span>Before</span>
          <span>not after</span>
        </div>
      </div>
      <div className="risk-threshold-copy">
        <h3 id="risk-threshold-title">
          Before a Base Aave V3 supply or borrow, inspect the inputs behind the decision.
        </h3>
        <p>
          Insight compares collateral and debt price evidence with freshness and live protocol
          parameters, then returns an assessment for your policy. Your application keeps signing and
          submission under its control; an optional signed record can preserve what was checked.
        </p>
        <Link href="/docs/x402#guard-families">
          Explore the Base Lending Guard <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
