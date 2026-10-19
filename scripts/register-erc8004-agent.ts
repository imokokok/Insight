/* eslint-disable no-console */
/**
 * Register Insight as an ERC-8004 agent on BNB Chain's official Identity
 * Registry (EIP-8004 Trustless Agents).
 *
 * The on-chain identity token (agentId) points at
 * https://www.oracleinsight.xyz/.well-known/agent8004.json via `agentURI`,
 * which binds the ERC-8004 Identity Registry entry to Insight's A2A / MCP /
 * OpenAPI service endpoints and x402 payment surface.
 *
 * Keys: uses ERC8004_REGISTRAR_PRIVATE_KEY from the environment (or .env.local
 * via loadEnv). Use a DEDICATED key — this key OWNS the agentId NFT and can
 * update the registration later (URIUpdated / MetadataSet). Anyone holding it
 * controls Insight's on-chain agent identity. Never put it in git.
 *
 * Modes:
 *   --check                 Read-only: show registrar address, gas balance,
 *                           and (with --agent-id N) the on-chain registration.
 *   --network bscTestnet    Chain 97 drill (default).
 *   --network bsc           Chain 56 mainnet registration.
 *   --uri <url>             Override the agentURI (default: production file).
 *   --agent-id <n>          With --check: inspect an existing registration.
 *
 * Run:  npx tsx scripts/register-erc8004-agent.ts --check --network bscTestnet
 *       npx tsx scripts/register-erc8004-agent.ts --network bscTestnet
 *       npx tsx scripts/register-erc8004-agent.ts --network bsc
 */
import './loadEnv';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { bsc, bscTestnet, monad } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const AGENT_URI_DEFAULT = 'https://www.oracleinsight.xyz/.well-known/agent8004.json';

const REGISTRY: Record<string, `0x${string}`> = {
  bsc: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  bscTestnet: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  // Monad mainnet: canonical ERC-8004 singleton deployment (same addresses as
  // BSC per erc-8004/erc-8004-contracts README; code verified on-chain 2026-10-19).
  monad: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
};

const CHAINS = { bsc, bscTestnet, monad } as const;

// Minimal ABI: register + the views/events this script touches.
const IDENTITY_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'getAgentWallet',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: false },
    ],
  },
] as const;

function parseArgs(argv: string[]) {
  const args: {
    check: boolean;
    network: 'bsc' | 'bscTestnet' | 'monad';
    uri?: string;
    agentId?: bigint;
  } = {
    check: false,
    network: 'bscTestnet',
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--network' && argv[i + 1]) {
      const n = argv[++i];
      if (n !== 'bsc' && n !== 'bscTestnet' && n !== 'monad')
        throw new Error(`Unknown network: ${n}`);
      args.network = n;
    } else if (argv[i] === '--uri' && argv[i + 1]) args.uri = argv[++i];
    else if (argv[i] === '--agent-id' && argv[i + 1]) args.agentId = BigInt(argv[++i]);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chain = CHAINS[args.network];
  const registry = REGISTRY[args.network];
  const agentURI = args.uri ?? AGENT_URI_DEFAULT;
  const client = createPublicClient({ chain, transport: http() });

  const header = `ERC-8004 Identity Registry · ${args.network} (chain ${chain.id})\nregistry  ${registry}\nagentURI  ${agentURI}`;
  console.log(`\n${header}\n${'─'.repeat(header.split('\n')[0].length)}\n`);

  if (args.agentId !== undefined) {
    const [owner, uri, wallet] = await Promise.all([
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'ownerOf',
        args: [args.agentId],
      }),
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'tokenURI',
        args: [args.agentId],
      }),
      client
        .readContract({
          address: registry,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'getAgentWallet',
          args: [args.agentId],
        })
        .catch(() => undefined),
    ]);
    console.log(`agentId     ${args.agentId}`);
    console.log(`owner       ${owner}`);
    console.log(`tokenURI    ${uri}`);
    if (wallet) console.log(`agentWallet ${wallet}`);
    return;
  }

  const pk = process.env.ERC8004_REGISTRAR_PRIVATE_KEY;
  const account = pk
    ? privateKeyToAccount(
        pk.startsWith('0x') ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`)
      )
    : null;

  console.log(`registrar  ${account ? account.address : '(no key — read-only)'}`);
  if (account) {
    const [balance, minted] = await Promise.all([
      client.getBalance({ address: account.address }),
      client.readContract({
        address: registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'balanceOf',
        args: [account.address],
      }),
    ]);
    console.log(`gas balance ${formatEther(balance)} ${chain.nativeCurrency.symbol}`);
    console.log(`owned agents ${minted}`);
    if (args.check) return;
    if (balance < parseEther('0.0005')) {
      throw new Error(
        `Insufficient gas for registration on ${args.network}. Fund ${account.address} first.`
      );
    }
  } else if (!args.check) {
    throw new Error(
      'ERC8004_REGISTRAR_PRIVATE_KEY not set. Load it from .env.local or export it first.'
    );
  }

  if (args.check) return;

  const walletClient = createWalletClient({ chain, transport: http(), account: account! });
  console.log(`\n→ register("${agentURI}") ...`);
  const hash = await walletClient.writeContract({
    address: registry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'register',
    args: [agentURI],
  });
  console.log(`  tx ${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`  status ${receipt.status} · block ${receipt.blockNumber} · gas ${receipt.gasUsed}`);

  let agentId: bigint | undefined;
  // Decode Registered(uint256 indexed agentId, string agentURI, address owner)
  const { decodeEventLog } = await import('viem');
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({
        abi: IDENTITY_REGISTRY_ABI,
        data: log.data,
        topics: log.topics,
        strict: false,
      });
      if (ev.eventName === 'Registered') {
        agentId = (ev.args as { agentId: bigint }).agentId;
        break;
      }
    } catch {
      /* not one of our events */
    }
  }
  if (agentId === undefined) throw new Error('Registered event not found in receipt logs');

  const [uri, owner] = await Promise.all([
    client.readContract({
      address: registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'tokenURI',
      args: [agentId],
    }),
    client.readContract({
      address: registry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: 'ownerOf',
      args: [agentId],
    }),
  ]);
  console.log(`\n✓ Registered agentId ${agentId}`);
  console.log(`  owner    ${owner}`);
  console.log(`  tokenURI ${uri}`);
  console.log(
    `\nNext: record agentId ${agentId} (${args.network}) in docs/erc8004-reputation-evidence.md`
  );
  console.log(
    '⚠ Back up ERC8004_REGISTRAR_PRIVATE_KEY — it owns this agentId and can update the registration.'
  );
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
