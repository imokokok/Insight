import { PriceDataSchema } from '@/lib/security/validation';
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

export function validatePriceData(data: unknown): PriceData {
  const result = PriceDataSchema.safeParse(data);

  if (!result.success) {
    const missingFields = result.error.issues
      .filter((issue) => issue.code === 'invalid_type' || issue.code === 'too_small')
      .map((issue) => issue.path.join('.'));
    throw new OracleDataValidationError(
      `Invalid price data: ${result.error.issues.map((i) => i.message).join(', ')}`,
      missingFields,
      data
    );
  }

  return result.data as PriceData;
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
