#!/usr/bin/env node
/**
 * Script to fix hardcoded 'zh-CN' locale in date formatting
 * This script replaces all toLocaleString('zh-CN'), toLocaleDateString('zh-CN'),
 * and toLocaleTimeString('zh-CN') with dynamic locale-based formatting
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to fix
const filesToFix = [
  'src/components/oracle/panels/ChainlinkRiskPanel.tsx',
  'src/components/alerts/AlertHistory.tsx',
  'src/components/oracle/common/BandCrossChainPriceConsistency.tsx',
  'src/components/oracle/charts/MovingAverageChart.tsx',
  'src/components/oracle/charts/DataQualityTrend.tsx',
  'src/components/oracle/panels/DisputeResolutionPanel.tsx',
  'src/components/oracle/panels/DisputeVotingPanel.tsx',
  'src/app/[locale]/price-query/components/DataQualityPanel.tsx',
  'src/components/oracle/charts/ValidatorHistoryChart.tsx',
  'src/components/oracle/charts/MultiValidatorComparison.tsx',
  'src/app/[locale]/dia/components/DIAStakingView.tsx',
  'src/components/oracle/common/PriceAccuracyStats.tsx',
  'src/components/favorites/FavoriteCard.tsx',
  'src/components/alerts/AlertList.tsx',
  'src/components/alerts/AlertNotification.tsx',
  'src/components/oracle/common/VolatilityAlert.tsx',
  'src/components/oracle/common/UMAScoreExplanationModal.tsx',
  'src/components/oracle/common/SecurityTimeline.tsx',
  'src/components/oracle/common/ChainEventMonitor.tsx',
  'src/components/oracle/common/RealtimeUpdateControl.tsx',
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // Check if file has hardcoded zh-CN
  if (!content.includes("'zh-CN'")) {
    console.log(`⏭️  No hardcoded zh-CN in: ${filePath}`);
    return;
  }

  // Add imports if not present
  if (!content.includes('useLocale')) {
    // Replace useTranslations import
    content = content.replace(
      /import\s+{\s*useTranslations\s*}\s+from\s+['"]@\/i18n['"];?/,
      "import { useTranslations, useLocale } from '@/i18n';\nimport { getDateTimeLocale } from '@/lib/utils/dateFormat';"
    );
  }

  // Add locale hook in component function
  // This is a simplified approach - complex cases need manual review
  const hasLocaleHook = content.includes('const locale = useLocale()');
  if (!hasLocaleHook && content.includes('const t = useTranslations()')) {
    content = content.replace(
      /(export\s+function\s+\w+\([^)]*\)\s*{[\s\S]*?)(const\s+t\s+=\s+useTranslations\([^)]*\);)/,
      '$1$2\n  const locale = useLocale();'
    );
  }

  // Replace date formatting calls
  // Note: This is a basic replacement - some cases may need manual adjustment
  content = content.replace(
    /\.toLocaleString\(['"]zh-CN['"]\)/g,
    '.toLocaleString(getDateTimeLocale(locale))'
  );
  content = content.replace(
    /\.toLocaleDateString\(['"]zh-CN['"]/g,
    '.toLocaleDateString(getDateTimeLocale(locale)'
  );
  content = content.replace(
    /\.toLocaleTimeString\(['"]zh-CN['"]/g,
    '.toLocaleTimeString(getDateTimeLocale(locale)'
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
  }
}

console.log('🔧 Fixing hardcoded zh-CN locale in date formatting...\n');

filesToFix.forEach(fixFile);

console.log('\n✨ Done! Please review the changes and run TypeScript check.');
console.log('   Some complex cases may need manual adjustment.');
