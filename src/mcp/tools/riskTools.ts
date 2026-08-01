import { getProtocolRiskParamsById } from '@/lib/api/services/protocolRiskParamsApiService';
import { getRiskSummary } from '@/lib/api/services/riskSummaryService';
import { reportService } from '@/lib/reports/reportService';
import { getTodayUtc } from '@/lib/utils/date';
import { type OracleProvider } from '@/types/oracle';

import { formatAsText, formatPercent } from './formatters';
import {
  DateQueryInputSchema,
  ProtocolRiskParamsInputSchema,
  RiskSummaryInputSchema,
} from './schemas';

import type { McpToolDefinition } from './types';

function formatRiskLevel(level: string, score: number): string {
  return `${level} (score ${score.toFixed(2)})`;
}

export const getRiskSummaryTool: McpToolDefinition<typeof RiskSummaryInputSchema> = {
  name: 'get_risk_summary',
  description:
    'Get a composite risk summary for an asset across selected oracle providers. Includes HHI concentration, volatility, correlation, freshness, manipulation resistance, and shared-dependency risk.',
  parameters: RiskSummaryInputSchema,
  handler: async (args) => {
    const result = await getRiskSummary(
      args.symbol,
      args.providers as OracleProvider[],
      args.period
    );

    const metrics = result.riskMetrics;
    const lines = [
      `**Risk summary for ${result.symbol}**`,
      `- Period: ${result.periodHours} hours`,
      `- Providers analyzed: ${result.providers.join(', ').toUpperCase()}`,
      '',
      '**Composite scores:**',
      `- Overall risk: ${formatRiskLevel(metrics.overallRisk.level, metrics.overallRisk.score)}`,
      `- Concentration risk (HHI): ${formatRiskLevel(metrics.hhi.level, metrics.hhi.value)}`,
      `- Diversification: ${formatRiskLevel(metrics.diversification.level, metrics.diversification.score)}`,
      `- Volatility: ${formatRiskLevel(metrics.volatility.level, metrics.volatility.index)}`,
      `- Correlation risk: ${formatRiskLevel(metrics.correlationRisk.level, metrics.correlationRisk.score)}`,
      `- Freshness risk: ${formatRiskLevel(metrics.freshnessRisk.level, metrics.freshnessRisk.score)}`,
      `- Manipulation resistance: ${formatRiskLevel(metrics.manipulationResistance.level, metrics.manipulationResistance.score)}`,
      `- Shared dependency: ${formatRiskLevel(metrics.sharedDependency.level, metrics.sharedDependency.score)}`,
      '',
      '**Key metrics:**',
      `- Annualized volatility: ${formatPercent(metrics.volatility.annualizedVolatility)}`,
      `- Average correlation: ${metrics.correlationRisk.avgCorrelation.toFixed(3)}`,
      `- Max staleness: ${metrics.freshnessRisk.maxStalenessSeconds}s`,
      `- Systemic risk factor: ${metrics.sharedDependency.systemicRiskFactor.toFixed(3)}`,
    ];

    if (metrics.correlationRisk.highCorrelationPairs.length > 0) {
      lines.push(
        `- High correlation pairs: ${metrics.correlationRisk.highCorrelationPairs.join(', ')}`
      );
    }

    if (metrics.freshnessRisk.staleOracleCount > 0) {
      lines.push(
        `- Stale oracles (${metrics.freshnessRisk.staleOracleCount}): ${metrics.freshnessRisk.staleOracles.map((o) => `${o.name} (${o.stalenessSeconds}s)`).join(', ')}`
      );
    }

    if (result.providerErrors.length > 0) {
      lines.push('', '**Fetch errors:**');
      for (const err of result.providerErrors) {
        lines.push(`- ${err.provider.toUpperCase()}: ${err.error}`);
      }
    }

    return lines.filter(Boolean).join('\n');
  },
};

export const checkLiquidationRiskTool: McpToolDefinition<typeof DateQueryInputSchema> = {
  name: 'check_liquidation_risk',
  description:
    'Check protocol liquidation risk for a specific date. Returns stress-test results based on representative benchmark positions.',
  parameters: DateQueryInputSchema,
  handler: async (args) => {
    const date = args.date ?? getTodayUtc();
    const report = await reportService.getReportByDate(date);

    if (!report) {
      return `No liquidation risk data available for ${date}.`;
    }

    const risks = report.protocolLiquidationRisks ?? [];

    if (risks.length === 0) {
      return `No liquidation risks recorded in the report for ${date}.`;
    }

    const lines = [
      `**Liquidation risk report for ${report.reportDate}**`,
      `*Disclaimer: Stress-test results are based on representative benchmark positions, not individual user wallets.*`,
      '',
      '**Top risks:**',
    ];

    for (const risk of risks.slice(0, 10)) {
      lines.push(formatAsText(risk));
    }

    if (risks.length > 10) {
      lines.push('', `... and ${risks.length - 10} more protocols.`);
    }

    return lines.join('\n');
  },
};

export const getProtocolRiskParamsTool: McpToolDefinition<typeof ProtocolRiskParamsInputSchema> = {
  name: 'get_protocol_risk_params',
  description:
    'Get risk parameters for a specific DeFi protocol, including liquidation thresholds, LTV ratios, and collateral factors.',
  parameters: ProtocolRiskParamsInputSchema,
  handler: async (args) => {
    const result = await getProtocolRiskParamsById(args.protocol);

    if (!result) {
      return `No risk parameters found for protocol "${args.protocol}".`;
    }

    const lines = [
      `**Protocol risk parameters: ${result.protocolName} (${result.protocolId})**`,
      `- Chain: ${result.chain}`,
      `- Type: ${result.protocolType}`,
      `- Assets: ${result.assetCount}`,
      `- Fetched at: ${result.fetchedAt ?? 'N/A'}`,
      '',
      '**Asset parameters:**',
    ];

    for (const asset of result.assets.slice(0, 20)) {
      lines.push(
        `- ${asset.symbol}: LTV ${(asset.maxLtv * 100).toFixed(0)}%, liquidation threshold ${(asset.liquidationThreshold * 100).toFixed(0)}%, collateral factor ${(asset.collateralFactor * 100).toFixed(0)}%`
      );
    }

    if (result.assets.length > 20) {
      lines.push('', `... and ${result.assets.length - 20} more assets.`);
    }

    return lines.filter(Boolean).join('\n');
  },
};
