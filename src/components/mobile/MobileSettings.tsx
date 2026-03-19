'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Moon,
  Sun,
  Bell,
  BellOff,
  Globe,
  Smartphone,
  Wifi,
  WifiOff,
  Gauge,
  Eye,
  EyeOff,
  ChevronRight,
  Check,
} from 'lucide-react';

interface MobileSettingsProps {
  className?: string;
}

type Theme = 'light' | 'dark' | 'system';
type DataMode = 'auto' | 'wifi-only' | 'low-data';

export function MobileSettings({ className = '' }: MobileSettingsProps) {
  const t = useTranslations();

  const [settings, setSettings] = useState({
    theme: 'system' as Theme,
    notifications: true,
    pushAlerts: true,
    dataMode: 'auto' as DataMode,
    compactMode: false,
    highPerformance: false,
    hideBalances: false,
    biometricAuth: false,
  });

  const updateSetting = useCallback(
    <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      // TODO: Persist settings to storage
    },
    []
  );

  const SettingItem = ({
    icon: Icon,
    label,
    description,
    children,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    description?: string;
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-4 bg-white border-b border-gray-100 active:bg-gray-50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-gray-300'
      }`}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  const SelectOption = <T extends string>({
    value,
    options,
    onChange,
  }: {
    value: T;
    options: { value: T; label: string; icon?: React.ElementType }[];
    onChange: (value: T) => void;
  }) => (
    <div className="flex gap-2">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[32px] ${
              isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`bg-gray-50 min-h-full ${className}`}>
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">{t('mobile.settings.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('mobile.settings.subtitle')}</p>
      </div>

      {/* Appearance Section */}
      <div className="mt-4">
        <div className="px-4 py-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('mobile.settings.appearance')}
          </h2>
        </div>
        <div className="bg-white">
          <SettingItem
            icon={settings.theme === 'dark' ? Moon : Sun}
            label={t('mobile.settings.theme')}
            description={t('mobile.settings.themeDesc')}
          >
            <SelectOption
              value={settings.theme}
              options={[
                { value: 'light', label: t('mobile.settings.light'), icon: Sun },
                { value: 'dark', label: t('mobile.settings.dark'), icon: Moon },
                { value: 'system', label: t('mobile.settings.system') },
              ]}
              onChange={(value) => updateSetting('theme', value)}
            />
          </SettingItem>

          <SettingItem
            icon={settings.compactMode ? EyeOff : Eye}
            label={t('mobile.settings.compactMode')}
            description={t('mobile.settings.compactModeDesc')}
          >
            <Toggle
              checked={settings.compactMode}
              onChange={(checked) => updateSetting('compactMode', checked)}
            />
          </SettingItem>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="mt-4">
        <div className="px-4 py-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('mobile.settings.notifications')}
          </h2>
        </div>
        <div className="bg-white">
          <SettingItem
            icon={settings.notifications ? Bell : BellOff}
            label={t('mobile.settings.enableNotifications')}
            description={t('mobile.settings.notificationsDesc')}
          >
            <Toggle
              checked={settings.notifications}
              onChange={(checked) => updateSetting('notifications', checked)}
            />
          </SettingItem>

          <SettingItem
            icon={Smartphone}
            label={t('mobile.settings.pushAlerts')}
            description={t('mobile.settings.pushAlertsDesc')}
          >
            <Toggle
              checked={settings.pushAlerts}
              onChange={(checked) => updateSetting('pushAlerts', checked)}
            />
          </SettingItem>
        </div>
      </div>

      {/* Data & Performance Section */}
      <div className="mt-4">
        <div className="px-4 py-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('mobile.settings.dataPerformance')}
          </h2>
        </div>
        <div className="bg-white">
          <SettingItem
            icon={settings.dataMode === 'wifi-only' ? WifiOff : Wifi}
            label={t('mobile.settings.dataMode')}
            description={t('mobile.settings.dataModeDesc')}
          >
            <SelectOption
              value={settings.dataMode}
              options={[
                { value: 'auto', label: t('mobile.settings.auto') },
                { value: 'wifi-only', label: t('mobile.settings.wifiOnly'), icon: Wifi },
                { value: 'low-data', label: t('mobile.settings.lowData') },
              ]}
              onChange={(value) => updateSetting('dataMode', value)}
            />
          </SettingItem>

          <SettingItem
            icon={Gauge}
            label={t('mobile.settings.highPerformance')}
            description={t('mobile.settings.highPerformanceDesc')}
          >
            <Toggle
              checked={settings.highPerformance}
              onChange={(checked) => updateSetting('highPerformance', checked)}
            />
          </SettingItem>

          <SettingItem
            icon={settings.hideBalances ? EyeOff : Eye}
            label={t('mobile.settings.hideBalances')}
            description={t('mobile.settings.hideBalancesDesc')}
          >
            <Toggle
              checked={settings.hideBalances}
              onChange={(checked) => updateSetting('hideBalances', checked)}
            />
          </SettingItem>
        </div>
      </div>

      {/* Language Section */}
      <div className="mt-4">
        <div className="px-4 py-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('mobile.settings.language')}
          </h2>
        </div>
        <div className="bg-white">
          <SettingItem
            icon={Globe}
            label={t('mobile.settings.language')}
            description={t('mobile.settings.currentLanguage')}
            onClick={() => {
              // TODO: Open language selector
            }}
          >
            <div className="flex items-center gap-1 text-gray-500">
              <span className="text-sm">{t('locale')}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </SettingItem>
        </div>
      </div>

      {/* About Section */}
      <div className="mt-4 mb-8">
        <div className="px-4 py-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('mobile.settings.about')}
          </h2>
        </div>
        <div className="bg-white">
          <SettingItem icon={Check} label={t('mobile.settings.version')} description="v1.0.0" />
        </div>
      </div>
    </div>
  );
}

export default MobileSettings;
