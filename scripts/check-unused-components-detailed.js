const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) {
        getAllFiles(fullPath, files);
      }
    } else if (item.isFile() && /\.(tsx?|jsx?)$/.test(item.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function checkComponentUsage(componentName, allFiles, excludeFile) {
  for (const file of allFiles) {
    if (file === excludeFile) continue;
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes(`<${componentName}`) || 
          content.includes(`<${componentName}`) ||
          content.includes(`${componentName}`) && 
          (content.includes(`import ${componentName}`) || 
           content.includes(`import { ${componentName}`) ||
           content.includes(`import {${componentName}`))) {
        return true;
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return false;
}

function main() {
  console.log('检查未使用的组件...\n');
  
  const allFiles = getAllFiles(srcDir);
  const unusedComponents = [];
  
  const componentsToCheck = [
    'GlobalErrorBoundary',
    'SectionErrorBoundary',
    'CacheStatusProvider',
    'useCacheStatusOptimized',
    'PerformanceBadge',
    'PerformanceReportButton',
    'NotificationBadge',
    'AvatarUploader',
    'EmptyStateQuickStart',
    'EmptyStateWithExamples',
    'EmptyStateError',
    'EmptyStateOffline',
    'NoDataEmptyState',
    'EmptyFavoritesState',
    'EmptySearchResultsState',
    'GuidedEmptyState',
    'CircularProgress',
    'StepProgress',
    'BatchOperationProgress',
    'useLoadingProgress',
    'LazyLoadPlaceholder',
    'DynamicBentoMetricsGrid',
    'REFETCH_INTERVAL_CONFIG',
  ];
  
  const componentFiles = {
    'GlobalErrorBoundary': 'src/components/ErrorBoundaries.tsx',
    'SectionErrorBoundary': 'src/components/ErrorBoundaries.tsx',
    'CacheStatusProvider': 'src/contexts/CacheStatusContext.tsx',
    'useCacheStatusOptimized': 'src/contexts/CacheStatusContext.tsx',
    'PerformanceBadge': 'src/components/performance/PerformanceMonitor.tsx',
    'PerformanceReportButton': 'src/components/performance/PerformanceMonitor.tsx',
    'NotificationBadge': 'src/components/realtime/RealtimeNotifications.tsx',
    'AvatarUploader': 'src/components/ui/AvatarUploader.tsx',
    'EmptyStateQuickStart': 'src/components/ui/EmptyStateEnhanced.tsx',
    'EmptyStateWithExamples': 'src/components/ui/EmptyStateEnhanced.tsx',
    'EmptyStateError': 'src/components/ui/EmptyStateEnhanced.tsx',
    'EmptyStateOffline': 'src/components/ui/EmptyStateEnhanced.tsx',
    'NoDataEmptyState': 'src/components/ui/EmptyStateEnhanced.tsx',
    'EmptyFavoritesState': 'src/components/ui/EmptyStateEnhanced.tsx',
    'EmptySearchResultsState': 'src/components/ui/EmptyStateEnhanced.tsx',
    'GuidedEmptyState': 'src/components/ui/EmptyStateEnhanced.tsx',
    'CircularProgress': 'src/components/ui/LoadingProgress.tsx',
    'StepProgress': 'src/components/ui/LoadingProgress.tsx',
    'BatchOperationProgress': 'src/components/ui/LoadingProgress.tsx',
    'useLoadingProgress': 'src/components/ui/LoadingProgress.tsx',
    'LazyLoadPlaceholder': 'src/components/ui/LoadingProgress.tsx',
    'DynamicBentoMetricsGrid': 'src/app/[locale]/home-components/DynamicBentoMetricsGrid.tsx',
    'REFETCH_INTERVAL_CONFIG': 'src/providers/ReactQueryProvider.tsx',
  };
  
  for (const component of componentsToCheck) {
    const filePath = componentFiles[component] ? 
      path.join(__dirname, '..', componentFiles[component]) : 
      null;
    
    const isUsed = checkComponentUsage(component, allFiles, filePath);
    
    if (!isUsed) {
      unusedComponents.push({
        name: component,
        file: componentFiles[component] || 'unknown'
      });
    }
  }
  
  if (unusedComponents.length === 0) {
    console.log('✅ 所有组件都被使用了');
  } else {
    console.log('❌ 找到以下未使用的组件:\n');
    unusedComponents.forEach(({ name, file }) => {
      console.log(`  - ${name} (${file})`);
    });
    console.log(`\n总计: ${unusedComponents.length} 个未使用的组件`);
  }
}

main();
