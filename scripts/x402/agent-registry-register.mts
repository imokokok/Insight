/**
 * Register Insight as an agent on the Solana Agent Registry (SATI / ERC-8004).
 *
 * Produces an ERC-8004 registration-v1 file (hosted IPFS) and mints the
 * Token-2022 agent NFT on Solana mainnet (program satiRkxEiwZ51cv8PRu8UMzuaqeaNU9jABo6oAFMsLe,
 * ~0.003-0.01 SOL). The registration cross-links the existing ERC-8004 BNB
 * identity (eip155:56, agentRegistry 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432,
 * agentId 375779 — see bnbconfig.json) so identity is portable across chains.
 *
 * Stage 1 (default, no side effects): loads the payer keypair, prints its
 *   pubkey/balance and the exact registration file that would be uploaded,
 *   and fails if the balance is below the estimated cost.
 * Stage 2 (SATI_EXECUTE=true): performs the on-chain registration.
 *
 * Usage:
 *   # dry run
 *   npx tsx scripts/x402/agent-registry-register.mts
 *   # execute
 *   SATI_PAYER_KEYPAIR_PATH=/path/to/keypair.json SATI_EXECUTE=true npx tsx scripts/x402/agent-registry-register.mts
 *
 * Keypair sources (first match wins):
 *   SATI_PAYER_KEYPAIR_JSON  inline JSON {publicKeyBase58, secretKeyBase64} or 64-byte array
 *   SATI_PAYER_KEYPAIR_PATH  path to the same JSON shapes
 *
 * Safety: the payer must be a dedicated, balance-limited mainnet key.
 * Registration only mints an NFT and writes metadata; it moves no USDC and
 * grants no custody.
 */

import fs from 'node:fs';

import { Sati, createSatiUploader, type RegistrationEntry } from '@cascade-fyi/sati-sdk';
import { createKeyPairSignerFromPrivateKeyBytes, type KeyPairSigner } from '@solana/kit';

const NETWORK = (process.env.SATI_NETWORK ?? 'mainnet') as 'mainnet' | 'devnet';
const MAINNET_PROGRAM = 'satiRkxEiwZ51cv8PRu8UMzuaqeaNU9jABo6oAFMsLe';
const REGISTRATION_FILE_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1';

const AGENT = {
  name: 'Insight',
  description:
    'Decision-input trust layer for DeFi and AI agents: pre-trade oracle risk checks (oracle evidence, risk intelligence, decision integrity, verify). x402 v2 payable pre-trade API + MCP; cross-chain ERC-8004 identity on BNB.',
  image: 'https://www.oracleinsight.xyz/logos/insight-glacier-cut.svg',
  externalUrl: 'https://www.oracleinsight.xyz',
  mcpUrl: 'https://www.oracleinsight.xyz/api/mcp',
} as const;

/** Cross-link to the existing ERC-8004 registration on BNB Smart Chain (bnbconfig.json). */
const BNB_REGISTRATION: RegistrationEntry = {
  agentId: 375779,
  agentRegistry: 'eip155:56:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
};

const MIN_BALANCE_SOL = Number(process.env.SATI_MIN_BALANCE_SOL ?? 0.02); // registration ~0.003-0.01 SOL; keep headroom for fees

function loadKeyPairSigner(): Promise<KeyPairSigner> {
  const inline = process.env.SATI_PAYER_KEYPAIR_JSON;
  const path = process.env.SATI_PAYER_KEYPAIR_PATH;
  if (!inline && !path) {
    throw new Error('set SATI_PAYER_KEYPAIR_JSON or SATI_PAYER_KEYPAIR_PATH');
  }
  const raw = path ? fs.readFileSync(path, 'utf8').trim() : '';
  const parsed: unknown = JSON.parse(inline ?? raw);
  let secret: Uint8Array;
  if (Array.isArray(parsed)) {
    const bytes = Uint8Array.from(parsed as number[]);
    secret = bytes.length === 64 ? bytes.slice(0, 32) : bytes;
  } else if (typeof parsed === 'object' && parsed !== null && 'secretKeyBase64' in parsed) {
    secret = Uint8Array.from(
      Buffer.from((parsed as { secretKeyBase64: string }).secretKeyBase64, 'base64')
    ).slice(0, 32);
  } else {
    throw new Error('unsupported keypair JSON shape');
  }
  return createKeyPairSignerFromPrivateKeyBytes(secret);
}

async function getBalanceSol(payer: KeyPairSigner): Promise<number> {
  const { createSolanaRpc } = await import('@solana/kit');
  const rpcUrl =
    process.env.SATI_RPC_URL ??
    (NETWORK === 'mainnet'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com');
  const rpc = createSolanaRpc(rpcUrl);
  const { value } = await rpc.getBalance(payer.address).send();
  return Number(value) / 1e9;
}

function registrationFilePreview() {
  // Mirrors what the SATI builder uploads: registration-v1 file with services,
  // trust mechanisms, x402 support, and the BNB cross-chain registration.
  return {
    type: REGISTRATION_FILE_TYPE,
    name: AGENT.name,
    description: AGENT.description,
    image: AGENT.image,
    externalUrl: AGENT.externalUrl,
    services: [{ name: 'MCP', url: AGENT.mcpUrl, version: '2025-06-18' }],
    registrations: [BNB_REGISTRATION],
    supportedTrust: ['reputation'],
    active: true,
    x402Support: true,
  };
}

async function main(): Promise<void> {
  const payer = await loadKeyPairSigner();
  const balance = await getBalanceSol(payer);
  const execute = process.env.SATI_EXECUTE === 'true';

  console.log(`network      : ${NETWORK}`);
  console.log(`program      : ${MAINNET_PROGRAM}`);
  console.log(`payer        : ${payer.address}`);
  console.log(`balance      : ${balance.toFixed(9)} SOL`);
  console.log('registration :', JSON.stringify(registrationFilePreview(), null, 2));

  if (balance < MIN_BALANCE_SOL) {
    throw new Error(
      `payer balance ${balance.toFixed(9)} SOL is below the ${MIN_BALANCE_SOL} SOL safety floor; fund it first`
    );
  }

  if (!execute) {
    console.log('\n[dry run] no on-chain action taken; set SATI_EXECUTE=true to register.');
    return;
  }

  const satiRpc = process.env.SATI_RPC_URL;
  const sati = new Sati({
    network: NETWORK,
    ...(satiRpc
      ? { rpcUrl: satiRpc, photonRpcUrl: satiRpc, wsUrl: satiRpc.replace(/^http/, 'ws') }
      : {}),
  });
  const builder = sati
    .createAgentBuilder(AGENT.name, AGENT.description, AGENT.image)
    .setMCP(AGENT.mcpUrl, '2025-06-18')
    .setExternalUrl(AGENT.externalUrl)
    .setX402Support(true)
    .setSupportedTrust(['reputation'])
    .setActive(true);

  // The builder does not expose a fluent setter for cross-chain registrations;
  // the params object is the same one register() serializes.
  builder.params.registrations = [BNB_REGISTRATION];

  const result = await builder.register({
    payer,
    uploader: createSatiUploader(),
  });

  console.log('\n[registered]');
  console.log('agent mint  :', result.mint);
  console.log('member no.  :', result.memberNumber);
  console.log('signature   :', result.signature);
  console.log(
    'agentId     :',
    `solana:${NETWORK === 'mainnet' ? '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' : 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1'}:${result.mint}`
  );
}

try {
  await main();
} catch (error) {
  console.error('agent-registry-register error:', error);
  process.exit(1);
}
