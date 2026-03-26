import { container, SERVICE_TOKENS } from '@/lib/di';
import { OracleProvider, Blockchain } from '@/types/oracle';

import { API3Client } from '../api3';
import { BandProtocolClient } from '../bandProtocol';
import { BaseOracleClient } from '../base';
import { ChainlinkClient } from '../chainlink';
import { ChronicleClient } from '../chronicle';
import { DIAClient } from '../dia';
import {
  OracleClientFactory,
  getOracleClient,
  getAllOracleClients,
  getOracleClientFromDI,
  registerMockOracleFactory,
  unregisterMockOracleFactory,
} from '../factory';
import { type IOracleClientFactory } from '../interfaces';
import { PythClient } from '../pythNetwork';
import { RedStoneClient } from '../redstone';
import { TellorClient } from '../tellor';
import { UMAClient } from '../uma';
import { WINkLinkClient } from '../winklink';

jest.mock('@/lib/di', () => ({
  container: {
    has: jest.fn(),
    resolve: jest.fn(),
    register: jest.fn(),
    unregister: jest.fn(),
  },
  SERVICE_TOKENS: {
    ORACLE_CLIENT_FACTORY: 'ORACLE_CLIENT_FACTORY',
  },
}));

describe('OracleClientFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    OracleClientFactory.clearInstances();
  });

  describe('getClient', () => {
    it('should create and return Chainlink client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.CHAINLINK);

      expect(client).toBeInstanceOf(ChainlinkClient);
      expect(client.name).toBe(OracleProvider.CHAINLINK);
    });

    it('should create and return Pyth client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.PYTH);

      expect(client).toBeInstanceOf(PythClient);
      expect(client.name).toBe(OracleProvider.PYTH);
    });

    it('should create and return RedStone client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.REDSTONE);

      expect(client).toBeInstanceOf(RedStoneClient);
      expect(client.name).toBe(OracleProvider.REDSTONE);
    });

    it('should create and return DIA client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.DIA);

      expect(client).toBeInstanceOf(DIAClient);
      expect(client.name).toBe(OracleProvider.DIA);
    });

    it('should create and return Tellor client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.TELLOR);

      expect(client).toBeInstanceOf(TellorClient);
      expect(client.name).toBe(OracleProvider.TELLOR);
    });

    it('should create and return Chronicle client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.CHRONICLE);

      expect(client).toBeInstanceOf(ChronicleClient);
      expect(client.name).toBe(OracleProvider.CHRONICLE);
    });

    it('should create and return WINkLink client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.WINKLINK);

      expect(client).toBeInstanceOf(WINkLinkClient);
      expect(client.name).toBe(OracleProvider.WINKLINK);
    });

    it('should create and return Band Protocol client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.BAND_PROTOCOL);

      expect(client).toBeInstanceOf(BandProtocolClient);
      expect(client.name).toBe(OracleProvider.BAND_PROTOCOL);
    });

    it('should create and return UMA client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.UMA);

      expect(client).toBeInstanceOf(UMAClient);
      expect(client.name).toBe(OracleProvider.UMA);
    });

    it('should create and return API3 client', () => {
      const client = OracleClientFactory.getClient(OracleProvider.API3);

      expect(client).toBeInstanceOf(API3Client);
      expect(client.name).toBe(OracleProvider.API3);
    });

    it('should return cached instance on subsequent calls', () => {
      const client1 = OracleClientFactory.getClient(OracleProvider.CHAINLINK);
      const client2 = OracleClientFactory.getClient(OracleProvider.CHAINLINK);

      expect(client1).toBe(client2);
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        OracleClientFactory.getClient('unknown' as OracleProvider);
      }).toThrow();
    });
  });

  describe('getAllClients', () => {
    it('should return all oracle clients', () => {
      const clients = OracleClientFactory.getAllClients();

      expect(clients).toHaveProperty(OracleProvider.CHAINLINK);
      expect(clients).toHaveProperty(OracleProvider.PYTH);
      expect(clients).toHaveProperty(OracleProvider.REDSTONE);
      expect(clients).toHaveProperty(OracleProvider.DIA);
      expect(clients).toHaveProperty(OracleProvider.TELLOR);
      expect(clients).toHaveProperty(OracleProvider.CHRONICLE);
      expect(clients).toHaveProperty(OracleProvider.WINKLINK);
      expect(clients).toHaveProperty(OracleProvider.BAND_PROTOCOL);
      expect(clients).toHaveProperty(OracleProvider.UMA);
      expect(clients).toHaveProperty(OracleProvider.API3);
    });

    it('should return cached instances', () => {
      const clients1 = OracleClientFactory.getAllClients();
      const clients2 = OracleClientFactory.getAllClients();

      expect(clients1[OracleProvider.CHAINLINK]).toBe(clients2[OracleProvider.CHAINLINK]);
    });
  });

  describe('clearInstances', () => {
    it('should clear all cached instances', () => {
      const client1 = OracleClientFactory.getClient(OracleProvider.CHAINLINK);
      OracleClientFactory.clearInstances();
      const client2 = OracleClientFactory.getClient(OracleProvider.CHAINLINK);

      expect(client1).not.toBe(client2);
    });
  });

  describe('hasClient', () => {
    it('should return false for uncached client', () => {
      expect(OracleClientFactory.hasClient(OracleProvider.CHAINLINK)).toBe(false);
    });

    it('should return true for cached client', () => {
      OracleClientFactory.getClient(OracleProvider.CHAINLINK);
      expect(OracleClientFactory.hasClient(OracleProvider.CHAINLINK)).toBe(true);
    });
  });

  describe('configure', () => {
    it('should update factory configuration', () => {
      OracleClientFactory.configure({ useDatabase: false });
      const client = OracleClientFactory.getClient(OracleProvider.CHAINLINK);

      expect(client['config'].useDatabase).toBe(false);
    });
  });

  describe('DI integration', () => {
    it('should use DI factory when available', () => {
      const mockFactory: IOracleClientFactory = {
        getClient: jest.fn().mockReturnValue(new ChainlinkClient()),
        getAllClients: jest.fn().mockReturnValue({}),
        clearInstances: jest.fn(),
        hasClient: jest.fn().mockReturnValue(false),
      };

      (container.has as jest.Mock).mockReturnValue(true);
      (container.resolve as jest.Mock).mockReturnValue(mockFactory);

      const client = OracleClientFactory.getClient(OracleProvider.CHAINLINK);

      expect(mockFactory.getClient).toHaveBeenCalledWith(OracleProvider.CHAINLINK);
      expect(client).toBeInstanceOf(ChainlinkClient);
    });

    it('should return null from DI when factory not registered', () => {
      (container.has as jest.Mock).mockReturnValue(false);

      const client = OracleClientFactory.getClientFromDI(OracleProvider.CHAINLINK);

      expect(client).toBeNull();
    });

    it('should register mock factory', () => {
      const mockFactory: IOracleClientFactory = {
        getClient: jest.fn(),
        getAllClients: jest.fn(),
        clearInstances: jest.fn(),
        hasClient: jest.fn(),
      };

      registerMockOracleFactory(mockFactory);

      expect(container.register).toHaveBeenCalledWith(
        SERVICE_TOKENS.ORACLE_CLIENT_FACTORY,
        expect.any(Function),
        true
      );
    });

    it('should unregister mock factory', () => {
      unregisterMockOracleFactory();

      expect(container.unregister).toHaveBeenCalledWith(SERVICE_TOKENS.ORACLE_CLIENT_FACTORY);
    });

    it('should check if using DI', () => {
      (container.has as jest.Mock).mockReturnValue(true);

      expect(OracleClientFactory.isUsingDI()).toBe(true);
    });
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    OracleClientFactory.clearInstances();
  });

  describe('getOracleClient', () => {
    it('should return oracle client', () => {
      const client = getOracleClient(OracleProvider.CHAINLINK);

      expect(client).toBeInstanceOf(ChainlinkClient);
    });
  });

  describe('getAllOracleClients', () => {
    it('should return all oracle clients', () => {
      const clients = getAllOracleClients();

      expect(Object.keys(clients)).toHaveLength(10);
    });
  });

  describe('getOracleClientFromDI', () => {
    it('should return null when DI not configured', () => {
      (container.has as jest.Mock).mockReturnValue(false);

      const client = getOracleClientFromDI(OracleProvider.CHAINLINK);

      expect(client).toBeNull();
    });
  });
});
