import { ReactNode } from 'react';

type CardVariant = 'default' | 'glass' | 'gradient' | 'solid';
type GradientType = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

interface AdvancedCardProps {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  gradientType?: GradientType;
  hoverable?: boolean;
  animatedShadow?: boolean;
  style?: React.CSSProperties;
}

const gradientClasses: Record<GradientType, string> = {
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-purple-500 to-pink-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-amber-500',
  pink: 'from-pink-500 to-rose-500',
};

export default function AdvancedCard({
  children,
  className = '',
  variant = 'default',
  gradientType = 'blue',
  hoverable = true,
  animatedShadow = true,
  style,
}: AdvancedCardProps) {
  const baseClasses = 'rounded-2xl overflow-hidden transition-all duration-500 ease-out';

  const variantClasses = {
    default: 'bg-white border border-gray-100 shadow-lg',
    glass: 'bg-white/70 backdrop-blur-xl border border-white/20 shadow-2xl',
    gradient: `bg-gradient-to-br ${gradientClasses[gradientType]} text-white shadow-2xl`,
    solid: 'bg-gray-900 text-white shadow-2xl',
  };

  const hoverClasses = hoverable
    ? 'hover:scale-[1.03] hover:-translate-y-2 cursor-pointer active:scale-[0.98]'
    : '';

  const shadowAnimationClasses = animatedShadow ? 'hover:shadow-2xl hover:shadow-blue-200/50' : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${shadowAnimationClasses} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

interface AdvancedCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function AdvancedCardHeader({ children, className = '' }: AdvancedCardHeaderProps) {
  return <div className={`px-8 py-6 border-b border-gray-100/50 ${className}`}>{children}</div>;
}

interface AdvancedCardTitleProps {
  children: ReactNode;
  className?: string;
}

export function AdvancedCardTitle({ children, className = '' }: AdvancedCardTitleProps) {
  return <h3 className={`text-2xl font-bold tracking-tight ${className}`}>{children}</h3>;
}

interface AdvancedCardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function AdvancedCardDescription({
  children,
  className = '',
}: AdvancedCardDescriptionProps) {
  return <p className={`text-sm opacity-70 mt-2 ${className}`}>{children}</p>;
}

interface AdvancedCardContentProps {
  children: ReactNode;
  className?: string;
}

export function AdvancedCardContent({ children, className = '' }: AdvancedCardContentProps) {
  return <div className={`px-8 py-6 ${className}`}>{children}</div>;
}

interface AdvancedCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function AdvancedCardFooter({ children, className = '' }: AdvancedCardFooterProps) {
  return (
    <div className={`px-8 py-4 border-t border-gray-100/50 bg-gray-50/30 ${className}`}>
      {children}
    </div>
  );
}
