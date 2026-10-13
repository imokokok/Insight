import { z } from 'zod';

/** Strict ISO-8601 timestamp with an explicit UTC marker or numeric offset. */
export const DecisionInputQuoteTimestampSchema = z.iso.datetime({ offset: true });
