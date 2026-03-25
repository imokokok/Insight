'use client';

import React from 'react';
import { useTranslations } from '@/i18n';
import { Contrast } from 'lucide-react';
import { Type } from 'lucide-react';
import { Palette } from 'lucide-react';
import { Monitor } from 'lucide-react';
import { Focus } from 'lucide-react';
import { RotateCcw } from 'lucide-react';
import { Check } from 'lucide-react';
import { Eye } from 'lucide-react';
import {
  useTheme,
  type ThemeMode,
  type ColorScheme,
  type AccessibilitySettings,
} from './ThemeContext';
import { motion } from 'framer-motion';

interface SettingSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingSection({ title, icon, children }: SettingSectionProps) {
  return (
    <section className="border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-600">{icon}</span>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

interface OptionButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  description?: string;
}

function OptionButton({ label, isSelected, onClick, description }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3 border transition-all
        ${
          isSelected
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
      aria-pressed={isSelected}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-sm font-medium ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
            {label}
          </span>
          {description && (
            <p className={`text-xs mt-0.5 ${isSelected ? 'text-primary-700' : 'text-gray-500'}`}>
              {description}
            </p>
          )}
        </div>
        {isSelected && <Check className="w-5 h-5 text-primary-600" aria-hidden="true" />}
      </div>
    </button>
  );
}

export function AccessibilitySettings() {
  const t = useTranslations('accessibility');
  const {
    settings,
    setThemeMode,
    setColorScheme,
    setFontSize,
    setReduceMotion,
    setFocusIndicator,
    resetSettings,
  } = useTheme();

  const themeModes: { value: ThemeMode; label: string; description: string }[] = [
    {
      value: 'default',
      label: t('theme.default'),
      description: t('theme.defaultDescription'),
    },
    {
      value: 'high-contrast',
      label: t('theme.highContrast'),
      description: t('theme.highContrastDescription'),
    },
    {
      value: 'dark',
      label: t('theme.dark'),
      description: t('theme.darkDescription'),
    },
  ];

  const colorSchemes: { value: ColorScheme; label: string; description: string }[] = [
    {
      value: 'normal',
      label: t('colorScheme.normal'),
      description: t('colorScheme.normalDescription'),
    },
    {
      value: 'protanopia',
      label: t('colorScheme.protanopia'),
      description: t('colorScheme.protanopiaDescription'),
    },
    {
      value: 'deuteranopia',
      label: t('colorScheme.deuteranopia'),
      description: t('colorScheme.deuteranopiaDescription'),
    },
    {
      value: 'tritanopia',
      label: t('colorScheme.tritanopia'),
      description: t('colorScheme.tritanopiaDescription'),
    },
    {
      value: 'achromatopsia',
      label: t('colorScheme.achromatopsia'),
      description: t('colorScheme.achromatopsiaDescription'),
    },
  ];

  const fontSizes: {
    value: AccessibilitySettings['fontSize'];
    label: string;
    description: string;
  }[] = [
    {
      value: 'normal',
      label: t('fontSize.normal'),
      description: t('fontSize.normalDescription'),
    },
    {
      value: 'large',
      label: t('fontSize.large'),
      description: t('fontSize.largeDescription'),
    },
    {
      value: 'x-large',
      label: t('fontSize.xLarge'),
      description: t('fontSize.xLargeDescription'),
    },
  ];

  const focusIndicators: {
    value: AccessibilitySettings['focusIndicator'];
    label: string;
    description: string;
  }[] = [
    {
      value: 'default',
      label: t('focusIndicator.default'),
      description: t('focusIndicator.defaultDescription'),
    },
    {
      value: 'enhanced',
      label: t('focusIndicator.enhanced'),
      description: t('focusIndicator.enhancedDescription'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
          <p className="text-sm text-gray-600 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={resetSettings}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          {t('resetSettings')}
        </button>
      </div>

      <div className="grid gap-4">
        <SettingSection title={t('sections.theme')} icon={<Contrast className="w-5 h-5" />}>
          <div className="grid gap-2 sm:grid-cols-3">
            {themeModes.map((mode) => (
              <OptionButton
                key={mode.value}
                label={mode.label}
                description={mode.description}
                isSelected={settings.themeMode === mode.value}
                onClick={() => setThemeMode(mode.value)}
              />
            ))}
          </div>
        </SettingSection>

        <SettingSection title={t('sections.colorVision')} icon={<Eye className="w-5 h-5" />}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {colorSchemes.map((scheme) => (
              <OptionButton
                key={scheme.value}
                label={scheme.label}
                description={scheme.description}
                isSelected={settings.colorScheme === scheme.value}
                onClick={() => setColorScheme(scheme.value)}
              />
            ))}
          </div>
        </SettingSection>

        <SettingSection title={t('sections.fontSize')} icon={<Type className="w-5 h-5" />}>
          <div className="grid gap-2 sm:grid-cols-3">
            {fontSizes.map((size) => (
              <OptionButton
                key={size.value}
                label={size.label}
                description={size.description}
                isSelected={settings.fontSize === size.value}
                onClick={() => setFontSize(size.value)}
              />
            ))}
          </div>
        </SettingSection>

        <SettingSection title={t('sections.focusIndicator')} icon={<Focus className="w-5 h-5" />}>
          <div className="grid gap-2 sm:grid-cols-2">
            {focusIndicators.map((indicator) => (
              <OptionButton
                key={indicator.value}
                label={indicator.label}
                description={indicator.description}
                isSelected={settings.focusIndicator === indicator.value}
                onClick={() => setFocusIndicator(indicator.value)}
              />
            ))}
          </div>
        </SettingSection>

        <SettingSection title={t('sections.motion')} icon={<Monitor className="w-5 h-5" />}>
          <div className="flex items-center justify-between p-3 border border-gray-200">
            <div>
              <span className="text-sm font-medium text-gray-900">{t('reduceMotion')}</span>
              <p className="text-xs text-gray-500 mt-0.5">{t('reduceMotionDescription')}</p>
            </div>
            <button
              onClick={() => setReduceMotion(!settings.reduceMotion)}
              className={`
                relative inline-flex h-6 w-11 items-center transition-colors
                ${settings.reduceMotion ? 'bg-primary-600' : 'bg-gray-200'}
              `}
              role="switch"
              aria-checked={settings.reduceMotion}
              aria-label={t('reduceMotion')}
            >
              <motion.span
                className="inline-block h-4 w-4 bg-white"
                animate={{ x: settings.reduceMotion ? 24 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </SettingSection>
      </div>

      <div className="bg-primary-50 border border-primary-200 p-4">
        <div className="flex items-start gap-3">
          <Palette className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-medium text-primary-900">{t('preview.title')}</h4>
            <p className="text-sm text-primary-700 mt-1">{t('preview.description')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-white border border-primary-200 text-primary-800">
                {t('preview.sampleText')}
              </span>
              <button className="inline-flex items-center px-3 py-1 text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                {t('preview.sampleButton')}
              </button>
              <a
                href="#"
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-primary-600 underline hover:text-primary-800"
              >
                {t('preview.sampleLink')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccessibilitySettingsButton() {
  const t = useTranslations('accessibility');
  const { isHighContrast, toggleHighContrast } = useTheme();

  return (
    <button
      onClick={toggleHighContrast}
      className={`
        inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors
        ${
          isHighContrast
            ? 'bg-yellow-400 text-black border-2 border-black'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }
      `}
      aria-pressed={isHighContrast}
      aria-label={isHighContrast ? t('disableHighContrast') : t('enableHighContrast')}
      title={isHighContrast ? t('disableHighContrast') : t('enableHighContrast')}
    >
      <Contrast className="w-4 h-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        {isHighContrast ? t('highContrastOn') : t('highContrast')}
      </span>
    </button>
  );
}
