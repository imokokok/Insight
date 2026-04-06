# 拆分超大文件检查清单（第二批）

## Phase 1: chartExport.ts拆分
- [ ] `types.ts` 已创建，包含导出相关类型定义
- [ ] `utils/exportHelpers.ts` 已创建，包含导出辅助工具函数
- [ ] `formats/csvExporter.ts` 已创建，包含CSV导出逻辑
- [ ] `formats/jsonExporter.ts` 已创建，包含JSON导出逻辑
- [ ] `formats/imageExporter.ts` 已创建，包含PNG/SVG导出逻辑
- [ ] `formats/excelExporter.ts` 已创建，包含Excel导出逻辑
- [ ] `formats/pdfExporter.ts` 已创建，包含PDF导出逻辑
- [ ] `chartExport.ts` 已重构，文件行数不超过300行
- [ ] 所有导出格式功能正常工作
- [ ] TypeScript类型检查通过

## Phase 2: umaSubgraphService.ts拆分
- [ ] `types.ts` 已扩展，包含所有必要的类型定义
- [ ] `utils/dataTransformers.ts` 已创建，包含数据转换工具
- [ ] `queries/assertions.ts` 已创建，包含断言查询逻辑
- [ ] `queries/disputes.ts` 已创建，包含争议查询逻辑
- [ ] `queries/statistics.ts` 已创建，包含统计数据查询
- [ ] `UMASubgraphService.ts` 已重构，文件行数不超过300行
- [ ] UMA集成功能正常工作
- [ ] TypeScript类型检查通过

## Phase 3: ChartRenderer.tsx拆分
- [ ] `utils/chartUtils.ts` 已创建，包含图表工具函数
- [ ] `hooks/useChartData.ts` 已创建，包含图表数据处理Hook
- [ ] `components/ChartLegend.tsx` 已创建
- [ ] `components/ChartTooltip.tsx` 已创建
- [ ] `components/PieChartRenderer.tsx` 已创建
- [ ] `components/LineChartRenderer.tsx` 已创建
- [ ] `components/BarChartRenderer.tsx` 已创建
- [ ] `ChartRenderer.tsx` 已重构，文件行数不超过300行
- [ ] 图表UI渲染正常，无视觉差异
- [ ] TypeScript类型检查通过

## Phase 4: 最终验证
- [ ] 所有拆分后的文件不超过300行
- [ ] TypeScript编译无错误
- [ ] ESLint检查通过
- [ ] 所有功能正常工作
- [ ] 无循环依赖
- [ ] 导入路径正确且清晰
- [ ] 代码注释和文档已更新

## 代码质量检查
- [ ] 每个文件职责单一，符合单一职责原则
- [ ] 相关代码内聚性良好
- [ ] 没有过度拆分，避免文件碎片化
- [ ] 模块边界清晰
- [ ] 依赖关系明确且合理
- [ ] 代码可读性提高
- [ ] 代码可维护性提高
- [ ] 代码可测试性提高

## 文档和注释
- [ ] 新创建的文件有适当的文件头注释
- [ ] 复杂逻辑有清晰的注释说明
- [ ] 导出的函数和类型有JSDoc注释
