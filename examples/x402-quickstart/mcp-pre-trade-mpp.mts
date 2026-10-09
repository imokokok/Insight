// MPP MCP pre-trade check: settles $0.02 USDC on Base after success.
// Available when MPP_ENABLED=true and MPP_MCP_ENABLED=true on the deployment.
//   npm i @modelcontextprotocol/sdk mppx viem
//   EVM_PRIVATE_KEY=0x... npx tsx mcp-pre-trade-mpp.mts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { evm } from 'mppx/client';
import { McpClient } from 'mppx/mcp/client';
import { privateKeyToAccount } from 'viem/accounts';
import { z } from 'zod';

const ENDPOINT = 'https://www.oracleinsight.xyz/api/mcp/mpp';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_USDC_AUTHORIZATION = { name: 'USD Coin', version: '2' } as const;

function readPrivateKey(): `0x${string}` {
  const value = process.env.EVM_PRIVATE_KEY;
  if (!value || !/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('EVM_PRIVATE_KEY must be a 32-byte 0x-prefixed private key');
  }
  return value as `0x${string}`;
}

const client = new Client({ name: 'insight-mpp-example', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT)));

const paidClient = McpClient.wrap(client, {
  methods: [
    evm.charge({
      account: privateKeyToAccount(readPrivateKey()),
      networks: [8453],
      currencies: [BASE_USDC],
      decimals: 6,
      authorization: BASE_USDC_AUTHORIZATION,
      maxAmount: '0.02',
    }),
  ],
});

try {
  const result = await paidClient.callTool({
    name: 'pre_trade_safety_check',
    arguments: { asset: 'ETH', chainId: 1, action: 'swap', tradeAmountUsd: 1000 },
  });

  const parsed = z
    .object({
      content: z.array(z.object({ type: z.string() }).passthrough()),
      isError: z.boolean().optional(),
    })
    .passthrough()
    .safeParse(result);
  if (!parsed.success || parsed.data.isError) {
    throw new Error('MCP pre-trade tool returned an invalid or failed result');
  }
  if (!result.receipt || result.receipt.status !== 'success' || !result.receipt.reference) {
    throw new Error('MPP settlement did not return a successful receipt');
  }

  process.stdout.write(`Tool result: ${JSON.stringify(parsed.data.content)}\n`);
  process.stdout.write(`MPP receipt: ${JSON.stringify(result.receipt)}\n`);
} finally {
  await client.close();
}
