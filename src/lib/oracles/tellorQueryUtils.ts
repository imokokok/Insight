export type QueryType = 'SpotPrice' | 'LegacyRequest' | 'TWAP' | 'CustomQuery';

export interface SpotPriceQuery {
  type: 'SpotPrice';
  asset: string;
  currency: string;
}

export interface LegacyRequestQuery {
  type: 'LegacyRequest';
  requestId: number;
}

export interface TWAPQuery {
  type: 'TWAP';
  asset: string;
  currency: string;
  timeframe: number;
}

export interface CustomQueryQuery {
  type: 'CustomQuery';
  queryData: string;
}

export type QueryData = SpotPriceQuery | LegacyRequestQuery | TWAPQuery | CustomQueryQuery;

export interface DecodedQueryData {
  queryType: string;
  queryId: string;
  params: Record<string, unknown>;
  humanReadable: string;
}

const QUERY_TYPE_IDS: Record<QueryType, string> = {
  SpotPrice: 'SpotPrice',
  LegacyRequest: 'LegacyRequest',
  TWAP: 'TWAP',
  CustomQuery: 'CustomQuery',
};

function simpleHash(str: string): string {
  let hashNum = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hashNum = ((hashNum << 5) - hashNum + char) | 0;
  }
  const hash = Math.abs(hashNum).toString(16);
  return '0x' + hash.padStart(64, '0').slice(0, 64);
}

function encodeString(str: string): string {
  const hex = Buffer.from(str).toString('hex');
  return hex.padEnd(128, '0').slice(0, 128);
}

function encodeUint256(num: number): string {
  return num.toString(16).padStart(64, '0');
}

export function encodeQueryData(query: QueryData): string {
  switch (query.type) {
    case 'SpotPrice': {
      const typeEncoded = encodeString(QUERY_TYPE_IDS.SpotPrice);
      const assetEncoded = encodeString(query.asset);
      const currencyEncoded = encodeString(query.currency);
      return '0x' + typeEncoded + assetEncoded + currencyEncoded;
    }
    case 'LegacyRequest': {
      const typeEncoded = encodeString(QUERY_TYPE_IDS.LegacyRequest);
      const requestIdEncoded = encodeUint256(query.requestId);
      return '0x' + typeEncoded + requestIdEncoded;
    }
    case 'TWAP': {
      const typeEncoded = encodeString(QUERY_TYPE_IDS.TWAP);
      const assetEncoded = encodeString(query.asset);
      const currencyEncoded = encodeString(query.currency);
      const timeframeEncoded = encodeUint256(query.timeframe);
      return '0x' + typeEncoded + assetEncoded + currencyEncoded + timeframeEncoded;
    }
    case 'CustomQuery': {
      return query.queryData;
    }
    default:
      throw new Error(`Unknown query type: ${(query as QueryData).type}`);
  }
}

export function getQueryId(queryData: string): string {
  return simpleHash(queryData);
}

export function getQueryIdFromQuery(query: QueryData): string {
  const encodedData = encodeQueryData(query);
  return getQueryId(encodedData);
}

function decodeHexString(hex: string, start: number, length: number): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const slice = cleanHex.slice(start * 2, (start + length) * 2);
  return Buffer.from(slice, 'hex').toString('utf8').replace(/\0/g, '');
}

function decodeUint256Hex(hex: string, start: number): number {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const slice = cleanHex.slice(start * 2, (start + 32) * 2);
  return parseInt(slice, 16) || 0;
}

export function decodeQueryData(queryData: string): DecodedQueryData {
  try {
    const cleanData = queryData.startsWith('0x') ? queryData : '0x' + queryData;

    const queryType = decodeHexString(cleanData, 0, 32).trim();

    let params: Record<string, unknown> = {};
    let humanReadable = '';

    switch (queryType) {
      case 'SpotPrice': {
        const asset = decodeHexString(cleanData, 32, 32).trim();
        const currency = decodeHexString(cleanData, 64, 32).trim();
        params = { asset, currency };
        humanReadable = `${asset}/${currency} Spot Price`;
        break;
      }
      case 'LegacyRequest': {
        const requestId = decodeUint256Hex(cleanData, 32);
        params = { requestId };
        humanReadable = `Legacy Request #${requestId}`;
        break;
      }
      case 'TWAP': {
        const asset = decodeHexString(cleanData, 32, 32).trim();
        const currency = decodeHexString(cleanData, 64, 32).trim();
        const timeframe = decodeUint256Hex(cleanData, 96);
        params = { asset, currency, timeframe };
        const timeframeHours = timeframe / 3600;
        humanReadable = `${asset}/${currency} ${timeframeHours}h TWAP`;
        break;
      }
      case 'CustomQuery': {
        params = { rawData: cleanData };
        humanReadable = 'Custom Query';
        break;
      }
      default:
        params = { unknownType: queryType, rawData: cleanData };
        humanReadable = `Unknown Query Type: ${queryType}`;
    }

    const queryId = getQueryId(queryData);

    return {
      queryType,
      queryId,
      params,
      humanReadable,
    };
  } catch (error) {
    const queryId = getQueryId(queryData);
    return {
      queryType: 'Unknown',
      queryId,
      params: {
        rawData: queryData,
        error: error instanceof Error ? error.message : 'Failed to decode',
      },
      humanReadable: 'Invalid Query Data',
    };
  }
}

export function isValidQueryId(queryId: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(queryId);
}

export function isValidQueryData(queryData: string): boolean {
  return /^0x[a-fA-F0-9]*$/.test(queryData) && queryData.length >= 2;
}

export interface PopularQuery {
  queryId: string;
  queryData: string;
  description: string;
  type: QueryType;
  lastUpdated: Date;
  currentValue: string;
}

export const POPULAR_QUERIES: PopularQuery[] = [];

export const QUERY_TYPES_INFO: Array<{
  type: QueryType;
  name: string;
  descriptionKey: string;
  exampleKey: string;
  params: string[];
}> = [
  {
    type: 'SpotPrice',
    name: 'SpotPrice',
    descriptionKey: 'tellor.queryData.queryTypes.spotPrice.description',
    exampleKey: 'tellor.queryData.queryTypes.spotPrice.example',
    params: ['asset (string)', 'currency (string)'],
  },
  {
    type: 'LegacyRequest',
    name: 'LegacyRequest',
    descriptionKey: 'tellor.queryData.queryTypes.legacyRequest.description',
    exampleKey: 'tellor.queryData.queryTypes.legacyRequest.example',
    params: ['requestId (uint256)'],
  },
  {
    type: 'TWAP',
    name: 'TWAP',
    descriptionKey: 'tellor.queryData.queryTypes.twap.description',
    exampleKey: 'tellor.queryData.queryTypes.twap.example',
    params: ['asset (string)', 'currency (string)', 'timeframe (uint256)'],
  },
  {
    type: 'CustomQuery',
    name: 'CustomQuery',
    descriptionKey: 'tellor.queryData.queryTypes.customQuery.description',
    exampleKey: 'tellor.queryData.queryTypes.customQuery.example',
    params: ['queryData (bytes)'],
  },
];

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return `${diffSec}s ago`;
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else {
    return `${diffHour}h ago`;
  }
}
