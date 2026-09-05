export class InsightApiError extends Error {
  readonly name = 'InsightApiError';

  constructor(
    message: string,
    readonly options: {
      status: number;
      code: string;
      retryable: boolean;
      requestId?: string;
      retryAfterSeconds?: number;
      creditCost?: number;
      creditBalance?: number;
    }
  ) {
    super(message);
  }
}

/** Raised by `assertSafe` when a caller opts into exception-style flow control. */
export class TradeBlockedError extends Error {
  readonly name = 'TradeBlockedError';

  constructor(
    readonly verdict: string,
    readonly reasons: readonly string[] = []
  ) {
    super(
      `Insight Guard blocked execution: ${verdict}${reasons.length ? ` (${reasons.join('; ')})` : ''}`
    );
  }
}

/** A receipt needs two v2/v3 pre-trade proofs; do not silently issue a weaker one. */
export class ReceiptConfigurationError extends Error {
  readonly name = 'ReceiptConfigurationError';

  constructor(message: string) {
    super(message);
  }
}
