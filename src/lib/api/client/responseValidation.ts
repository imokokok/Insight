import { z } from 'zod';

const ApiErrorSchema = z
  .object({
    code: z.string().optional(),
    message: z.string().optional(),
    details: z.unknown().optional(),
  })
  .passthrough();

const ApiEnvelopeSchema = z
  .object({
    success: z.boolean(),
    data: z.unknown().optional(),
    error: ApiErrorSchema.optional(),
  })
  .passthrough();

export type ApiEnvelope = z.infer<typeof ApiEnvelopeSchema>;

/**
 * Validates the shared API response envelope before a caller reads any field
 * from JSON returned over the network. Endpoint-specific callers must still
 * validate `data` with their own schema.
 */
export function parseApiEnvelope(payload: unknown, context = 'API response'): ApiEnvelope {
  const parsed = ApiEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`${context} has an invalid JSON envelope`);
  }
  return parsed.data;
}

export function apiErrorMessage(envelope: ApiEnvelope, fallback: string): string {
  return envelope.error?.message || fallback;
}

export function apiErrorCode(envelope: ApiEnvelope, fallback = 'UNKNOWN'): string {
  return envelope.error?.code || fallback;
}

export function requireApiData<T>(
  envelope: ApiEnvelope,
  schema: z.ZodType<T>,
  context = 'API response'
): T {
  const parsed = schema.safeParse(envelope.data);
  if (!parsed.success) {
    throw new Error(`${context} has an invalid data payload`);
  }
  return parsed.data;
}

export function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
