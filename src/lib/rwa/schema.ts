import { z } from 'zod';

import { RWA_UINT256_PATTERN } from '../../../sdk/src/rwa';

const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/);
const hash = z.string().regex(/^0x[0-9a-f]{64}$/);
const address = z.string().regex(/^0x[0-9a-f]{40}$/);
const uint = z.string().regex(new RegExp(RWA_UINT256_PATTERN), 'RWA_UINT256_OUT_OF_RANGE');
const time = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const session = z.enum(['REGULAR', 'PRE', 'POST', 'OVERNIGHT', 'CLOSED', 'UNKNOWN']);
const evidenceKind = z.enum(['reserve', 'eligibility', 'redemption']);
const basis = z.enum(['underlying-spot', 'token-market', 'token-nav']);
const action = z.enum(['buy', 'sell', 'borrow', 'collateralize', 'liquidate', 'redeem', 'repay']);
const names = z.array(id).max(32);
const rule = z
  .object({
    priceRequired: z.boolean(),
    allowedSessions: z.array(session).max(6),
    requiredEvidence: z.array(evidenceKind).max(3),
  })
  .strict();
export const RwaDiagnosticSchema = z
  .object({
    input: z
      .object({
        instrument: z
          .object({
            schema: z.literal('insight.rwa-instrument.v1'),
            underlyingId: id,
            issuer: id,
            tokenChainId: time.positive(),
            tokenAddress: address,
            venueMic: z.string().regex(/^[A-Z0-9]{4}$/),
            kind: z.enum(['equity', 'etf', 'fund', 'commodity', 'credit']),
            currency: z.string().regex(/^[A-Z]{3}$/),
            priceBasis: basis,
            corporateActionVersion: id,
          })
          .strict(),
        request: z
          .object({
            instrumentId: hash,
            action,
            amount: uint,
            call: z
              .object({
                chainId: time.positive(),
                from: address,
                to: address,
                calldataHash: hash,
                value: uint,
                nonce: uint,
              })
              .strict(),
          })
          .strict(),
        prices: z
          .array(
            z
              .object({
                feedId: id,
                instrumentId: hash,
                evidenceChainId: time,
                currency: z.string().regex(/^[A-Z]{3}$/),
                priceBasis: basis,
                corporateActionVersion: id,
                session,
                priceE8: uint,
                observedAt: time,
                retrievedAt: time,
              })
              .strict()
          )
          .max(32),
        market: z
          .object({
            instrumentId: hash,
            mic: z.string().regex(/^[A-Z0-9]{4}$/),
            source: id,
            session,
            halt: z.enum(['CLEAR', 'HALTED', 'UNKNOWN']),
            corporateAction: z.enum(['CLEAR', 'PENDING', 'UNKNOWN']),
            observedAt: time,
            validUntil: time,
          })
          .strict()
          .nullable(),
        evidence: z
          .array(
            z
              .object({
                kind: evidenceKind,
                instrumentId: hash,
                subject: z.string().max(200),
                source: id,
                status: z.enum(['OK', 'BLOCKED', 'UNKNOWN']),
                observedAt: time,
                validUntil: time,
              })
              .strict()
          )
          .max(32),
      })
      .strict(),
    policy: z
      .object({
        schema: z.literal('insight.rwa-policy.v1'),
        name: id,
        instrumentId: hash,
        environment: z.enum(['production', 'simulation']),
        minProviders: z.number().int().min(2).max(32),
        minIndependentGroups: z.number().int().min(2).max(32),
        maxPriceAgeSeconds: z.number().int().min(1).max(86400),
        maxStateAgeSeconds: z.number().int().min(1).max(86400),
        maxSpreadBps: z.number().int().min(0).max(10000),
        reportTtlSeconds: z.number().int().min(1).max(300),
        feeds: z.record(
          id,
          z.object({ group: id, derived: z.boolean(), evidenceChainId: time }).strict()
        ),
        stateSources: names,
        evidenceSources: z
          .object({ reserve: names, eligibility: names, redemption: names })
          .strict(),
        actions: z
          .object({
            buy: rule.optional(),
            sell: rule.optional(),
            borrow: rule.optional(),
            collateralize: rule.optional(),
            liquidate: rule.optional(),
            redeem: rule.optional(),
            repay: rule.optional(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();
