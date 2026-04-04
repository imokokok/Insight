const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function findImports(filePath, componentName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];

  // Check for direct imports
  const directImportRegex = new RegExp(`import\\s+.*\\b${componentName}\\b.*from`, 'g');
  let match;
  while ((match = directImportRegex.exec(content)) !== null) {
    imports.push({
      type: 'direct',
      line: content.substring(0, match.index).split('\n').length,
      match: match[0]
    });
  }

  // Check for namespace imports
  const namespaceRegex = new RegExp(`import\\s+\\*\\s+as\\s+\\w+.*from`, 'g');
  while ((match = namespaceRegex.exec(content)) !== null) {
    const importPath = match[0].match(/from\s+['"]([^'"]+)['"]/);
    if (importPath) {
      const dir = path.dirname(filePath);
      const resolvedPath = resolveImport(dir, importPath[1]);
      if (resolvedPath && fs.existsSync(resolvedPath)) {
        const indexContent = fs.readFileSync(resolvedPath, 'utf-8');
        if (indexContent.includes(componentName)) {
          imports.push({
            type: 'namespace',
            line: content.substring(0, match.index).split('\n').length,
            match: match[0],
            via: importPath[1]
          });
        }
      }
    }
  }

  return imports;
}

function resolveImport(fromDir, importPath) {
  if (importPath.startsWith('@/')) {
    const relPath = importPath.replace('@/', '');
    return path.join(srcDir, relPath);
  }
  return null;
}

const componentsToCheck = [
  'API3AlertBadge',
  'API3AlertNotification',
  'AlertNotification',
  'PriceChartTooltip',
  'PerformanceGauge',
  'API3PanelConfig',
  'BandProtocolPanelConfig',
  'ChainlinkPanelConfig',
  'ChroniclePanelConfig',
  'DIAPanelConfig',
  'PythPanelConfig',
  'RedStonePanelConfig',
  'TellorPanelConfig',
  'UMAPanelConfig',
  'WINkLinkPanelConfig',
  'AirnodeDeploymentPanel',
  'ChainlinkDataFeedsPanel',
  'ChainlinkEcosystemPanel',
  'ChainlinkNodesPanel',
  'ChainlinkRiskPanel',
  'CoveragePoolPanel',
  'CrossChainPanel',
  'DIADataFeedsPanel',
  'DIAEcosystemPanel',
  'DIANFTDataPanel',
  'DIARiskAssessmentPanel',
  'DIAStakingPanel',
  'DataSourceTraceabilityPanel',
  'MarketDataPanel',
  'PublisherAnalysisPanel',
  'ValidatorRow',
  'ShortcutContext',
  'Input',
  'LoadingProgress',
  'Toast',
  'API3ApiDocs',
  'API3IntegrationGuide',
  'API3SdkDownloads',
  'API3TestnetSwitch',
  'ChainlinkErrorBoundary',
  'SmallComponents',
  'PairSelector',
  'AnalysisTab',
  'OracleProfilesTab',
  'PriceComparisonTab',
  'QualityAnalysisTab',
  'constants',
  'ChartConfigContext',
  'OracleDataContext',
  'UIStateContext',
  'ChartContext',
  'RedStoneClientContext',
  'KeyboardShortcuts',
];

console.log('🔍 深度分析组件使用情况...\n');

componentsToCheck.forEach(component => {
  console.log(`\n📦 ${component}:`);

  // Search in all tsx files
  const results = [];
  const searchDir = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        searchDir(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const relativePath = path.relative(srcDir, filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Direct import check
        if (content.includes(`import`) && content.includes(component)) {
          const importMatch = content.match(new RegExp(`import\\s+.*\\b${component}\\b`, 'g'));
          if (importMatch) {
            results.push({
              file: relativePath,
              type: 'import',
              match: importMatch[0]
            });
          }
        }

        // Default export check (for page components)
        if (content.includes(`export default`) && content.includes(component)) {
          results.push({
            file: relativePath,
            type: 'export_default',
            match: `export default ${component}`
          });
        }

        // Named export check
        if (content.includes(`export`) && content.includes(`function ${component}`)) {
          results.push({
            file: relativePath,
            type: 'named_export',
            match: `export function ${component}`
          });
        }

        // Dynamic usage in getPanelConfig
        if (content.includes('getPanelConfig') && content.includes(component)) {
          results.push({
            file: relativePath,
            type: 'dynamic_usage',
            match: 'used in getPanelConfig'
          });
        }

        // Context provider usage
        if (content.includes('Provider') && content.includes(component)) {
          results.push({
            file: relativePath,
            type: 'provider_usage',
            match: `Provider usage`
          });
        }
      }
    });
  };

  searchDir(srcDir);

  if (results.length === 0) {
    console.log('   ❌ 未发现任何使用');
  } else {
    results.forEach(r => {
      console.log(`   ✅ ${r.type}: ${r.file}`);
      if (r.match && r.type === 'import') {
        console.log(`      ${r.match}`);
      }
    });
  }
});

console.log('\n\n📊 扫描完成');
