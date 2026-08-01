'use client';

import Link from 'next/link';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Database,
  FileCode,
  Layers,
  Rocket,
  Scale,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface QuickLink {
  href: string;
  label: string;
  icon: React.ElementType;
  external?: boolean;
}

const quickLinks: QuickLink[] = [
  { href: '#quickstart', label: 'Quick Start', icon: Rocket },
  { href: '#features', label: 'Features', icon: Sparkles },
  { href: '#technical', label: 'Technical Docs', icon: FileCode },
  { href: '#methodology', label: 'Methodology', icon: Scale },
  { href: '#architecture', label: 'Architecture', icon: Layers },
  { href: '#data-sources', label: 'Data Sources', icon: Database },
  { href: '/docs/api', label: 'API Reference', icon: Terminal, external: true },
  { href: '/ai', label: 'AI / MCP Server', icon: Bot, external: true },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

function QuickLinkButton({ link }: { link: QuickLink }) {
  const Icon = link.icon;
  const baseClass =
    'group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all';

  if (link.external) {
    return (
      <Link
        href={link.href}
        className={`${baseClass} bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/20`}
      >
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-300 transition-colors" />
        <span>{link.label}</span>
        <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
      </Link>
    );
  }

  return (
    <a
      href={link.href}
      className={`${baseClass} bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/20`}
    >
      <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-300 transition-colors" />
      <span>{link.label}</span>
      <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
    </a>
  );
}

export default function DocsHero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 border-b border-slate-800">
      {/* Blue gradient orb */}
      <div
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Purple gradient orb */}
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.14) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-blue-200 text-xs font-medium mb-6 backdrop-blur-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Insight Documentation</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6"
          >
            Build with confidence
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
              on oracle data.
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-8 max-w-2xl"
          >
            Learn how to use Insight for oracle reliability tracking, cross-oracle comparison, risk
            surveillance, and programmatic data access.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
            {quickLinks.map((link) => (
              <QuickLinkButton key={link.href} link={link} />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
