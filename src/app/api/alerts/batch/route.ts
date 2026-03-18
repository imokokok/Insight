import { NextRequest, NextResponse } from 'next/server';
import { getServerQueries } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { getUserId } from '@/lib/api/utils';

const logger = createLogger('api-alerts-batch');

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, alertIds } = body;

    if (!action || !alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: action, alertIds (array)' },
        { status: 400 }
      );
    }

    const validActions = ['enable', 'disable', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const queries = getServerQueries();
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    // Verify all alerts belong to the user
    const userAlerts = await queries.getAlerts(userId);
    if (!userAlerts) {
      return NextResponse.json({ error: 'Failed to fetch user alerts' }, { status: 500 });
    }

    const userAlertIds = new Set(userAlerts.map((a) => a.id));
    const validAlertIds = alertIds.filter((id) => userAlertIds.has(id));
    const invalidAlertIds = alertIds.filter((id) => !userAlertIds.has(id));

    // Add invalid IDs to failed list
    invalidAlertIds.forEach((id) => results.failed.push(id));

    // Process batch action
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
