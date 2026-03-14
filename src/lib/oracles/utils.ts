import { OracleClient, OracleProvider, PriceData } from '@/types/oracle';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  RedStoneClient,
  DIAClient,
  TellarClient,
  ChronicleClient,
  WINkLinkClient,
} from './index';

const clients: Record<OracleProvider, OracleClient> = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH]: new PythClient(),
  [OracleProvider.API3]: new API3Client(),
  [OracleProvider.REDSTONE]: new RedStoneClient(),
  [OracleProvider.DIA]: new DIAClient(),
  [OracleProvider.TELLAR]: new TellarClient(),
  [OracleProvider.CHRONICLE]: new ChronicleClient(),
  [OracleProvider.WINKLINK]: new WINkLinkClient(),
};

export function getOracleClient(provider: OracleProvider): OracleClient {
  return clients[provider];
}

export function getAllOracleClients(): OracleClient[] {
  return Object.values(clients);
}

export async function fetchAllPrices(symbol: string): Promise<PriceData[]> {
  const clients = getAllOracleClients();
  const results = await Promise.allSettled(clients.map((client) => client.getPrice(symbol)));

  return results
    .filter((result): result is PromiseFulfilledResult<PriceData> => result.status === 'fulfilled')
    .map((result) => result.value);
}

export function calculateAveragePrice(prices: PriceData[]): number {
  if (prices.length === 0) return 0;
  const sum = prices.reduce((acc, curr) => acc + curr.price, 0);
  return sum / prices.length;
}

export function calculateMedianPrice(prices: PriceData[]): number {
  if (prices.length === 0) return 0;
  const sortedPrices = [...prices].sort((a, b) => a.price - b.price);
  const mid = Math.floor(sortedPrices.length / 2);
  return sortedPrices.length % 2 !== 0
    ? sortedPrices[mid].price
    : (sortedPrices[mid - 1].price + sortedPrices[mid].price) / 2;
}
