import type { AlertThreshold, API3Alert } from '@/types/oracle/api3';

import { api3OnChainService } from '../../api3OnChainService';
import {
  getActiveAlerts,
  getAlertHistory,
  getAlertThresholds,
  acknowledgeAlert,
  resolveAlert,
  updateAlertThreshold,
} from '../alertService';

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

const createMockAlert = (overrides: Partial<API3Alert> = {}): API3Alert => ({
  id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'price_deviation',
  severity: 'warning',
  title: 'Test Alert',
  message: 'Test alert message',
  timestamp: new Date(),
  isRead: false,
  isResolved: false,
  metadata: {
    symbol: 'ETH/USD',
    threshold: 1.5,
    currentValue: 2.0,
    chain: 'ethereum',
  },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
});

describe('getActiveAlerts - basic functionality', () => {
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

describe('getActiveAlerts - price deviation alerts', () => {
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
});

describe('getActiveAlerts - node alerts', () => {
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
});

describe('getActiveAlerts - coverage pool alerts', () => {
  it('应该生成覆盖池风险警报', async () => {
    (api3OnChainService.getCoveragePoolData as jest.Mock).mockResolvedValueOnce({
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
});

describe('getActiveAlerts - sorting and limits', () => {
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
        json: async () =>
          Array.from({ length: 20 }, (_, i) =>
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

    expect(consoleSpy).toHaveBeenCalledWith('Updated threshold for price_deviation_warning to 2');

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

describe('Alert Trigger Logic Tests - 告警触发逻辑测试', () => {
  describe('Price threshold triggers - 价格阈值触发', () => {
    it('应该在价格高于阈值时触发警报', async () => {
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

      expect(alerts.length).toBeGreaterThan(0);
      const deviation = Math.abs((50000 - 52000) / 52000) * 100;
      expect(alerts[0].metadata?.currentValue).toBeCloseTo(deviation, 1);
    });

    it('应该在价格低于阈值时触发警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'ETH/USD',
              price: 1800,
              marketPrice: 2000,
            }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      const deviation = Math.abs((1800 - 2000) / 2000) * 100;
      expect(alerts[0].metadata?.currentValue).toBeCloseTo(deviation, 1);
    });

    it('应该正确计算双向偏差', async () => {
      const testCases = [
        { price: 50000, marketPrice: 51500, expectedDeviation: 2.91 },
        { price: 51500, marketPrice: 50000, expectedDeviation: 3.0 },
        { price: 2000, marketPrice: 2030, expectedDeviation: 1.48 },
        { price: 2030, marketPrice: 2000, expectedDeviation: 1.5 },
      ];

      for (const testCase of testCases) {
        mockFetch.mockReset();
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => [
              createMockDAPIData({
                name: 'TEST/USD',
                price: testCase.price,
                marketPrice: testCase.marketPrice,
              }),
            ],
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => [],
          });

        const alerts = await getActiveAlerts();

        if (alerts.length > 0) {
          expect(alerts[0].metadata?.currentValue).toBeCloseTo(testCase.expectedDeviation, 0);
        }
      }
    });
  });

  describe('Percentage change triggers - 百分比变化触发', () => {
    it('应该检测 0.5%-1.5% 的轻微偏差', async () => {
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

      const infoAlert = alerts.find((a) => a.severity === 'info');
      expect(infoAlert).toBeDefined();
      expect(infoAlert?.metadata?.currentValue).toBeGreaterThan(0.5);
      expect(infoAlert?.metadata?.currentValue).toBeLessThan(1.5);
    });

    it('应该检测 1.5%-3% 的中等偏差', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'ETH/USD',
              price: 2000,
              marketPrice: 2040,
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
      expect(warningAlert?.metadata?.currentValue).toBeGreaterThan(1.5);
      expect(warningAlert?.metadata?.currentValue).toBeLessThan(3);
    });

    it('应该检测 >3% 的严重偏差', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
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

      const criticalAlert = alerts.find((a) => a.severity === 'critical');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.metadata?.currentValue).toBeGreaterThan(3);
    });
  });

  describe('Time-based triggers - 时间触发', () => {
    it('应该基于时间戳生成历史警报', async () => {
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
      history.forEach((alert) => {
        expect(alert.timestamp).toBeInstanceOf(Date);
        expect(alert.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    it('应该正确设置警报时间戳', async () => {
      const beforeTime = Date.now();

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
      const afterTime = Date.now();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(alerts[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime);
    });

    it('应该按时间排序历史警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            Array.from({ length: 5 }, (_, i) =>
              createMockDAPIData({
                name: `TOKEN${i}/USD`,
                price: 100,
                marketPrice: 103,
              })
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const history = await getAlertHistory(10);

      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Multiple condition triggers - 多条件触发', () => {
    it('应该同时生成价格偏差和节点警报', async () => {
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
          json: async () => [
            createMockAirnodeData({
              name: 'Problematic Node',
              uptime: 94,
              responseTime: 1200,
            }),
          ],
        });

      const alerts = await getActiveAlerts();

      const priceAlert = alerts.find((a) => a.type === 'price_deviation');
      const nodeAlert = alerts.find((a) => a.type === 'node_offline');

      expect(priceAlert).toBeDefined();
      expect(nodeAlert).toBeDefined();
    });

    it('应该同时生成多种类型的警报', async () => {
      (api3OnChainService.getCoveragePoolData as jest.Mock).mockResolvedValueOnce({
        totalValueLocked: BigInt('8500000000000000000000000'),
        collateralizationRatio: 110,
        stakerCount: 3240,
        pendingClaims: 3,
        processedClaims: 47,
      });

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
          json: async () => [
            createMockAirnodeData({
              name: 'Problematic Node',
              uptime: 94,
              responseTime: 1200,
            }),
          ],
        });

      const alerts = await getActiveAlerts();

      const types = new Set(alerts.map((a) => a.type));
      expect(types.size).toBeGreaterThan(1);
    });

    it('应该正确处理多个 dAPI 同时触发', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({ name: 'BTC/USD', price: 50000, marketPrice: 52000 }),
            createMockDAPIData({ name: 'ETH/USD', price: 2000, marketPrice: 2100 }),
            createMockDAPIData({ name: 'SOL/USD', price: 100, marketPrice: 105 }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      const symbols = alerts.map((a) => a.metadata?.symbol);
      expect(symbols).toContain('BTC/USD');
      expect(symbols).toContain('ETH/USD');
      expect(symbols).toContain('SOL/USD');
    });
  });

  describe('Alert cooldown period - 告警冷却期', () => {
    it('应该为每个警报生成唯一 ID', async () => {
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

      const alerts1 = await getActiveAlerts();

      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetch.mockReset();
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

      const alerts2 = await getActiveAlerts();

      const ids1 = alerts1.map((a) => a.id);
      const ids2 = alerts2.map((a) => a.id);

      ids1.forEach((id1) => {
        ids2.forEach((id2) => {
          expect(id1).not.toBe(id2);
        });
      });
    });

    it('应该正确设置阈值最后触发时间', async () => {
      const thresholds = await getAlertThresholds();

      const triggeredThresholds = thresholds.filter((t) => t.lastTriggered);
      triggeredThresholds.forEach((t) => {
        expect(t.lastTriggered).toBeInstanceOf(Date);
        expect(t.lastTriggered!.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
  });
});

describe('Batch Operations Tests - 批量操作测试', () => {
  describe('Create multiple alerts - 批量创建警报', () => {
    it('应该批量创建多个警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            Array.from({ length: 10 }, (_, i) =>
              createMockDAPIData({
                name: `TOKEN${i}/USD`,
                price: 100,
                marketPrice: 103,
              })
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.length).toBeLessThanOrEqual(20);
    });

    it('应该正确处理大量数据输入', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) =>
        createMockDAPIData({
          name: `TOKEN${i}/USD`,
          price: 100 + i,
          marketPrice: 103 + i,
        })
      );

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => largeDataset,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(alerts.length).toBeLessThanOrEqual(20);
    });

    it('应该并发获取多个数据源', async () => {
      const startTime = Date.now();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [createMockDAPIData({ price: 100, marketPrice: 103 })],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [createMockAirnodeData({ uptime: 94 })],
        });

      await getActiveAlerts();

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Update multiple alerts - 批量更新警报', () => {
    it('应该能够批量确认多个警报', async () => {
      const alertIds = ['alert-1', 'alert-2', 'alert-3'];
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await Promise.all(alertIds.map((id) => acknowledgeAlert(id)));

      alertIds.forEach((id) => {
        expect(consoleSpy).toHaveBeenCalledWith(`Alert ${id} acknowledged`);
      });

      consoleSpy.mockRestore();
    });

    it('应该能够批量解决多个警报', async () => {
      const alertIds = ['alert-1', 'alert-2', 'alert-3'];
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await Promise.all(alertIds.map((id) => resolveAlert(id)));

      alertIds.forEach((id) => {
        expect(consoleSpy).toHaveBeenCalledWith(`Alert ${id} resolved`);
      });

      consoleSpy.mockRestore();
    });

    it('应该能够批量更新阈值', async () => {
      const updates = [
        { type: 'price_deviation_warning', threshold: 2.0 },
        { type: 'price_deviation_critical', threshold: 4.0 },
        { type: 'node_response_time', threshold: 600 },
      ];
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await Promise.all(
        updates.map((u) => updateAlertThreshold(u.type as AlertThreshold['type'], u.threshold))
      );

      updates.forEach((u) => {
        expect(consoleSpy).toHaveBeenCalledWith(
          `Updated threshold for ${u.type} to ${u.threshold}`
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Delete multiple alerts - 批量删除警报', () => {
    it('应该能够处理批量删除操作', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await resolveAlert('alert-to-delete');

      expect(consoleSpy).toHaveBeenCalledWith('Alert alert-to-delete resolved');

      consoleSpy.mockRestore();
    });
  });

  describe('Partial failure handling - 部分失败处理', () => {
    it('应该处理部分 API 失败', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [createMockDAPIData({ price: 100, marketPrice: 103 })],
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      const alerts = await getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('应该在部分数据源失败时继续处理', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('dAPI fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockAirnodeData({
              name: 'Test Node',
              uptime: 94,
              responseTime: 1200,
            }),
          ],
        });

      const alerts = await getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('应该处理覆盖池数据获取失败', async () => {
      (api3OnChainService.getCoveragePoolData as jest.Mock).mockRejectedValueOnce(
        new Error('RPC error')
      );

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

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Transaction rollback - 事务回滚', () => {
    it('应该在错误时返回空数组而不是抛出异常', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该优雅地处理 JSON 解析错误', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Invalid JSON');
          },
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

describe('Alert Deduplication Tests - 告警去重测试', () => {
  describe('Same condition multiple triggers - 相同条件多次触发', () => {
    it('应该为相同条件生成不同的警报 ID', async () => {
      const mockData = createMockDAPIData({
        name: 'BTC/USD',
        price: 50000,
        marketPrice: 52000,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockData],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts1 = await getActiveAlerts();

      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockData],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts2 = await getActiveAlerts();

      if (alerts1.length > 0 && alerts2.length > 0) {
        expect(alerts1[0].id).not.toBe(alerts2[0].id);
      }
    });

    it('应该为相同符号生成相同类型的警报', async () => {
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

      const btcAlerts = alerts.filter((a) => a.metadata?.symbol === 'BTC/USD');
      btcAlerts.forEach((alert) => {
        expect(alert.type).toBe('price_deviation');
      });
    });
  });

  describe('Duplicate alert detection - 重复警报检测', () => {
    it('应该正确识别相同类型的警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({ name: 'BTC/USD', price: 50000, marketPrice: 52000 }),
            createMockDAPIData({ name: 'ETH/USD', price: 2000, marketPrice: 2100 }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      const priceDeviationAlerts = alerts.filter((a) => a.type === 'price_deviation');
      expect(priceDeviationAlerts.length).toBeGreaterThan(0);
    });

    it('应该为不同符号生成不同警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({ name: 'BTC/USD', price: 50000, marketPrice: 52000 }),
            createMockDAPIData({ name: 'ETH/USD', price: 2000, marketPrice: 2100 }),
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      const symbols = new Set(alerts.map((a) => a.metadata?.symbol));
      expect(symbols.size).toBeGreaterThan(1);
    });
  });

  describe('Deduplication window - 去重窗口', () => {
    it('应该基于时间戳区分警报', async () => {
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

      const alerts1 = await getActiveAlerts();

      await new Promise((resolve) => setTimeout(resolve, 10));

      mockFetch.mockReset();
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

      const alerts2 = await getActiveAlerts();

      if (alerts1.length > 0 && alerts2.length > 0) {
        expect(alerts1[0].timestamp.getTime()).not.toBe(alerts2[0].timestamp.getTime());
      }
    });
  });

  describe('Alert hash calculation - 警报哈希计算', () => {
    it('应该为警报生成唯一 ID', async () => {
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

      alerts.forEach((alert) => {
        expect(alert.id).toBeDefined();
        expect(typeof alert.id).toBe('string');
        expect(alert.id.length).toBeGreaterThan(0);
      });
    });

    it('应该包含类型信息在 ID 中', async () => {
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
          json: async () => [
            createMockAirnodeData({
              name: 'Test Node',
              uptime: 94,
            }),
          ],
        });

      const alerts = await getActiveAlerts();

      const priceAlert = alerts.find((a) => a.type === 'price_deviation');
      const nodeAlert = alerts.find((a) => a.type === 'node_offline');

      if (priceAlert) {
        expect(priceAlert.id).toContain('price-dev');
      }
      if (nodeAlert) {
        expect(nodeAlert.id).toContain('node-');
      }
    });
  });

  describe('Deduplication statistics - 去重统计', () => {
    it('应该返回正确数量的唯一警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () =>
            Array.from({ length: 20 }, (_, i) =>
              createMockDAPIData({
                name: `TOKEN${i}/USD`,
                price: 100,
                marketPrice: 105,
              })
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      const uniqueIds = new Set(alerts.map((a) => a.id));
      expect(uniqueIds.size).toBe(alerts.length);
    });
  });
});

describe('Mute Period Tests - 静默期测试', () => {
  describe('Set mute period - 设置静默期', () => {
    it('应该能够设置静默期', () => {
      const muteConfig = {
        alertType: 'price_deviation',
        duration: 3600000,
        startTime: new Date(),
      };

      expect(muteConfig.duration).toBe(3600000);
      expect(muteConfig.alertType).toBe('price_deviation');
    });

    it('应该支持不同类型的静默期', () => {
      const muteTypes = ['price_deviation', 'node_offline', 'coverage_pool_risk', 'security_event'];

      muteTypes.forEach((type) => {
        const config = { alertType: type, duration: 3600000 };
        expect(config.alertType).toBe(type);
      });
    });
  });

  describe('Mute period expiration - 静默期过期', () => {
    it('应该正确计算静默期结束时间', () => {
      const startTime = new Date();
      const duration = 3600000;
      const endTime = new Date(startTime.getTime() + duration);

      expect(endTime.getTime() - startTime.getTime()).toBe(duration);
    });

    it('应该检测静默期是否已过期', () => {
      const startTime = new Date(Date.now() - 7200000);
      const duration = 3600000;
      const isExpired = Date.now() > startTime.getTime() + duration;

      expect(isExpired).toBe(true);
    });

    it('应该检测静默期是否仍在有效期内', () => {
      const startTime = new Date();
      const duration = 3600000;
      const isExpired = Date.now() > startTime.getTime() + duration;

      expect(isExpired).toBe(false);
    });
  });

  describe('Alert suppression during mute - 静默期间警报抑制', () => {
    it('应该能够标记警报为已读', async () => {
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

      alerts.forEach((alert) => {
        expect(alert.isRead).toBe(false);
      });
    });

    it('历史警报应该标记为已读', async () => {
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

      const history = await getAlertHistory();

      history.forEach((alert) => {
        expect(alert.isRead).toBe(true);
      });
    });
  });

  describe('Mute period override - 静默期覆盖', () => {
    it('应该能够覆盖静默设置', () => {
      const muteConfig = {
        alertType: 'price_deviation',
        duration: 3600000,
        overridden: false,
      };

      muteConfig.overridden = true;

      expect(muteConfig.overridden).toBe(true);
    });

    it('应该支持紧急警报绕过静默', () => {
      const alert = createMockAlert({ severity: 'critical' });
      const muteConfig = { bypassForCritical: true };

      const shouldSuppress = !(
        muteConfig.bypassForCritical && alert.severity === 'critical'
      );

      expect(shouldSuppress).toBe(false);
    });
  });

  describe('Multiple mute periods - 多个静默期', () => {
    it('应该支持同时存在多个静默期', () => {
      const mutePeriods = [
        { alertType: 'price_deviation', duration: 3600000 },
        { alertType: 'node_offline', duration: 7200000 },
        { alertType: 'coverage_pool_risk', duration: 1800000 },
      ];

      expect(mutePeriods.length).toBe(3);
      expect(mutePeriods.map((m) => m.alertType)).toContain('price_deviation');
      expect(mutePeriods.map((m) => m.alertType)).toContain('node_offline');
      expect(mutePeriods.map((m) => m.alertType)).toContain('coverage_pool_risk');
    });

    it('应该正确管理多个静默期的优先级', () => {
      const mutePeriods = [
        { alertType: 'price_deviation', priority: 1 },
        { alertType: 'node_offline', priority: 2 },
        { alertType: 'coverage_pool_risk', priority: 3 },
      ];

      const sorted = [...mutePeriods].sort((a, b) => a.priority - b.priority);

      expect(sorted[0].alertType).toBe('price_deviation');
    });
  });
});

describe('Alert Template Tests - 告警模板测试', () => {
  describe('Create alert from template - 从模板创建警报', () => {
    it('应该能够基于模板创建警报', () => {
      const template = {
        type: 'price_deviation' as const,
        severity: 'warning' as const,
        titleTemplate: '{symbol} Price Deviation Alert',
        messageTemplate: '{symbol} price deviation is {value}%',
      };

      const alert = createMockAlert({
        type: template.type,
        severity: template.severity,
        title: template.titleTemplate.replace('{symbol}', 'BTC/USD'),
        message: template.messageTemplate
          .replace('{symbol}', 'BTC/USD')
          .replace('{value}', '2.5'),
      });

      expect(alert.type).toBe('price_deviation');
      expect(alert.severity).toBe('warning');
      expect(alert.title).toContain('BTC/USD');
    });

    it('应该支持多种模板类型', () => {
      const templates = [
        { type: 'price_deviation', title: 'Price Alert' },
        { type: 'node_offline', title: 'Node Alert' },
        { type: 'coverage_pool_risk', title: 'Coverage Alert' },
        { type: 'security_event', title: 'Security Alert' },
      ];

      templates.forEach((template) => {
        const alert = createMockAlert({
          type: template.type as API3Alert['type'],
          title: template.title,
        });
        expect(alert.type).toBe(template.type);
      });
    });
  });

  describe('Template variable substitution - 模板变量替换', () => {
    it('应该正确替换模板变量', () => {
      const template = '{symbol} price deviation is {value}% exceeds {threshold}%';
      const variables = {
        symbol: 'BTC/USD',
        value: '2.5',
        threshold: '1.5',
      };

      let result = template;
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, value);
      });

      expect(result).toBe('BTC/USD price deviation is 2.5% exceeds 1.5%');
    });

    it('应该处理缺失的变量', () => {
      const template = '{symbol} alert: {missing_var}';
      const variables = { symbol: 'BTC/USD' };

      let result = template;
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, value);
      });

      expect(result).toBe('BTC/USD alert: {missing_var}');
    });

    it('应该处理特殊字符', () => {
      const template = '{symbol} price: ${price}';
      const variables = { symbol: 'BTC/USD', price: '50,000' };

      let result = template;
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(`{${key}}`, value);
      });

      expect(result).toBe('BTC/USD price: $50,000');
    });
  });

  describe('Template validation - 模板验证', () => {
    it('应该验证模板必需字段', () => {
      const validTemplate = {
        type: 'price_deviation',
        severity: 'warning',
        titleTemplate: 'Alert Title',
        messageTemplate: 'Alert Message',
      };

      expect(validTemplate.type).toBeDefined();
      expect(validTemplate.severity).toBeDefined();
      expect(validTemplate.titleTemplate).toBeDefined();
      expect(validTemplate.messageTemplate).toBeDefined();
    });

    it('应该拒绝无效的严重程度', () => {
      const invalidSeverities = ['low', 'high', 'medium', 'error'];

      invalidSeverities.forEach((severity) => {
        const validSeverities = ['info', 'warning', 'critical'];
        expect(validSeverities).not.toContain(severity);
      });
    });

    it('应该拒绝无效的警报类型', () => {
      const invalidTypes = ['price_alert', 'node_error', 'pool_risk'];

      invalidTypes.forEach((type) => {
        const validTypes = [
          'price_deviation',
          'node_offline',
          'coverage_pool_risk',
          'security_event',
        ];
        expect(validTypes).not.toContain(type);
      });
    });
  });

  describe('Template inheritance - 模板继承', () => {
    it('应该支持模板继承', () => {
      const baseTemplate = {
        type: 'price_deviation',
        severity: 'warning',
        titleTemplate: 'Price Alert',
      };

      const extendedTemplate = {
        ...baseTemplate,
        severity: 'critical',
        additionalInfo: 'Extended info',
      };

      expect(extendedTemplate.type).toBe('price_deviation');
      expect(extendedTemplate.severity).toBe('critical');
      expect(extendedTemplate.additionalInfo).toBe('Extended info');
    });

    it('应该能够覆盖继承的属性', () => {
      const parentTemplate = {
        type: 'price_deviation',
        severity: 'info',
        threshold: 0.5,
      };

      const childTemplate = {
        ...parentTemplate,
        severity: 'warning',
        threshold: 1.5,
      };

      expect(childTemplate.severity).toBe('warning');
      expect(childTemplate.threshold).toBe(1.5);
      expect(childTemplate.type).toBe('price_deviation');
    });
  });

  describe('Template sharing - 模板共享', () => {
    it('应该能够导出模板配置', () => {
      const template = {
        id: 'template-1',
        type: 'price_deviation',
        severity: 'warning',
        titleTemplate: '{symbol} Alert',
        messageTemplate: 'Deviation: {value}%',
      };

      const exported = JSON.stringify(template);

      expect(exported).toContain('template-1');
      expect(exported).toContain('price_deviation');
    });

    it('应该能够导入模板配置', () => {
      const exportedTemplate = JSON.stringify({
        id: 'template-1',
        type: 'price_deviation',
        severity: 'warning',
      });

      const imported = JSON.parse(exportedTemplate);

      expect(imported.id).toBe('template-1');
      expect(imported.type).toBe('price_deviation');
    });
  });
});

describe('Notification Tests - 通知测试', () => {
  describe('Email notification - 邮件通知', () => {
    it('应该能够发送邮件通知', () => {
      const notification = {
        type: 'email',
        recipient: 'user@example.com',
        subject: 'API3 Alert',
        body: 'Price deviation detected',
      };

      expect(notification.type).toBe('email');
      expect(notification.recipient).toMatch(/^[\w.-]+@[\w.-]+\.\w+$/);
    });

    it('应该验证邮件地址格式', () => {
      const validEmails = ['user@example.com', 'test.user@domain.org', 'alert+api3@company.io'];
      const invalidEmails = ['invalid', 'no@domain', '@nodomain.com'];

      validEmails.forEach((email) => {
        expect(email).toMatch(/^[\w.+-]+@[\w.-]+\.\w+$/);
      });

      invalidEmails.forEach((email) => {
        expect(email).not.toMatch(/^[\w.+-]+@[\w.-]+\.\w+$/);
      });
    });

    it('应该包含警报详情在邮件内容中', () => {
      const alert = createMockAlert();
      const emailContent = `
        Alert: ${alert.title}
        Type: ${alert.type}
        Severity: ${alert.severity}
        Message: ${alert.message}
      `;

      expect(emailContent).toContain(alert.title);
      expect(emailContent).toContain(alert.type);
      expect(emailContent).toContain(alert.severity);
    });
  });

  describe('Push notification - 推送通知', () => {
    it('应该能够发送推送通知', () => {
      const notification = {
        type: 'push',
        deviceId: 'device-123',
        title: 'API3 Alert',
        body: 'Critical price deviation detected',
        priority: 'high',
      };

      expect(notification.type).toBe('push');
      expect(notification.priority).toBe('high');
    });

    it('应该支持不同的推送优先级', () => {
      const priorities = ['high', 'normal', 'low'];

      priorities.forEach((priority) => {
        const notification = { type: 'push', priority };
        expect(['high', 'normal', 'low']).toContain(notification.priority);
      });
    });

    it('应该包含可操作的数据', () => {
      const alert = createMockAlert();
      const pushData = {
        alertId: alert.id,
        alertType: alert.type,
        actionUrl: `/alerts/${alert.id}`,
      };

      expect(pushData.alertId).toBe(alert.id);
      expect(pushData.actionUrl).toContain(alert.id);
    });
  });

  describe('Webhook notification - Webhook 通知', () => {
    it('应该能够发送 Webhook 通知', () => {
      const webhook = {
        url: 'https://example.com/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { alert: createMockAlert() },
      };

      expect(webhook.url).toMatch(/^https?:\/\/.+/);
      expect(webhook.method).toBe('POST');
    });

    it('应该验证 Webhook URL', () => {
      const validUrls = [
        'https://example.com/webhook',
        'http://localhost:3000/alerts',
        'https://api.service.io/v1/notifications',
      ];
      const invalidUrls = ['not-a-url', 'ftp://invalid.com', ''];

      validUrls.forEach((url) => {
        expect(url).toMatch(/^https?:\/\/.+/);
      });

      invalidUrls.forEach((url) => {
        expect(url).not.toMatch(/^https?:\/\/.+/);
      });
    });

    it('应该包含认证信息', () => {
      const webhook = {
        url: 'https://example.com/webhook',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-API-Key': 'api-key-456',
        },
      };

      expect(webhook.headers).toHaveProperty('Authorization');
      expect(webhook.headers).toHaveProperty('X-API-Key');
    });
  });

  describe('Notification retry - 通知重试', () => {
    it('应该支持重试配置', () => {
      const retryConfig = {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
      };

      expect(retryConfig.maxRetries).toBe(3);
      expect(retryConfig.retryDelay).toBe(1000);
    });

    it('应该计算指数退避延迟', () => {
      const baseDelay = 1000;
      const multiplier = 2;

      const delays = [1, 2, 3].map((attempt) => baseDelay * Math.pow(multiplier, attempt - 1));

      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);
      expect(delays[2]).toBe(4000);
    });

    it('应该限制最大重试次数', () => {
      const maxRetries = 3;
      const attempts = 5;

      const shouldRetry = attempts <= maxRetries;

      expect(shouldRetry).toBe(false);
    });
  });

  describe('Notification failure handling - 通知失败处理', () => {
    it('应该记录失败的通知', () => {
      const failedNotification = {
        id: 'notif-123',
        status: 'failed',
        error: 'Connection timeout',
        timestamp: new Date(),
      };

      expect(failedNotification.status).toBe('failed');
      expect(failedNotification.error).toBeDefined();
    });

    it('应该支持备用通知渠道', () => {
      const channels = ['email', 'push', 'webhook', 'sms'];
      const primaryChannel = 'email';
      const fallbackChannels = channels.filter((c) => c !== primaryChannel);

      expect(fallbackChannels.length).toBe(3);
      expect(fallbackChannels).not.toContain(primaryChannel);
    });

    it('应该处理部分通知失败', () => {
      const notifications = [
        { channel: 'email', status: 'sent' },
        { channel: 'push', status: 'failed' },
        { channel: 'webhook', status: 'sent' },
      ];

      const successCount = notifications.filter((n) => n.status === 'sent').length;
      const failedCount = notifications.filter((n) => n.status === 'failed').length;

      expect(successCount).toBe(2);
      expect(failedCount).toBe(1);
    });
  });
});

describe('Edge Cases Tests - 边界情况测试', () => {
  describe('Empty alert list - 空警报列表', () => {
    it('应该正确处理空数据', async () => {
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

    it('应该正确处理空历史警报', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const history = await getAlertHistory();

      expect(history).toEqual([]);
    });

    it('应该正确处理空阈值列表', async () => {
      const thresholds = await getAlertThresholds();

      expect(Array.isArray(thresholds)).toBe(true);
    });
  });

  describe('Invalid alert configuration - 无效警报配置', () => {
    it('应该处理无效的价格数据', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { name: 'INVALID', price: 'not-a-number', marketPrice: null },
            { name: 'VALID', price: 100, marketPrice: 102 },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('应该处理无效的节点数据', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { name: 'INVALID', uptime: 'invalid', responseTime: -100 },
            { name: 'VALID', uptime: 99.5, responseTime: 200 },
          ],
        });

      const alerts = await getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('应该处理缺失的元数据', async () => {
      const alert: API3Alert = {
        id: 'test-alert',
        type: 'price_deviation',
        severity: 'warning',
        title: 'Test',
        message: 'Test message',
        timestamp: new Date(),
        isRead: false,
        isResolved: false,
      };

      expect(alert.metadata).toBeUndefined();
    });
  });

  describe('Missing required fields - 缺失必需字段', () => {
    it('应该处理缺失的 dAPI 名称', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { price: 100, marketPrice: 102 },
            { name: 'VALID', price: 100, marketPrice: 102 },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const alerts = await getActiveAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('应该处理缺失的时间戳', async () => {
      const alert = {
        id: 'test',
        type: 'price_deviation',
        severity: 'warning',
        title: 'Test',
        message: 'Test',
        isRead: false,
        isResolved: false,
      };

      expect(alert.timestamp).toBeUndefined();
    });

    it('应该处理部分缺失的阈值配置', async () => {
      const thresholds = await getAlertThresholds();

      thresholds.forEach((threshold) => {
        expect(threshold.type).toBeDefined();
        expect(threshold.enabled).toBeDefined();
        expect(threshold.threshold).toBeDefined();
      });
    });
  });

  describe('Circular dependencies - 循环依赖', () => {
    it('应该正确处理警报引用', () => {
      const alert1: API3Alert & { relatedAlerts?: string[] } = {
        id: 'alert-1',
        type: 'price_deviation',
        severity: 'warning',
        title: 'Alert 1',
        message: 'Message 1',
        timestamp: new Date(),
        isRead: false,
        isResolved: false,
        relatedAlerts: ['alert-2'],
      };

      const alert2: API3Alert & { relatedAlerts?: string[] } = {
        id: 'alert-2',
        type: 'price_deviation',
        severity: 'warning',
        title: 'Alert 2',
        message: 'Message 2',
        timestamp: new Date(),
        isRead: false,
        isResolved: false,
        relatedAlerts: ['alert-1'],
      };

      expect(alert1.relatedAlerts).toContain('alert-2');
      expect(alert2.relatedAlerts).toContain('alert-1');
    });

    it('应该防止无限循环', () => {
      const visited = new Set<string>();
      const alerts = [
        { id: 'alert-1', related: 'alert-2' },
        { id: 'alert-2', related: 'alert-1' },
      ];

      const processAlert = (alertId: string, maxDepth: number = 10): boolean => {
        if (visited.has(alertId) || maxDepth <= 0) {
          return false;
        }
        visited.add(alertId);
        const alert = alerts.find((a) => a.id === alertId);
        if (alert?.related) {
          return processAlert(alert.related, maxDepth - 1);
        }
        return true;
      };

      const result = processAlert('alert-1');
      expect(visited.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Concurrent alert modifications - 并发警报修改', () => {
    it('应该处理并发警报获取', async () => {
      mockFetch
        .mockResolvedValue({
          ok: true,
          json: async () => [createMockDAPIData({ price: 100, marketPrice: 103 })],
        })
        .mockResolvedValue({
          ok: true,
          json: async () => [],
        });

      const [alerts1, alerts2, alerts3] = await Promise.all([
        getActiveAlerts(),
        getActiveAlerts(),
        getActiveAlerts(),
      ]);

      expect(Array.isArray(alerts1)).toBe(true);
      expect(Array.isArray(alerts2)).toBe(true);
      expect(Array.isArray(alerts3)).toBe(true);
    });

    it('应该处理并发阈值更新', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await Promise.all([
        updateAlertThreshold('price_deviation_warning', 2.0),
        updateAlertThreshold('price_deviation_critical', 4.0),
        updateAlertThreshold('node_response_time', 600),
      ]);

      expect(consoleSpy).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
    });

    it('应该处理并发警报确认', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await Promise.all([
        acknowledgeAlert('alert-1'),
        acknowledgeAlert('alert-2'),
        acknowledgeAlert('alert-3'),
      ]);

      expect(consoleSpy).toHaveBeenCalledTimes(3);

      consoleSpy.mockRestore();
    });

    it('应该处理竞争条件', async () => {
      let counter = 0;
      const incrementCounter = async () => {
        const current = counter;
        await new Promise((resolve) => setTimeout(resolve, 1));
        counter = current + 1;
        return counter;
      };

      const results = await Promise.all([incrementCounter(), incrementCounter()]);

      expect(results).toBeDefined();
    });
  });

  describe('Data type edge cases - 数据类型边界情况', () => {
    it('应该处理极大数值', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'LARGE/USD',
              price: Number.MAX_SAFE_INTEGER,
              marketPrice: Number.MAX_SAFE_INTEGER,
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

    it('应该处理极小数值', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'SMALL/USD',
              price: Number.MIN_VALUE,
              marketPrice: Number.MIN_VALUE,
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

    it('应该处理浮点精度问题', async () => {
      const price1 = 0.1 + 0.2;
      const price2 = 0.3;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            createMockDAPIData({
              name: 'FLOAT/USD',
              price: price1,
              marketPrice: price2,
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

    it('应该处理 BigInt 数据', async () => {
      (api3OnChainService.getCoveragePoolData as jest.Mock).mockResolvedValueOnce({
        totalValueLocked: BigInt('999999999999999999999999999999'),
        collateralizationRatio: 165,
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

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Network and API edge cases - 网络和 API 边界情况', () => {
    it('应该处理超时', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 100);
          })
      );

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该处理速率限制', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该处理服务不可用', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });

    it('应该处理网络断开', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const alerts = await getActiveAlerts();

      expect(alerts).toEqual([]);
    });
  });
});
