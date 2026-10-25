import { keccak256 } from 'viem';

import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

import { UniswapV3MarketRpcClient, type UniswapV3Hex } from './uniswapV3Market';

export const BASE_DEX_VENUE_CHAIN_ID = 8453;

export const BASE_DEX_VENUE_IDS = [
  'aerodrome-slipstream',
  'pancakeswap-v3',
  'curve-stableswap',
  'maverick-v2',
  'quickswap-v2',
  'quickswap-algebra-v4',
  'uniswap-v4',
  'pancakeswap-infinity',
] as const;

export type BaseDexVenueId = (typeof BASE_DEX_VENUE_IDS)[number];
type BaseDexVenueContractRole =
  | 'factory'
  | 'quoter'
  | 'router'
  | 'pool'
  | 'pool-manager'
  | 'vault'
  | 'state-view';

export interface BaseDexVenueContract {
  role: BaseDexVenueContractRole;
  address: UniswapV3Hex;
  codeHash: UniswapV3Hex;
}

export interface BaseDexVenueDefinition {
  id: BaseDexVenueId;
  displayName: string;
  model:
    | 'concentrated-liquidity'
    | 'stableswap'
    | 'bin-liquidity'
    | 'constant-product'
    | 'singleton-hooks';
  contracts: readonly BaseDexVenueContract[];
  capabilities: {
    /** Contract identities are re-read at one Base block before exposure. */
    deploymentEvidence: true;
    /** Only an allowlisted, profile-specific implementation may emit calldata. */
    exactInputPreparation: 'available' | 'review-required';
  };
  executionBoundary: string;
}

const VENUES: Record<BaseDexVenueId, BaseDexVenueDefinition> = {
  'aerodrome-slipstream': {
    id: 'aerodrome-slipstream',
    displayName: 'Aerodrome Slipstream',
    model: 'concentrated-liquidity',
    contracts: [
      {
        role: 'factory',
        address: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A',
        codeHash: '0x7340cf80843bd721bcaefbfc050e38304cb4174c239e6e914e3056f27f39b11c',
      },
      {
        role: 'quoter',
        address: '0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0',
        codeHash: '0xfb0ab713266d089d5b6ac48d50455c4fadc9cd49a1efcc83a091e7c2e48dad0e',
      },
      {
        role: 'router',
        address: '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5',
        codeHash: '0x8ca2876cc2c509da1648ef2ad21a8849c261cf7316b675119b98ba298c8657e7',
      },
    ],
    capabilities: { deploymentEvidence: true, exactInputPreparation: 'available' },
    executionBoundary:
      'Only Base WETH/USDC CL100 in the separate reviewed-pool allowlist can prepare unsigned calldata.',
  },
  'pancakeswap-v3': {
    id: 'pancakeswap-v3',
    displayName: 'PancakeSwap V3',
    model: 'concentrated-liquidity',
    contracts: [
      {
        role: 'factory',
        address: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
        codeHash: '0x8191d3ab1d55d3da9822199f28865415c99566b6f1aee4a4b16713f57930678c',
      },
      {
        role: 'quoter',
        address: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
        codeHash: '0x945e158b4d4b58c41ade0a10f7e6df0a3c631468fcd762eced1b3fe38fe1f812',
      },
      {
        role: 'router',
        address: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
        codeHash: '0x2cbdac93453dc8ebb7906446b3af75ada8ff43a6225a08ed2e0ee6eb12057b42',
      },
    ],
    capabilities: { deploymentEvidence: true, exactInputPreparation: 'available' },
    executionBoundary:
      'Only Base USDC/USDT 0.01% in the separate reviewed-pool allowlist can prepare unsigned calldata.',
  },
  'curve-stableswap': {
    id: 'curve-stableswap',
    displayName: 'Curve StableSwap',
    model: 'stableswap',
    contracts: [
      {
        role: 'router',
        address: '0x4f37A9d177470499A2dD084621020b023fcffc1F',
        codeHash: '0x3abb7fe467b6c925ab1b25771cf1c75cc507aec2f873a8d03ee95160c5a83579',
      },
      {
        role: 'pool',
        address: '0x335be1a364ea7f5da30aaaf062103ab91bf44dd0',
        codeHash: '0xfc94ec3e7034decd3f7a080dd9e1ae820a2ffd4cbc78c6f1fdc5b65864731aa0',
      },
    ],
    capabilities: { deploymentEvidence: true, exactInputPreparation: 'review-required' },
    executionBoundary:
      'StableSwap coin indexes, amplification, pool-specific ABI, and quote/settlement tests must be reviewed before a Curve transaction path is enabled.',
  },
  'maverick-v2': {
    id: 'maverick-v2',
    displayName: 'Maverick V2',
    model: 'bin-liquidity',
    contracts: [
      {
        role: 'factory',
        address: '0x0A7e848Aca42d879EF06507Fca0E7b33A0a63c1e',
        codeHash: '0x7273fba84b1c11de7a221e9d30e824f122bcdd1fa351055bd4a0568da585487d',
      },
      {
        role: 'quoter',
        address: '0xb40AfdB85a07f37aE217E7D6462e609900dD8D7A',
        codeHash: '0xcb986c5586811f7eb20d81023720d6f00ea2dd30033a519ae4857df09f2c6838',
      },
      {
        role: 'router',
        address: '0x5eDEd0d7E76C563FF081Ca01D9d12D6B404Df527',
        codeHash: '0x14dd99cfe7929e14d61b71892057e6acc470724c8c373b0643ecfa202091acd6',
      },
    ],
    capabilities: { deploymentEvidence: true, exactInputPreparation: 'review-required' },
    executionBoundary:
      'Maverick bin movement and per-pool swap parameters are not V3 semantics; a reviewed pool adapter is required before transaction preparation.',
  },
  'quickswap-v2': {
    id: 'quickswap-v2',
    displayName: 'QuickSwap V2',
    model: 'constant-product',
    contracts: [
      {
        role: 'factory',
        address: '0xEC6540261aaaE13F236A032d454dc9287E52e56A',
        codeHash: '0xbab145d02e7005f0d84c6c1639d39b799b0ea16df99ebbdaf5a14d9da820b4e0',
      },
      {
        role: 'router',
        address: '0x4a012af2b05616Fb390ED32452641C3F04633bb5',
        codeHash: '0xb5e20c5b15af401f9eb25bf99e713c71d2fa9c3ef0f003cd602358e3c9f7b6a1',
      },
      {
        role: 'pool',
        address: '0x7fb81993af9c46a5b487be991f44feed77e82074',
        codeHash: '0x5b83bdbcc56b2e630f2807bbadd2b0c21619108066b92a58de081261089e9ce5',
      },
    ],
    capabilities: { deploymentEvidence: true, exactInputPreparation: 'review-required' },
    executionBoundary:
      'A reviewed V2 reserve/fee adapter and exact path test are required before emitting router calldata.',
  },
  'quickswap-algebra-v4': {
    id: 'quickswap-algebra-v4',
    displayName: 'QuickSwap Algebra V4',
    model: 'concentrated-liquidity',
    contracts: [
      {
        role: 'factory',
        address: '0xC5396866754799B9720125B104AE01d935Ab9C7b',
        codeHash: '0x7822b724506fdf3f88058e04b74d0c754a8e09f5db1964fdc2ceb9977967b153',
      },
      {
        role: 'quoter',
        address: '0x23E0583a3a000d567bB3848115065c1890D87fb5',
        codeHash: '0xe12adc61e8bfa0dde56957ff5bb8c7113ec3e5b19c7ce45b2a8c0c46cffdc860',
      },
      {
        role: 'router',
        address: '0xe6c9bb24ddB4aE5c6632dbE0DE14e3E474c6Cb04',
        codeHash: '0x62cdf7bae0ae1144d6c21f2412bcfa28d8fd6025f0cd3c9d0ceb961e883b8737',
      },
    ],
    capabilities: { deploymentEvidence: true, exactInputPreparation: 'review-required' },
    executionBoundary:
      'Algebra’s dynamic fee/plugin state must be bound to an allowlisted pool before a quote or transaction path is enabled.',
  },
  'uniswap-v4': {
    id: 'uniswap-v4',
    displayName: 'Uniswap V4',
    model: 'singleton-hooks',
    contracts: [
      {
        role: 'pool-manager',
        address: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        codeHash: '0x83b2af6e9f3158defc2811cbcb0db71ecf8b2ba2abea39c39e370ac5c6f43eb6',
      },
      {
        role: 'quoter',
        address: '0xE1A6C5803e3c44368b171BD680c7D32dfc92CA47',
        codeHash: '0x0db83a28f61d9261b79cefd2217ab6fa26fe355a066ff609c9f606edc4bcf4f5',
      },
      {
        role: 'state-view',
        address: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71',
        codeHash: '0xbbd5859677ef5491143133e8ed2b8faa0272f6fc2cbae94c53e79cc8c0538545',
      },
    ],
    capabilities: { deploymentEvidence: true, exactInputPreparation: 'review-required' },
    executionBoundary:
      'Every pool key and hook implementation must be individually allowlisted and code-pinned before quote or execution preparation.',
  },
  'pancakeswap-infinity': {
    id: 'pancakeswap-infinity',
    displayName: 'PancakeSwap Infinity',
    model: 'singleton-hooks',
    contracts: [
      {
        role: 'vault',
        address: '0x238a358808379702088667322f80aC48bAd5e6c4',
        codeHash: '0x678bab6ace02b3fc508054b194f3f70190a0621f51bcae69be33cc5416031908',
      },
      {
        role: 'pool-manager',
        address: '0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b',
        codeHash: '0x3caf72836cb6603c6af03bba1578ec70ece8c3e5b1d0ef73667b5fbd74b02a0f',
      },
      {
        role: 'pool-manager',
        address: '0xC697d2898e0D09264376196696c51D7aBbbAA4a9',
        codeHash: '0x9e95edb558f2fb05a0d5a96b57cd59400d39b1b7c02a4fc7a8a158b3d092835f',
      },
      {
        role: 'router',
        address: '0xd9C500DfF816a1Da21A48A732d3498Bf09dc9AEB',
        codeHash: '0xff0f54623048c027945896b2d5f07c2ed4e9ab5055f257991f5f88a71ad82822',
      },
    ],
    capabilities: { deploymentEvidence: true, exactInputPreparation: 'review-required' },
    executionBoundary:
      'Both pool type and hook code are pool-specific. Insight refuses transaction preparation until the full pool key, hook, manager, and route are individually reviewed.',
  },
};

function baseRpcEndpoints(): string[] {
  return [
    ...new Set(
      (CHAINLINK_RPC_CONFIG[BASE_DEX_VENUE_CHAIN_ID]?.endpoints ?? []).filter((endpoint) => {
        try {
          return new URL(endpoint).protocol === 'https:';
        } catch {
          return false;
        }
      })
    ),
  ];
}

export class BaseDexVenueRpcClient extends UniswapV3MarketRpcClient {
  constructor(endpoints: string[] = baseRpcEndpoints()) {
    super(BASE_DEX_VENUE_CHAIN_ID, endpoints);
  }
}

export function isBaseDexVenueId(value: string): value is BaseDexVenueId {
  return (BASE_DEX_VENUE_IDS as readonly string[]).includes(value);
}

export function baseDexVenueDefinition(id: BaseDexVenueId): BaseDexVenueDefinition {
  const venue = VENUES[id];
  if (!venue) throw new Error('Base DEX venue is outside Insight’s reviewed deployment allowlist.');
  return venue;
}

export function listBaseDexVenueDefinitions(): BaseDexVenueDefinition[] {
  return BASE_DEX_VENUE_IDS.map((id) => baseDexVenueDefinition(id));
}

export interface BaseDexVenueSnapshot {
  source: 'dex-deployment';
  chainId: typeof BASE_DEX_VENUE_CHAIN_ID;
  observedAt: string;
  block: { number: string; hash: UniswapV3Hex; timestamp: string };
  venues: Array<
    Omit<BaseDexVenueDefinition, 'contracts'> & {
      contracts: Array<BaseDexVenueContract & { observedCodeHash: UniswapV3Hex }>;
    }
  >;
}

/**
 * Read all requested contract code at one pinned Base block. This gives the
 * heterogeneous venues a truthful common capability: verified deployment
 * identity. It intentionally does not invent a shared quote or swap ABI.
 */
export async function getBaseDexVenueSnapshot(
  requestedVenueIds: readonly BaseDexVenueId[] = BASE_DEX_VENUE_IDS,
  options: { rpc?: BaseDexVenueRpcClient; nowMs?: number; signal?: AbortSignal } = {}
): Promise<BaseDexVenueSnapshot> {
  const ids =
    requestedVenueIds.length > 0 ? [...new Set(requestedVenueIds)] : [...BASE_DEX_VENUE_IDS];
  if (ids.some((id) => !isBaseDexVenueId(id))) {
    throw new Error('Base DEX venue is outside Insight’s reviewed deployment allowlist.');
  }
  const venues = ids.map((id) => baseDexVenueDefinition(id));
  const rpc = options.rpc ?? new BaseDexVenueRpcClient();
  const blockNumber = await rpc.getBlockNumber(options.signal);
  const block = await rpc.getBlock(blockNumber, options.signal);
  const observedAtMs = Math.max(options.nowMs ?? Date.now(), Date.now());
  const verifiedVenues = await Promise.all(
    venues.map(async (venue) => {
      const runtimeCodes = await Promise.all(
        venue.contracts.map((contract) =>
          rpc.getCode(contract.address, block.number, options.signal)
        )
      );
      const contracts = venue.contracts.map((contract, index) => {
        const runtimeCode = runtimeCodes[index];
        if (!runtimeCode || runtimeCode === '0x') {
          throw new Error(
            `${venue.displayName} ${contract.role} has no runtime code at the pinned block.`
          );
        }
        const observedCodeHash = keccak256(runtimeCode);
        if (observedCodeHash !== contract.codeHash) {
          throw new Error(
            `${venue.displayName} ${contract.role} runtime code does not match the reviewed deployment.`
          );
        }
        return { ...contract, observedCodeHash };
      });
      return { ...venue, contracts };
    })
  );
  return {
    source: 'dex-deployment',
    chainId: BASE_DEX_VENUE_CHAIN_ID,
    observedAt: new Date(observedAtMs).toISOString(),
    block: {
      number: block.number.toString(),
      hash: block.hash,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
    },
    venues: verifiedVenues,
  };
}
