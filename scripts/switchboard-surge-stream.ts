/* eslint-disable no-console */
/**
 * Persistent Switchboard Surge Plug worker.
 *
 * This is intentionally not a Vercel request/cron: the free Plug plan allows
 * one long-lived connection and two feeds, configured here as BTC/USD + ETH/USD.
 */
import { runSwitchboardSurgeStream } from '@/lib/oracles/services/switchboardSurgeStream';

const secretKey = process.env.SWITCHBOARD_SOLANA_SECRET_KEY;
if (!secretKey) {
  throw new Error(
    'SWITCHBOARD_SOLANA_SECRET_KEY is required (32/64-byte base58 or a Solana keypair JSON array)'
  );
}

const controller = new AbortController();
process.once('SIGINT', () => controller.abort());
process.once('SIGTERM', () => controller.abort());

let attempt = 0;
while (!controller.signal.aborted) {
  try {
    await runSwitchboardSurgeStream({
      secretKey,
      solanaRpcUrl: process.env.SWITCHBOARD_SOLANA_RPC_URL,
      gatewayUrl: process.env.SWITCHBOARD_SURGE_GATEWAY_URL,
      signal: controller.signal,
    });
    attempt = 0;
  } catch (error) {
    if (controller.signal.aborted) break;
    attempt += 1;
    const delayMs = Math.min(60_000, 1_000 * 2 ** Math.min(attempt - 1, 6));
    console.error(
      `[switchboard-surge] connection failed; retrying in ${delayMs}ms:`,
      error instanceof Error ? error.message : error
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

console.log('[switchboard-surge] stopped');
