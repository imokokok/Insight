export type AlertConditionType = 'above' | 'below' | 'change_percent';

export interface AlertMessages {
  priceReached: string;
  priceBelow: string;
  changeReached: string;
  conditionMet: string;
}

const messages: Record<string, AlertMessages> = {
  'zh-CN': {
    priceReached: '价格 {current} 达到目标 {target}',
    priceBelow: '价格 {current} 低于目标 {target}',
    changeReached: '价格变化 {change}% 达到目标 {target}%',
    conditionMet: '条件已满足',
  },
  en: {
    priceReached: 'Price {current} reached target {target}',
    priceBelow: 'Price {current} fell below target {target}',
    changeReached: 'Price change {change}% reached target {target}%',
    conditionMet: 'Condition met',
  },
};

export function getAlertMessages(locale: string = 'zh-CN'): AlertMessages {
  return messages[locale] || messages['zh-CN'];
}

export function formatConditionMet(
  conditionType: AlertConditionType,
  currentPrice: number,
  targetValue: number,
  previousPrice?: number,
  locale: string = 'zh-CN'
): string {
  const msg = getAlertMessages(locale);

  switch (conditionType) {
    case 'above':
      return msg.priceReached
        .replace('{current}', currentPrice.toFixed(4))
        .replace('{target}', targetValue.toFixed(4));

    case 'below':
      return msg.priceBelow
        .replace('{current}', currentPrice.toFixed(4))
        .replace('{target}', targetValue.toFixed(4));

    case 'change_percent':
      if (previousPrice && previousPrice !== 0) {
        const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
        return msg.changeReached
          .replace('{change}', changePercent.toFixed(2))
          .replace('{target}', targetValue.toFixed(2));
      }
      return msg.changeReached
        .replace('{change}', '0.00')
        .replace('{target}', targetValue.toFixed(2));

    default:
      return msg.conditionMet;
  }
}

export function formatConditionMetWithI18n(
  conditionType: AlertConditionType,
  currentPrice: number,
  targetValue: number,
  previousPrice?: number
): { key: string; params: Record<string, string | number> } {
  switch (conditionType) {
    case 'above':
      return {
        key: 'alerts.conditionMet.above',
        params: {
          current: currentPrice.toFixed(4),
          target: targetValue.toFixed(4),
        },
      };

    case 'below':
      return {
        key: 'alerts.conditionMet.below',
        params: {
          current: currentPrice.toFixed(4),
          target: targetValue.toFixed(4),
        },
      };

    case 'change_percent':
      if (previousPrice && previousPrice !== 0) {
        const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
        return {
          key: 'alerts.conditionMet.changePercent',
          params: {
            change: changePercent.toFixed(2),
            target: targetValue.toFixed(2),
          },
        };
      }
      return {
        key: 'alerts.conditionMet.changePercentSimple',
        params: {
          target: targetValue.toFixed(2),
        },
      };

    default:
      return {
        key: 'alerts.conditionMet.default',
        params: {},
      };
  }
}
