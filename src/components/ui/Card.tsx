import { ReactNode } from 'react';
import { tailwindClasses } from '@/lib/config/colors';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outlined';
  hoverable?: boolean;
  style?: React.CSSProperties;
}

export function Card({
  children,
  className = '',
  variant = 'default',
  hoverable = false,
  style,
}: CardProps) {
  const baseClasses = `${tailwindClasses.bg.white} ${tailwindClasses.transition.colors}`;

  const variantClasses = {
    default: `${tailwindClasses.borderBase.DEFAULT} ${tailwindClasses.border.light}`,
    outlined: `${tailwindClasses.borderBase.DEFAULT} ${tailwindClasses.border.DEFAULT}`,
  };

  const hoverClasses = hoverable ? `${tailwindClasses.hover.borderDark} ${tailwindClasses.cursor.pointer}` : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={`${tailwindClasses.spacing.cardPadding} ${tailwindClasses.borderBase.bottom} ${tailwindClasses.border.light} ${className}`}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return <h3 className={`${tailwindClasses.font.title} ${tailwindClasses.text.primary} ${className}`}>{children}</h3>;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`${tailwindClasses.spacing.cardPadding} ${className}`}>{children}</div>;
}

export default Card;
