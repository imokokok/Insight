import type { PriceData } from '@/types/oracle';

export class OracleDataValidationError extends Error {
  constructor(
    message: string,
    public readonly missingFields: string[],
    public readonly rawData: unknown
  ) {
    super(message);
    this.name = 'OracleDataValidationError';
  }
}

function validateOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new OracleDataValidationError(
      `Invalid price data: ${fieldName} must be a finite number`,
      [fieldName],
      value
    );
  }
  return value;
}

function validateOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new OracleDataValidationError(
      `Invalid price data: ${fieldName} must be a string`,
      [fieldName],
      value
    );
  }
  return value;
}

function validateConfidenceInterval(value: unknown): PriceData['confidenceInterval'] {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || value === null) {
    throw new OracleDataValidationError(
      'Invalid price data: confidenceInterval must be an object',
      ['confidenceInterval'],
      value
    );
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.bid !== 'number' || !Number.isFinite(obj.bid)) {
    throw new OracleDataValidationError(
      'Invalid price data: confidenceInterval.bid must be a finite number',
      ['confidenceInterval'],
      value
    );
  }
  if (typeof obj.ask !== 'number' || !Number.isFinite(obj.ask)) {
    throw new OracleDataValidationError(
      'Invalid price data: confidenceInterval.ask must be a finite number',
      ['confidenceInterval'],
      value
    );
  }
  if (typeof obj.widthPercentage !== 'number' || !Number.isFinite(obj.widthPercentage)) {
    throw new OracleDataValidationError(
      'Invalid price data: confidenceInterval.widthPercentage must be a finite number',
      ['confidenceInterval'],
      value
    );
  }
  return {
    bid: obj.bid,
    ask: obj.ask,
    widthPercentage: obj.widthPercentage,
  };
}

function validateDataSource(value: unknown): PriceData['dataSource'] {
  if (value === undefined || value === null) return undefined;
  if (value !== 'real' && value !== 'mock' && value !== 'api' && value !== 'fallback') {
    throw new OracleDataValidationError(
      'Invalid price data: dataSource must be one of: real, mock, api, fallback',
      ['dataSource'],
      value
    );
  }
  return value;
}

export function validatePriceData(data: unknown): PriceData {
  if (!data || typeof data !== 'object') {
    throw new OracleDataValidationError('Invalid price data: expected object', [], data);
  }

  const obj = data as Record<string, unknown>;
  const missingFields: string[] = [];

  const requiredFields = ['price', 'timestamp', 'provider', 'symbol'];
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new OracleDataValidationError(
      `Invalid price data: missing required fields: ${missingFields.join(', ')}`,
      missingFields,
      data
    );
  }

  if (typeof obj.price !== 'number' || !Number.isFinite(obj.price)) {
    throw new OracleDataValidationError(
      'Invalid price data: price must be a finite number',
      ['price'],
      data
    );
  }

  if (typeof obj.timestamp !== 'number' && typeof obj.timestamp !== 'string') {
    throw new OracleDataValidationError(
      'Invalid price data: timestamp must be a number or string',
      ['timestamp'],
      data
    );
  }

  if (typeof obj.provider !== 'string') {
    throw new OracleDataValidationError(
      'Invalid price data: provider must be a string',
      ['provider'],
      data
    );
  }

  if (typeof obj.symbol !== 'string') {
    throw new OracleDataValidationError(
      'Invalid price data: symbol must be a string',
      ['symbol'],
      data
    );
  }

  const result: PriceData = {
    price: obj.price,
    timestamp:
      typeof obj.timestamp === 'string'
        ? (() => {
            const ts = new Date(obj.timestamp).getTime();
            if (!Number.isFinite(ts)) {
              throw new OracleDataValidationError(
                'Invalid price data: timestamp string could not be parsed to a valid date',
                ['timestamp'],
                obj.timestamp
              );
            }
            return ts;
          })()
        : obj.timestamp,
    provider: obj.provider as PriceData['provider'],
    symbol: obj.symbol,
  };

  const chain = validateOptionalString(obj.chain, 'chain');
  if (chain !== undefined) result.chain = chain as PriceData['chain'];

  result.decimals = validateOptionalNumber(obj.decimals, 'decimals');
  result.confidence = validateOptionalNumber(obj.confidence, 'confidence');
  if (obj.confidenceSource === 'original' || obj.confidenceSource === 'estimated') {
    result.confidenceSource = obj.confidenceSource;
  }
  result.source = validateOptionalString(obj.source, 'source');
  result.change = validateOptionalNumber(obj.change, 'change');
  result.change24h = validateOptionalNumber(obj.change24h, 'change24h');
  result.change24hPercent = validateOptionalNumber(obj.change24hPercent, 'change24hPercent');
  result.confidenceInterval = validateConfidenceInterval(obj.confidenceInterval);
  result.dataSource = validateDataSource(obj.dataSource);
  result.roundId = validateOptionalString(obj.roundId, 'roundId');
  result.answeredInRound = validateOptionalString(obj.answeredInRound, 'answeredInRound');
  result.version = validateOptionalString(obj.version, 'version');
  result.startedAt = validateOptionalNumber(obj.startedAt, 'startedAt');
  result.priceId = validateOptionalString(obj.priceId, 'priceId');
  result.exponent = validateOptionalNumber(obj.exponent, 'exponent');
  result.conf = validateOptionalNumber(obj.conf, 'conf');
  result.publishTime = validateOptionalNumber(obj.publishTime, 'publishTime');
  result.dapiName = validateOptionalString(obj.dapiName, 'dapiName');
  result.proxyAddress = validateOptionalString(obj.proxyAddress, 'proxyAddress');
  result.dataAge = validateOptionalNumber(obj.dataAge, 'dataAge');

  return result;
}

export function validatePriceDataArray(data: unknown): PriceData[] {
  if (!Array.isArray(data)) {
    throw new OracleDataValidationError('Invalid price data array: expected array', [], data);
  }

  return data.map((item, index) => {
    try {
      return validatePriceData(item);
    } catch (error) {
      if (error instanceof OracleDataValidationError) {
        throw new OracleDataValidationError(
          `Invalid price data at index ${index}: ${error.message}`,
          error.missingFields,
          error.rawData
        );
      }
      throw error;
    }
  });
}
