'use client';

import { motion } from 'framer-motion';
import { Settings, User } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

export function SettingsHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-slate-50/60 to-white border-b border-slate-200">
      {/* Abstract gradient orbs */}
      <div
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 sm:pt-16 sm:pb-16">
        <motion.div
          className="max-w-3xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-700 text-xs font-medium mb-5 shadow-sm"
          >
            <User className="w-3.5 h-3.5" />
            <span>Account</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-4 flex items-center gap-3"
          >
            <Settings className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            Settings
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl"
          >
            Manage your account settings and preferences
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
