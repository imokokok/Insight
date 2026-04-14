import { type NextRequest, NextResponse } from 'next/server';

import { getUserId } from '@/lib/api/utils';
import { strictRateLimit } from '@/lib/api/middleware/rateLimitMiddleware';
import { sanitizeObject } from '@/lib/security';
import { BatchOperationSchema, validateAndSanitize } from '@/lib/security/validation';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('api-alerts-batch');

export async function POST(request: NextRequest) {
  const rateLimitResult = await strictRateLimit(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const validatedData = validateAndSanitize(BatchOperationSchema, body);

    if (!validatedData) {
      return NextResponse.json(
        { error: 'Invalid request data. Check action and alertIds fields.' },
        { status: 400 }
      );
    }

    const sanitizedData = sanitizeObject(validatedData);
    const { action, alertIds } = sanitizedData;

    const queries = getServerQueries();
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    const userAlerts = await queries.getAlerts(userId);
    if (!userAlerts) {
      return NextResponse.json({ error: 'Failed to fetch user alerts' }, { status: 500 });
    }

    const userAlertIds = new Set(userAlerts.map((a) => a.id));
    const validAlertIds = alertIds.filter((id: string) => userAlertIds.has(id));
    const invalidAlertIds = alertIds.filter((id: string) => !userAlertIds.has(id));

    invalidAlertIds.forEach((id: string) => results.failed.push(id));

    if (action === 'enable' || action === 'disable') {
      const isActive = action === 'enable';

      for (const alertId of validAlertIds) {
        try {
          const updated = await queries.updateAlert(alertId, { is_active: isActive });
          if (updated) {
            results.success.push(alertId);
          } else {
            results.failed.push(alertId);
          }
        } catch (error) {
          logger.error(
            `Failed to ${action} alert`,
            error instanceof Error ? error : new Error(String(error))
          );
          results.failed.push(alertId);
        }
      }
    } else if (action === 'delete') {
      for (const alertId of validAlertIds) {
        try {
          const success = await queries.deleteAlert(alertId);
          if (success) {
            results.success.push(alertId);
          } else {
            results.failed.push(alertId);
          }
        } catch (error) {
          logger.error(
            'Failed to delete alert',
            error instanceof Error ? error : new Error(String(error))
          );
          results.failed.push(alertId);
        }
      }
    }

    return NextResponse.json({
      message: `Batch ${action} completed`,
      results: {
        processed: results.success.length + results.failed.length,
        succeeded: results.success.length,
        failed: results.failed.length,
        successIds: results.success,
        failedIds: results.failed,
      },
    });
  } catch (error) {
    logger.error(
      'Error processing batch operation',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
