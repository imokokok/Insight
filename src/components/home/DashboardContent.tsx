import type { ReactNode } from 'react';

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

interface DashboardShellProps {
  liveDashboard: ReactNode;
}

export function DashboardShell({ liveDashboard }: DashboardShellProps) {
  return (
    <div className="home-canvas min-h-screen bg-[#f8f7f4]">
      <HeroSection />

      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {liveDashboard}
        <OracleQuestionSection />
        <OracleProcessSection />

        <section className="home-chapter border-t border-slate-900/10 py-16 sm:py-20 lg:py-24">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">The instruments / 05</p>
            <div>
              <h2 className="home-section-title">Different questions. One clear audit trail.</h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Move from oracle observations to explainable risk assessments with tools for
                protocols, operators, developers, and AI agents.
              </p>
            </div>
          </div>
          <FeatureGrid />
          <div className="mt-6">
            <UseCaseBanner />
          </div>
        </section>

        <section className="home-chapter border-t border-slate-900/10 py-16 sm:py-20 lg:py-24">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">Portable proof / 06</p>
            <div>
              <h2 className="home-section-title">Evidence that travels with the decision.</h2>
            </div>
          </div>
          <VerifiabilityBanner />
        </section>

        <section className="home-chapter border-t border-slate-900/10 pt-16 sm:pt-20 lg:pt-24">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <p className="home-kicker">For builders / 07</p>
            <div>
              <h2 className="home-section-title">Bring oracle intelligence into your workflow.</h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Use REST or MCP for source data and risk analysis. Use Guard SDK for assessment,
                monitoring, and optional checks before transaction submission.
              </p>
            </div>
          </div>
          <HomeApiTeaser />
          <div className="mt-6">
            <OracleClosingSection />
          </div>
        </section>
      </div>
    </div>
  );
}

export function HomeLiveDashboardFallback() {
  return (
    <div className="home-data-loading" aria-busy="true" aria-label="Sampling live oracle data">
      <section id="live-evidence" className="home-chapter scroll-mt-20 py-16 sm:py-20 lg:py-28">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <p className="home-kicker">Live evidence / 01</p>
          <div>
            <h2 className="home-section-title">Sampling the market beneath the price.</h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              Independent feeds are resolving into one inspectable consensus record.
            </p>
          </div>
        </div>

        <div className="glacial-loading-sheet">
          <div className="glacial-loading-meta">
            <span>LIVE SAMPLING</span>
            <span>ORACLE SOURCES</span>
            <span>CONSENSUS LAYER</span>
          </div>
          <div className="glacial-loading-strata" />
          <div className="glacial-loading-rows">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="glacial-loading-row">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div />
                <div />
                <div />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function DashboardContent({ initialData }: { initialData: ServerDashboardData }) {
  return <DashboardShell liveDashboard={<HomeLiveDashboard initialData={initialData} />} />;
}
