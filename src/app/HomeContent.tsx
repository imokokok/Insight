'use client';

import dynamic from 'next/dynamic';

import { ErrorBoundary } from '@/components/error-boundary';
import { HeroSkeleton } from '@/components/ui';

const ProfessionalHero = dynamic(() => import('@/components/home/ProfessionalHero'), {
  loading: () => <HeroSkeleton />,
  ssr: false,
});

const HomeDashboard = dynamic(
  () => import('@/components/home/HomeDashboard').then((m) => m.HomeDashboard),
  {
    loading: () => <HeroSkeleton />,
    ssr: false,
  }
);

function HomeContentInner() {
  return (
    <div className="min-h-screen">
      <ProfessionalHero />
      <HomeDashboard />
    </div>
  );
}

export default function HomeContent() {
  return (
    <ErrorBoundary level="page" componentName="HomeContent">
      <HomeContentInner />
    </ErrorBoundary>
  );
}
