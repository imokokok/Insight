'use client';

import { useEffect, useState } from 'react';

export default function HeroBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
            linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top right orb */}
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full animate-pulse-slow"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.05) 40%, transparent 70%)',
            filter: 'blur(60px)',
            willChange: 'transform, opacity',
          }}
        />

        {/* Bottom left orb */}
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full animate-pulse-slow-reverse"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
            filter: 'blur(50px)',
            willChange: 'transform, opacity',
            animationDelay: '-4s',
          }}
        />

        {/* Center subtle glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] animate-float"
          style={{
            background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.06) 0%, transparent 60%)',
            filter: 'blur(40px)',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Bottom fade for smooth transition */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 1))',
        }}
      />
    </div>
  );
}
