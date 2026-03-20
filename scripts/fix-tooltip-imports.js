#!/usr/bin/env node

/**
 * 修复 Tooltip 重复导入问题
 * 将 recharts 的 Tooltip 重命名为 RechartsTooltip
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'src/app/[locale]/home-components/BentoMetricsGrid.tsx',
  'src/components/oracle/panels/WINkLinkRiskPanel.tsx',
  'src/components/oracle/panels/UMARiskPanel/index.tsx',
  'src/components/oracle/panels/UMANetworkPanel/index.tsx',
  'src/components/oracle/panels/RedStoneRiskAssessmentPanel.tsx',
  'src/components/oracle/panels/PublisherContributionPanel.tsx',
  'src/components/oracle/panels/PriceDeviationChart.tsx',
  'src/components/oracle/panels/LatencyDistributionChart.tsx',
  'src/components/oracle/panels/DIARiskAssessmentPanel.tsx',
  'src/components/oracle/panels/CrossChainPanel.tsx',
  'src/components/oracle/panels/ChainlinkRiskPanel.tsx',
  'src/components/oracle/panels/BandRiskAssessmentPanel.tsx',
  'src/components/oracle/indicators/RSIIndicator.tsx',
  'src/components/oracle/indicators/MACDIndicator.tsx',
  'src/components/oracle/indicators/BollingerBands.tsx',
  'src/components/oracle/indicators/ATRIndicator.tsx',
  'src/components/oracle/common/UMAScoreExplanationModal.tsx',
  'src/components/oracle/common/RequestTypeDistribution.tsx',
  'src/components/oracle/common/GasFeeComparison.tsx',
  'src/components/oracle/common/DataSourceCoverage.tsx',
  'src/components/oracle/common/ConfidenceScore.tsx',
  'src/components/oracle/charts/ValidatorHistoryChart.tsx',
  'src/components/oracle/charts/StakingDistributionChart.tsx',
  'src/components/oracle/charts/RequestTrendChart.tsx',
  'src/components/oracle/charts/PriceVolatilityChart.tsx',
  'src/components/oracle/charts/PriceDistributionBoxPlot.tsx',
  'src/components/oracle/charts/PriceDeviationRisk.tsx',
  'src/components/oracle/charts/PriceDeviationHistoryChart.tsx',
  'src/components/oracle/charts/PriceChart/ChartCanvas.tsx',
  'src/components/oracle/charts/MultiValidatorComparison.tsx',
  'src/components/oracle/charts/MovingAverageChart.tsx',
  'src/components/oracle/charts/LatencyTrendMiniChart.tsx',
  'src/components/oracle/charts/LatencyTrendChart.tsx',
  'src/components/oracle/charts/LatencyHistogram.tsx',
  'src/components/oracle/charts/LatencyDistributionHistogram.tsx',
  'src/components/oracle/charts/InteractivePriceChart/InteractivePriceChart.tsx',
  'src/components/oracle/charts/GasFeeTrendChart.tsx',
  'src/components/oracle/charts/DataSourceTrend.tsx',
  'src/components/oracle/charts/DataQualityTrend.tsx',
  'src/components/oracle/charts/CrossOracleComparison/OverviewTab.tsx',
  'src/components/oracle/charts/CrossOracleComparison/ChartsTab.tsx',
  'src/components/oracle/charts/CrossChainTrendChart.tsx',
  'src/components/oracle/charts/CorrelationAnalysis.tsx',
  'src/components/oracle/charts/ConfidenceIntervalChart.tsx',
  'src/components/oracle/charts/ConcentrationRisk.tsx',
  'src/components/oracle/charts/ChainComparison.tsx',
  'src/components/oracle/charts/CDFChart.tsx',
  'src/components/oracle/charts/AccuracyTrendChart.tsx',
  'src/components/mobile/MobilePriceChart.tsx',
  'src/components/mobile/MobileBarChart.tsx',
  'src/components/comparison/TimeComparisonChart.tsx',
  'src/components/comparison/OracleComparisonView.tsx',
  'src/components/comparison/BenchmarkComparison.tsx',
  'src/app/[locale]/price-query/components/PriceChartRealtime.tsx',
  'src/app/[locale]/price-query/components/PriceChart.tsx',
  'src/app/[locale]/price-query/components/DataQualityPanel.tsx',
  'src/app/[locale]/market-overview/components/OracleComparison.tsx',
  'src/app/[locale]/market-overview/components/ChartRenderer.tsx',
  'src/app/[locale]/market-overview/components/ChainBreakdownChart.tsx',
  'src/app/[locale]/market-overview/components/BenchmarkComparison.tsx',
  'src/app/[locale]/market-overview/components/AssetCategoryChart.tsx',
  'src/app/[locale]/home-components/OracleMarketOverview.tsx',
  'src/app/[locale]/cross-oracle/components/FullscreenChart.tsx',
  'src/app/[locale]/cross-oracle/components/ComparisonTabs.tsx',
  'src/app/[locale]/cross-chain/page.tsx',
  'src/app/[locale]/cross-chain/components/VolatilitySurface.tsx',
  'src/app/[locale]/cross-chain/components/StandardBoxPlot.tsx',
  'src/app/[locale]/cross-chain/components/RollingCorrelationChart.tsx',
  'src/app/[locale]/cross-chain/components/ResidualDiagnostics.tsx',
  'src/app/[locale]/cross-chain/components/PriceSpreadHeatmap.tsx',
  'src/app/[locale]/cross-chain/components/InteractivePriceChart.tsx',
  'src/app/[locale]/cross-chain/components/CointegrationAnalysis.tsx',
];

const projectRoot = path.join(__dirname, '..');

let fixedCount = 0;
let errorCount = 0;

filesToFix.forEach(file => {
  const filePath = path.join(projectRoot, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ 文件不存在: ${file}`);
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // 检查是否有重复导入问题
    const hasRechartsTooltip = content.includes('from \'recharts\'') && content.includes('Tooltip');
    const hasUITooltip = content.includes('from \'@/components/ui\'') && content.includes('Tooltip');
    
    if (!hasRechartsTooltip || !hasUITooltip) {
      // 没有重复导入问题，跳过
      return;
    }
    
    // 1. 将 recharts 的 Tooltip 重命名为 RechartsTooltip
    content = content.replace(
      /import\s*\{([^}]*)Tooltip([^}]*)\}\s*from\s*['"]recharts['"];?/g,
      (match, before, after) => {
        return `import {${before}Tooltip as RechartsTooltip${after}} from 'recharts';`;
      }
    );
    
    // 2. 移除从 @/components/ui 导入的 Tooltip
    content = content.replace(
      /import\s*\{([^}]*)Tooltip([^}]*)\}\s*from\s*['"]@\/components\/ui['"];?\n?/g,
      (match, before, after) => {
        // 如果还有其他导入，保留它们
        const otherImports = (before + after).replace(/,\s*,/g, ',').replace(/^,\s*|\s*,$/g, '').trim();
        if (otherImports) {
          return `import {${otherImports}} from '@/components/ui';\n`;
        }
        return '';
      }
    );
    
    // 3. 替换 JSX 中的 <Tooltip 为 <RechartsTooltip
    // 但要注意不要替换已经正确使用的 RechartsTooltip
    content = content.replace(/<Tooltip(?=\s)/g, '<RechartsTooltip');
    content = content.replace(/<\/Tooltip>/g, '</RechartsTooltip>');
    
    // 4. 修复可能的双重替换问题
    content = content.replace(/<RechartsTooltip\s+as={[^}]+}>/g, '<Tooltip');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已修复: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ 修复失败: ${file} - ${error.message}`);
    errorCount++;
  }
});

console.log(`\n================================`);
console.log(`修复完成!`);
console.log(`================================`);
console.log(`已修复: ${fixedCount} 个文件`);
console.log(`错误: ${errorCount} 个文件`);
