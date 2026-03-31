'use client';

import { useState, useCallback } from 'react';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function CopyButton({
  text,
  className = '',
  size = 'md',
  showTooltip = true,
}: CopyButtonProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      setError(t('common.copyFailed'));
      setTimeout(() => {
        setError(null);
      }, 2000);
    }
  }, [text, t]);

  return (
    <button
      onClick={handleCopy}
      className={`
        relative inline-flex items-center justify-center
        ${buttonSizeClasses[size]}
        text-gray-400 hover:text-gray-600
        hover:bg-gray-100 rounded-md
        transition-all duration-200
        ${className}
      `}
      title={showTooltip ? (copied ? t('common.copied') : t('common.copy')) : undefined}
    >
      {error ? (
        <span className="text-xs text-red-500">{error}</span>
      ) : copied ? (
        <Check className={`${sizeClasses[size]} text-emerald-500`} />
      ) : (
        <Copy className={sizeClasses[size]} />
      )}
    </button>
  );
}
