import type { PriceAlert } from '@/lib/supabase/queries';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    gte: jest.fn().mockReturnThis(),
  },
  queries: {
    triggerAlert: jest.fn().mockResolvedValue(null),
  },
}));

import { checkAlertCondition, formatConditionMet } from '../detector';
import { queries } from '@/lib/supabase/client';

describe('Alert Detector', () => {
  describe('checkAlertCondition', () => {
    const createMockAlert = (
      conditionType: 'above' | 'below' | 'change_percent',
      targetValue: number
    ): PriceAlert => ({
      id: 'test-alert-id',
      user_id: 'test-user-id',
      name: 'Test Alert',
      symbol: 'BTC',
      chain: null,
      condition_type: conditionType,
      target_value: targetValue,
      provider: null,
      is_active: true,
      last_triggered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    it('should trigger "above" condition when price reaches target', () => {
      const alert = createMockAlert('above', 70000);
      const result = checkAlertCondition(alert, 70000);
      expect(result).toBe(true);
    });

    it('should trigger "above" condition when price exceeds target', () => {
      const alert = createMockAlert('above', 70000);
      const result = checkAlertCondition(alert, 71000);
      expect(result).toBe(true);
    });

    it('should not trigger "above" condition when price is below target', () => {
      const alert = createMockAlert('above', 70000);
      const result = checkAlertCondition(alert, 69000);
      expect(result).toBe(false);
    });

    it('should trigger "below" condition when price reaches target', () => {
      const alert = createMockAlert('below', 60000);
      const result = checkAlertCondition(alert, 60000);
      expect(result).toBe(true);
    });

    it('should trigger "below" condition when price is below target', () => {
      const alert = createMockAlert('below', 60000);
      const result = checkAlertCondition(alert, 59000);
      expect(result).toBe(true);
    });

    it('should not trigger "below" condition when price is above target', () => {
      const alert = createMockAlert('below', 60000);
      const result = checkAlertCondition(alert, 61000);
      expect(result).toBe(false);
    });

    it('should trigger "change_percent" condition when change exceeds target', () => {
      const alert = createMockAlert('change_percent', 5);
      const result = checkAlertCondition(alert, 73500, 70000);
      expect(result).toBe(true);
    });

    it('should not trigger "change_percent" condition when change is below target', () => {
      const alert = createMockAlert('change_percent', 5);
      const result = checkAlertCondition(alert, 71000, 70000);
      expect(result).toBe(false);
    });

    it('should not trigger "change_percent" condition when previous price is zero', () => {
      const alert = createMockAlert('change_percent', 5);
      const result = checkAlertCondition(alert, 70000, 0);
      expect(result).toBe(false);
    });

    it('should not trigger "change_percent" condition when previous price is undefined', () => {
      const alert = createMockAlert('change_percent', 5);
      const result = checkAlertCondition(alert, 70000);
      expect(result).toBe(false);
    });

    it('should handle negative price changes', () => {
      const alert = createMockAlert('change_percent', 5);
      const result = checkAlertCondition(alert, 66500, 70000);
      expect(result).toBe(true);
    });
  });

  describe('checkAlertCondition - 边界条件测试', () => {
    const createMockAlert = (
      conditionType: 'above' | 'below' | 'change_percent',
      targetValue: number
    ): PriceAlert => ({
      id: 'test-alert-id',
      user_id: 'test-user-id',
      name: 'Test Alert',
      symbol: 'BTC',
      chain: null,
      condition_type: conditionType,
      target_value: targetValue,
      provider: null,
      is_active: true,
      last_triggered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    describe('零价格处理', () => {
      it('should handle zero current price for "above" condition', () => {
        const alert = createMockAlert('above', 0);
        const result = checkAlertCondition(alert, 0);
        expect(result).toBe(true);
      });

      it('should not trigger "above" when target is positive and price is zero', () => {
        const alert = createMockAlert('above', 100);
        const result = checkAlertCondition(alert, 0);
        expect(result).toBe(false);
      });

      it('should handle zero current price for "below" condition', () => {
        const alert = createMockAlert('below', 0);
        const result = checkAlertCondition(alert, 0);
        expect(result).toBe(true);
      });

      it('should trigger "below" when target is positive and price is zero', () => {
        const alert = createMockAlert('below', 100);
        const result = checkAlertCondition(alert, 0);
        expect(result).toBe(true);
      });

      it('should not trigger "change_percent" when current price is zero', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 0, 100);
        expect(result).toBe(true);
      });

      it('should not trigger "change_percent" when both prices are zero', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 0, 0);
        expect(result).toBe(false);
      });
    });

    describe('负价格处理', () => {
      it('should handle negative current price for "above" condition', () => {
        const alert = createMockAlert('above', -100);
        const result = checkAlertCondition(alert, -50);
        expect(result).toBe(true);
      });

      it('should not trigger "above" when price is more negative than target', () => {
        const alert = createMockAlert('above', -100);
        const result = checkAlertCondition(alert, -200);
        expect(result).toBe(false);
      });

      it('should handle negative current price for "below" condition', () => {
        const alert = createMockAlert('below', -100);
        const result = checkAlertCondition(alert, -150);
        expect(result).toBe(true);
      });

      it('should not trigger "below" when price is less negative than target', () => {
        const alert = createMockAlert('below', -100);
        const result = checkAlertCondition(alert, -50);
        expect(result).toBe(false);
      });

      it('should handle negative target value for "above" condition', () => {
        const alert = createMockAlert('above', -50);
        expect(checkAlertCondition(alert, -40)).toBe(true);
        expect(checkAlertCondition(alert, -60)).toBe(false);
      });

      it('should handle negative target value for "below" condition', () => {
        const alert = createMockAlert('below', -50);
        expect(checkAlertCondition(alert, -60)).toBe(true);
        expect(checkAlertCondition(alert, -40)).toBe(false);
      });

      it('should handle change_percent with negative prices', () => {
        const alert = createMockAlert('change_percent', 10);
        const result = checkAlertCondition(alert, -110, -100);
        expect(result).toBe(true);
      });
    });

    describe('极大值处理', () => {
      it('should handle Number.MAX_SAFE_INTEGER for "above" condition', () => {
        const alert = createMockAlert('above', Number.MAX_SAFE_INTEGER - 1);
        const result = checkAlertCondition(alert, Number.MAX_SAFE_INTEGER);
        expect(result).toBe(true);
      });

      it('should not trigger "above" when price is less than MAX_SAFE_INTEGER target', () => {
        const alert = createMockAlert('above', Number.MAX_SAFE_INTEGER);
        const result = checkAlertCondition(alert, Number.MAX_SAFE_INTEGER - 1);
        expect(result).toBe(false);
      });

      it('should handle Number.MAX_SAFE_INTEGER for "below" condition', () => {
        const alert = createMockAlert('below', Number.MAX_SAFE_INTEGER);
        const result = checkAlertCondition(alert, Number.MAX_SAFE_INTEGER - 1);
        expect(result).toBe(true);
      });

      it('should handle very large target value for "change_percent"', () => {
        const alert = createMockAlert('change_percent', 1);
        const largeValue = Number.MAX_SAFE_INTEGER / 2;
        const result = checkAlertCondition(alert, largeValue * 1.02, largeValue);
        expect(result).toBe(true);
      });

      it('should handle MAX_SAFE_INTEGER as target value', () => {
        const alert = createMockAlert('above', Number.MAX_SAFE_INTEGER);
        expect(checkAlertCondition(alert, Number.MAX_SAFE_INTEGER)).toBe(true);
      });
    });

    describe('极小值处理', () => {
      it('should handle Number.MIN_VALUE for "above" condition', () => {
        const alert = createMockAlert('above', 0);
        const result = checkAlertCondition(alert, Number.MIN_VALUE);
        expect(result).toBe(true);
      });

      it('should handle Number.MIN_VALUE for "below" condition', () => {
        const alert = createMockAlert('below', Number.MIN_VALUE);
        const result = checkAlertCondition(alert, 0);
        expect(result).toBe(true);
      });

      it('should handle very small positive values for "change_percent"', () => {
        const alert = createMockAlert('change_percent', 50);
        const smallValue = Number.MIN_VALUE;
        const result = checkAlertCondition(alert, smallValue * 2, smallValue);
        expect(result).toBe(true);
      });

      it('should handle epsilon-level differences for "above"', () => {
        const alert = createMockAlert('above', 1);
        const result = checkAlertCondition(alert, 1 + Number.EPSILON);
        expect(result).toBe(true);
      });
    });

    describe('NaN 和 Infinity 处理', () => {
      it('should return false for NaN current price in "above" condition', () => {
        const alert = createMockAlert('above', 100);
        const result = checkAlertCondition(alert, NaN);
        expect(result).toBe(false);
      });

      it('should return false for NaN current price in "below" condition', () => {
        const alert = createMockAlert('below', 100);
        const result = checkAlertCondition(alert, NaN);
        expect(result).toBe(false);
      });

      it('should return false for NaN current price in "change_percent" condition', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, NaN, 100);
        expect(result).toBe(false);
      });

      it('should return false for NaN previous price in "change_percent" condition', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 100, NaN);
        expect(result).toBe(false);
      });

      it('should handle Infinity for "above" condition', () => {
        const alert = createMockAlert('above', Number.MAX_SAFE_INTEGER);
        const result = checkAlertCondition(alert, Infinity);
        expect(result).toBe(true);
      });

      it('should handle Infinity for "below" condition', () => {
        const alert = createMockAlert('below', Infinity);
        const result = checkAlertCondition(alert, Number.MAX_SAFE_INTEGER);
        expect(result).toBe(true);
      });

      it('should return false for -Infinity in "above" condition with positive target', () => {
        const alert = createMockAlert('above', 0);
        const result = checkAlertCondition(alert, -Infinity);
        expect(result).toBe(false);
      });

      it('should handle Infinity in "change_percent" calculation', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, Infinity, 100);
        expect(result).toBe(true);
      });

      it('should return false when previous price is Infinity in "change_percent"', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 100, Infinity);
        expect(result).toBe(false);
      });

      it('should handle NaN target value', () => {
        const alert = createMockAlert('above', NaN);
        const result = checkAlertCondition(alert, 100);
        expect(result).toBe(false);
      });

      it('should handle Infinity target value for "above"', () => {
        const alert = createMockAlert('above', Infinity);
        const result = checkAlertCondition(alert, Number.MAX_SAFE_INTEGER);
        expect(result).toBe(false);
      });
    });
  });

  describe('checkAlertCondition - 并发告警测试', () => {
    const createMockAlert = (
      id: string,
      conditionType: 'above' | 'below' | 'change_percent',
      targetValue: number,
      symbol: string = 'BTC'
    ): PriceAlert => ({
      id,
      user_id: 'test-user-id',
      name: `Test Alert ${id}`,
      symbol,
      chain: null,
      condition_type: conditionType,
      target_value: targetValue,
      provider: null,
      is_active: true,
      last_triggered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    describe('多个告警同时触发', () => {
      it('should correctly evaluate multiple alerts with same condition type', () => {
        const alerts = [
          createMockAlert('alert-1', 'above', 50000),
          createMockAlert('alert-2', 'above', 60000),
          createMockAlert('alert-3', 'above', 70000),
        ];

        const currentPrice = 65000;
        const results = alerts.map((alert) => checkAlertCondition(alert, currentPrice));

        expect(results[0]).toBe(true);
        expect(results[1]).toBe(true);
        expect(results[2]).toBe(false);
      });

      it('should correctly evaluate mixed condition types simultaneously', () => {
        const alerts = [
          createMockAlert('alert-1', 'above', 60000),
          createMockAlert('alert-2', 'below', 50000),
          createMockAlert('alert-3', 'change_percent', 5),
        ];

        const currentPrice = 65000;
        const previousPrice = 60000;
        const results = alerts.map((alert) =>
          alert.condition_type === 'change_percent'
            ? checkAlertCondition(alert, currentPrice, previousPrice)
            : checkAlertCondition(alert, currentPrice)
        );

        expect(results[0]).toBe(true);
        expect(results[1]).toBe(false);
        expect(results[2]).toBe(true);
      });

      it('should handle all alerts triggering at once', () => {
        const alerts = [
          createMockAlert('alert-1', 'above', 50000),
          createMockAlert('alert-2', 'below', 80000),
          createMockAlert('alert-3', 'change_percent', 1),
        ];

        const currentPrice = 60000;
        const previousPrice = 55000;
        const results = alerts.map((alert) =>
          alert.condition_type === 'change_percent'
            ? checkAlertCondition(alert, currentPrice, previousPrice)
            : checkAlertCondition(alert, currentPrice)
        );

        expect(results.every((r) => r === true)).toBe(true);
      });

      it('should handle no alerts triggering', () => {
        const alerts = [
          createMockAlert('alert-1', 'above', 80000),
          createMockAlert('alert-2', 'below', 40000),
          createMockAlert('alert-3', 'change_percent', 50),
        ];

        const currentPrice = 60000;
        const previousPrice = 59000;
        const results = alerts.map((alert) =>
          alert.condition_type === 'change_percent'
            ? checkAlertCondition(alert, currentPrice, previousPrice)
            : checkAlertCondition(alert, currentPrice)
        );

        expect(results.every((r) => r === false)).toBe(true);
      });
    });

    describe('同一资产的多个条件', () => {
      it('should handle multiple conditions for same asset with different thresholds', () => {
        const btcAlerts = [
          createMockAlert('btc-above-1', 'above', 50000, 'BTC'),
          createMockAlert('btc-above-2', 'above', 60000, 'BTC'),
          createMockAlert('btc-below-1', 'below', 40000, 'BTC'),
        ];

        const currentPrice = 55000;
        const results = btcAlerts.map((alert) => checkAlertCondition(alert, currentPrice));

        expect(results[0]).toBe(true);
        expect(results[1]).toBe(false);
        expect(results[2]).toBe(false);
      });

      it('should handle overlapping conditions for same asset', () => {
        const alerts = [
          createMockAlert('alert-1', 'above', 50000, 'BTC'),
          createMockAlert('alert-2', 'below', 70000, 'BTC'),
        ];

        const currentPrice = 60000;
        const results = alerts.map((alert) => checkAlertCondition(alert, currentPrice));

        expect(results[0]).toBe(true);
        expect(results[1]).toBe(true);
      });

      it('should handle change_percent with other conditions for same asset', () => {
        const alerts = [
          createMockAlert('alert-1', 'above', 50000, 'BTC'),
          createMockAlert('alert-2', 'change_percent', 5, 'BTC'),
        ];

        const currentPrice = 55000;
        const previousPrice = 50000;
        const results = alerts.map((alert) =>
          alert.condition_type === 'change_percent'
            ? checkAlertCondition(alert, currentPrice, previousPrice)
            : checkAlertCondition(alert, currentPrice)
        );

        expect(results[0]).toBe(true);
        expect(results[1]).toBe(true);
      });
    });

    describe('不同资产的告警', () => {
      it('should correctly evaluate alerts for different assets', () => {
        const alerts = [
          createMockAlert('btc-alert', 'above', 50000, 'BTC'),
          createMockAlert('eth-alert', 'above', 3000, 'ETH'),
          createMockAlert('sol-alert', 'above', 100, 'SOL'),
        ];

        const priceMap = new Map([
          ['BTC', 55000],
          ['ETH', 2500],
          ['SOL', 150],
        ]);

        const results = alerts.map((alert) => {
          const price = priceMap.get(alert.symbol) ?? 0;
          return checkAlertCondition(alert, price);
        });

        expect(results[0]).toBe(true);
        expect(results[1]).toBe(false);
        expect(results[2]).toBe(true);
      });

      it('should handle mixed conditions across different assets', () => {
        const alerts = [
          { alert: createMockAlert('btc-above', 'above', 50000, 'BTC'), symbol: 'BTC' },
          { alert: createMockAlert('eth-below', 'below', 4000, 'ETH'), symbol: 'ETH' },
          { alert: createMockAlert('sol-change', 'change_percent', 10, 'SOL'), symbol: 'SOL' },
        ];

        const priceData = new Map([
          ['BTC', { current: 55000, previous: 54000 }],
          ['ETH', { current: 3500, previous: 3600 }],
          ['SOL', { current: 120, previous: 100 }],
        ]);

        const results = alerts.map(({ alert, symbol }) => {
          const prices = priceData.get(symbol);
          if (!prices) return false;
          return alert.condition_type === 'change_percent'
            ? checkAlertCondition(alert, prices.current, prices.previous)
            : checkAlertCondition(alert, prices.current);
        });

        expect(results[0]).toBe(true);
        expect(results[1]).toBe(true);
        expect(results[2]).toBe(true);
      });
    });
  });

  describe('checkAlertCondition - 特殊场景测试', () => {
    const createMockAlert = (
      conditionType: 'above' | 'below' | 'change_percent',
      targetValue: number
    ): PriceAlert => ({
      id: 'test-alert-id',
      user_id: 'test-user-id',
      name: 'Test Alert',
      symbol: 'BTC',
      chain: null,
      condition_type: conditionType,
      target_value: targetValue,
      provider: null,
      is_active: true,
      last_triggered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    describe('价格恰好等于目标值', () => {
      it('should trigger "above" when price exactly equals target', () => {
        const alert = createMockAlert('above', 70000);
        const result = checkAlertCondition(alert, 70000);
        expect(result).toBe(true);
      });

      it('should trigger "below" when price exactly equals target', () => {
        const alert = createMockAlert('below', 60000);
        const result = checkAlertCondition(alert, 60000);
        expect(result).toBe(true);
      });

      it('should trigger "change_percent" when change exactly equals target', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 105, 100);
        expect(result).toBe(true);
      });

      it('should trigger "change_percent" when negative change exactly equals target', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 95, 100);
        expect(result).toBe(true);
      });
    });

    describe('价格刚好超过目标值一点点', () => {
      it('should trigger "above" when price is slightly above target', () => {
        const alert = createMockAlert('above', 70000);
        const result = checkAlertCondition(alert, 70000.0001);
        expect(result).toBe(true);
      });

      it('should not trigger "above" when price is slightly below target', () => {
        const alert = createMockAlert('above', 70000);
        const result = checkAlertCondition(alert, 69999.9999);
        expect(result).toBe(false);
      });

      it('should trigger "below" when price is slightly below target', () => {
        const alert = createMockAlert('below', 60000);
        const result = checkAlertCondition(alert, 59999.9999);
        expect(result).toBe(true);
      });

      it('should not trigger "below" when price is slightly above target', () => {
        const alert = createMockAlert('below', 60000);
        const result = checkAlertCondition(alert, 60000.0001);
        expect(result).toBe(false);
      });

      it('should trigger "change_percent" when change slightly exceeds target', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 105.01, 100);
        expect(result).toBe(true);
      });

      it('should not trigger "change_percent" when change is slightly below target', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 104.99, 100);
        expect(result).toBe(false);
      });

      it('should handle floating point precision edge case', () => {
        const alert = createMockAlert('above', 0.1 + 0.2);
        const result = checkAlertCondition(alert, 0.1 + 0.2);
        expect(result).toBe(true);
      });
    });

    describe('百分比变化的精确计算', () => {
      it('should calculate exact 10% increase correctly', () => {
        const alert = createMockAlert('change_percent', 10);
        const result = checkAlertCondition(alert, 110, 100);
        expect(result).toBe(true);
      });

      it('should calculate exact 10% decrease correctly', () => {
        const alert = createMockAlert('change_percent', 10);
        const result = checkAlertCondition(alert, 90, 100);
        expect(result).toBe(true);
      });

      it('should calculate percentage from very small base', () => {
        const alert = createMockAlert('change_percent', 100);
        const result = checkAlertCondition(alert, 0.02, 0.01);
        expect(result).toBe(true);
      });

      it('should calculate percentage for large values', () => {
        const alert = createMockAlert('change_percent', 1);
        const result = checkAlertCondition(alert, 1010000, 1000000);
        expect(result).toBe(true);
      });

      it('should handle precise decimal percentages', () => {
        const alert = createMockAlert('change_percent', 0.01);
        const result = checkAlertCondition(alert, 100.01, 100);
        expect(result).toBe(true);
      });

      it('should not trigger for change just below threshold', () => {
        const alert = createMockAlert('change_percent', 10);
        const result = checkAlertCondition(alert, 109.99, 100);
        expect(result).toBe(false);
      });

      it('should handle 100% change correctly', () => {
        const alert = createMockAlert('change_percent', 100);
        const result = checkAlertCondition(alert, 200, 100);
        expect(result).toBe(true);
      });

      it('should handle 200% change correctly', () => {
        const alert = createMockAlert('change_percent', 200);
        const result = checkAlertCondition(alert, 300, 100);
        expect(result).toBe(true);
      });
    });

    describe('零基准价格的变化百分比', () => {
      it('should not trigger when previous price is zero', () => {
        const alert = createMockAlert('change_percent', 5);
        const result = checkAlertCondition(alert, 100, 0);
        expect(result).toBe(false);
      });

      it('should not trigger when previous price is zero regardless of current price', () => {
        const alert = createMockAlert('change_percent', 0.01);
        const result = checkAlertCondition(alert, Number.MAX_SAFE_INTEGER, 0);
        expect(result).toBe(false);
      });

      it('should not trigger when previous price is zero and current is also zero', () => {
        const alert = createMockAlert('change_percent', 0);
        const result = checkAlertCondition(alert, 0, 0);
        expect(result).toBe(false);
      });

      it('should handle very small previous price correctly', () => {
        const alert = createMockAlert('change_percent', 100);
        const result = checkAlertCondition(alert, Number.MIN_VALUE * 2, Number.MIN_VALUE);
        expect(result).toBe(true);
      });
    });
  });

  describe('formatConditionMet', () => {
    it('should format "above" condition', () => {
      const result = formatConditionMet('above', 70000, 70000);
      expect(result).toContain('70000');
      expect(result).toContain('达到目标');
    });

    it('should format "below" condition', () => {
      const result = formatConditionMet('below', 60000, 60000);
      expect(result).toContain('60000');
      expect(result).toContain('低于目标');
    });

    it('should format "change_percent" condition with previous price', () => {
      const result = formatConditionMet('change_percent', 73500, 5, 70000);
      expect(result).toContain('5.00%');
      expect(result).toContain('达到目标');
    });

    it('should format "change_percent" condition without previous price', () => {
      const result = formatConditionMet('change_percent', 73500, 5);
      expect(result).toContain('5.00%');
    });
  });

  describe('formatConditionMet - 格式化函数测试', () => {
    describe('各种条件格式化', () => {
      it('should format "above" condition with decimal prices', () => {
        const result = formatConditionMet('above', 70000.1234, 70000);
        expect(result).toContain('70000.1234');
        expect(result).toContain('达到目标');
      });

      it('should format "below" condition with decimal prices', () => {
        const result = formatConditionMet('below', 59999.8765, 60000);
        expect(result).toContain('59999.8765');
        expect(result).toContain('低于目标');
      });

      it('should format positive percentage change', () => {
        const result = formatConditionMet('change_percent', 105, 5, 100);
        expect(result).toContain('5.00%');
        expect(result).toContain('达到目标');
      });

      it('should format negative percentage change', () => {
        const result = formatConditionMet('change_percent', 95, 5, 100);
        expect(result).toContain('-5.00%');
        expect(result).toContain('达到目标');
      });

      it('should format zero percentage change', () => {
        const result = formatConditionMet('change_percent', 100, 0, 100);
        expect(result).toContain('0.00%');
      });

      it('should format large percentage change', () => {
        const result = formatConditionMet('change_percent', 300, 200, 100);
        expect(result).toContain('200.00%');
      });
    });

    describe('边界值格式化', () => {
      it('should format zero prices', () => {
        const result = formatConditionMet('above', 0, 0);
        expect(result).toContain('0.0000');
      });

      it('should format very large prices', () => {
        const result = formatConditionMet(
          'above',
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER
        );
        expect(result).toContain(Number.MAX_SAFE_INTEGER.toString());
      });

      it('should format very small prices', () => {
        const result = formatConditionMet('above', Number.MIN_VALUE, Number.MIN_VALUE);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });

      it('should format negative prices', () => {
        const result = formatConditionMet('above', -100, -100);
        expect(result).toContain('-100');
      });

      it('should format percentage with many decimal places', () => {
        const result = formatConditionMet('change_percent', 100.123, 0.123, 100);
        expect(result).toContain('0.12%');
      });

      it('should handle zero target value for "above"', () => {
        const result = formatConditionMet('above', 0, 0);
        expect(result).toContain('0.0000');
        expect(result).toContain('达到目标');
      });

      it('should handle zero target value for "below"', () => {
        const result = formatConditionMet('below', 0, 0);
        expect(result).toContain('0.0000');
        expect(result).toContain('低于目标');
      });
    });

    describe('国际化消息格式', () => {
      it('should return Chinese message for "above" condition', () => {
        const result = formatConditionMet('above', 100, 100);
        expect(result).toMatch(/价格.*达到目标/);
      });

      it('should return Chinese message for "below" condition', () => {
        const result = formatConditionMet('below', 100, 100);
        expect(result).toMatch(/价格.*低于目标/);
      });

      it('should return Chinese message for "change_percent" condition', () => {
        const result = formatConditionMet('change_percent', 105, 5, 100);
        expect(result).toMatch(/价格变化.*达到目标/);
      });

      it('should return fallback message for unknown condition type', () => {
        const result = formatConditionMet('unknown' as any, 100, 100);
        expect(result).toBe('条件已满足');
      });

      it('should format message without previous price for "change_percent"', () => {
        const result = formatConditionMet('change_percent', 100, 5);
        expect(result).toBe('价格变化达到目标 5.00%');
      });

      it('should handle zero previous price in "change_percent"', () => {
        const result = formatConditionMet('change_percent', 100, 5, 0);
        expect(result).toBe('价格变化达到目标 5.00%');
      });

      it('should include both current price and target in "above" message', () => {
        const result = formatConditionMet('above', 75000.5, 70000);
        expect(result).toContain('75000.5000');
        expect(result).toContain('70000.0000');
      });

      it('should include both current price and target in "below" message', () => {
        const result = formatConditionMet('below', 55000.25, 60000);
        expect(result).toContain('55000.2500');
        expect(result).toContain('60000.0000');
      });
    });
  });

  describe('checkAlertConditions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return empty array when no active alerts found', async () => {
      const { checkAlertConditions } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: [], error: null });

      const result = await checkAlertConditions([]);
      expect(result).toEqual([]);
    });

    it('should handle database error gracefully', async () => {
      const { checkAlertConditions } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      (supabase.eq as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error('DB error'),
      });

      const result = await checkAlertConditions([]);
      expect(result).toEqual([]);
    });

    it('should check alerts against matching price data', async () => {
      const { checkAlertConditions } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      const mockAlerts = [
        {
          id: 'alert-1',
          user_id: 'user-1',
          symbol: 'BTC',
          condition_type: 'above',
          target_value: 50000,
          provider: null,
          chain: null,
          is_active: true,
        },
      ];

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: mockAlerts, error: null });
      (supabase.limit as jest.Mock).mockResolvedValueOnce({ data: [], error: null });

      const priceData = [{ provider: 'test', symbol: 'BTC', price: 55000, timestamp: Date.now() }];

      const result = await checkAlertConditions(priceData);
      expect(result.length).toBe(1);
      expect(result[0].conditionMet).toBe(true);
    });
  });

  describe('triggerAlert', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return null when existing event found within cooldown', async () => {
      const { triggerAlert } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      (supabase.maybeSingle as jest.Mock).mockResolvedValueOnce({
        data: { id: 'existing-event' },
        error: null,
      });

      const result = await triggerAlert('alert-1', {
        alertId: 'alert-1',
        userId: 'user-1',
        price: 50000,
        conditionMet: 'test condition',
      });

      expect(result).toBeNull();
    });

    it('should return null when check error occurs', async () => {
      const { triggerAlert } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      (supabase.maybeSingle as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error('Check error'),
      });

      const result = await triggerAlert('alert-1', {
        alertId: 'alert-1',
        userId: 'user-1',
        price: 50000,
        conditionMet: 'test condition',
      });

      expect(result).toBeNull();
    });

    it('should trigger alert when no existing event', async () => {
      const { triggerAlert } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      (supabase.maybeSingle as jest.Mock).mockResolvedValueOnce({ data: null, error: null });

      (queries.triggerAlert as jest.Mock).mockResolvedValueOnce({
        id: 'event-1',
        alert_id: 'alert-1',
        user_id: 'user-1',
      });

      const result = await triggerAlert('alert-1', {
        alertId: 'alert-1',
        userId: 'user-1',
        price: 50000,
        conditionMet: 'test condition',
      });

      expect(result).not.toBeNull();
    });
  });

  describe('processPriceUpdate', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return empty array when no conditions met', async () => {
      const { processPriceUpdate } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: [], error: null });

      const result = await processPriceUpdate([
        { provider: 'test', symbol: 'BTC', price: 50000, timestamp: Date.now() },
      ]);

      expect(result).toEqual([]);
    });

    it('should process triggered alerts', async () => {
      const { processPriceUpdate } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      const mockAlerts = [
        {
          id: 'alert-1',
          user_id: 'user-1',
          symbol: 'BTC',
          condition_type: 'above',
          target_value: 50000,
          provider: null,
          chain: null,
          is_active: true,
        },
      ];

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: mockAlerts, error: null });
      (supabase.limit as jest.Mock).mockResolvedValueOnce({ data: [], error: null });
      (supabase.maybeSingle as jest.Mock).mockResolvedValueOnce({ data: null, error: null });

      (queries.triggerAlert as jest.Mock).mockResolvedValueOnce({
        id: 'event-1',
        alert_id: 'alert-1',
      });

      const result = await processPriceUpdate([
        { provider: 'test', symbol: 'BTC', price: 55000, timestamp: Date.now() },
      ]);

      expect(result.length).toBe(1);
    });
  });

  describe('AlertDetector class', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create detector with default interval', async () => {
      const { AlertDetector } = await import('../detector');
      const detector = new AlertDetector();
      expect(detector.isRunning()).toBe(false);
    });

    it('should create detector with custom interval', async () => {
      const { AlertDetector } = await import('../detector');
      const detector = new AlertDetector(5000);
      expect(detector.isRunning()).toBe(false);
    });

    it('should start and stop detector', async () => {
      const { AlertDetector } = await import('../detector');
      const detector = new AlertDetector(1000);

      expect(detector.isRunning()).toBe(false);

      const fetchPriceData = jest.fn().mockResolvedValue([]);
      detector.start(fetchPriceData);

      expect(detector.isRunning()).toBe(true);

      detector.stop();
      expect(detector.isRunning()).toBe(false);
    });

    it('should restart detector when start called twice', async () => {
      const { AlertDetector } = await import('../detector');
      const detector = new AlertDetector(1000);

      const fetchPriceData = jest.fn().mockResolvedValue([]);
      detector.start(fetchPriceData);
      detector.start(fetchPriceData);

      expect(detector.isRunning()).toBe(true);

      detector.stop();
      expect(detector.isRunning()).toBe(false);
    });

    it('should get last price after update', async () => {
      const { AlertDetector } = await import('../detector');
      const detector = new AlertDetector(1000);

      expect(detector.getLastPrice('test', 'BTC')).toBeUndefined();

      const fetchPriceData = jest
        .fn()
        .mockResolvedValue([
          { provider: 'test', symbol: 'BTC', price: 50000, timestamp: Date.now() },
        ]);

      detector.start(fetchPriceData);

      await new Promise((resolve) => setTimeout(resolve, 100));

      detector.stop();
    });

    it('should handle errors in detector loop', async () => {
      const { AlertDetector } = await import('../detector');
      const detector = new AlertDetector(100);

      const fetchPriceData = jest.fn().mockRejectedValue(new Error('Fetch error'));
      detector.start(fetchPriceData);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(detector.isRunning()).toBe(true);

      detector.stop();
    });

    it('should process price updates and store last prices', async () => {
      const { AlertDetector } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');
      const detector = new AlertDetector(50);

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: [], error: null });

      const priceData = [
        { provider: 'test', symbol: 'BTC', price: 50000, timestamp: Date.now() },
        { provider: 'test', symbol: 'ETH', chain: 'ethereum', price: 3000, timestamp: Date.now() },
      ];

      const fetchPriceData = jest.fn().mockResolvedValue(priceData);
      detector.start(fetchPriceData);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(detector.getLastPrice('test', 'BTC')).toBe(50000);
      expect(detector.getLastPrice('test', 'ETH', 'ethereum')).toBe(3000);

      detector.stop();
    });
  });

  describe('checkAlertConditions - additional coverage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle change_percent alerts with price history', async () => {
      const { checkAlertConditions } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      const mockAlerts = [
        {
          id: 'alert-1',
          user_id: 'user-1',
          symbol: 'BTC',
          condition_type: 'change_percent',
          target_value: 5,
          provider: null,
          chain: null,
          is_active: true,
        },
      ];

      const mockPriceRecords = [
        {
          symbol: 'BTC',
          provider: 'test',
          chain: null,
          price: 50000,
          timestamp: new Date().toISOString(),
        },
      ];

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: mockAlerts, error: null });
      (supabase.or as jest.Mock).mockReturnThis();
      (supabase.order as jest.Mock).mockReturnThis();
      (supabase.limit as jest.Mock).mockResolvedValueOnce({ data: mockPriceRecords, error: null });

      const priceData = [{ provider: 'test', symbol: 'BTC', price: 53000, timestamp: Date.now() }];

      const result = await checkAlertConditions(priceData);
      expect(result.length).toBe(1);
      expect(result[0].conditionMet).toBe(false);
    });

    it('should handle change_percent alerts without matching price history', async () => {
      const { checkAlertConditions } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      const mockAlerts = [
        {
          id: 'alert-1',
          user_id: 'user-1',
          symbol: 'BTC',
          condition_type: 'change_percent',
          target_value: 5,
          provider: null,
          chain: null,
          is_active: true,
        },
      ];

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: mockAlerts, error: null });
      (supabase.or as jest.Mock).mockReturnThis();
      (supabase.order as jest.Mock).mockReturnThis();
      (supabase.limit as jest.Mock).mockResolvedValueOnce({ data: [], error: null });

      const priceData = [{ provider: 'test', symbol: 'BTC', price: 53000, timestamp: Date.now() }];

      const result = await checkAlertConditions(priceData);
      expect(result.length).toBe(1);
      expect(result[0].conditionMet).toBe(false);
    });

    it('should handle alerts with provider filter', async () => {
      const { checkAlertConditions } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      const mockAlerts = [
        {
          id: 'alert-1',
          user_id: 'user-1',
          symbol: 'BTC',
          condition_type: 'above',
          target_value: 50000,
          provider: 'pyth',
          chain: null,
          is_active: true,
        },
      ];

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: mockAlerts, error: null });

      const priceData = [
        { provider: 'pyth', symbol: 'BTC', price: 55000, timestamp: Date.now() },
        { provider: 'chainlink', symbol: 'BTC', price: 55000, timestamp: Date.now() },
      ];

      const result = await checkAlertConditions(priceData);
      expect(result.length).toBe(1);
    });

    it('should handle alerts with chain filter', async () => {
      const { checkAlertConditions } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      const mockAlerts = [
        {
          id: 'alert-1',
          user_id: 'user-1',
          symbol: 'BTC',
          condition_type: 'above',
          target_value: 50000,
          provider: null,
          chain: 'ethereum',
          is_active: true,
        },
      ];

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: mockAlerts, error: null });

      const priceData = [
        { provider: 'test', symbol: 'BTC', chain: 'ethereum', price: 55000, timestamp: Date.now() },
      ];

      const result = await checkAlertConditions(priceData);
      expect(result.length).toBe(1);
    });

    it('should handle price history fetch error', async () => {
      const { checkAlertConditions } = await import('../detector');
      const { supabase } = await import('@/lib/supabase/client');

      const mockAlerts = [
        {
          id: 'alert-1',
          user_id: 'user-1',
          symbol: 'BTC',
          condition_type: 'change_percent',
          target_value: 5,
          provider: null,
          chain: null,
          is_active: true,
        },
      ];

      (supabase.eq as jest.Mock).mockResolvedValueOnce({ data: mockAlerts, error: null });
      (supabase.or as jest.Mock).mockReturnThis();
      (supabase.order as jest.Mock).mockReturnThis();
      (supabase.limit as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: new Error('DB error'),
      });

      const priceData = [{ provider: 'test', symbol: 'BTC', price: 53000, timestamp: Date.now() }];

      const result = await checkAlertConditions(priceData);
      expect(result.length).toBe(1);
    });
  });

  describe('checkAlertCondition - default case', () => {
    it('should return false for unknown condition type', () => {
      const alert = {
        id: 'test-alert-id',
        user_id: 'test-user-id',
        name: 'Test Alert',
        symbol: 'BTC',
        chain: null,
        condition_type: 'unknown' as any,
        target_value: 100,
        provider: null,
        is_active: true,
        last_triggered_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = checkAlertCondition(alert, 100);
      expect(result).toBe(false);
    });
  });
});
