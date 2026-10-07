#!/usr/bin/env node
// Insight pre-trade safety check via x402: pay $0.02 USDC on Base per check.
//
// Usage:
//   npm i @x402/fetch @x402/evm viem
//   EVM_PRIVATE_KEY=0x... node pre-trade.mjs
//
// The wallet needs a small USDC balance on Base mainnet.
// Docs: https://www.oracleinsight.xyz/docs/x402

import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const ENDPOINT =
  'https://www.oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000';

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
console.log('payer:', account.address);

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});
const client = new x402Client().register(
  'eip155:8453',
  new ExactEvmScheme(toClientEvmSigner(account, publicClient)),
);
const fetchWithPay = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPay(ENDPOINT);
console.log('HTTP', res.status);
const check = await res.json();
console.log(JSON.stringify(check, null, 2));

const settleHeader = res.headers.get('payment-response');
if (settleHeader) {
  const settle = JSON.parse(Buffer.from(settleHeader, 'base64').toString('utf8'));
  if (settle.transaction) {
    console.log('SETTLE TX: https://basescan.org/tx/' + settle.transaction);
  }
}
