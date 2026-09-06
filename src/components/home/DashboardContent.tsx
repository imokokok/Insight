import type { ServerDashboardData } from '@/lib/home/dashboardData';

import {
  OracleClosingSection,
  OracleProcessSection,
  OracleQuestionSection,
} from './EditorialNarrative';
import { FeatureGrid } from './FeatureGrid';
import { HeroSection } from './HeroSection';
import { HomeApiTeaser } from './HomeApiTeaser';
import { HomeLiveDashboard } from './HomeLiveDashboard';
import { UseCaseBanner } from './UseCaseBanner';
import { VerifiabilityBanner } from './VerifiabilityBanner';

export default function DashboardContent({ initialData }: { initialData: ServerDashboardData }) {
  return (
    <div className="home-canvas min-h-screen bg-[#f8f7f4]">
      <HeroSection />

      <div className="mx-auto max-w-[1440px] px-5 pb-20 sm:px-8 lg:px-12 lg:pb-28">
        <OracleQuestionSection />
        <HomeLiveDashboard initialData={initialData} />
        <OracleProcessSection />

        <section className="border-t border-slate-900/10 py-16 sm:py-20 lg:py-28">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">06 — Make risk actionable</p>
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                Different questions. One clear audit trail.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Move from price discovery to execution safety with tools designed for protocols,
                operators, developers, and AI agents.
              </p>
            </div>
          </div>
          <FeatureGrid />
          <div className="mt-6">
            <UseCaseBanner />
          </div>
        </section>

        <section className="border-t border-slate-900/10 py-16 sm:py-20 lg:py-28">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">07 — Keep it verifiable</p>
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                Evidence that travels with the decision.
              </h2>
            </div>
          </div>
          <VerifiabilityBanner />
          <div className="mt-6">
            <HomeApiTeaser />
          </div>
        </section>

        <OracleClosingSection />
        <p className="mt-7 text-center text-xs text-slate-500">
          Prices are aggregated for transparency. Verify critical values on-chain before execution.
        </p>
      </div>
    </div>
  );
}
