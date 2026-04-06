import type { CSSProperties } from 'react';

import { semanticColors } from '@/lib/config/colors';

import type { AlignType, ConditionalFormattingRule } from '../types';

export function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function evaluateCondition(
  value: number,
  condition: ConditionalFormattingRule['condition'],
  ruleValue: number | [number, number]
): boolean {
  switch (condition) {
    case 'gt':
      return value > (ruleValue as number);
    case 'gte':
      return value >= (ruleValue as number);
    case 'lt':
      return value < (ruleValue as number);
    case 'lte':
      return value <= (ruleValue as number);
    case 'eq':
      return value === ruleValue;
    case 'between':
      const [min, max] = ruleValue as [number, number];
      return value >= min && value <= max;
    default:
      return false;
  }
}

export function getConditionalStyle(style: ConditionalFormattingRule['style']): string {
  switch (style) {
    case 'success':
      return 'font-medium';
    case 'danger':
      return 'font-medium';
    case 'warning':
      return 'font-medium';
    case 'info':
      return 'font-medium';
    default:
      return '';
  }
}

export function getConditionalStyleCSS(style: ConditionalFormattingRule['style']): CSSProperties {
  switch (style) {
    case 'success':
      return {
        backgroundColor: semanticColors.success.light,
        color: semanticColors.success.text,
      };
    case 'danger':
      return {
        backgroundColor: semanticColors.danger.light,
        color: semanticColors.danger.text,
      };
    case 'warning':
      return {
        backgroundColor: semanticColors.warning.light,
        color: semanticColors.warning.text,
      };
    case 'info':
      return {
        backgroundColor: semanticColors.info.light,
        color: semanticColors.info.text,
      };
    default:
      return {};
  }
}

export function getAlignClass(align?: AlignType): string {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    case 'left':
    default:
      return 'text-left';
  }
}
