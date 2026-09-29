import { z } from 'zod';

/** Accept an integer JSON number or a decimal integer string at request boundaries. */
export function boundedIntegerInput(min: number, max: number, message: string) {
  return z
    .union([z.number(), z.string().trim().regex(/^\d+$/, message).transform(Number)])
    .pipe(z.number().int().min(min, message).max(max, message));
}
