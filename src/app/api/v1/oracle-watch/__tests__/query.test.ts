import { validateQuerySchema } from '@/lib/validation';

import { OracleWatchQuerySchema } from '../route';

async function validate(query: string) {
  const request = new Request(`https://www.oracleinsight.xyz/api/v1/oracle-watch?${query}`);
  return validateQuerySchema(OracleWatchQuerySchema)(request);
}

describe('Oracle Watch query validation', () => {
  it('accepts the SDK default attest=true query', async () => {
    const result = await validate('symbol=ETH&chain=ethereum&attest=true');

    expect(result.success).toBe(true);
    expect(result.data?.query).toEqual({ symbol: 'ETH', chain: 'ethereum', attest: true });
  });

  it('accepts attest=false without silently enabling signing', async () => {
    const result = await validate('symbol=ETH&attest=false');

    expect(result.success).toBe(true);
    expect(result.data?.query).toEqual({ symbol: 'ETH', attest: false });
  });

  it('rejects invalid attest values', async () => {
    const result = await validate('symbol=ETH&attest=yes');

    expect(result.success).toBe(false);
  });
});
