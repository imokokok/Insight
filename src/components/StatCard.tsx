import { ReactNode } from 'react';

type TrendDirection = 'up' | 'down' | 'neutral';
type StatCardVariant = 'default' | 'accent' | 'minimal';
type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: number;
  trendDirection?: TrendDirection;
  trendLabel?: string;
  variant?: StatCardVariant;
  accentColor?: AccentColor;
  description?: string;
  suffix?: string;
  prefix?: string;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}

const accentColors: Record<AccentColor, string> = {
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-purple-500 to-pink-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-amber-500',
  red: 'from-red-500 to-rose-500',
  cyan: 'from-cyan-500 to-teal-500',
};

const iconBackgrounds: Record<AccentColor, string> = {
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  green: 'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  cyan: 'bg-cyan-100 text-cyan-600',
};

const trendColors: Record<TrendDirection, string> = {
  up: 'text-green-600 bg-green-50',
  down: 'text-red-600 bg-red-50',
  neutral: 'text-gray-600 bg-gray-50',
};

const trendIcons: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendDirection = 'neutral',
  trendLabel,
  variant = 'default',
  accentColor = 'blue',
  description,
  suffix,
  prefix,
  className = '',
  onClick,
  children,
}: StatCardProps) {
  const baseClasses = 'relative overflow-hidden rounded-2xl transition-all duration-300';
  const clickableClasses = onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : '';

  const variantClasses = {
    default: 'bg-white border border-gray-100 shadow-lg',
    accent: `bg-gradient-to-br ${accentColors[accentColor]} text-white shadow-2xl`,
    minimal: 'bg-transparent',
  };

  const renderTrend = () => {
    if (trend === undefined) return null;
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
          variant === 'accent' ? 'bg-white/20 text-white' : trendColors[trendDirection]
        }`}
      >
        <span>{trendIcons[trendDirection]}</span>
        <span>{trend}%</span>
        {trendLabel && <span className="opacity-70">{trendLabel}</span>}
      </div>
    );
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {variant === 'accent' && <div className="absolute inset-0 bg-black/5" />}

      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p
              className={`text-sm font-medium ${
                variant === 'accent' ? 'text-white/80' : 'text-gray-500'
              }`}
            >
              {title}
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              {prefix && (
                <span
                  className={`text-xl font-semibold ${
                    variant === 'accent' ? 'text-white/70' : 'text-gray-400'
                  }`}
                >
                  {prefix}
                </span>
              )}
              <span
                className={`text-3xl font-bold tracking-tight ${
                  variant === 'accent' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {value}
              </span>
              {suffix && (
                <span
                  className={`text-xl font-semibold ${
                    variant === 'accent' ? 'text-white/70' : 'text-gray-400'
                  }`}
                >
                  {suffix}
                </span>
              )}
            </div>
            {description && (
              <p
                className={`mt-2 text-sm ${
                  variant === 'accent' ? 'text-white/70' : 'text-gray-500'
                }`}
              >
                {description}
              </p>
            )}
            {renderTrend()}
          </div>

          {icon && (
            <div
              className={`ml-4 p-3 rounded-xl ${
                variant === 'accent' ? 'bg-white/20 text-white' : iconBackgrounds[accentColor]
              }`}
            >
              {icon}
            </div>
          )}
        </div>

        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
