import { NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('csp-report');

function safeString(value: unknown, maxLength = 500): string | undefined {
  return typeof value === 'string' ? value.slice(0, maxLength) : undefined;
}

export const OPTIONS = createOptionsHandler();
export const dynamic = 'force-dynamic';

export const POST = createApiHandler(
  async (request) => {
    try {
      const payload = (await request.json()) as Record<string, unknown>;
      const report = (payload['csp-report'] ?? payload.body ?? payload) as Record<string, unknown>;

      logger.warn('Content Security Policy violation', {
        documentUri: safeString(report['document-uri'] ?? report.documentURL),
        violatedDirective: safeString(
          report['violated-directive'] ?? report.effectiveDirective,
          100
        ),
        blockedUri: safeString(report['blocked-uri'] ?? report.blockedURL),
        sourceFile: safeString(report['source-file'] ?? report.sourceFile),
      });
    } catch {
      // Browsers and extensions occasionally submit malformed reports. A CSP
      // telemetry failure must never affect application traffic.
    }

    return new NextResponse(null, { status: 204 });
  },
  {
    middlewares: {
      logging: true,
      auth: false,
      rateLimit: { preset: 'lenient' },
      cors: true,
    },
    preAuthBurstLimit: 120,
    maxBodyBytes: 16 * 1024,
  }
);
