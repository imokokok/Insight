import { createHash } from 'node:crypto';

import { ed25519 } from '@noble/curves/ed25519';

import {
  KAMINO_LEND_PROGRAM_ID,
  JUPITER_LEND_LIQUIDITY_PROGRAM_ID,
  JUPITER_LEND_PROGRAM_ID,
  MARGINFI_V2_PROGRAM_ID,
  SAVE_LEND_PROGRAM_ID,
  decodeSolanaLendingExactCall,
  type SolanaLendingTransaction,
} from '../solanaLendingAction';
import { assessSolanaLendingGuard } from '../solanaLendingGuard';
import {
  createSolanaLendingGuardDecision,
  verifySolanaLendingGuardDecision,
} from '../solanaLendingGuardAttestation';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);
  let output = '';
  while (value > 0n) {
    output = ALPHABET[Number(value % 58n)] + output;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    output = `1${output}`;
  }
  return output || '1';
}
function key(seed: number): string {
  return base58(Uint8Array.from({ length: 32 }, (_, index) => ((seed + index) % 255) + 1));
}
function data(amount: bigint): string {
  const bytes = Uint8Array.from([169, 201, 30, 126, 6, 205, 102, 68, ...new Array(8).fill(0)]);
  for (let index = 0; index < 8; index += 1)
    bytes[8 + index] = Number((amount >> BigInt(index * 8)) & 0xffn);
  return base58(bytes);
}
function transaction(): SolanaLendingTransaction {
  const accountKeys = [
    key(1),
    key(2),
    key(3),
    key(4),
    'So11111111111111111111111111111111111111112',
    key(5),
    key(6),
    key(7),
    key(8),
    key(9),
    key(10),
    key(11),
    KAMINO_LEND_PROGRAM_ID,
  ];
  return {
    network: 'mainnet-beta',
    messageVersion: 'legacy',
    feePayer: accountKeys[0],
    recentBlockhash: key(12),
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    accountKeys,
    addressTableLookups: [],
    loadedAddresses: { writable: [], readonly: [] },
    instructions: [
      {
        programIdIndex: 12,
        accountIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        data: data(1_000_000n),
      },
    ],
  };
}
function marginfiBorrowTransaction(): SolanaLendingTransaction {
  const accountKeys = [
    key(30),
    key(31),
    key(32),
    key(33),
    key(34),
    key(35),
    key(36),
    key(37),
    MARGINFI_V2_PROGRAM_ID,
  ];
  const discriminator = createHash('sha256')
    .update('global:lending_account_borrow')
    .digest()
    .subarray(0, 8);
  const instructionData = Uint8Array.from([...discriminator, 64, 66, 15, 0, 0, 0, 0, 0]);
  return {
    network: 'mainnet-beta',
    messageVersion: 'legacy',
    feePayer: accountKeys[0],
    recentBlockhash: key(38),
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    accountKeys,
    addressTableLookups: [],
    loadedAddresses: { writable: [], readonly: [] },
    instructions: [
      {
        programIdIndex: 8,
        accountIndexes: [1, 2, 0, 3, 4, 5, 6, 7],
        data: base58(instructionData),
      },
    ],
  };
}
function jupiterDepositTransaction(): SolanaLendingTransaction {
  const accountKeys = [
    key(60),
    key(61),
    key(62),
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    key(63),
    key(64),
    key(65),
    key(66),
    key(67),
    key(68),
    key(69),
    key(70),
    JUPITER_LEND_LIQUIDITY_PROGRAM_ID,
    key(71),
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    '11111111111111111111111111111111',
    JUPITER_LEND_PROGRAM_ID,
  ];
  const discriminator = [242, 35, 198, 137, 82, 225, 242, 182];
  const instructionData = Uint8Array.from([...discriminator, 64, 66, 15, 0, 0, 0, 0, 0]);
  return {
    network: 'mainnet-beta',
    messageVersion: 'legacy',
    feePayer: accountKeys[0],
    recentBlockhash: key(72),
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    accountKeys,
    addressTableLookups: [],
    loadedAddresses: { writable: [], readonly: [] },
    instructions: [
      {
        programIdIndex: 17,
        accountIndexes: Array.from({ length: 17 }, (_, index) => index),
        data: base58(instructionData),
      },
    ],
  };
}
function saveDepositTransaction(): SolanaLendingTransaction {
  const accountKeys = [
    key(80),
    key(81),
    key(82),
    key(83),
    key(84),
    key(85),
    key(86),
    key(87),
    'SysvarC1ock11111111111111111111111111111111',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    SAVE_LEND_PROGRAM_ID,
  ];
  const instructionData = Uint8Array.from([4, 64, 66, 15, 0, 0, 0, 0, 0]);
  return {
    network: 'mainnet-beta',
    messageVersion: 'legacy',
    feePayer: accountKeys[0],
    recentBlockhash: key(90),
    header: {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 1,
    },
    accountKeys,
    addressTableLookups: [],
    loadedAddresses: { writable: [], readonly: [] },
    instructions: [
      {
        programIdIndex: 10,
        accountIndexes: [1, 2, 3, 4, 5, 6, 7, 0, 8, 9],
        data: base58(instructionData),
      },
    ],
  };
}
const input = {
  protocolId: 'kamino-lend' as const,
  action: 'supply' as const,
  collateralSymbol: 'SOL',
  loanSymbol: 'USDC',
  collateralValueUsd: 10_000,
  debtValueUsd: 0,
};
const oracleResult = {
  verdict: 'PASS',
  maxDeviationPct: 0,
  staleDataRisk: false,
  participantCount: 4,
  attestation: null,
};
const simulation = {
  network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const,
  messageHash: '0x' + 'ab'.repeat(32),
  simulationSlot: 1,
  simulatedAt: 1_792_252_800,
  status: 'SIMULATED' as const,
  unitsConsumed: 1,
  feeLamports: '5000',
};
const accounts = (action: ReturnType<typeof decodeSolanaLendingExactCall>) => [
  {
    address: action.programId,
    role: 'program' as const,
    owner: 'BPFLoaderUpgradeab1e11111111111111111111111',
    executable: true,
  },
  {
    address: action.marketId,
    role: 'market-or-group' as const,
    owner: action.programId,
    executable: false,
  },
  {
    address: action.reserveOrBank,
    role: 'reserve-or-bank' as const,
    owner: action.programId,
    executable: false,
  },
  ...(action.positionAccount
    ? [
        {
          address: action.positionAccount,
          role: 'position' as const,
          owner: action.programId,
          executable: false,
        },
      ]
    : []),
  ...(action.sourceTokenAccount
    ? [
        {
          address: action.sourceTokenAccount,
          role: 'source-token' as const,
          owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          executable: false,
        },
      ]
    : []),
];

describe('Solana Lending Guard', () => {
  it('accepts only a canonical direct Kamino instruction', () => {
    const decoded = decodeSolanaLendingExactCall(transaction(), input);
    expect(decoded).toMatchObject({
      protocolId: 'kamino-lend',
      action: 'supply',
      amount: '1000000',
      assetMint: 'So11111111111111111111111111111111111111112',
    });
    expect(decoded.messageHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('fails closed when a second instruction is present', () => {
    const value = transaction();
    value.instructions.push({ ...value.instructions[0] });
    expect(() => decodeSolanaLendingExactCall(value, input)).toThrow(
      'exactly one protocol instruction'
    );
  });

  it('decodes the reviewed Marginfi borrow account layout', () => {
    const decoded = decodeSolanaLendingExactCall(marginfiBorrowTransaction(), {
      protocolId: 'marginfi-v2',
      action: 'borrow',
      collateralSymbol: 'SOL',
      loanSymbol: 'USDC',
    });
    expect(decoded).toMatchObject({
      protocolId: 'marginfi-v2',
      action: 'borrow',
      amount: '1000000',
      assetMint: null,
    });
    expect(decoded.positionAccount).toBe(key(32));
  });

  it('admits only the canonical Jupiter Lend Earn main-market deposit profile', () => {
    const decoded = decodeSolanaLendingExactCall(jupiterDepositTransaction(), {
      protocolId: 'jupiter-lend-earn',
      action: 'supply',
      collateralSymbol: 'USDC',
      loanSymbol: 'USDC',
    });
    expect(decoded).toMatchObject({
      protocolId: 'jupiter-lend-earn',
      action: 'supply',
      programId: JUPITER_LEND_PROGRAM_ID,
      secondaryProgramId: JUPITER_LEND_LIQUIDITY_PROGRAM_ID,
      amount: '1000000',
      assetMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    });
    expect(() =>
      decodeSolanaLendingExactCall(jupiterDepositTransaction(), {
        protocolId: 'jupiter-lend-earn',
        action: 'borrow',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
      })
    ).toThrow(/outside the direct profile/);
  });

  it('binds Save Lend reserve-liquidity deposits to the source SPL account and mint', () => {
    const decoded = decodeSolanaLendingExactCall(saveDepositTransaction(), {
      protocolId: 'save-lend',
      action: 'supply',
      collateralSymbol: 'USDC',
      loanSymbol: 'USDC',
      assetMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    });
    expect(decoded).toMatchObject({
      protocolId: 'save-lend',
      programId: SAVE_LEND_PROGRAM_ID,
      amount: '1000000',
      assetMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      sourceTokenAccount: key(81),
    });
    expect(() =>
      decodeSolanaLendingExactCall(saveDepositTransaction(), {
        protocolId: 'save-lend',
        action: 'borrow',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        assetMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      })
    ).toThrow(/only reserve-liquidity deposits/);
  });

  it('creates a short-lived Ed25519 decision only after oracle, account, and simulation checks pass', async () => {
    const previousSeed = process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
    process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = '11'.repeat(32);
    try {
      const value = transaction();
      const guard = await assessSolanaLendingGuard(input, value, {
        checkOracle: jest.fn().mockResolvedValue(oracleResult) as never,
        verifyProtocolAccounts: async (action) => accounts(action),
        simulate: async (message) => ({
          ...simulation,
          messageHash: decodeSolanaLendingExactCall(message, input).messageHash,
        }),
        now: () => new Date('2026-10-26T00:00:00.000Z'),
      });
      expect(guard.verdict).toBe('ALLOW');
      const decision = createSolanaLendingGuardDecision(guard, value, {
        now: () => new Date('2026-10-26T00:00:00.000Z'),
      });
      expect(decision.attestation).not.toBeNull();
      expect(
        verifySolanaLendingGuardDecision(decision, {
          now: () => new Date('2026-10-26T00:01:00.000Z'),
        })
      ).toMatchObject({ valid: true, reason: 'OK' });
      expect(decision.attestation?.signer.publicKey).toBe(
        base58(ed25519.getPublicKey(Uint8Array.from(Buffer.from('11'.repeat(32), 'hex'))))
      );
    } finally {
      if (previousSeed === undefined) delete process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED;
      else process.env.INSIGHT_SOLANA_EVIDENCE_SIGNER_SEED = previousSeed;
    }
  });

  it('fails closed when the live simulation fails', async () => {
    const guard = await assessSolanaLendingGuard(input, transaction(), {
      checkOracle: jest.fn().mockResolvedValue(oracleResult) as never,
      verifyProtocolAccounts: async (action) => accounts(action),
      simulate: async () => {
        throw new Error('simulation error');
      },
    });
    expect(guard.verdict).toBe('BLOCK');
    expect(guard.reasons.join(' ')).toContain('did not pass live protocol simulation');
  });
});
