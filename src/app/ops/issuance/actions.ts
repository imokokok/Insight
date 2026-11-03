'use server';

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { requireOpsOwner } from '@/lib/ops/auth';
import {
  applyIssuanceChange,
  ISSUANCE_REASON_MAX_LENGTH,
  ISSUANCE_REASON_MIN_LENGTH,
} from '@/lib/ops/issuanceControl';

const IssuanceChangeSchema = z.object({
  halted: z.enum(['true', 'false']),
  reason: z
    .string()
    .trim()
    .min(
      ISSUANCE_REASON_MIN_LENGTH,
      `A reason of at least ${ISSUANCE_REASON_MIN_LENGTH} characters is required to change issuance state.`
    )
    .max(ISSUANCE_REASON_MAX_LENGTH),
});

/**
 * Engage or release the pre-trade issuance halt.
 *
 * Ordered on purpose: authorize the owner first (so an unauthorized caller
 * cannot probe the payload), then validate, then apply. The database function
 * flips the state and writes the audit row in one transaction, so a change can
 * never land without its record. Any failure throws — a privileged control must
 * never report a silent success.
 */
export async function setIssuanceHalt(form: FormData): Promise<void> {
  const { userId, email } = await requireOpsOwner();

  const parsed = IssuanceChangeSchema.safeParse({
    halted: form.get('halted'),
    reason: form.get('reason'),
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        `A reason of ${ISSUANCE_REASON_MIN_LENGTH}–${ISSUANCE_REASON_MAX_LENGTH} characters is required to change issuance state.`
    );
  }

  await applyIssuanceChange({
    halted: parsed.data.halted === 'true',
    reason: parsed.data.reason,
    actorId: userId,
    actorEmail: email,
  });

  revalidatePath('/ops/issuance');
}
