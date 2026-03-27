# Insight Oracle 页面模板系统使用指南

## 概述

本项目创建了一个统一的 Oracle 页面模板系统，旨在解决 10 个 oracle 页面（chainlink, pyth, api3, band-protocol, uma, redstone, dia, tellor, chronicle, winklink）结构高度相似但各自独立维护的问题。

## 核心组件

### 1. OraclePageTemplate 组件

位置：`src/components/oracle/shared/OraclePageTemplateNew.tsx`

这是一个可配置的页面模板，支持以下功能：

- 可配置的 Hero 组件
- 可配置的 Sidebar 组件
- 动态视图切换
- 移动端响应式布局
- 加载和错误状态处理

### 2. useOraclePage Hook

位置：`src/hooks/oracles/useOraclePage.ts`

统一的页面数据管理 Hook，提供：

- 统一的数据获取逻辑
- 状态管理（loading, error, refreshing）
- 自动刷新功能
- 数据导出功能

### 3. 扩展的配置系统

位置：`src/lib/config/oracles.tsx`

在原有配置基础上添加了 `views` 配置：

```typescript
interface OracleViewConfig {
  id: string;
  labelKey: string;
  component: string;
  requiredData?: string[];
  default?: boolean;
}
```

## 使用示例

### Chainlink 页面迁移示例

```typescript
'use client';

import { OracleProvider } from '@/types/oracle';
import { OraclePageTemplate, OracleViewProps } from '@/components/oracle/shared/OraclePageTemplateNew';
import { useOraclePage } from '@/hooks/oracles/useOraclePage';
import { ChainlinkHero } from './components/ChainlinkHero';
import { ChainlinkSidebar } from './components/ChainlinkSidebar';
import { ChainlinkMarketView } from './components/ChainlinkMarketView';
// ... 其他视图组件

const views = [
  {
    id: 'market',
    labelKey: 'chainlink.menu.marketData',
    component: ({ config, data, isLoading }: OracleViewProps) => (
      <ChainlinkMarketView
        config={config}
        price={data.price ?? null}
        historicalData={data.historicalData ?? []}
        isLoading={isLoading}
      />
    ),
    default: true,
  },
  // ... 其他视图
];

export default function ChainlinkPage() {
  const {
    config,
    price,
    historicalData,
    networkStats,
    isLoading,
    isError,
    error,
    lastUpdated,
    isRefreshing,
    refresh,
    exportData,
  } = useOraclePage({
    provider: OracleProvider.CHAINLINK,
  });

  return (
    <OraclePageTemplate
      provider={OracleProvider.CHAINLINK}
      hero={{ component: ChainlinkHero }}
      sidebar={{ component: ChainlinkSidebar }}
      views={views}
      data={{
        price,
        historicalData,
        networkStats,
      }}
      state={{
        isLoading,
        isError,
        error,
        isRefreshing,
        lastUpdated,
      }}
      actions={{
        refresh,
        exportData,
      }}
    />
  );
}
```

## 向后兼容

现有的页面实现（如 `page.tsx`）继续工作，不受影响。新的模板系统通过 `page-new.tsx` 文件提供，可以在准备就绪后逐步迁移。

## 迁移步骤

1. **创建视图配置**：定义每个 oracle 的视图列表
2. **适配现有组件**：确保 Hero 和 Sidebar 组件符合模板接口
3. **使用 useOraclePage**：替换现有的数据获取逻辑
4. **测试验证**：确保功能完整性
5. **切换页面**：将 `page-new.tsx` 重命名为 `page.tsx`

## 优势

1. **减少重复代码**：共享页面结构和逻辑
2. **统一用户体验**：一致的布局和交互模式
3. **易于维护**：修改一处，全局生效
4. **类型安全**：完整的 TypeScript 类型支持
5. **可扩展性**：轻松添加新的 oracle 页面

## 注意事项

- 现有组件可能需要适配以符合新的接口定义
- 类型定义需要保持一致性
- 建议在测试环境充分验证后再切换到生产环境
