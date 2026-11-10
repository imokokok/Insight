/**
 * Initial reviewed-profile registry (P0-2).
 *
 * Every anchor below is read verbatim from a source-controlled constant in
 * `src/lib/**` and carries a `file:line` evidence reference. The review date
 * is 2026-11-05 (the P0-1 first-hand verification); code comments in the
 * source files record their own review dates where different.
 *
 * Findings carried over from P0-1 (see the evidence report referenced below):
 * - Drift v2 (`drift-v2-mainnet`): program id / 3 market PDAs /
 *   marginRatioInitial=500 still match on-chain EXACTLY (constants correct,
 *   do NOT change them), but the AMM timestamps have been frozen since
 *   2026-04-01 and the official repo was archived with "comment out all ixs".
 *   => status STALE + activityStatus FROZEN ("parameters consistent but venue
 *   no longer active"). This is the case the heartbeat must reproduce.
 * - Synthetix V3 Base (`synthetix-perps-v3-base`): proxy still has code,
 *   getMarkets() returns 108 markets incl. all 6 reviewed ids. Constants
 *   correct; activity not independently observed -> activityStatus UNKNOWN.
 * - Monad PancakeSwap profile: consistent with official framing; unchanged.
 *
 * Extension: add a descriptor to the relevant group below (or call
 * `registerReviewedProfile`). A future decoder is referenced by `decoderId`;
 * nothing here switches on profileId.
 */

import type {
  ActivitySignal,
  EvidenceLevel,
  EvidenceRef,
  ReviewedProfileDescriptor,
} from './types';

export const REVIEWED_PROFILE_SCHEMA_VERSION = 'insight.reviewed-profile-registry.v1' as const;

/** ISO date of this registry review / the P0-1 first-hand verification. */
export const REVIEW_DATE = '2026-11-05';

/** P0-1 first-hand evidence report (outside the repository, read-only). */
export const P0_1_EVIDENCE_REPORT =
  '~/.workbuddy/insight-capability-gap/2026-11-05-reviewed-profile-核实证据.md';

/** Solana mainnet CAIP-2, from src/lib/lending/solanaLendingAction.ts:12. */
export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

function ev(ref: string, level: EvidenceLevel, note?: string): EvidenceRef {
  return note === undefined ? { ref, level } : { ref, level, note };
}

/** No independent activity signal has been captured yet -> UNKNOWN, never ACTIVE. */
const unknownSignal = (): ActivitySignal => ({ kind: 'none' });

const P0_1_CHAIN = (note: string) => ev(P0_1_EVIDENCE_REPORT, 'chain', note);

// ---------------------------------------------------------------------------
// lending · Base (chainId 8453)
// src/lib/lending/baseLendingAction.ts:165-170 / baseLendingProtocols.ts
// ---------------------------------------------------------------------------
const BASE_LENDING: ReviewedProfileDescriptor[] = [
  {
    profileId: 'aave-v3-base',
    family: 'lending',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/baseLendingAction.ts:8', 'official', 'AaveV3Base.POOL import'),
      ev('src/lib/lending/baseLendingAction.ts:19', 'official', 'BASE_CHAIN_ID'),
      ev('src/lib/lending/baseLendingAction.ts:165-170', 'official', 'reviewed protocol ids'),
    ],
    chainAnchor: {
      pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes:
      'AaveV3Base.POOL from @aave-dao/aave-address-book via baseLendingAction.ts:8. 活性未独立观测。',
  },
  {
    profileId: 'morpho-blue-base',
    family: 'lending',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/baseLendingAction.ts:20', 'official', 'MORPHO_BLUE_BASE'),
      ev('src/lib/lending/baseLendingAction.ts:165-170', 'official'),
    ],
    chainAnchor: {
      pool: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Morpho Blue canonical singleton, baseLendingAction.ts:20.',
  },
  {
    profileId: 'compound-v3-base',
    family: 'lending',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/baseLendingProtocols.ts:11', 'official', 'COMPOUND_V3_BASE_COMET'),
      ev('src/lib/lending/baseLendingProtocols.ts:53-56', 'official', 'collateral assets'),
    ],
    chainAnchor: {
      proxy: '0xb125e6687d4313864e53df431d5425969c15eb2f',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Compound V3 Base Comet as the pinned proxy/target.',
  },
  {
    profileId: 'moonwell-base',
    family: 'lending',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/baseLendingProtocols.ts:14', 'official', 'MOONWELL_BASE_COMPTROLLER'),
      ev('src/lib/lending/baseLendingProtocols.ts:21-29', 'official', '7 reviewed markets'),
    ],
    chainAnchor: {
      proxy: '0xfbb21d0380bee3312b33c4353c8936a0f13ef26c',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes:
      'Comptroller pinned; the 7 admitted markets are listed at baseLendingProtocols.ts:21-29.',
  },
];

// ---------------------------------------------------------------------------
// lending · multichain EVM (Polygon 137 / Arbitrum 42161 / BNB 56 / Base 8453)
// src/lib/lending/multichainEvmLendingAction.ts:47-61
// src/lib/lending/multichainEvmLendingProtocols.ts
// ---------------------------------------------------------------------------
const MULTICHAIN_EVM_LENDING: ReviewedProfileDescriptor[] = [
  {
    profileId: 'aave-v3-polygon',
    family: 'lending',
    chainId: 137,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/multichainEvmLendingAction.ts:47-61', 'official'),
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:30-37',
        'official',
        'AAVE_V3_EVM_MARKETS.polygon POOL'
      ),
    ],
    chainAnchor: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'AaveV3Polygon.POOL, read via @aave-dao/aave-address-book.',
  },
  {
    profileId: 'aave-v3-arbitrum',
    family: 'lending',
    chainId: 42161,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:38-47',
        'official',
        'AAVE_V3_EVM_MARKETS.arbitrum'
      ),
    ],
    chainAnchor: {
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'AaveV3Arbitrum.POOL.',
  },
  {
    profileId: 'aave-v3-bnb',
    family: 'lending',
    chainId: 56,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:48-55',
        'official',
        'AAVE_V3_EVM_MARKETS.bnb'
      ),
    ],
    chainAnchor: {
      pool: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'AaveV3BNB.POOL.',
  },
  {
    profileId: 'venus-core-bnb',
    family: 'lending',
    chainId: 56,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:63-70',
        'official',
        'VENUS_CORE_POOL_COMPTROLLER + markets'
      ),
    ],
    chainAnchor: {
      proxy: '0xfd36e2c2a6789db23113685031d7f16329158384',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Venus BNB Core Pool comptroller.',
  },
  {
    profileId: 'compound-v3-arbitrum',
    family: 'lending',
    chainId: 42161,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:93-100',
        'official',
        'COMPOUND_V3_ARBITRUM_COMET'
      ),
    ],
    chainAnchor: {
      proxy: '0x9c4ec768c28520b50860ea7a15bd7213a9ff58bf',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Compound V3 Arbitrum native-USDC Comet.',
  },
  {
    profileId: 'morpho-blue-arbitrum',
    family: 'lending',
    chainId: 42161,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:77-86',
        'official',
        'MORPHO_BLUE_EVM_MARKETS'
      ),
    ],
    chainAnchor: {
      pool: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Morpho Blue shares the canonical singleton across deployments.',
  },
  {
    profileId: 'morpho-blue-polygon',
    family: 'lending',
    chainId: 137,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:77-86',
        'official',
        'MORPHO_BLUE_EVM_MARKETS'
      ),
    ],
    chainAnchor: {
      pool: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Morpho Blue Polygon singleton.',
  },
  {
    profileId: 'lista-moolah-bnb',
    family: 'lending',
    chainId: 56,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/multichainEvmLendingProtocols.ts:107', 'official', 'LISTA_MOOLAH_BNB'),
    ],
    chainAnchor: {
      proxy: '0x8f73b65b4caaf64fba2af91cc5d4a2a1318e5d8c',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Lista Moolah documented BSC core proxy.',
  },
  {
    profileId: 'euler-v2-base',
    family: 'lending',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:114-125',
        'official',
        'EULER_V2_EVM_MARKETS.base'
      ),
    ],
    chainAnchor: {
      proxy: '0x7f321498a801a191a93c840750ed637149ddf8d0',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Euler V2 Base eVaultFactory.',
  },
  {
    profileId: 'euler-v2-arbitrum',
    family: 'lending',
    chainId: 42161,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:114-125',
        'official',
        'EULER_V2_EVM_MARKETS.arbitrum'
      ),
    ],
    chainAnchor: {
      proxy: '0x78df1cf5bf06a7f27f2acc580b934238c1b80d50',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Euler V2 Arbitrum eVaultFactory.',
  },
  {
    profileId: 'dolomite-arbitrum',
    family: 'lending',
    chainId: 42161,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:128',
        'official',
        'DOLOMITE_ARBITRUM_MARGIN'
      ),
    ],
    chainAnchor: {
      proxy: '0x6bd780e7fdf01d77e4d475c821f1e7ae05409072',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Dolomite canonical Arbitrum margin engine.',
  },
  {
    profileId: 'fluid-vault-t1-base',
    family: 'lending',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:135-144',
        'official',
        'FLUID_VAULT_T1_EVM_MARKETS.base'
      ),
    ],
    chainAnchor: {
      proxy: '0x324c5dc1fc42c7a4d43d92df1eba58a54d13bf2d',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Fluid T1 VaultFactory (same address on Base/Arbitrum).',
  },
  {
    profileId: 'fluid-vault-t1-arbitrum',
    family: 'lending',
    chainId: 42161,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/multichainEvmLendingProtocols.ts:135-144',
        'official',
        'FLUID_VAULT_T1_EVM_MARKETS.arbitrum'
      ),
    ],
    chainAnchor: {
      proxy: '0x324c5dc1fc42c7a4d43d92df1eba58a54d13bf2d',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Fluid T1 VaultFactory (Arbitrum).',
  },
];

// ---------------------------------------------------------------------------
// lending · Monad (chainId 143)
// src/lib/lending/monadLendingAction.ts:117 / monadLendingProtocols.ts
// ---------------------------------------------------------------------------
const MONAD_LENDING: ReviewedProfileDescriptor[] = [
  {
    profileId: 'aave-v3-monad',
    family: 'lending',
    chainId: 143,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/monadLendingAction.ts:117', 'official', 'MonadLendingProtocolIdSchema'),
      ev('src/lib/lending/monadLendingProtocols.ts:12', 'official', 'AAVE_V3_MONAD_POOL'),
      ev('src/lib/lending/monadLendingProtocols.ts:27-37', 'official', 'AAVE_V3_MONAD_ASSETS'),
    ],
    chainAnchor: {
      pool: '0x69a5f9ad4f96ebf0a0c792dd42a01cc5c0102fef',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Monad Aave v3 Pool; MONAD_CHAIN_ID=143 at monadLendingProtocols.ts:10.',
  },
  {
    profileId: 'morpho-blue-monad',
    family: 'lending',
    chainId: 143,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/monadLendingProtocols.ts:19', 'official', 'MORPHO_BLUE_MONAD'),
    ],
    chainAnchor: {
      pool: '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Morpho Blue immutable Monad singleton.',
  },
];

// ---------------------------------------------------------------------------
// lending · HyperEVM (chainId 999)
// src/lib/lending/hyperEvmLendingAction.ts:65 / hyperEvmLendingProtocols.ts
// ---------------------------------------------------------------------------
const HYPEREVM_LENDING: ReviewedProfileDescriptor[] = [
  {
    profileId: 'hyperlend-core-hyperevm',
    family: 'lending',
    chainId: 999,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev(
        'src/lib/lending/hyperEvmLendingAction.ts:65',
        'official',
        'HyperEvmLendingProtocolIdSchema'
      ),
      ev('src/lib/lending/hyperEvmLendingProtocols.ts:16', 'official', 'HYPERLEND_CORE_POOL'),
      ev('src/lib/lending/hyperEvmLendingProtocols.ts:37', 'official', 'HYPERLEND_CORE_ASSETS'),
    ],
    chainAnchor: {
      pool: '0x00a89d7a5a02160f20150ebea7a2b5e4879a1a8b',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes:
      'HyperLend Core (Aave V3 fork) Pool on HyperEVM chain 999; pool/addresses-provider/UiPoolDataProvider live-verified 2026-11-10 via RPC getBytecode + getReservesList. Reviewed assets: WHYPE, WSTHYPE, UBTC, UETH, USDe, sUSDe, USDT0, KHYPE, USDC.',
  },
];

// ---------------------------------------------------------------------------
// lending · Solana
// src/lib/lending/solanaLendingAction.ts:12-20,144-150
// ---------------------------------------------------------------------------
const SOLANA_LENDING: ReviewedProfileDescriptor[] = [
  {
    profileId: 'kamino-lend',
    family: 'lending',
    chainId: SOLANA_MAINNET_CAIP2,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/solanaLendingAction.ts:13', 'official', 'KAMINO_LEND_PROGRAM_ID'),
      ev('src/lib/lending/solanaLendingAction.ts:144-150', 'official', 'reviewed protocol ids'),
    ],
    chainAnchor: {
      programId: 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Kamino Lend mainnet program id.',
  },
  {
    profileId: 'marginfi-v2',
    family: 'lending',
    chainId: SOLANA_MAINNET_CAIP2,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/solanaLendingAction.ts:14', 'official', 'MARGINFI_V2_PROGRAM_ID'),
    ],
    chainAnchor: {
      programId: 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Marginfi v2 mainnet program id.',
  },
  {
    profileId: 'jupiter-lend-earn',
    family: 'lending',
    chainId: SOLANA_MAINNET_CAIP2,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/solanaLendingAction.ts:16-18', 'official', 'JUPITER_LEND_*_PROGRAM_ID'),
    ],
    chainAnchor: {
      programId: 'jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes:
      'Jupiter Lend main program; secondary liquidity program at solanaLendingAction.ts:17-18.',
  },
  {
    profileId: 'save-lend',
    family: 'lending',
    chainId: SOLANA_MAINNET_CAIP2,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/solanaLendingAction.ts:20', 'official', 'SAVE_LEND_PROGRAM_ID'),
    ],
    chainAnchor: {
      programId: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Save (SPL Token Lending) mainnet program id.',
  },
  {
    profileId: 'loopscale-vault',
    family: 'lending',
    chainId: SOLANA_MAINNET_CAIP2,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/lending/solanaLendingAction.ts:144-150', 'official', 'reviewed protocol id only'),
      ev('src/lib/lending/loopscaleVaultDeposit.ts:1', 'official', 'deposit integration'),
    ],
    chainAnchor: {
      paramSlot: 'loopscale-vault',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes:
      '未找到该 profile 可比对的链上 program-address 常量；以 protocolId 作为身份锚点，后续用 decoder 补锚点。',
  },
];

// ---------------------------------------------------------------------------
// swap · 6 EVM profiles
// src/lib/dex/baseAgentSwapGuard.ts:66-73 / aerodromeSlipstream.ts / pancakeSwapV3.ts
// ---------------------------------------------------------------------------
const EVM_SWAP: ReviewedProfileDescriptor[] = [
  {
    profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
    family: 'swap',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/dex/baseAgentSwapGuard.ts:66-73', 'official', 'reviewed swap profile ids'),
      ev(
        'src/lib/dex/aerodromeSlipstream.ts:21-38',
        'official',
        'factory/quoter/router + code hashes'
      ),
      ev('src/lib/dex/aerodromeSlipstream.ts:49-58', 'official', 'WETH/USDC pool + poolCodeHash'),
    ],
    chainAnchor: {
      pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59',
      bytecodeHash: '0xacd6710f7037ad095b1e4d5f8ee5b2681069cb4dd316e77e4e0cb8f85716a2a1',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Aerodrome Slipstream CL100 pool, tickSpacing=100.',
  },
  {
    profileId: 'base-aerodrome-slipstream-usdc-usdt-cl1',
    family: 'swap',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/dex/baseAgentSwapGuard.ts:66-73', 'official'),
      ev(
        'src/lib/dex/aerodromeSlipstream.ts:67-76',
        'official',
        'USDC/USDT CL1 pool + poolCodeHash'
      ),
    ],
    chainAnchor: {
      pool: '0xa41Bc0AFfbA7Fd420d186b84899d7ab2aC57fcD1',
      bytecodeHash: '0xacd6710f7037ad095b1e4d5f8ee5b2681069cb4dd316e77e4e0cb8f85716a2a1',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Shares the Slipstream CL pool implementation code hash with WETH/USDC.',
  },
  {
    profileId: 'base-pancakeswap-v3-usdc-usdt-100',
    family: 'swap',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/dex/baseAgentSwapGuard.ts:66-73', 'official'),
      ev('src/lib/dex/pancakeSwapV3.ts:11-24', 'official', 'Base deployment + CODE_IDENTITY'),
      ev('src/lib/dex/pancakeSwapV3.ts:26-31', 'official', 'USDC/USDT pool + poolCodeHash'),
    ],
    chainAnchor: {
      pool: '0x5f07bb9fee6062e9d09a52e6d587c64bad6ba706',
      bytecodeHash: '0xaef3a8195a0422d20abe974031e2b026409664b58b3deebafdfc494edce77a07',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'PancakeSwap V3 Base, feeTier=100.',
  },
  {
    profileId: 'bnb-pancakeswap-v3-usdt-usdc-100',
    family: 'swap',
    chainId: 56,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/dex/baseAgentSwapGuard.ts:66-73', 'official'),
      ev('src/lib/dex/pancakeSwapV3.ts:38-59', 'official', 'BNB deployment + USDT/USDC pool'),
    ],
    chainAnchor: {
      pool: '0x92b7807bf19b7dddf89b706143896d05228f3121',
      bytecodeHash: '0xc7f2aca72215bdbdca3ee6ae87d5500b09b13f0e6cfe097cd3092ab9e8439f34',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'PancakeSwap V3 BNB, per-chain poolCodeHash.',
  },
  {
    profileId: 'bnb-pancakeswap-v3-usdt-wbnb-100',
    family: 'swap',
    chainId: 56,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/dex/baseAgentSwapGuard.ts:66-73', 'official'),
      ev('src/lib/dex/pancakeSwapV3.ts:61-73', 'official', 'USDT/WBNB volatile pair'),
    ],
    chainAnchor: {
      pool: '0x172fcD41E0913e95784454622d1c3724f546f849',
      bytecodeHash: '0x6796316e56ef0dd38755758b3239f271b2398ef028c8200bcf7fc8cc00ae1cfd',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Reviewed volatile major pair, block 131435862.',
  },
  {
    profileId: 'monad-pancakeswap-v3-wmon-usdc-500',
    family: 'swap',
    chainId: 143,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/dex/baseAgentSwapGuard.ts:66-73', 'official'),
      ev('src/lib/dex/pancakeSwapV3.ts:84-105', 'official', 'Monad deployment + WMON/USDC pool'),
      P0_1_CHAIN('C2/C3：PancakeSwap V3 在 Monad 真实部署、与官方口径不矛盾；逐池量级未取到'),
    ],
    chainAnchor: {
      pool: '0x63e48b725540a3db24acf6682a29f877808c53f2',
      bytecodeHash: '0x35fd982b4dd2ca117a46c8ee159413c5fae65feb122ab257c5db26b78604e1be',
      activitySignal: { kind: 'venueApi', maxSilenceHours: 24 },
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes:
      'P0-1 结论：与官方口径不矛盾，常量不改；feeTier=500；逐池量级仍不确定（见证据报告 C3）。',
  },
];

// ---------------------------------------------------------------------------
// swap · 2 Solana Orca profiles
// src/lib/dex/solanaOrcaWhirlpool.ts:20,28-31,91-123
// ---------------------------------------------------------------------------
const SOLANA_ORCA_SWAP: ReviewedProfileDescriptor[] = [
  {
    profileId: 'solana-orca-whirlpool-usdc-usdt-1',
    family: 'swap',
    chainId: SOLANA_MAINNET_CAIP2,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/dex/solanaOrcaWhirlpool.ts:20', 'official', 'ORCA_WHIRLPOOL_PROGRAM_ID'),
      ev('src/lib/dex/solanaOrcaWhirlpool.ts:28-31', 'official', 'reviewed profile ids'),
      ev('src/lib/dex/solanaOrcaWhirlpool.ts:95-108', 'official', 'USDC/USDT pool state'),
    ],
    chainAnchor: {
      programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
      pool: '4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Orca Whirlpool USDC/USDT, tickSpacing=1, feeRate=100.',
  },
  {
    profileId: 'solana-orca-whirlpool-sol-usdc-1',
    family: 'swap',
    chainId: SOLANA_MAINNET_CAIP2,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/dex/solanaOrcaWhirlpool.ts:20', 'official'),
      ev('src/lib/dex/solanaOrcaWhirlpool.ts:109-122', 'official', 'SOL/USDC pool state'),
    ],
    chainAnchor: {
      programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
      pool: 'Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE',
      activitySignal: unknownSignal(),
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Orca Whirlpool SOL/USDC, decoded live 2026-11-04, tickSpacing=4, feeRate=400.',
  },
];

// ---------------------------------------------------------------------------
// perp · four chains + Hyperliquid
// ---------------------------------------------------------------------------
const PERP: ReviewedProfileDescriptor[] = [
  {
    profileId: 'synthetix-perps-v3-base',
    family: 'perp',
    chainId: 8453,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/perps/basePerpGuard.ts:26', 'official', 'SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID'),
      ev('src/lib/perps/basePerpAction.ts:28', 'official', 'PERPS_MARKET_PROXY'),
      ev('src/lib/perps/basePerpAction.ts:34-41', 'official', '6 reviewed market ids'),
      P0_1_CHAIN('B1/B2：代理仍有 610 字节代码，getMarkets() 返回 108 市场含全部 6 个 reviewed ID'),
      P0_1_CHAIN('B7：官方仓库 archived（≠链上停用）；链上活性未独立观测'),
    ],
    chainAnchor: {
      proxy: '0x0A2AF931eFFd34b81ebcc57E3d3c9B1E1dE1C9Ce',
      marketAccounts: ['100', '200', '400', '7100', '800', '1200'],
      paramSlot: 'getMarkets()@0xec2c9016 -> 108 ids',
      activitySignal: { kind: 'onchainTimestamp', maxSilenceHours: 24 },
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'P0-1：常量正确不改；代理仍部署且可调用。活性未观测 -> UNKNOWN，不得当 ACTIVE。',
  },
  {
    profileId: 'aster-perps-bnb-mainnet',
    family: 'perp',
    chainId: 56,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/perps/bnbPerpGuard.ts:38', 'official', 'BNB_PERP_GUARD_ASTER_PROTOCOL_ID'),
      ev('src/lib/dex/asterPerpMarket.ts:26', 'official', "ASTER_MAINNET_NETWORK='eip155:56'"),
    ],
    chainAnchor: {
      paramSlot: 'aster-perps-bnb-mainnet',
      activitySignal: { kind: 'venueApi', maxSilenceHours: 24 },
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes:
      'API-based venue；未找到可比对链上合约地址常量，以 protocolId 身份锚点占位，后续用 decoder 补。',
  },
  {
    profileId: 'perpl-perps-monad-mainnet',
    family: 'perp',
    chainId: 143,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/perps/monadPerpGuard.ts:42', 'official', 'MONAD_PERP_GUARD_PERPL_PROTOCOL_ID'),
      ev('src/lib/perps/perplPerpMarket.ts:25', 'official', "PERPL_MAINNET_NETWORK='eip155:143'"),
    ],
    chainAnchor: {
      paramSlot: 'perpl-perps-monad-mainnet',
      activitySignal: { kind: 'venueApi', maxSilenceHours: 24 },
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'API-based venue；未找到可比对链上合约地址常量，以 protocolId 身份锚点占位。',
  },
  {
    profileId: 'drift-v2-mainnet',
    family: 'perp',
    chainId: SOLANA_MAINNET_CAIP2,
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/perps/solanaPerpGuard.ts:57', 'official', 'DRIFT_V2_PROTOCOL_ID'),
      ev('src/lib/perps/driftPerpMarket.ts:41', 'official', 'DRIFT_V2_MAINNET_PROGRAM_ID'),
      ev(
        'src/lib/perps/solanaPerpGuard.ts:60-70',
        'official',
        'marginRatioInitial=500 / 3 reviewed markets'
      ),
      P0_1_CHAIN(
        'A2：程序 ID / 三市场 / marginRatioInitial=500 与链上逐字段一致（常量正确，不改）'
      ),
      P0_1_CHAIN(
        'A4：三市场 lastMarkPriceTwapTs 自 2026-04-01T18:31Z 冻结约 218 天；官方 commit e32903bec003 "comment out all ixs"'
      ),
      P0_1_CHAIN('A3：官方仓库归档并迁往 velocity-exchange，docs 重定向'),
    ],
    chainAnchor: {
      programId: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
      marketAccounts: [
        '8UJgxaiQx5nTrdDgph5FiahMmzduuLTLf5WmsPegYA6W',
        '2UZMvVTBQR9yWxrEdzEQzXWE61bUjqQ5VpJAGqVb3B19',
        '25Eax9W8SA3wpCQFhJEGyHhQ2NDHEshZEDzyMNtthR8D',
      ],
      paramSlot: 'marginRatioInitial=500@+1136',
      activitySignal: {
        kind: 'onchainTimestamp',
        onchainField: 'ammLastMarkPriceTwapTs @ +888 (driftPerpMarket.ts:57-82)',
        lastObservedAt: '2026-04-01T18:31:45Z',
        declaredInactiveAt: '2026-04-01T17:36:27Z',
        maxSilenceHours: 24,
        declarationRef: `${P0_1_EVIDENCE_REPORT}#a4--断言主网-amm-仍提供实時非冻结场所证据`,
      },
    },
    lastHeartbeatAt: null,
    status: 'STALE',
    activityStatus: 'FROZEN',
    notes:
      'P0-1 核心情形：链上参数与 review 逐字段一致，但 AMM 冻结约 218 天且官方注释掉全部指令 -> 活性失效。常量正确，不改；status=STALE 表达「参数没变但场所已停止活跃」。',
  },
  {
    profileId: 'hyperliquid-perps-mainnet',
    family: 'perp',
    chainId: 'hyperliquid:mainnet',
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/perps/hyperliquidPerpGuard.ts:33', 'official', 'HYPERLIQUID_PERPS_PROTOCOL_ID'),
      ev(
        'src/lib/dex/hyperliquidPerpMarket.ts:12',
        'official',
        "HYPERLIQUID_MAINNET_NETWORK='hyperliquid:mainnet'"
      ),
    ],
    chainAnchor: {
      paramSlot: 'hyperliquid-perps-mainnet',
      activitySignal: { kind: 'venueApi', maxSilenceHours: 24 },
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: 'Hyperliquid L1 / API-based；未找到可比对链上合约地址常量，以 protocolId 身份锚点占位。',
  },
];

// ---------------------------------------------------------------------------
// prediction · chain-agnostic
// ---------------------------------------------------------------------------
const PREDICTION: ReviewedProfileDescriptor[] = [
  {
    profileId: 'polymarket-prediction-mainnet',
    family: 'prediction',
    chainId: 'chain-agnostic',
    reviewedAt: REVIEW_DATE,
    evidenceRefs: [
      ev('src/lib/prediction/polymarketGuard.ts:43', 'official', 'POLYMARKET_GUARD_PROTOCOL_ID'),
      ev(
        'src/lib/settlementEvidence/polymarket.ts:23',
        'official',
        "DEFAULT_GAMMA_BASE_URL='https://gamma-api.polymarket.com'"
      ),
      ev(
        'src/lib/prediction/polymarketGuard.ts:24-28',
        'official',
        'reviewed 2026-11-04 against live updown series'
      ),
    ],
    chainAnchor: {
      paramSlot: 'polymarket-prediction-mainnet',
      activitySignal: { kind: 'venueApi', maxSilenceHours: 24 },
    },
    lastHeartbeatAt: null,
    status: 'ACTIVE',
    activityStatus: 'UNKNOWN',
    notes: '链无关（Gamma API）；metadata 是唯一评估输入，transport/shape 失败即 BLOCK。',
  },
];

// ---------------------------------------------------------------------------
// Registry index (data-driven, no switch on profileId)
// ---------------------------------------------------------------------------
const PROFILES: ReviewedProfileDescriptor[] = [
  ...BASE_LENDING,
  ...MULTICHAIN_EVM_LENDING,
  ...MONAD_LENDING,
  ...HYPEREVM_LENDING,
  ...SOLANA_LENDING,
  ...EVM_SWAP,
  ...SOLANA_ORCA_SWAP,
  ...PERP,
  ...PREDICTION,
];

export const REVIEWED_PROFILES: readonly ReviewedProfileDescriptor[] = PROFILES;

const INDEX = new Map<string, ReviewedProfileDescriptor>();
for (const descriptor of PROFILES) INDEX.set(descriptor.profileId, descriptor);

export function getReviewedProfile(profileId: string): ReviewedProfileDescriptor | undefined {
  return INDEX.get(profileId);
}

export function listReviewedProfiles(): readonly ReviewedProfileDescriptor[] {
  return PROFILES;
}

export function listReviewedProfileIds(): string[] {
  return Array.from(INDEX.keys());
}

/** Extend the registry with a new descriptor (+ optional decoderId), no switch. */
export function registerReviewedProfile(descriptor: ReviewedProfileDescriptor): void {
  if (!INDEX.has(descriptor.profileId)) PROFILES.push(descriptor);
  INDEX.set(descriptor.profileId, descriptor);
}
