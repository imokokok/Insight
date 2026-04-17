'use client';

import { useState } from 'react';

import { Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showToggle?: boolean;
}

export function PasswordInput({ showToggle = true, className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations();

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Lock className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type={showPassword ? 'text' : 'password'}
        className={
          className ??
          'w-full pl-12 pr-12 py-3 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors rounded-md'
        }
        {...props}
      />
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-4 flex items-center"
          aria-label={
            showPassword ? t('crossOracle.ui.hidePassword') : t('crossOracle.ui.showPassword')
          }
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          )}
        </button>
      )}
    </div>
  );
}
