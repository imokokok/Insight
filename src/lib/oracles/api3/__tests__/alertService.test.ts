import {
  getActiveAlerts,
  getAlertHistory,
  getAlertThresholds,
  acknowledgeAlert,
  resolveAlert,
  updateAlertThreshold,
} from '../alertService';

import type { API3Alert, AlertThreshold } from '@/types/oracle/api3';

jest.mock('../../api3DataSources', () => ({
  getAPI3Endpoint: jest.fn((source: string, endpoint: string) => {
    return `https://api.test.com/${endpoint}`;
  }),
}));

jest.mock('../../api3OnChainService', () => ({
  api3OnChainService: {
    getCoveragePoolData: jest.fn().mockResolvedValue({
      totalValueLocked: BigInt('8500000000000000000000000'),
      collateralizationRatio: 165,
      stakerCount: 3240,
      pendingClaims: 3,
      processedClaims: 47,
    }),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockDAPIData = (overrides: Record<string, unknown> = {}) => ({
  name: 'ETH/USD',
  dapiName: 'ETH/USD',
  symbol: 'ETH',
  price: 2000,
  marketPrice: 2000,
  deviation: 0,
  status: 'active',
  active: true,
  chain: 'ethereum',
  network: 'ethereum',
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createMockAirnodeData = (overrides: Record<string, unknown> = {}) => ({
  name: 'Test Airnode',
  provider: 'Test Provider',
  address: '0x1234567890abcdef1234567890abcdef12345678',
  airnodeAddress: '0x1234567890abcdef1234567890abcdef12345678',
  status: 'active',
  uptime: 99.9,
  responseTime: 200,
  chain: 'ethereum',
  network: 'ethereum',
  ...overrides,
});

describe('alertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('getActiveAlerts', () => {
    it('应该返回空数组当所有数据正常时', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [createMockDAPIData()],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [createMockAirnodeData()],
        });

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该生成价格偏差警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'BTC/USD',
              price: 50000,
              marketPrice: 50400,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('price_deviation');
      expect(alerts[0].metadata?.symbol).toBe('BTC/USD');
    });

    it('应该为严重偏差生成 critical 级别警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'BTC/USD',
              price: 50000,
              marketPrice: 52000,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      const criticalAlert = alerts.find((a) => a.severity === 'critical');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.type).toBe('price_deviation');
    });

    it('应该为中等偏差生成 warning 级别警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'ETH/USD',
              price: 2000,
              marketPrice: 2035,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      const warningAlert = alerts.find((a) => a.severity === 'warning');
      expect(warningAlert).toBeDefined();
      expect(warningAlert?.type).toBe('price_deviation');
    });

    it('应该生成节点离线警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockAirnodeData({
              name: 'Problematic Node',
              uptime: 94,
              responseTime: 1200,
            }),
          ],
        });

      const alerts = await getActiveAlerts();

      const nodeAlert = alerts.find((a) => a.type === 'node_offline');
      expect(nodeAlert).toBeDefined();
      expect(nodeAlert?.severity).toBe('critical');
    });

    it('应该为响应时间问题生成警告', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockAirnodeData({
              name: 'Slow Node',
              uptime: 99.5,
              responseTime: 600,
            }),
          ],
        });

      const alerts = await getActiveAlerts();

      const nodeAlert = alerts.find((a) => a.type === 'node_offline');
      expect(nodeAlert).toBeDefined();
      expect(nodeAlert?.severity).toBe('warning');
    });

    it('应该生成覆盖池风险警报', async () => {
      const { api3OnChainService } = require('../../api3OnChainService');
      api3OnChainService.getCoveragePoolData.mockResolvedValueOnce({
        totalValueLocked: BigInt('8500000000000000000000000'),
        collateralizationRatio: 140,
        stakerCount: 3240,
        pendingClaims: 3,
        processedClaims: 47,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      const coverageAlert = alerts.find((a) => a.type === 'coverage_pool_risk');
      expect(coverageAlert).toBeDefined();
      expect(coverageAlert?.severity).toBe('warning');
    });

    it('应该按严重程度排序警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'BTC/USD',
              price: 50000,
              marketPrice: 50200,
            }),
            createMockDAPIData({
              name: 'ETH/USD',
              price: 2000,
              marketPrice: 2100,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      for (let i = 0; i < alerts.length - 1; i++) {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        expect(severityOrder[alerts[i].severity]).toBeLessThanOrEqual(
          severityOrder[alerts[i + 1].severity]
        );
      }
    });

    it('应该限制返回最多 20 个警报', async () => {
      const manyDapis = Array.from({ length: 30 }, (_, i) =>
        createMockDAPIData({
          name: `TOKEN${i}/USD`,
          price: 100,
          marketPrice: 105,
        })
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => manyDapis,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(alerts.length).toBeLessThanOrEqual(20);
    });

    it('应该处理 API 错误并返回空数组', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该处理非数组响应', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ not: 'array' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => null,
        });

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该处理 HTTP 错误响应', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该跳过价格为 0 的 dAPI', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'ZERO/USD',
              price: 0,
              marketPrice: 100,
            }),
            createMockDAPIData({
              name: 'VALID/USD',
              price: 100,
              marketPrice: 102,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(alerts.find((a) => a.metadata?.symbol === 'ZERO/USD')).toBeUndefined();
      expect(alerts.find((a) => a.metadata?.symbol === 'VALID/USD')).toBeDefined();
    });
  });

  describe('getAlertHistory', () => {
    it('应该返回历史警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'BTC/USD',
              price: 50000,
              marketPrice: 50400,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const history = await getAlertHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].isResolved).toBe(true);
      expect(history[0].isRead).toBe(true);
    });

    it('应该限制返回数量', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => Array.from({ length: 20 }, (_, i) =>
            createMockDAPIData({
              name: `TOKEN${i}/USD`,
              price: 100,
              marketPrice: 102,
            })
          ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const history = await getAlertHistory(5);

      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('应该按时间戳降序排列', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'BTC/USD',
              price: 50000,
              marketPrice: 50200,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const history = await getAlertHistory();

      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i + 1].timestamp.getTime()
        );
      }
    });

    it('应该处理错误并返回空数组', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const history = await getAlertHistory();

      expect(history).toEqual([]);
    });
  });

  describe('getAlertThresholds', () => {
    it('应该返回警报阈值配置', async () => {
      const thresholds = await getAlertThresholds();

      expect(Array.isArray(thresholds)).toBe(true);
      expect(thresholds.length).toBeGreaterThan(0);
    });

    it('应该包含所有必要的阈值类型', async () => {
      const thresholds = await getAlertThresholds();

      const types = thresholds.map((t) => t.type);
      expect(types).toContain('price_deviation_warning');
      expect(types).toContain('price_deviation_critical');
      expect(types).toContain('node_response_time');
      expect(types).toContain('coverage_pool_ratio');
      expect(types).toContain('security_event');
    });

    it('每个阈值应该有正确的结构', async () => {
      const thresholds = await getAlertThresholds();

      thresholds.forEach((threshold: AlertThreshold) => {
        expect(threshold).toHaveProperty('type');
        expect(threshold).toHaveProperty('enabled');
        expect(threshold).toHaveProperty('threshold');
        expect(typeof threshold.type).toBe('string');
        expect(typeof threshold.enabled).toBe('boolean');
        expect(typeof threshold.threshold).toBe('number');
      });
    });

    it('所有阈值应该默认启用', async () => {
      const thresholds = await getAlertThresholds();

      thresholds.forEach((threshold: AlertThreshold) => {
        expect(threshold.enabled).toBe(true);
      });
    });
  });

  describe('acknowledgeAlert', () => {
    it('应该成功确认警报', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await acknowledgeAlert('alert-123');

      expect(consoleSpy).toHaveBeenCalledWith('Alert alert-123 acknowledged');

      consoleSpy.mockRestore();
    });
  });

  describe('resolveAlert', () => {
    it('应该成功解决警报', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await resolveAlert('alert-456');

      expect(consoleSpy).toHaveBeenCalledWith('Alert alert-456 resolved');

      consoleSpy.mockRestore();
    });
  });

  describe('updateAlertThreshold', () => {
    it('应该成功更新阈值', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await updateAlertThreshold('price_deviation_warning', 2.0);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Updated threshold for price_deviation_warning to 2'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('警报消息生成', () => {
    it('应该为不同严重程度生成不同的消息', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'BTC/USD',
              price: 50000,
              marketPrice: 50100,
            }),
            createMockDAPIData({
              name: 'ETH/USD',
              price: 2000,
              marketPrice: 2035,
            }),
            createMockDAPIData({
              name: 'SOL/USD',
              price: 100,
              marketPrice: 105,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      const infoAlert = alerts.find((a) => a.severity === 'info');
      const warningAlert = alerts.find((a) => a.severity === 'warning');
      const criticalAlert = alerts.find((a) => a.severity === 'critical');

      if (infoAlert) {
        expect(infoAlert.message).toContain('minor');
      }
      if (warningAlert) {
        expect(warningAlert.message).toContain('1.5%');
      }
      if (criticalAlert) {
        expect(criticalAlert.message).toContain('severe');
      }
    });

    it('警报应该包含正确的元数据', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'BTC/USD',
              price: 50000,
              marketPrice: 50400,
              chain: 'arbitrum',
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].metadata?.symbol).toBe('BTC/USD');
      expect(alerts[0].metadata?.chain).toBe('arbitrum');
      expect(alerts[0].metadata?.currentValue).toBeDefined();
      expect(alerts[0].metadata?.threshold).toBeDefined();
    });
  });

  describe('边界情况', () => {
    it('应该处理空的 dAPI 和 Airnode 数据', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该处理缺失的字段', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              name: undefined,
              price: undefined,
              marketPrice: undefined,
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              name: undefined,
              uptime: undefined,
              responseTime: undefined,
            },
          ],
        });

      const alerts = await getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('应该处理负价格', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'NEGATIVE/USD',
              price: -100,
              marketPrice: 100,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});
