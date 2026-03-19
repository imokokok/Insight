'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'default' | 'high-contrast' | 'dark';
export type ColorScheme = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface AccessibilitySettings {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  fontSize: 'normal' | 'large' | 'x-large';
  reduceMotion: boolean;
  focusIndicator: 'default' | 'enhanced';
}

interface ThemeContextType {
  settings: AccessibilitySettings;
  setThemeMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setFontSize: (size: AccessibilitySettings['fontSize']) => void;
  setReduceMotion: (reduce: boolean) => void;
  setFocusIndicator: (indicator: AccessibilitySettings['focusIndicator']) => void;
  toggleHighContrast: () => void;
  resetSettings: () => void;
  isHighContrast: boolean;
}

const defaultSettings: AccessibilitySettings = {
  themeMode: 'default',
  colorScheme: 'normal',
  fontSize: 'normal',
  reduceMotion: false,
  focusIndicator: 'default',
};

const STORAGE_KEY = 'insight-accessibility-settings';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 localStorage 加载设置
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load accessibility settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // 保存设置到 localStorage
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save accessibility settings:', error);
    }
  }, [settings, isLoaded]);

  // 应用主题类到 document
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // 清除所有主题类
    root.classList.remove(
      'theme-high-contrast',
      'theme-dark',
      'color-protanopia',
      'color-deuteranopia',
      'color-tritanopia',
      'color-achromatopsia',
      'font-large',
      'font-x-large',
      'reduce-motion',
      'focus-enhanced'
    );

    // 应用主题模式
    if (settings.themeMode === 'high-contrast') {
      root.classList.add('theme-high-contrast');
    } else if (settings.themeMode === 'dark') {
      root.classList.add('theme-dark');
    }

    // 应用色觉辅助
    if (settings.colorScheme !== 'normal') {
      root.classList.add(`color-${settings.colorScheme}`);
    }

    // 应用字体大小
    if (settings.fontSize !== 'normal') {
      root.classList.add(`font-${settings.fontSize}`);
    }

    // 应用减少动画
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    }

    // 应用焦点指示器
    if (settings.focusIndicator === 'enhanced') {
      root.classList.add('focus-enhanced');
    }
  }, [settings]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setSettings((prev) => ({ ...prev, themeMode: mode }));
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setSettings((prev) => ({ ...prev, colorScheme: scheme }));
  }, []);

  const setFontSize = useCallback((size: AccessibilitySettings['fontSize']) => {
    setSettings((prev) => ({ ...prev, fontSize: size }));
  }, []);

  const setReduceMotion = useCallback((reduce: boolean) => {
    setSettings((prev) => ({ ...prev, reduceMotion: reduce }));
  }, []);

  const setFocusIndicator = useCallback((indicator: AccessibilitySettings['focusIndicator']) => {
    setSettings((prev) => ({ ...prev, focusIndicator: indicator }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      themeMode: prev.themeMode === 'high-contrast' ? 'default' : 'high-contrast',
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const value: ThemeContextType = {
    settings,
    setThemeMode,
    setColorScheme,
    setFontSize,
    setReduceMotion,
    setFocusIndicator,
    toggleHighContrast,
    resetSettings,
    isHighContrast: settings.themeMode === 'high-contrast',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function useHighContrast() {
  const { isHighContrast, toggleHighContrast } = useTheme();
  return { isHighContrast, toggleHighContrast };
}
