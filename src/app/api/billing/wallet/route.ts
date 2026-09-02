/**
 * GET /api/billing/wallet
 *
 * Returns the current user's prepaid credit wallet for the BillingPanel:
 *   - balance: chargeable credits available for per-call usage
 *   - frozen:  reserved credits for concurrent in-flight charges
 *   - recent:  the last N ledger entries (topups, usage charges, grants)
 *
 * Uses Bearer session auth. Reads go through the service-role client
 * (credit_wallet / credit_ledger expose only the user's own rows via RLS, but
 * the service role keeps the query consistent with other user-owned reads).
 */

import { NextResponse } from 'next/server';

import { createApiHandler, ApiResponseBuilder } from '@/lib/api/handler';
import { getWalletBalance } from '@/lib/billing/creditWallet';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const GET = createApiHandler(
  async (_request, context) => {
    const userId = context.auth?.userId;
    if (!userId) {
      return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', 'User not found'), {
        status: 401,
      });
    }

    const wallet = await getWalletBalance(userId);

    const serviceClient = createServiceRoleClient();
    const { data: recent } = await serviceClient
      .from('credit_ledger')
      .select('delta, kind, ref_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json(
      ApiResponseBuilder.success({
        balance: wallet?.balance ?? 0,
        frozen: wallet?.frozen ?? 0,
        recent: (recent ?? []).map((row) => ({
          delta: Number(row.delta),
          kind: row.kind,
          ref: row.ref_id,
          createdAt: row.created_at,
        })),
      })
    );
  },
  {
    middlewares: {
      logging: true,
      auth: { required: true, allowApiKey: false },
      rateLimit: { preset: 'strict' },
      cors: true,
    },
  }
);
