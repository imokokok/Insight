'use client';

import dynamic from 'next/dynamic';

import { HeroSkeleton } from '@/components/ui';

const ProfessionalHero = dynamic(() => import('./home-components/ProfessionalHero'), {
  loading: () => <HeroSkeleton />,
  ssr: false,
});

export default function HomeContent() {
  return (
    <div className="min-h-screen">
      <ProfessionalHero />
    </div>
  );
}
