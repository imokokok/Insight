'use client';

import { useState, useEffect } from 'react';

import { Globe, Users, Activity, Clock } from 'lucide-react';

import { useLocale, useTranslations } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { baseColors, semanticColors } from '@/lib/config/colors';

interface TrustMetric {
  id: string;
  icon: typeof Globe;
  value: string;
  label: {
    en: string;
    zh: string;
  };
  subLabel?: {
    en: string;
    zh: string;
  };
}

const trustMetricIds = [
  { id: 'networks', icon: Globe, value: '15+' },
  { id: 'partners', icon: Users, value: '200+' },
  { id: 'apiCalls', icon: Activity, value: '50M+' },
  { id: 'uptime', icon: Clock, value: '99.99%' },
];

export default function TrustMetricsBanner() {
  const t = useTranslations('home.trustMetrics');
  const locale = useLocale();
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="w-full border-t transition-all duration-500"
      style={{
        borderColor: baseColors.gray[200],
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 py-6">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-12">
          {trustMetricIds.map((metric, index) => {
            const Icon = metric.icon;
            const isHovered = hoveredMetric === metric.id;
            const isLast = index === trustMetricIds.length - 1;

            return (
              <div
                key={metric.id}
                className="flex items-center gap-4"
                onMouseEnter={() => setHoveredMetric(metric.id)}
                onMouseLeave={() => setHoveredMetric(null)}
              >
                <div
                  className="flex items-center gap-3 transition-all duration-300 cursor-default"
                  style={{
                    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="p-2 rounded-lg transition-all duration-300"
                    style={{
                      backgroundColor: isHovered ? 'rgba(59, 130, 246, 0.1)' : baseColors.gray[100],
                    }}
                  >
                    <Icon
                      className="w-5 h-5 transition-colors duration-300"
                      style={{
                        color: isHovered ? baseColors.primary[600] : baseColors.gray[500],
                      }}
                    />
                  </div>

                  {/* Value and Label */}
                  <div className="flex flex-col">
                    <span
                      className="text-2xl sm:text-3xl font-bold tracking-tight transition-colors duration-300"
                      style={{
                        color: isHovered ? baseColors.primary[700] : baseColors.gray[900],
                      }}
                    >
                      {metric.value}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium" style={{ color: baseColors.gray[600] }}>
                        {t(`metrics.${metric.id}.label`)}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: semanticColors.success.light,
                          color: semanticColors.success.text,
                        }}
                      >
                        {t(`metrics.${metric.id}.subLabel`)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Separator */}
                {!isLast && (
                  <div
                    className="hidden sm:block w-px h-10"
                    style={{ backgroundColor: baseColors.gray[200] }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
