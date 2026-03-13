import { checkAlertCondition, formatConditionMet } from '../detector';
import type { PriceAlert } from '@/lib/supabase/queries';

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
});
