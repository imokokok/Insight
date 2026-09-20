/** @jest-environment node */
import { NextRequest } from 'next/server';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { POST } from '../route';

jest.mock('@/lib/api/handler', () => ({
  createApiHandler: (
    handler: (request: NextRequest, context: unknown) => unknown,
    options: { middlewares: unknown; validation: unknown }
  ) => {
    expect(options.middlewares).toEqual(['protocol-api-key-and-credit']);
    return async (request: NextRequest) => {
      const { createZodValidationMiddleware } = jest.requireActual('@/lib/validation/middleware');
      const result = await createZodValidationMiddleware(options.validation)(request);
      if (!result.success) return result.response;
      return handler(request, { requestId: 'test', validated: result.data });
    };
  },
  createOptionsHandler: () => jest.fn(),
  ApiResponseBuilder: { success: (data: unknown) => ({ success: true, data }) },
  V1_PROTOCOL_TIER_MIDDLEWARES: ['protocol-api-key-and-credit'],
}));
afterEach(() => jest.useRealTimers());
it('HTTP rejects uint256 overflow with field, stable code and non-retryable detail', async () => {
  const body = JSON.parse(
    readFileSync(join(process.cwd(), 'examples/rwa-v1/diagnostic-request.json'), 'utf8')
  );
  body.input.request.amount = (2n ** 256n).toString();
  const response = await POST(
    new NextRequest('https://test/api/v1/rwa/assessment', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  );
  expect(response.status).toBe(400);
  expect((await response.json()).error.details.errors).toContainEqual({
    field: 'input.request.amount',
    message: 'RWA_UINT256_OUT_OF_RANGE',
    code: 'RWA_UINT256_OUT_OF_RANGE',
    retryable: false,
  });
});
it('POST validates JSON, uses server time and returns non-authorizing no-store diagnostics', async () => {
  jest.useFakeTimers().setSystemTime(new Date(1800000000 * 1000));
  const body = readFileSync(join(process.cwd(), 'examples/rwa-v1/diagnostic-request.json'), 'utf8');
  const response = await POST(
    new NextRequest('https://test/api/v1/rwa/assessment', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const result = await response.json();
  expect(result.data.report.evaluation.verdict).toBe('ALLOW');
  expect(result.data.mayAuthorizeExecution).toBe(false);
});
it('rejects caller-selected evaluation time and incomplete input', async () => {
  const body = JSON.parse(
    readFileSync(join(process.cwd(), 'examples/rwa-v1/diagnostic-request.json'), 'utf8')
  );
  body.evaluatedAt = 1800000000;
  const response = await POST(
    new NextRequest('https://test/api/v1/rwa/assessment', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  );
  expect(response.status).toBe(400);
});
