# 翻译文件拆分方案 Spec

## 问题分析

当前项目使用单文件 JSON 存储翻译键，存在以下问题：

1. **文件体积过大**: en.json 约 6,596 行，zh-CN.json 约 6,729 行，总计 13,000+ 行
2. **命名空间混乱**: 约 100+ 个顶级命名空间，包含大量重复和嵌套
3. **维护困难**: 查找和修改特定模块的翻译需要在大文件中搜索
4. **加载性能**: 首次加载需要下载完整翻译文件（约 240KB）
5. **团队协作**: 多人同时编辑翻译文件容易产生冲突

## 现状统计

```
文件行数:
- en.json: 6,596 行
- zh-CN.json: 6,729 行

顶级命名空间数量: 100+
主要命名空间:
- common, navbar, blockchain, footer, home
- crossOracle, crossOracleComparison, crossChain
- chainlink, dia, tellor, uma, redstone, pythNetwork, api3, bandProtocol, chronicle, winklink
- priceQuery, priceDeviation, dataQuality, comparison
- alerts, favorites, settings, auth
- charts, panels, forms, mobile, search
```

## 拆分策略

### 策略选择: 按功能模块拆分 (推荐)

**理由**:
- 与项目代码结构对齐（app/[locale]/ 下的页面结构）
- 便于按需加载（Code Splitting）
- 团队协作时冲突概率降低
- 符合 next-intl 的最佳实践

### 目标结构

```
src/i18n/
├── config.ts              # i18n 配置集中管理
├── request.ts             # 服务端加载配置（已存在，需修改）
├── routing.ts             # 路由配置（已存在）
├── provider.tsx           # 客户端 Provider（已存在，需修改）
├── types.ts               # 类型定义
├── index.ts               # 统一导出
├── messages/              # 拆分后的翻译文件
│   ├── common.json        # 通用翻译（~500 行）
│   ├── navigation.json    # 导航相关（~200 行）
│   ├── home.json          # 首页（~100 行）
│   ├── marketOverview.json # 市场概览（~300 行）
│   ├── priceQuery.json    # 价格查询（~400 行）
│   ├── crossOracle.json   # 跨预言机分析（~600 行）
│   ├── crossChain.json    # 跨链对比（~500 行）
│   ├── oracles/           # 各预言机详情页
│   │   ├── chainlink.json
│   │   ├── pyth.json
│   │   ├── api3.json
│   │   ├── band.json
│   │   ├── tellor.json
│   │   ├── uma.json
│   │   ├── dia.json
│   │   ├── redstone.json
│   │   ├── chronicle.json
│   │   └── winklink.json
│   ├── components/        # 可复用组件
│   │   ├── charts.json
│   │   ├── alerts.json
│   │   ├── export.json
│   │   ├── favorites.json
│   │   └── search.json
│   ├── features/          # 功能模块
│   │   ├── settings.json
│   │   ├── auth.json
│   │   └── methodology.json
│   └── zh-CN/             # 中文翻译镜像结构
│       ├── common.json
│       ├── navigation.json
│       └── ...
```

## 命名空间合并建议

### 需要合并的重复/相似命名空间

| 当前命名空间 | 建议合并到 | 原因 |
|-------------|-----------|------|
| `priceQuery` (多处定义) | 统一为 `priceQuery` | 重复定义 |
| `crossOracleComparison` | 合并到 `crossOracle` | 功能重叠 |
| `oracleCommon` | 合并到 `common.oracles` | 归类整理 |
| `dataQuality` (多处定义) | 统一为 `dataQuality` | 重复定义 |
| `comparison` (多处定义) | 统一为 `comparison` | 重复定义 |

### 命名空间重命名建议

| 当前命名空间 | 建议新名称 | 原因 |
|-------------|-----------|------|
| `pythNetwork` | `oracles.pyth` | 统一预言机命名规范 |
| `bandProtocol` | `oracles.band` | 简化名称 |
| `winklink` | `oracles.winklink` | 统一预言机命名规范 |
| `crossOracle` | `analysis.crossOracle` | 归类到分析模块 |
| `crossChain` | `analysis.crossChain` | 归类到分析模块 |

## 技术实现方案

### 1. 使用 next-intl 的异步加载

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  
  // 按需加载翻译文件
  const messages = {
    ...await import(`./messages/${locale}/common.json`),
    ...await import(`./messages/${locale}/navigation.json`),
    // 根据路由动态加载其他文件
  };
  
  return { locale, messages };
});
```

### 2. 客户端按需加载

```typescript
// 动态导入特定页面的翻译
const loadMessages = async (locale: string, namespace: string) => {
  return import(`./messages/${locale}/${namespace}.json`);
};
```

### 3. 类型安全

```typescript
// src/i18n/types.ts
import enCommon from './messages/en/common.json';
import enNavigation from './messages/en/navigation.json';
// ...

export type Messages = {
  common: typeof enCommon;
  navigation: typeof enNavigation;
  // ...
};
```

## 影响分析

### 受影响的代码

1. **i18n 配置**: `src/i18n/request.ts`, `src/lib/i18n/provider.tsx`
2. **所有使用翻译的组件**: 约 100+ 文件
3. **类型定义**: 需要更新翻译键的类型

### 向后兼容性

- **方案**: 保持现有翻译键路径不变，仅拆分文件存储
- **迁移**: 逐步迁移，新旧方案可共存

## 实施建议

### 阶段一: 基础设施（低风险）
1. 创建新的目录结构
2. 实现新的加载机制
3. 添加类型支持

### 阶段二: 核心模块迁移（中风险）
1. 迁移 `common`, `navigation`, `footer`
2. 迁移 `home`, `marketOverview`
3. 验证所有引用正确

### 阶段三: 功能模块迁移（中风险）
1. 迁移各预言机详情页
2. 迁移分析页面（crossOracle, crossChain）
3. 迁移组件翻译

### 阶段四: 清理（低风险）
1. 删除旧的 monolithic 翻译文件
2. 更新文档

## 预期收益

1. **维护效率**: 文件大小减少 80%+，定位翻译键更快
2. **加载性能**: 支持按需加载，首屏加载减少 ~70%
3. **协作体验**: 冲突概率降低，代码审查更专注
4. **类型安全**: 完整的 TypeScript 支持

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 翻译键遗漏 | 高 | 建立完整的迁移检查清单 |
| 运行时错误 | 中 | 添加翻译键缺失的 fallback 处理 |
| 构建复杂度 | 低 | 使用自动化脚本处理重复任务 |
