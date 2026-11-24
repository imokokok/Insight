/**
 * Locks the advisory-only boundary on the standard (non-ApiResponseBuilder)
 * error envelopes produced by errorToResponse / createErrorResponse.
 * See docs/advisory-only-boundary.md.
 */
import { AppError } from '../AppError';
import { errorToResponse } from '../errorToResponse';

describe('errorToResponse advisory boundary', () => {
  it('carries meta.insightDoesNotEnforce: true on AppError responses', async () => {
    const error = new AppError({ code: 'VALIDATION_ERROR', message: 'bad input', statusCode: 400 });
    const response = errorToResponse(error);
    const body = await response.json();

    expect(body.meta?.insightDoesNotEnforce).toBe(true);
  });

  it('carries meta.insightDoesNotEnforce: true on unhandled internal errors', async () => {
    const response = errorToResponse(new Error('boom'));
    const body = await response.json();

    expect(body.error?.code).toBe('INTERNAL_ERROR');
    expect(body.meta?.insightDoesNotEnforce).toBe(true);
  });
});
