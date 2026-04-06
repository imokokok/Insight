# 拆分大文件规范

## Why
代码库中存在多个过大的文件（超过500行），这些文件包含多个职责、混合关注点，导致：
- 代码可读性和可维护性降低
- 测试困难
- 代码复用性差
- 团队协作时容易产生冲突

## What Changes
- 拆分 `PythDataService.ts` (734行) - 提取重试逻辑、缓存管理、跨链数据获取到独立模块
- 拆分 `AnalysisTab.tsx` (327行) - 提取占位符组件到独立文件
- 拆分 `useCrossChainData.ts` (1,758行) - 提取验证逻辑、异常检测、工具函数到独立模块
- 拆分 `bandRpcService.ts` (1,419行) - 按功能域拆分（验证者、区块、治理等）
- 拆分 `ChartExportButton.tsx` (1,104行) - 提取状态管理、导出逻辑、子组件
- 拆分 `diaDataService.ts` (1,059行) - 提取配置常量、地址映射到独立文件
- 拆分 `DataTablePro.tsx` (1,028行) - 提取类型定义、工具函数、子组件

## Impact
- Affected specs: 数据获取、组件架构、代码组织
- Affected code: 
  - `/src/lib/oracles/pyth/PythDataService.ts`
  - `/src/app/[locale]/cross-oracle/components/tabs/AnalysisTab.tsx`
  - `/src/app/[locale]/cross-chain/useCrossChainData.ts`
  - `/src/lib/oracles/bandProtocol/bandRpcService.ts`
  - `/src/components/oracle/forms/ChartExportButton.tsx`
  - `/src/lib/oracles/diaDataService.ts`
  - `/src/components/ui/DataTablePro.tsx`

## ADDED Requirements

### Requirement: 模块化拆分原则
系统应当遵循以下拆分原则：
- 单一职责原则：每个文件只负责一个明确的功能
- 内聚性：相关的代码应该放在一起
- 适度拆分：避免过度拆分导致文件碎片化
- 清晰的依赖关系：拆分后的模块应该有清晰的导入导出关系

#### Scenario: 拆分服务类
- **WHEN** 服务类超过500行且包含多个职责
- **THEN** 应该按职责拆分为多个模块，每个模块不超过300行

#### Scenario: 拆分组件
- **WHEN** 组件文件超过300行且包含多个子组件
- **THEN** 应该将子组件提取到独立文件，主组件文件不超过200行

#### Scenario: 拆分Hook
- **WHEN** 自定义Hook超过500行且包含多个逻辑关注点
- **THEN** 应该拆分为多个更小的Hook，每个Hook专注于单一职责

## MODIFIED Requirements

### Requirement: Pyth数据服务架构
原有的单一 `PythDataService.ts` 文件将被拆分为：
- `PythDataService.ts` - 核心服务类，负责价格数据获取（约200行）
- `retry.ts` - 重试逻辑工具函数（约50行）
- `crossChain.ts` - 跨链数据获取逻辑（约150行）
- `calculations.ts` - 统计计算函数（约50行）

### Requirement: AnalysisTab组件架构
原有的 `AnalysisTab.tsx` 将被拆分为：
- `AnalysisTab.tsx` - 主组件（约100行）
- `components/DataQualityTrend.tsx` - 数据质量趋势组件
- `components/LatencyDistributionHistogram.tsx` - 延迟分布直方图组件
- `components/MovingAverageChart.tsx` - 移动平均线图表组件
- `components/PriceCorrelationMatrix.tsx` - 价格相关性矩阵组件
- `components/PriceDeviationHeatmap.tsx` - 价格偏差热力图组件
- `components/PriceDistributionBoxPlot.tsx` - 价格分布箱线图组件
- `components/PriceVolatilityChart.tsx` - 价格波动率图表组件
- `components/OraclePerformanceRanking.tsx` - 预言机性能排名组件

### Requirement: CrossChain数据Hook架构
原有的 `useCrossChainData.ts` 将被拆分为：
- `useCrossChainData.ts` - 主Hook，组合其他Hooks（约300行）
- `hooks/useDataValidation.ts` - 数据验证逻辑
- `hooks/useAnomalyDetection.ts` - 异常检测逻辑
- `hooks/useDataFetching.ts` - 数据获取逻辑
- `utils/validation.ts` - 验证工具函数
- `utils/anomalyDetection.ts` - 异常检测工具函数

### Requirement: Band RPC服务架构
原有的 `bandRpcService.ts` 将被拆分为：
- `BandRpcService.ts` - 核心服务类（约200行）
- `validators.ts` - 验证者相关逻辑
- `blocks.ts` - 区块相关逻辑
- `governance.ts` - 治理相关逻辑
- `types.ts` - 类型定义（已存在，可能需要扩展）

### Requirement: ChartExportButton组件架构
原有的 `ChartExportButton.tsx` 将被拆分为：
- `ChartExportButton.tsx` - 主组件（约200行）
- `components/ExportSettings.tsx` - 导出设置子组件
- `components/ResolutionPicker.tsx` - 分辨率选择器
- `components/BatchSelector.tsx` - 批量选择器
- `components/ExportPreview.tsx` - 导出预览
- `hooks/useExportState.ts` - 导出状态管理Hook
- `hooks/useExportActions.ts` - 导出操作Hook

### Requirement: DIA数据服务架构
原有的 `diaDataService.ts` 将被拆分为：
- `DIADataService.ts` - 核心服务类（约300行）
- `constants/chainMapping.ts` - 链映射常量
- `constants/assetAddresses.ts` - 资产地址常量
- `constants/nftCollections.ts` - NFT集合常量

### Requirement: DataTablePro组件架构
原有的 `DataTablePro.tsx` 将被拆分为：
- `DataTablePro.tsx` - 主组件（约300行）
- `components/TableHeader.tsx` - 表头组件
- `components/TableBody.tsx` - 表体组件
- `components/ColumnResizer.tsx` - 列宽调整器
- `components/DensityToggle.tsx` - 密度切换器
- `types.ts` - 类型定义
- `utils/formatting.ts` - 格式化工具函数
- `utils/sorting.ts` - 排序工具函数

## REMOVED Requirements
无移除的需求。所有功能保持不变，仅进行代码组织优化。
