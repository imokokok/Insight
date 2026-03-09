import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  hoverable?: boolean;
  style?: React.CSSProperties;
}

export default function Card({
  children,
  className = '',
  variant = 'default',
  hoverable = true,
  style,
}: CardProps) {
  const baseClasses = 'bg-white rounded-2xl transition-all duration-500 ease-out';

  const variantClasses = {
    default: 'border border-gray-100 shadow-sm',
    elevated: 'border-0 shadow-lg shadow-gray-200/50',
    outlined: 'border-2 border-gray-200 shadow-none',
    gradient: 'border-0 shadow-lg shadow-blue-200/30 relative overflow-hidden',
  };

  const hoverClasses = hoverable
    ? 'hover:shadow-2xl hover:shadow-blue-100/60 hover:-translate-y-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
    : '';

  const gradientOverlay =
    variant === 'gradient' ? (
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 pointer-events-none" />
    ) : null;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
      style={style}
    >
      {gradientOverlay}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`px-6 py-5 border-b border-gray-100 ${className}`}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-xl font-semibold text-gray-900 tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}
