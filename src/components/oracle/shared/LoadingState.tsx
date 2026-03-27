'use client';

import { useTranslations } from '@/i18n';

interface LoadingStateProps {
  themeColor?: string;
  message?: string;
}

// 预定义的 Tailwind 颜色映射
const tailwindColorStyles: Record<string, string> = {
  blue: 'border-blue-200 border-t-blue-600',
  green: 'border-green-200 border-t-green-600',
  purple: 'border-purple-200 border-t-purple-600',
  red: 'border-red-200 border-t-red-600',
  orange: 'border-orange-200 border-t-orange-600',
  indigo: 'border-indigo-200 border-t-indigo-600',
  pink: 'border-pink-200 border-t-pink-600',
  cyan: 'border-cyan-200 border-t-cyan-600',
  yellow: 'border-yellow-200 border-t-yellow-600',
};

// 判断是否为十六进制颜色值
const isHexColor = (color: string): boolean => {
  return color.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(color);
};

export function LoadingState({ themeColor = 'blue', message }: LoadingStateProps) {
  const t = useTranslations();

  // 如果是十六进制颜色，使用内联样式
  const hexColor = isHexColor(themeColor) ? themeColor : null;

  // 获取边框类名（如果不是十六进制颜色）
  const borderClasses = hexColor ? '' : (tailwindColorStyles[themeColor] || tailwindColorStyles.blue);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className={`w-12 h-12 border-4 rounded-full animate-spin ${borderClasses}`}
          style={hexColor ? {
            borderColor: `${hexColor}33`, // 20% 透明度
            borderTopColor: hexColor,
          } : undefined}
        />
        <p className="text-gray-500">{message || t('status.loading')}</p>
      </div>
    </div>
  );
}
