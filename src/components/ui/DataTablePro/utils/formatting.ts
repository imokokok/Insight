import type { CSSProperties } from 'react';

import { semanticColors } from '@/lib/config/colors';

import type { AlignType, ConditionalFormattingRule } from '../types';

export { getNestedValue } from '@/lib/utils/format';

type ConditionEvaluator = (value: number, ruleValue: number | [number, number]) => boolean;

const CONDITION_EVALUATORS: Record<ConditionalFormattingRule['condition'], ConditionEvaluator> = {
  gt: (value, ruleValue) => value > (ruleValue as number),
  gte: (value, ruleValue) => value >= (ruleValue as number),
  lt: (value, ruleValue) => value < (ruleValue as number),
  lte: (value, ruleValue) => value <= (ruleValue as number),
  eq: (value, ruleValue) => value === ruleValue,
  between: (value, ruleValue) => {
    const [min, max] = ruleValue as [number, number];
    return value >= min && value <= max;
  },
};

export function evaluateCondition(
  value: number,
  condition: ConditionalFormattingRule['condition'],
  ruleValue: number | [number, number]
): boolean {
  return CONDITION_EVALUATORS[condition]?.(value, ruleValue) ?? false;
}

export function getConditionalStyle(style: ConditionalFormattingRule['style']): string {
  return style ? 'font-medium' : '';
}

const CONDITIONAL_STYLE_MAP: Record<ConditionalFormattingRule['style'], CSSProperties> = {
  success: {
    backgroundColor: semanticColors.success.light,
    color: semanticColors.success.text,
  },
  danger: {
    backgroundColor: semanticColors.danger.light,
    color: semanticColors.danger.text,
  },
  warning: {
    backgroundColor: semanticColors.warning.light,
    color: semanticColors.warning.text,
  },
  info: {
    backgroundColor: semanticColors.info.light,
    color: semanticColors.info.text,
  },
};

export function getConditionalStyleCSS(style: ConditionalFormattingRule['style']): CSSProperties {
  return CONDITIONAL_STYLE_MAP[style] ?? {};
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
