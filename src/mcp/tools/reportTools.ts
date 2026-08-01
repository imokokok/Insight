import { getIncidentAggregation } from '@/lib/api/services/incidentService';
import { reportService } from '@/lib/reports/reportService';
import { get7dAgoUtc, getTodayUtc } from '@/lib/utils/date';

import { formatAsText } from './formatters';
import { DateQueryInputSchema, IncidentsInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

export const getDailyReportTool: McpToolDefinition<typeof DateQueryInputSchema> = {
  name: 'get_daily_report',
  description:
    'Get the full daily oracle/risk report for a specific date, including liquidation risks, anomalies, and market summary.',
  parameters: DateQueryInputSchema,
  handler: async (args) => {
    const date = args.date ?? getTodayUtc();
    const report = await reportService.getReportByDate(date);

    if (!report) {
      return `No daily report available for ${date}.`;
    }

    return formatAsText(report);
  },
};

export const getIncidentsTool: McpToolDefinition<typeof IncidentsInputSchema> = {
  name: 'get_incidents',
  description:
    'Get oracle incidents and deviation events within a date range. Filter by provider and minimum severity.',
  parameters: IncidentsInputSchema,
  handler: async (args) => {
    const fromOrDefault = args.from ?? get7dAgoUtc();
    const toOrDefault = args.to ?? getTodayUtc();

    const result = await getIncidentAggregation({
      from: fromOrDefault,
      to: toOrDefault,
      provider: args.provider,
      minSeverity: args.minSeverity,
      limit: args.limit,
      offset: args.offset,
    });

    const lines = [
      `**Oracle incidents (${fromOrDefault} to ${toOrDefault})**`,
      `- Total: ${result.total}`,
      `- By severity: critical ${result.bySeverity.critical}, high ${result.bySeverity.high}, medium ${result.bySeverity.medium}, low ${result.bySeverity.low}`,
      `- By type: ${Object.entries(result.byType)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ')}`,
      `- Showing ${result.incidents.length} (offset ${args.offset})`,
      '',
      '**Incidents:**',
    ];

    for (const incident of result.incidents) {
      lines.push(`- [${incident.severity.toUpperCase()}] ${incident.description}`);
    }

    return lines.join('\n');
  },
};
