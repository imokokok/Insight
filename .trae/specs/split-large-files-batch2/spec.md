# 拆分超大文件规范（第二批）

## Why
代码库中仍有3个超过900行的超大文件，这些文件包含多个职责、混合关注点，需要进一步拆分以提高代码可维护性：
- `chartExport.ts` (993行) - 图表导出工具函数
- `umaSubgraphService.ts` (930行) - UMA子图服务
- `ChartRenderer.tsx` (908行) - 图表渲染组件

## What Changes
- 拆分 `chartExport.ts` (993行) - 按导出格式拆分（CSV、JSON、PNG、SVG、Excel、PDF）
- 拆分 `umaSubgraphService.ts` (930行) - 拆分查询逻辑、类型定义、数据处理
- 拆分 `ChartRenderer.tsx` (908行) - 提取子组件、拆分渲染逻辑

## Impact
- Affected specs: 数据导出、UMA集成、图表渲染
- Affected code: 
  - `/src/lib/utils/chartExport.ts`
  - `/src/lib/oracles/umaSubgraphService.ts`
  - `/src/app/[locale]/market-overview/components/ChartRenderer.tsx`

## ADDED Requirements

### Requirement: 图表导出工具架构
原有的单一 `chartExport.ts` 文件将被拆分为：
- `chartExport.ts` - 主导出函数，协调各格式导出（约200行）
- `formats/csvExporter.ts` - CSV格式导出逻辑
- `formats/jsonExporter.ts` - JSON格式导出逻辑
- `formats/imageExporter.ts` - PNG/SVG图像导出逻辑
- `formats/excelExporter.ts` - Excel格式导出逻辑
- `formats/pdfExporter.ts` - PDF格式导出逻辑
- `utils/exportHelpers.ts` - 导出辅助工具函数
- `types.ts` - 导出相关类型定义

### Requirement: UMA子图服务架构
原有的 `umaSubgraphService.ts` 文件将被拆分为：
- `UMASubgraphService.ts` - 核心服务类（约200行）
- `queries/assertions.ts` - 断言查询逻辑
- `queries/disputes.ts` - 争议查询逻辑
- `queries/statistics.ts` - 统计数据查询
- `types.ts` - 类型定义（已存在，可能需要扩展）
- `utils/dataTransformers.ts` - 数据转换工具

### Requirement: 图表渲染组件架构
原有的 `ChartRenderer.tsx` 文件将被拆分为：
- `ChartRenderer.tsx` - 主渲染组件（约200行）
- `components/PieChartRenderer.tsx` - 饼图渲染组件
- `components/LineChartRenderer.tsx` - 折线图渲染组件
- `components/BarChartRenderer.tsx` - 柱状图渲染组件
- `components/ChartLegend.tsx` - 图例组件
- `components/ChartTooltip.tsx` - 提示框组件
- `hooks/useChartData.ts` - 图表数据处理Hook
- `utils/chartUtils.ts` - 图表工具函数

## MODIFIED Requirements
无修改的需求。所有功能保持不变，仅进行代码组织优化。

## REMOVED Requirements
无移除的需求。
