'use server';

import { revalidatePath } from 'next/cache';

import { appendWorkflowReview } from '@/lib/ops/workflowQuality';

export async function saveWorkflowReview(form: FormData) {
  await appendWorkflowReview({
    checkId: form.get('checkId'),
    status: form.get('status'),
    reason: form.get('reason'),
  });
  revalidatePath('/ops/safety/workflows');
}
