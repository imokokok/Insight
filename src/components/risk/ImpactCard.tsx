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
    <div
      className={cn(
        'bg-slate-50 rounded-xl border border-slate-100 p-4 transition-shadow hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-white rounded-lg shadow-sm text-slate-500">{icon}</div>
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{count}</div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
