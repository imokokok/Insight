import {
  ValidatorFn,
  chain,
  required,
  isString,
  isNumber,
  isInteger,
  isPositive,
  isEmail,
  isUrl,
  isUuid,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  oneOf,
} from './validators';

export interface FieldSchema {
  validators: ValidatorFn[];
  required?: boolean;
  transform?: (value: unknown) => unknown;
}

export interface ObjectSchema {
  [key: string]: FieldSchema;
}

export interface ValidationResult {
  valid: boolean;
  data?: Record<string, unknown>;
  errors?: Array<{ field: string; message: string }>;
}

export function validateObject(
  data: Record<string, unknown>,
  schema: ObjectSchema
): ValidationResult {
  const result: Record<string, unknown> = {};
  const errors: Array<{ field: string; message: string }> = [];

  for (const [field, fieldSchema] of Object.entries(schema)) {
    let value = data[field];

    if (value === undefined || value === null) {
      if (fieldSchema.required) {
        errors.push({ field, message: `${field} is required` });
      }
      continue;
    }

    if (fieldSchema.transform) {
      value = fieldSchema.transform(value);
    }

    for (const validator of fieldSchema.validators) {
      const validationResult = validator(value, field);
      if (!validationResult.valid) {
        errors.push({ field, message: validationResult.error.message });
        break;
      }
      value = validationResult.value;
    }

    result[field] = value;
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: result };
}

export const commonSchemas = {
  id: {
    validators: [isString, minLength(1)],
    required: true,
  },
  uuid: {
    validators: [isUuid],
    required: true,
  },
  email: {
    validators: [isEmail],
    required: true,
  },
  url: {
    validators: [isUrl],
    required: true,
  },
  positiveInteger: {
    validators: [isInteger, isPositive],
    required: true,
  },
  positiveNumber: {
    validators: [isNumber, isPositive],
    required: true,
  },
  nonEmptyString: {
    validators: [isString, minLength(1)],
    required: true,
  },
  page: {
    validators: [isInteger, min(1)],
    required: false,
    transform: (v: unknown) => (v === undefined ? 1 : Number(v)),
  },
  limit: {
    validators: [isInteger, min(1), max(100)],
    required: false,
    transform: (v: unknown) => (v === undefined ? 20 : Number(v)),
  },
};

export function createStringSchema(options?: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}): FieldSchema {
  const validators: ValidatorFn[] = [isString];

  if (options?.minLength !== undefined) {
    validators.push(minLength(options.minLength));
  }
  if (options?.maxLength !== undefined) {
    validators.push(maxLength(options.maxLength));
  }
  if (options?.pattern !== undefined) {
    validators.push(pattern(options.pattern));
  }

  return {
    validators,
    required: options?.required ?? true,
  };
}

export function createNumberSchema(options?: {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
}): FieldSchema {
  const validators: ValidatorFn[] = [options?.integer ? isInteger : isNumber];
  if (options?.min !== undefined) {
    validators.push(min(options.min));
  }
  if (options?.max !== undefined) {
    validators.push(max(options.max));
  }

  return {
    validators,
    required: options?.required ?? true,
  };
}

export function createEnumSchema<T extends readonly string[]>(
  options: T,
  required = true
): FieldSchema {
  return {
    validators: [isString, oneOf(options)],
    required,
  };
}

export function createPaginationSchema(): ObjectSchema {
  return {
    page: { ...commonSchemas.page },
    limit: { ...commonSchemas.limit },
  };
}

export const symbolSchema: FieldSchema = {
  validators: [
    isString,
    minLength(1),
    maxLength(20),
    pattern(/^[A-Z0-9]+\/[A-Z0-9]+$/i, 'Invalid symbol format'),
  ],
  required: true,
};

export const providerSchema: FieldSchema = createEnumSchema(
  ['chainlink', 'band_protocol', 'uma', 'api3', 'pyth'] as const,
  true
);

export const chainSchema: FieldSchema = createEnumSchema(
  ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'base'] as const,
  false
);

export const periodSchema: FieldSchema = createNumberSchema({
  required: false,
  integer: true,
  min: 1,
  max: 365,
});
