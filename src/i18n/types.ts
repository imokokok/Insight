// 类型定义文件 - 将在迁移完成后启用完整类型
// 目前使用动态类型以支持渐进式迁移

import { type Locale } from './config';

export type { Locale };

// 基础消息类型
export type Messages = Record<string, unknown>;

// 翻译函数类型
export type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

// i18n Context 类型
export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFunction;
}

// 动态加载的消息类型
export interface LoadedMessages {
  [key: string]: Messages;
}
