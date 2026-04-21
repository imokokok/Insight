import { ValidationError } from '@/lib/errors';

export type ValidatorResult =
  | { valid: true; value: unknown }
  | { valid: false; error: ValidationError };

export type ValidatorFn = (value: unknown, field?: string) => ValidatorResult;

export function required(value: unknown, field = 'value'): ValidatorResult {
  if (value === undefined || value === null || value === '') {
    return {
      valid: false,
      error: new ValidationError(`${field} is required`, { field }),
    };
  }
  return { valid: true, value };
}

export function isString(value: unknown, field = 'value'): ValidatorResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: new ValidationError(`${field} must be a string`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function isNumber(value: unknown, field = 'value'): ValidatorResult {
  // Use Number.isFinite to exclude Infinity and -Infinity
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return {
      valid: false,
      error: new ValidationError(`${field} must be a number`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function isInteger(value: unknown, field = 'value'): ValidatorResult {
  // First validate if it is a number
  const numberCheck = isNumber(value, field);
  if (!numberCheck.valid) {
    return numberCheck;
  }
  if (!Number.isInteger(value)) {
    return {
      valid: false,
      error: new ValidationError(`${field} must be an integer`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function isBoolean(value: unknown, field = 'value'): ValidatorResult {
  if (typeof value !== 'boolean') {
    return {
      valid: false,
      error: new ValidationError(`${field} must be a boolean`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function isArray(value: unknown, field = 'value'): ValidatorResult {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: new ValidationError(`${field} must be an array`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function isObject(value: unknown, field = 'value'): ValidatorResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {
      valid: false,
      error: new ValidationError(`${field} must be an object`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function minLength(min: number): ValidatorFn {
  return (value: unknown, field = 'value'): ValidatorResult => {
    // Return error for non-string/array
    if (typeof value !== 'string' && !Array.isArray(value)) {
      return {
        valid: false,
        error: new ValidationError(`${field} must be a string or array`, { field, value }),
      };
    }

    if (typeof value === 'string') {
      if (value.length < min) {
        return {
          valid: false,
          error: new ValidationError(`${field} must be at least ${min} characters`, {
            field,
            value,
            constraints: { minLength: min },
          }),
        };
      }
    } else if (Array.isArray(value)) {
      if (value.length < min) {
        return {
          valid: false,
          error: new ValidationError(`${field} must have at least ${min} items`, {
            field,
            value,
            constraints: { minLength: min },
          }),
        };
      }
    }
    return { valid: true, value };
  };
}

export function maxLength(max: number): ValidatorFn {
  return (value: unknown, field = 'value'): ValidatorResult => {
    // Return error for non-string/array
    if (typeof value !== 'string' && !Array.isArray(value)) {
      return {
        valid: false,
        error: new ValidationError(`${field} must be a string or array`, { field, value }),
      };
    }

    if (typeof value === 'string') {
      if (value.length > max) {
        return {
          valid: false,
          error: new ValidationError(`${field} must be at most ${max} characters`, {
            field,
            value,
            constraints: { maxLength: max },
          }),
        };
      }
    } else if (Array.isArray(value)) {
      if (value.length > max) {
        return {
          valid: false,
          error: new ValidationError(`${field} must have at most ${max} items`, {
            field,
            value,
            constraints: { maxLength: max },
          }),
        };
      }
    }
    return { valid: true, value };
  };
}

export function min(min: number): ValidatorFn {
  return (value: unknown, field = 'value'): ValidatorResult => {
    // Add type validation
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return {
        valid: false,
        error: new ValidationError(`${field} must be a number`, { field, value }),
      };
    }
    if (value < min) {
      return {
        valid: false,
        error: new ValidationError(`${field} must be at least ${min}`, {
          field,
          value,
          constraints: { min },
        }),
      };
    }
    return { valid: true, value };
  };
}

export function max(max: number): ValidatorFn {
  return (value: unknown, field = 'value'): ValidatorResult => {
    // Add type validation
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return {
        valid: false,
        error: new ValidationError(`${field} must be a number`, { field, value }),
      };
    }
    if (value > max) {
      return {
        valid: false,
        error: new ValidationError(`${field} must be at most ${max}`, {
          field,
          value,
          constraints: { max },
        }),
      };
    }
    return { valid: true, value };
  };
}

export function pattern(regex: RegExp, message?: string): ValidatorFn {
  return (value: unknown, field = 'value'): ValidatorResult => {
    // Return error for non-string
    if (typeof value !== 'string') {
      return {
        valid: false,
        error: new ValidationError(`${field} must be a string`, { field, value }),
      };
    }
    if (!regex.test(value)) {
      return {
        valid: false,
        error: new ValidationError(message || `${field} has invalid format`, {
          field,
          value,
          constraints: { pattern: regex.source },
        }),
      };
    }
    return { valid: true, value };
  };
}

export function isEmail(value: unknown, field = 'value'): ValidatorResult {
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (typeof value !== 'string' || !emailRegex.test(value)) {
    return {
      valid: false,
      error: new ValidationError(`${field} must be a valid email`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function isUrl(value: unknown, field = 'value'): ValidatorResult {
  try {
    if (typeof value !== 'string') {
      throw new Error();
    }
    new URL(value);
    return { valid: true, value };
  } catch {
    return {
      valid: false,
      error: new ValidationError(`${field} must be a valid URL`, { field, value }),
    };
  }
}

export function isUuid(value: unknown, field = 'value'): ValidatorResult {
  // Update regex to support v6/v7/v8 UUID
  // v1: 1xxx, v2: 2xxx, v3: 3xxx, v4: 4xxx, v5: 5xxx, v6: 6xxx, v7: 7xxx, v8: 8xxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof value !== 'string' || !uuidRegex.test(value)) {
    return {
      valid: false,
      error: new ValidationError(`${field} must be a valid UUID`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function oneOf<T extends readonly unknown[]>(options: T): ValidatorFn {
  return (value: unknown, field = 'value'): ValidatorResult => {
    if (!options.includes(value)) {
      return {
        valid: false,
        error: new ValidationError(`${field} must be one of: ${options.join(', ')}`, {
          field,
          value,
          constraints: { allowedValues: options },
        }),
      };
    }
    return { valid: true, value };
  };
}

export function isPositive(value: unknown, field = 'value'): ValidatorResult {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return {
      valid: false,
      error: new ValidationError(`${field} must be a positive number`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function isNonNegative(value: unknown, field = 'value'): ValidatorResult {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return {
      valid: false,
      error: new ValidationError(`${field} must be a non-negative number`, { field, value }),
    };
  }
  return { valid: true, value };
}

export function chain(...validators: ValidatorFn[]): ValidatorFn {
  return (value: unknown, field = 'value'): ValidatorResult => {
    let currentValue = value;
    for (const validator of validators) {
      const result = validator(currentValue, field);
      if (!result.valid) {
        return result;
      }
      currentValue = result.value;
    }
    return { valid: true, value: currentValue };
  };
}

export function optional(
  validator: ValidatorFn,
  treatEmptyStringAsUndefined: boolean = true
): ValidatorFn {
  return (value: unknown, field = 'value'): ValidatorResult => {
    if (value === undefined || value === null || (treatEmptyStringAsUndefined && value === '')) {
      return { valid: true, value: undefined };
    }
    return validator(value, field);
  };
}
