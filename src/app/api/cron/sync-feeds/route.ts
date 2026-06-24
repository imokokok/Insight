import { NextResponse } from 'next/server';

import { feedDiscoveryService } from '@/lib/oracles/services/feedDiscoveryService';
import { feedSyncService } from '@/lib/oracles/services/feedSyncService';
import { type OracleFeedInsert } from '@/lib/supabase/queries';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('CronSyncFeeds');

const SUPPORTED_PROVIDERS = [
  'chainlink',
  'pyth',
  'supra',
  'dia',
  'redstone',
  'api3',
  'winklink',
  'twap',
  'twap-token',
  'reflector',
  'flare',
];

async function upsertDiscoveredFeeds(feeds: OracleFeedInsert[]): Promise<number> {
  if (feeds.length === 0) return 0;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('oracle_feeds')
    .upsert(feeds, { onConflict: 'provider,symbol,chain_id' })
    .select();
  if (error) {
    logger.error(
      'Failed to upsert discovered feeds',
      error instanceof Error ? error : new Error(String(error))
    );
    return 0;
  }
  return data?.length || 0;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'discover';
    const provider = url.searchParams.get('provider') || '';

    if (provider && !SUPPORTED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Unsupported provider. Supported: ${SUPPORTED_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    switch (mode) {
      case 'seed': {
        // Initial seed from hardcoded data — one provider at a time
        // Call with ?provider=chainlink, ?provider=pyth, etc.
        if (!provider) {
          return NextResponse.json(
            {
              error:
                'Seed mode requires ?provider= parameter (call once per provider to stay within 10s timeout)',
            },
            { status: 400 }
          );
        }
        const results = await feedSyncService.fullSync(provider);
        const summary = results.map((r) => ({
          provider: r.provider,
          discovered: r.discovered,
          upserted: r.upserted,
          deactivated: r.deactivated,
          errors: r.errors,
        }));
        return NextResponse.json({ success: true, mode: 'seed', provider, results: summary });
      }

      case 'discover': {
        // Discover feeds from official APIs — one provider at a time
        // Call with ?provider=chainlink, ?provider=pyth, etc.
        if (!provider) {
          return NextResponse.json(
            {
              error:
                'Discover mode requires ?provider= parameter (call once per provider to stay within 10s timeout)',
            },
            { status: 400 }
          );
        }
        const discovery = await feedDiscoveryService.discoverAll(provider);
        const upserted = await upsertDiscoveredFeeds(discovery[0]?.feeds || []);
        const summary = [
          {
            provider: discovery[0]?.provider || provider,
            discovered: discovery[0]?.discovered || 0,
            upserted,
            errors: discovery[0]?.errors.length || 0,
          },
        ];
        return NextResponse.json({ success: true, mode: 'discover', provider, results: summary });
      }

      case 'registry': {
        // Chainlink Feed Registry only
        const results = [await feedSyncService.syncChainlinkFeedsFromRegistry()];
        const summary = results.map((r) => ({
          provider: r.provider,
          discovered: r.discovered,
          upserted: r.upserted,
          errors: r.errors,
        }));
        return NextResponse.json({ success: true, mode: 'registry', results: summary });
      }

      case 'verify': {
        // Verify existing feeds
        const results = [await feedSyncService.verifyChainlinkFeeds()];
        const summary = results.map((r) => ({
          provider: r.provider,
          discovered: r.discovered,
          errors: r.errors,
        }));
        return NextResponse.json({ success: true, mode: 'verify', results: summary });
      }

      default:
        return NextResponse.json(
          { error: `Unknown mode: ${mode}. Use: seed, discover, registry, verify` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Feed sync failed', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
