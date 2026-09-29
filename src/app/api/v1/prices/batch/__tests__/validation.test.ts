/** @jest-environment node */
import { NextRequest } from 'next/server';

import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';

import { POST } from '../route';

jest.mock('@/lib/oracles/base/databaseOperations', () => ({ fetchPriceWithDatabase: jest.fn() }));

it('v1 POST rejects an oversized batch before API key lookup or any price fetch', async () => {
  const response = await POST(
    new NextRequest('https://test/api/v1/prices/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        queries: Array(21).fill({ provider: 'chainlink', symbol: 'ETH' }),
      }),
    }),
    { params: Promise.resolve({}) }
  );
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.success).toBe(false);
  expect(body.error.code).toBe('VALIDATION_ERROR');
  expect(fetchPriceWithDatabase).not.toHaveBeenCalled();
});
