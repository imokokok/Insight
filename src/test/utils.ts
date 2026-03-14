import { vi, beforeEach, afterEach } from 'vitest';
import { container, SERVICE_TOKENS, clearServices } from '@/lib/di';
import { IOracleClientFactory, IMockOracleClient } from '@/lib/oracles/interfaces';
import { OracleProvider, Blockchain, PriceData } from '@/types/oracle';
import { MockOracleClient, createMockOracleClientBuilder } from '@/lib/oracles/__mocks__';

export function setupTestEnvironment(): void {
  clearServices();
  vi.clearAllMocks();
}

export function teardownTestEnvironment(): void {
  clearServices();
  vi.restoreAllMocks();
}

export function createMockOracleFactory(
  clients?: Partial<Record<OracleProvider, IMockOracleClient>>
): IOracleClientFactory {
  const mockClients: Record<OracleProvider, IMockOracleClient> = {
    [OracleProvider.CHAINLINK]: clients?.[OracleProvider.CHAINLINK] ?? createMockOracleClientBuilder().build(),
    [OracleProvider.BAND_PROTOCOL]: clients?.[OracleProvider.BAND_PROTOCOL] ?? createMockOracleClientBuilder().build(),
    [OracleProvider.UMA]: clients?.[OracleProvider.UMA] ?? createMockOracleClientBuilder().build(),
    [OracleProvider.PYTH]: clients?.[OracleProvider.PYTH] ?? createMockOracleClientBuilder().build(),
    [OracleProvider.API3]: clients?.[OracleProvider.API3] ?? createMockOracleClientBuilder().build(),
    [OracleProvider.REDSTONE]: clients?.[OracleProvider.REDSTONE] ?? createMockOracleClientBuilder().build(),
  };

  return {
    getClient: (provider: OracleProvider) => mockClients[provider],
    getAllClients: () => mockClients,
    hasClient: (provider: OracleProvider) => provider in mockClients,
    clearInstances: () => {
      Object.values(mockClients).forEach((client) => {
        if ('clearMocks' in client) {
          client.clearMocks();
        }
      });
    },
  };
}

export function registerMockOracleFactory(
  clients?: Partial<Record<OracleProvider, IMockOracleClient>>
): IOracleClientFactory {
  const factory = createMockOracleFactory(clients);
  container.register<IOracleClientFactory>(
    SERVICE_TOKENS.ORACLE_CLIENT_FACTORY,
    () => factory,
    true
  );
  return factory;
}

export function createTestTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function waitForCondition(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Condition not met within ${timeout}ms`));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

export function createSpyableAsyncFunction<T>(
  returnValue: T,
  options: { delay?: number; shouldThrow?: boolean; error?: Error } = {}
): ReturnType<typeof vi.fn> {
  return vi.fn(async () => {
    if (options.delay) {
      await createTestTimeout(options.delay);
    }

    if (options.shouldThrow) {
      throw options.error ?? new Error('Async function error');
    }

    return returnValue;
  });
}

export function withMockedDate(timestamp: number, fn: () => void | Promise<void>): void | Promise<void> {
  const originalDate = global.Date;
  const MockDate = class extends Date {
    constructor(...args: number[]) {
      if (args.length === 0) {
        super(timestamp);
      } else {
        super(...args as [number]);
      }
    }

    static now() {
      return timestamp;
    }
  };

  global.Date = MockDate as typeof Date;

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(() => {
        global.Date = originalDate;
      });
    }
    global.Date = originalDate;
    return result;
  } catch (error) {
    global.Date = originalDate;
    throw error;
  }
}

export function createTestSuiteSetup(options: { useMockOracle?: boolean } = {}) {
  const { useMockOracle = true } = options;
  let mockFactory: IOracleClientFactory | null = null;

  beforeEach(() => {
    setupTestEnvironment();
    if (useMockOracle) {
      mockFactory = registerMockOracleFactory();
    }
  });

  afterEach(() => {
    teardownTestEnvironment();
    mockFactory = null;
  });

  return {
    getMockFactory: () => mockFactory,
  };
}
