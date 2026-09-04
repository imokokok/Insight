'use client';

import { cn } from '@/lib/utils';

interface ImpactCardProps {
  title: string;
  count: number;
  description: string;
  icon: React.ReactNode;
  className?: string;
}

export function ImpactCard({ title, count, description, icon, className }: ImpactCardProps) {
  return (
    <div className={cn('border-y border-slate-900/15 bg-slate-50/60 p-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <div className="border border-blue-200 bg-white p-1.5 text-blue-600">{icon}</div>
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{count}</div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
