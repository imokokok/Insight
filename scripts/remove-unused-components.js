const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const filesToDelete = [
  'src/components/alerts/AlertNotification.tsx',
  'src/components/comparison/OracleComparisonView.tsx',
  'src/components/error-display/ErrorDisplay.tsx',
  'src/components/oracle/ChainSelector.tsx',
  'src/components/oracle/alerts/API3AlertBadge.tsx',
  'src/components/oracle/alerts/API3AlertNotification.tsx',
  'src/components/oracle/alerts/API3AlertPanel.tsx',
  'src/components/oracle/alerts/AnomalyAlert.tsx',
  'src/components/oracle/alerts/DapiPriceDeviationMonitor.tsx',
  'src/components/oracle/alerts/anomalyUtils.tsx',
  'src/components/oracle/charts/ChainCoverageHeatmap.tsx',
  'src/components/oracle/charts/CorrelationAnalysis.tsx',
  'src/components/oracle/charts/DynamicChartComponents.tsx',
  'src/components/oracle/charts/PriceChart/DynamicPriceChart.tsx',
  'src/components/oracle/charts/PriceChart/PriceChartTooltip.tsx',
  'src/components/oracle/data-display/ConfidenceScore.tsx',
  'src/components/oracle/data-display/DataQualityIndicator.tsx',
  'src/components/oracle/data-display/DataSourceCredibility.tsx',
  'src/components/oracle/data-display/PageHeader.tsx',
  'src/components/oracle/data-display/PerformanceGauge.tsx',
  'src/components/oracle/data-display/SnapshotComparison.tsx',
  'src/components/oracle/data-display/SnapshotManager.tsx',
  'src/components/oracle/forms/CustomTimeRangeSelector.tsx',
  'src/components/oracle/forms/DapiSearchFilter.tsx',
  'src/components/oracle/indicators/ATRIndicator.tsx',
  'src/components/oracle/indicators/BollingerBands.tsx',
  'src/components/oracle/oracle-panels/API3PanelConfig.tsx',
  'src/components/oracle/oracle-panels/BandProtocolPanelConfig.tsx',
  'src/components/oracle/oracle-panels/ChainlinkPanelConfig.tsx',
  'src/components/oracle/oracle-panels/ChroniclePanelConfig.tsx',
  'src/components/oracle/oracle-panels/DIAPanelConfig.tsx',
  'src/components/oracle/oracle-panels/PythPanelConfig.tsx',
  'src/components/oracle/oracle-panels/RedStonePanelConfig.tsx',
  'src/components/oracle/oracle-panels/TellorPanelConfig.tsx',
  'src/components/oracle/oracle-panels/UMAPanelConfig.tsx',
  'src/components/oracle/oracle-panels/WINkLinkPanelConfig.tsx',
  'src/components/oracle/panels/AirnodeDeploymentPanel.tsx',
  'src/components/oracle/panels/ChainlinkDataFeedsPanel.tsx',
  'src/components/oracle/panels/ChainlinkEcosystemPanel.tsx',
  'src/components/oracle/panels/ChainlinkNodesPanel.tsx',
  'src/components/oracle/panels/ChainlinkRiskPanel.tsx',
  'src/components/oracle/panels/CoveragePoolPanel.tsx',
  'src/components/oracle/panels/CrossChainPanel.tsx',
  'src/components/oracle/panels/DIADataFeedsPanel.tsx',
  'src/components/oracle/panels/DIAEcosystemPanel.tsx',
  'src/components/oracle/panels/DIANFTDataPanel.tsx',
  'src/components/oracle/panels/DIARiskAssessmentPanel.tsx',
  'src/components/oracle/panels/DIAStakingPanel.tsx',
  'src/components/oracle/panels/DataSourceTraceabilityPanel.tsx',
  'src/components/oracle/panels/MarketDataPanel.tsx',
  'src/components/oracle/panels/PublisherAnalysisPanel.tsx',
  'src/components/oracle/panels/ValidatorPanel/ValidatorRow.tsx',
  'src/components/performance/PerformanceMonitor.tsx',
  'src/components/realtime/RealtimeNotifications.tsx',
  'src/components/shortcuts/ShortcutContext.tsx',
  'src/components/ui/Breadcrumb.tsx',
  'src/components/ui/DataFreshness.tsx',
  'src/components/ui/ErrorState.tsx',
  'src/components/ui/LoadingProgress.tsx',
  'src/components/ui/PriceChange.tsx',
  'src/components/ui/Select.tsx',
  'src/components/ui/Spinner.tsx',
  'src/components/ui/Textarea.tsx',
  'src/components/ui/Toast.tsx',
];

console.log('🗑️  开始删除未使用的组件...\n');

let deletedCount = 0;
let notFoundCount = 0;

for (const file of filesToDelete) {
  const filePath = path.join(projectRoot, file);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ 已删除: ${file}`);
    deletedCount++;
  } else {
    console.log(`⚠️  文件不存在: ${file}`);
    notFoundCount++;
  }
}

console.log(`\n📊 删除统计:`);
console.log(`✅ 已删除: ${deletedCount} 个文件`);
console.log(`⚠️  未找到: ${notFoundCount} 个文件`);
console.log(`📝 总计: ${filesToDelete.length} 个文件`);
