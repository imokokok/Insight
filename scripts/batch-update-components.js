#!/usr/bin/env node

/**
 * 批量更新组件脚本
 * 1. 补充缺失的 i18n 翻译键
 * 2. 更新 DashboardCard 导入（保持兼容）
 * 3. 标准化按钮使用
 */

const fs = require('fs');
const path = require('path');

// 需要添加的翻译键
const translationsToAdd = {
  'zh-CN': {
    // crossChain 相关
    'crossChain': {
      'autoRefreshOff': '关闭自动刷新',
      'autoRefresh30s': '30秒',
      'autoRefresh1m': '1分钟',
      'autoRefresh5m': '5分钟',
      'averagePrice': '平均价格',
      'medianPrice': '中位数价格',
      'highestPrice': '最高价格',
      'priceRange': '价格区间',
      'standardDeviation': '标准差',
      'dataPoints': '数据点',
      'iqr': '四分位距',
      'skewness': '偏度',
      'kurtosis': '峰度',
      'confidenceInterval95': '95%置信区间',
      'coefficientOfVariation': '变异系数',
      'consistencyRating': '一致性评级',
      'stabilityAnalysis': '稳定性分析',
      'blockchain': '区块链',
      'dataIntegrity': '数据完整性',
      'priceVolatility': '价格波动率',
      'priceJumpFrequency': '价格跳跃频率',
      'stabilityRating': '稳定性评级',
      'cointegrationAnalysis': '协整分析',
      'cointegrationDesc': '分析不同链上价格之间的长期均衡关系',
      'volatilityAnalysis': '波动性分析',
      'volatilityAnalysisDesc': '分析价格波动的统计特征',
      'priceDistributionAnalysis': '价格分布分析',
      'priceDistributionHistogram': '价格分布直方图',
      'frequency': '频率',
      'medianLine': '中位数线',
      'meanLine': '均值线',
      'chainPriceBoxPlot': '链价格箱线图',
      'title': '跨链分析',
      'colorblindModeOn': '色盲模式已开启',
      'switchToColorblindMode': '切换到色盲模式',
      'colorblindFriendly': '色盲友好',
      'export': '导出',
      'autoRefresh': '自动刷新',
      'refreshSuccess': '刷新成功',
      'loadingData': '加载数据中...',
      'tooltip': {
        'averagePrice': '所有链上价格的平均值',
        'medianPrice': '所有链上价格的中位数',
        'highestPrice': '所有链中的最高价格',
        'priceRange': '最高价格与最低价格的差值',
        'standardDeviation': '价格波动的标准差',
        'dataPoints': '数据点的数量',
        'iqr': '第三四分位数与第一四分位数的差值',
        'skewness': '价格分布的不对称性',
        'kurtosis': '价格分布的尾部厚度',
        'confidenceInterval95': '95%置信水平下的价格区间',
        'coefficientOfVariation': '标准差与平均值的比值',
        'consistencyRating': '基于标准差的一致性评级'
      }
    },
    // crossOracle 相关
    'crossOracle': {
      'subtitle': '多预言机价格对比分析',
      'favorites': {
        'button': '收藏',
        'quickAccess': '快速访问',
        'viewAll': '查看全部'
      },
      'weighted': '加权',
      'historyRange': '历史范围',
      'low': '最低',
      'ofAverage': '占平均值',
      'variance': '方差',
      'basedOnStdDev': '基于标准差'
    },
    // settings 相关
    'settings': {
      'profile': {
        'title': '个人资料',
        'subtitle': '管理您的个人信息和账户设置',
        'displayNameLabel': '显示名称',
        'displayNamePlaceholder': '输入显示名称',
        'emailLabel': '邮箱',
        'emailNotEditable': '邮箱不可编辑',
        'saveChanges': '保存更改',
        'saveSuccess': '保存成功',
        'saveError': '保存失败',
        'passwordManagement': '密码管理',
        'passwordManagementDesc': '更新您的密码以保护账户安全',
        'changePassword': '修改密码',
        'newPassword': '新密码',
        'newPasswordPlaceholder': '输入新密码',
        'passwordMinLength': '密码长度至少为8位',
        'passwordMismatch': '两次输入的密码不一致',
        'passwordUpdateSuccess': '密码更新成功',
        'passwordUpdateError': '密码更新失败'
      }
    }
  },
  'en': {
    // crossChain 相关
    'crossChain': {
      'autoRefreshOff': 'Auto Refresh Off',
      'autoRefresh30s': '30 Seconds',
      'autoRefresh1m': '1 Minute',
      'autoRefresh5m': '5 Minutes',
      'averagePrice': 'Average Price',
      'medianPrice': 'Median Price',
      'highestPrice': 'Highest Price',
      'priceRange': 'Price Range',
      'standardDeviation': 'Standard Deviation',
      'dataPoints': 'Data Points',
      'iqr': 'Interquartile Range',
      'skewness': 'Skewness',
      'kurtosis': 'Kurtosis',
      'confidenceInterval95': '95% Confidence Interval',
      'coefficientOfVariation': 'Coefficient of Variation',
      'consistencyRating': 'Consistency Rating',
      'stabilityAnalysis': 'Stability Analysis',
      'blockchain': 'Blockchain',
      'dataIntegrity': 'Data Integrity',
      'priceVolatility': 'Price Volatility',
      'priceJumpFrequency': 'Price Jump Frequency',
      'stabilityRating': 'Stability Rating',
      'cointegrationAnalysis': 'Cointegration Analysis',
      'cointegrationDesc': 'Analyze long-term equilibrium relationships between prices on different chains',
      'volatilityAnalysis': 'Volatility Analysis',
      'volatilityAnalysisDesc': 'Analyze statistical characteristics of price volatility',
      'priceDistributionAnalysis': 'Price Distribution Analysis',
      'priceDistributionHistogram': 'Price Distribution Histogram',
      'frequency': 'Frequency',
      'medianLine': 'Median Line',
      'meanLine': 'Mean Line',
      'chainPriceBoxPlot': 'Chain Price Box Plot',
      'title': 'Cross Chain Analysis',
      'colorblindModeOn': 'Colorblind Mode On',
      'switchToColorblindMode': 'Switch to Colorblind Mode',
      'colorblindFriendly': 'Colorblind Friendly',
      'export': 'Export',
      'autoRefresh': 'Auto Refresh',
      'refreshSuccess': 'Refresh Success',
      'loadingData': 'Loading data...',
      'tooltip': {
        'averagePrice': 'Average of prices across all chains',
        'medianPrice': 'Median of prices across all chains',
        'highestPrice': 'Highest price across all chains',
        'priceRange': 'Difference between highest and lowest prices',
        'standardDeviation': 'Standard deviation of price fluctuations',
        'dataPoints': 'Number of data points',
        'iqr': 'Difference between third and first quartiles',
        'skewness': 'Asymmetry of price distribution',
        'kurtosis': 'Tail thickness of price distribution',
        'confidenceInterval95': 'Price interval at 95% confidence level',
        'coefficientOfVariation': 'Ratio of standard deviation to mean',
        'consistencyRating': 'Consistency rating based on standard deviation'
      }
    },
    // crossOracle 相关
    'crossOracle': {
      'subtitle': 'Multi-Oracle Price Comparison Analysis',
      'favorites': {
        'button': 'Favorites',
        'quickAccess': 'Quick Access',
        'viewAll': 'View All'
      },
      'weighted': 'Weighted',
      'historyRange': 'History Range',
      'low': 'Low',
      'ofAverage': 'Of Average',
      'variance': 'Variance',
      'basedOnStdDev': 'Based on Std Dev'
    },
    // settings 相关
    'settings': {
      'profile': {
        'title': 'Profile',
        'subtitle': 'Manage your personal information and account settings',
        'displayNameLabel': 'Display Name',
        'displayNamePlaceholder': 'Enter display name',
        'emailLabel': 'Email',
        'emailNotEditable': 'Email is not editable',
        'saveChanges': 'Save Changes',
        'saveSuccess': 'Saved successfully',
        'saveError': 'Save failed',
        'passwordManagement': 'Password Management',
        'passwordManagementDesc': 'Update your password to keep your account secure',
        'changePassword': 'Change Password',
        'newPassword': 'New Password',
        'newPasswordPlaceholder': 'Enter new password',
        'passwordMinLength': 'Password must be at least 8 characters',
        'passwordMismatch': 'Passwords do not match',
        'passwordUpdateSuccess': 'Password updated successfully',
        'passwordUpdateError': 'Password update failed'
      }
    }
  }
};

// 深度合并对象
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// 更新翻译文件
function updateTranslationFile(locale, translations) {
  const filePath = path.join(process.cwd(), 'src/i18n/messages', locale, 'common.json');
  
  if (!fs.existsSync(filePath)) {
    console.error(`Translation file not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  // 合并翻译
  deepMerge(data, translations);
  
  // 写回文件
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`✓ Updated ${locale}/common.json`);
}

// 更新组件导入
function updateComponentImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 检查是否使用了 DashboardCard
  if (content.includes('DashboardCard') && content.includes("from '@/components/oracle/common'")) {
    // 添加新的 Card 组件导入（如果还没有）
    if (!content.includes("from '@/components/ui/Card'")) {
      // 在最后一个 import 后添加新的 import
      const lastImportMatch = content.match(/import .* from ['"].*['"];?\n(?!import)/);
      if (lastImportMatch) {
        const importStatement = "import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';\n";
        content = content.replace(lastImportMatch[0], importStatement + lastImportMatch[0]);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Updated imports in ${path.basename(filePath)}`);
  }
}

// 主函数
function main() {
  console.log('🚀 Starting batch component update...\n');

  // 1. 更新翻译文件
  console.log('📚 Updating translation files...');
  updateTranslationFile('zh-CN', translationsToAdd['zh-CN']);
  updateTranslationFile('en', translationsToAdd['en']);
  console.log('');

  // 2. 更新组件导入
  console.log('🔄 Updating component imports...');
  const filesToUpdate = [
    'src/components/oracle/panels/*.tsx',
    'src/components/alerts/*.tsx',
  ];

  // 获取所有需要更新的文件
  const { execSync } = require('child_process');
  filesToUpdate.forEach(pattern => {
    try {
      const files = execSync(`find src -path "${pattern}" -type f 2>/dev/null || true`, { encoding: 'utf-8' });
      files.split('\n').filter(f => f).forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
          updateComponentImports(fullPath);
        }
      });
    } catch (e) {
      // 忽略错误
    }
  });

  console.log('\n✅ Batch update completed!');
}

main();
