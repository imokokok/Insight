/**
 * @fileoverview 主题相关类型定义
 * @description 定义颜色、间距、圆角、阴影等设计系统类型
 */

// ============================================================================
// 颜色类型
// ============================================================================

/**
 * 主题颜色类型
 */
export type ThemeColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

/**
 * 颜色变体类型
 */
export type ColorVariant = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';

/**
 * 颜色强度类型（简化版）
 */
export type ColorIntensity = 'light' | 'DEFAULT' | 'dark';

/**
 * 状态颜色类型
 */
export type StatusColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * 颜色配置
 */
export interface ColorConfig {
  DEFAULT: string;
  light?: string;
  dark?: string;
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;
}

/**
 * 完整主题颜色配置
 */
export interface ThemeColors {
  primary: ColorConfig;
  secondary: ColorConfig;
  success: ColorConfig;
  warning: ColorConfig;
  danger: ColorConfig;
  info: ColorConfig;
  neutral: ColorConfig;
  gray: ColorConfig;
  background: {
    DEFAULT: string;
    secondary: string;
    tertiary: string;
  };
  foreground: {
    DEFAULT: string;
    secondary: string;
    tertiary: string;
  };
  border: {
    DEFAULT: string;
    secondary: string;
    focus: string;
  };
}

// ============================================================================
// 圆角类型
// ============================================================================

/**
 * 圆角大小类型
 */
export type RadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

/**
 * 圆角配置
 */
export interface RadiusConfig {
  none: '0';
  sm: '0.25rem'; // 4px
  md: '0.375rem'; // 6px
  lg: '0.5rem'; // 8px
  xl: '0.75rem'; // 12px
  '2xl': '1rem'; // 16px
  '3xl': '1.5rem'; // 24px
  full: '9999px';
}

// ============================================================================
// 间距类型
// ============================================================================

/**
 * 间距大小类型
 */
export type SpacingSize = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20' | '24' | '32' | '40' | '48' | '56' | '64';

/**
 * 间距配置（单位：rem）
 */
export interface SpacingConfig {
  0: '0';
  1: '0.25rem'; // 4px
  2: '0.5rem'; // 8px
  3: '0.75rem'; // 12px
  4: '1rem'; // 16px
  5: '1.25rem'; // 20px
  6: '1.5rem'; // 24px
  8: '2rem'; // 32px
  10: '2.5rem'; // 40px
  12: '3rem'; // 48px
  16: '4rem'; // 64px
  20: '5rem'; // 80px
  24: '6rem'; // 96px
  32: '8rem'; // 128px
  40: '10rem'; // 160px
  48: '12rem'; // 192px
  56: '14rem'; // 224px
  64: '16rem'; // 256px
}

// ============================================================================
// 阴影类型
// ============================================================================

/**
 * 阴影大小类型
 */
export type ShadowSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'inner' | 'outline';

/**
 * 阴影配置
 */
export interface ShadowConfig {
  none: 'none';
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)';
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)';
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)';
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)';
  outline: '0 0 0 3px rgb(59 130 246 / 0.5)';
}

// ============================================================================
// 字体类型
// ============================================================================

/**
 * 字体大小类型
 */
export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';

/**
 * 字体粗细类型
 */
export type FontWeight = 'thin' | 'extralight' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';

/**
 * 行高类型
 */
export type LineHeight = 'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';

/**
 * 字体配置
 */
export interface FontConfig {
  family: {
    sans: string;
    serif: string;
    mono: string;
  };
  size: Record<FontSize, string>;
  weight: Record<FontWeight, number>;
  lineHeight: Record<LineHeight, number>;
}

// ============================================================================
// 断点类型
// ============================================================================

/**
 * 断点配置（单位：px）
 */
export interface BreakpointConfig {
  sm: '640px';
  md: '768px';
  lg: '1024px';
  xl: '1280px';
  '2xl': '1536px';
}

/**
 * 容器最大宽度配置
 */
export interface ContainerConfig {
  sm: '640px';
  md: '768px';
  lg: '1024px';
  xl: '1280px';
  '2xl': '1536px';
}

// ============================================================================
// 过渡和动画类型
// ============================================================================

/**
 * 过渡持续时间类型
 */
export type TransitionDuration = 'fast' | 'normal' | 'slow';

/**
 * 缓动函数类型
 */
export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'spring';

/**
 * 过渡配置
 */
export interface TransitionConfig {
  duration: {
    fast: '150ms';
    normal: '200ms';
    slow: '300ms';
  };
  easing: {
    linear: 'linear';
    ease: 'ease';
    'ease-in': 'ease-in';
    'ease-out': 'ease-out';
    'ease-in-out': 'ease-in-out';
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  };
}

// ============================================================================
// Z-Index 类型
// ============================================================================

/**
 * Z-Index 层级类型
 */
export type ZIndexLevel = 'hide' | 'base' | 'dropdown' | 'sticky' | 'fixed' | 'modal' | 'popover' | 'tooltip' | 'toast';

/**
 * Z-Index 配置
 */
export interface ZIndexConfig {
  hide: -1;
  base: 0;
  dropdown: 1000;
  sticky: 1020;
  fixed: 1030;
  modal: 1040;
  popover: 1050;
  tooltip: 1060;
  toast: 1070;
}

// ============================================================================
// 完整主题配置
// ============================================================================

/**
 * 完整主题配置接口
 */
export interface ThemeConfig {
  colors: ThemeColors;
  radius: RadiusConfig;
  spacing: SpacingConfig;
  shadow: ShadowConfig;
  font: FontConfig;
  breakpoint: BreakpointConfig;
  container: ContainerConfig;
  transition: TransitionConfig;
  zIndex: ZIndexConfig;
}

// ============================================================================
// 主题模式类型
// ============================================================================

/**
 * 主题模式类型
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 主题上下文值
 */
export interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isDark: boolean;
  theme: ThemeConfig;
}

// ============================================================================
// 组件特定主题类型
// ============================================================================

/**
 * 按钮主题配置
 */
export interface ButtonThemeConfig {
  borderRadius: RadiusSize;
  fontWeight: FontWeight;
  sizes: Record<'sm' | 'md' | 'lg', { padding: string; fontSize: FontSize; height: string }>;
}

/**
 * 卡片主题配置
 */
export interface CardThemeConfig {
  borderRadius: RadiusSize;
  shadow: ShadowSize;
  padding: Record<'sm' | 'md' | 'lg', string>;
}

/**
 * 输入框主题配置
 */
export interface InputThemeConfig {
  borderRadius: RadiusSize;
  borderColor: string;
  focusBorderColor: string;
  focusRingColor: string;
  sizes: Record<'sm' | 'md' | 'lg', { padding: string; fontSize: FontSize; height: string }>;
}

// ============================================================================
// 语义化颜色类型
// ============================================================================

/**
 * 语义化背景颜色类型
 */
export type BackgroundColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

/**
 * 语义化文字颜色类型
 */
export type TextColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'disabled';

/**
 * 语义化边框颜色类型
 */
export type BorderColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'focus';
