// Insight pre-trade safety check via MPP: pay $0.02 USDC on Base per check.
// This rail is available when the Insight deployment has MPP_ENABLED=true.
//   npm i mppx viem zod
//   EVM_PRIVATE_KEY=0x... npx tsx pre-trade-mpp.mts

import { Mppx, evm } from 'mppx/client';
import { privateKeyToAccount } from 'viem/accounts';
import { z } from 'zod';

const ENDPOINT =
  'https://www.oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

function readPrivateKey(): `0x${string}` {
  const value = process.env.EVM_PRIVATE_KEY;
  if (!value || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('EVM_PRIVATE_KEY must be a 32-byte 0x-prefixed private key');
  }
  return value as `0x${string}`;
}

const mppx = Mppx.create({
  methods: [
    evm.charge({
      account: privateKeyToAccount(readPrivateKey()),
      networks: [8453],
      currencies: [BASE_USDC],
      maxAmount: '0.02',
    }),
  ],
});

const response = await mppx.fetch(ENDPOINT);
const body: unknown = await response.json();
const parsed = z
  .object({
    success: z.literal(true),
    data: z.object({ verdict: z.string() }).passthrough(),
  })
  .passthrough()
  .safeParse(body);

if (!response.ok || !parsed.success) {
  throw new Error(`Pre-trade check failed with HTTP ${response.status}`);
}

console.log('Verdict:', parsed.data.data.verdict);
console.log('Payment receipt:', response.headers.get('Payment-Receipt') ?? 'not returned');
