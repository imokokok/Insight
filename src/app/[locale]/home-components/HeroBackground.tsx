'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

// Dynamic import for particle network to avoid SSR issues
const ParticleNetwork = dynamic(() => import('./ParticleNetwork'), {
  ssr: false,
});

// Dynamic import for data flow lines
const DataFlowLines = dynamic(() => import('./DataFlowLines'), {
  ssr: false,
});

interface HeroBackgroundProps {
  enableParticles?: boolean;
  enableDataFlow?: boolean;
}

export default function HeroBackground({
  enableParticles = true,
  enableDataFlow = true,
}: HeroBackgroundProps) {
  const [mounted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return true;
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [particleCount] = useState(() => {
    if (typeof window === 'undefined') return 25;
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    if (isLowEnd) return 10;
    if (isMobile) return 15;
    return 25;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (!mounted) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-white" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base background */}
      <div className="absolute inset-0 bg-white" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Static gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top right orb - blue */}
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Bottom left orb - purple */}
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.03) 40%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        {/* Top left orb - cyan accent */}
        <div
          className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0.02) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Center subtle glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.04) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Particle Network Layer - Middle */}
      {enableParticles && !prefersReducedMotion && (
        <div className="absolute inset-0 z-[1]">
          <ParticleNetwork
            particleCount={particleCount}
            connectionDistance={120}
            themeColor="#3b82f6"
          />
        </div>
      )}

      {/* Data Flow Lines Layer - Top */}
      {enableDataFlow && !prefersReducedMotion && (
        <div className="absolute inset-0 z-[2]">
          <DataFlowLines />
        </div>
      )}

      {/* Bottom fade for smooth transition */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[3]"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 1))',
        }}
      />
    </div>
  );
}
