import { z } from 'zod';

const DecimalSchema = z.string().regex(/^(0|[1-9][0-9]*)(?:\.[0-9]+)?$/);
const Fixed18DecimalSchema = z.string().regex(/^(0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/);
const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const IdSchema = z.string().regex(/^0x[0-9a-f]{64}$/);

const DeploymentSchema = z
  .object({
    contractAddress: AddressSchema,
    chainId: z.number().int().positive(),
    networkName: z.string().min(1).optional(),
  })
  .strip();

const TradingCapabilitySchema = z
  .object({
    whole: z.string().nullable(),
    fractional: z.string().nullable(),
  })
  .strip();

const SessionTradingCapabilitiesSchema = z
  .object({
    market: TradingCapabilitySchema.nullable().optional(),
    extended: TradingCapabilitySchema.nullable().optional(),
    overnight: TradingCapabilitySchema.nullable().optional(),
  })
  .strip()
  .refine((value) => value.market != null || value.extended != null || value.overnight != null);

const LegacyTradingStatusSchema = z
  .enum(['tradable', 'untradable', 'position_closing_only', 'position_opening_only', ''])
  .nullable();

function normalizeLegacyStatus(value: z.infer<typeof LegacyTradingStatusSchema>) {
  if (!value) return null;
  return `TRADING_STATUS_${value.toUpperCase()}`;
}

const LegacyTradingCapabilitiesSchema = z
  .object({
    fractionalTradability: LegacyTradingStatusSchema.optional(),
    allDayTradability: LegacyTradingStatusSchema.optional(),
    extendedHoursFractionalTradability: z.boolean().nullable().optional(),
  })
  .strip()
  .refine(
    (value) =>
      value.fractionalTradability !== undefined ||
      value.allDayTradability !== undefined ||
      value.extendedHoursFractionalTradability !== undefined
  )
  .transform((value) => ({
    market: {
      whole: null,
      fractional: normalizeLegacyStatus(value.fractionalTradability ?? null),
    },
    extended: {
      whole: null,
      fractional:
        value.extendedHoursFractionalTradability == null
          ? null
          : value.extendedHoursFractionalTradability
            ? 'TRADING_STATUS_TRADABLE'
            : 'TRADING_STATUS_UNTRADABLE',
    },
    overnight: {
      whole: normalizeLegacyStatus(value.allDayTradability ?? null),
      fractional: null,
    },
  }));

const TradingCapabilitiesSchema = z.union([
  SessionTradingCapabilitiesSchema,
  LegacyTradingCapabilitiesSchema,
]);

export const RobinhoodAssetsResponseSchema = z
  .object({
    assets: z.array(
      z
        .object({
          id: IdSchema,
          tokenSymbol: z.string().min(1).max(32),
          tokenName: z.string().min(1).max(200),
          deployments: z.array(DeploymentSchema).min(1),
          currentMultiplier: Fixed18DecimalSchema,
          pendingMultiplier: z
            .union([Fixed18DecimalSchema, z.literal('')])
            .nullable()
            .optional(),
          pendingMultiplierEffectiveTime: z.string().nullable().optional(),
          tradingCapabilities: TradingCapabilitiesSchema.nullable().optional(),
          status: z.enum([
            'ASSET_STATUS_UNSPECIFIED',
            'ASSET_STATUS_ACTIVE',
            'ASSET_STATUS_INACTIVE',
          ]),
          tokenDecimals: z.number().int().min(0).max(36).optional(),
          isin: z.string().min(1).max(32).optional(),
          logoUrl: z.string().url().optional(),
        })
        .strip()
    ),
  })
  .strip();

export const RobinhoodPricesResponseSchema = z
  .object({
    quotes: z.array(
      z
        .object({
          tokenSymbol: z.string().min(1).max(32),
          deployments: z.array(DeploymentSchema).min(1),
          bid: Fixed18DecimalSchema,
          ask: Fixed18DecimalSchema,
          currency: z.literal('USD'),
          dailyTradingVolume: DecimalSchema,
          isTradingHalt: z.boolean(),
          generatedAt: z.string().datetime({ offset: true }),
        })
        .strip()
    ),
  })
  .strip();

export const RobinhoodCorporateActionsResponseSchema = z
  .object({
    corpActions: z.array(
      z
        .object({
          id: IdSchema,
          type: z.string().min(1).max(100),
          status: z.enum([
            'CORPORATE_ACTION_STATUS_UNSPECIFIED',
            'CORPORATE_ACTION_STATUS_IN_PROGRESS',
            'CORPORATE_ACTION_STATUS_COMPLETED',
          ]),
          processDate: z
            .object({
              year: z.number().int().min(1900).max(9999),
              month: z.number().int().min(1).max(12),
              day: z.number().int().min(1).max(31),
            })
            .nullable()
            .optional(),
          tokenSymbol: z.string().min(1).max(32),
          deployments: z.array(DeploymentSchema).min(1),
          details: z.record(z.string(), z.unknown()),
        })
        .strip()
    ),
  })
  .strip();

export const RobinhoodRwaContextQuerySchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .regex(/^[A-Za-z][A-Za-z0-9.-]{0,15}$/)
      .transform((value) => value.toUpperCase()),
    verifyOnchain: z
      .preprocess((value) => {
        if (typeof value !== 'string') return value;
        if (['true', '1'].includes(value.toLowerCase())) return true;
        if (['false', '0'].includes(value.toLowerCase())) return false;
        return value;
      }, z.boolean())
      .optional()
      .default(true),
  })
  .strict();

export type RobinhoodAssetsResponse = z.infer<typeof RobinhoodAssetsResponseSchema>;
export type RobinhoodPricesResponse = z.infer<typeof RobinhoodPricesResponseSchema>;
export type RobinhoodCorporateActionsResponse = z.infer<
  typeof RobinhoodCorporateActionsResponseSchema
>;
