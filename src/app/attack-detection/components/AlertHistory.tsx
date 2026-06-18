'use client';

import { BellOff } from 'lucide-react';

import { AlertCard } from './AlertCard';

import type { AlertRecord } from '../types';

interface AlertHistoryProps {
  alerts: AlertRecord[];
}

export function AlertHistory({ alerts }: AlertHistoryProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center text-center">
        <BellOff className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">No alerts recorded. Monitoring is active.</p>
      </div>
    );
  }

  return (
    <div className="max-h-[600px] overflow-y-auto space-y-3 pr-1">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
