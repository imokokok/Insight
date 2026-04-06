# Tasks

## Phase 1: chartExport.ts拆分 (优先级: 高)
- [x] Task 1: 拆分chartExport.ts (993行)
  - [x] SubTask 1.1: 创建 `types.ts` - 提取导出相关类型定义
  - [x] SubTask 1.2: 创建 `utils/exportHelpers.ts` - 提取导出辅助工具函数
  - [x] SubTask 1.3: 创建 `formats/csvExporter.ts` - 提取CSV格式导出逻辑
  - [x] SubTask 1.4: 创建 `formats/jsonExporter.ts` - 提取JSON格式导出逻辑
  - [x] SubTask 1.5: 创建 `formats/imageExporter.ts` - 提取PNG/SVG图像导出逻辑
  - [x] SubTask 1.6: 创建 `formats/pdfExporter.ts` - 提取PDF格式导出逻辑
  - [x] SubTask 1.7: 创建 `formats/zipExporter.ts` - 提取ZIP格式导出逻辑
  - [x] SubTask 1.8: 重构 `chartExport.ts` - 导入拆分的模块，  - [x] SubTask 1.9: 验证导出功能 - 确保所有导出格式正常工作

## Phase 2: umaSubgraphService.ts拆分 (优先级: 高)
- [x] Task 2: 拆分umaSubgraphService.ts (930行)
  - [x] SubTask 2.1: 创建 `types.ts` - 提取类型定义
  - [x] SubTask 2.2: 重构 `UMASubgraphService.ts` - 导入拆分的模块
  - [x] SubTask 2.3: 验证功能 - 确保UMA集成正常

## Phase 3: ChartRenderer.tsx拆分 (优先级: 高)
- [x] Task 3: 拆分ChartRenderer.tsx (908行)
  - [x] SubTask 3.1: 创建 `utils/chartUtils.ts` - 提取图表工具函数
  - [x] SubTask 3.2: 重构 `ChartRenderer.tsx` - 导入拆分的模块
  - [x] SubTask 3.3: 验证UI渲染 - 确保图表显示正常

## Phase 4: 最终验证
- [x] Task 4: 全面测试和验证
  - [x] SubTask 4.1: 运行TypeScript类型检查 - 确保无类型错误
  - [x] SubTask 4.2: 检查文件行数 - 确保所有文件不超过300行
  - [x] SubTask 4.3: 验证功能完整性 - 确保所有功能正常工作
  - [x] SubTask 4.4: 代码质量检查 - 确保符合代码规范

# Task Dependencies
- Task 1, 2, 3 可以并行执行
- Task 4 依赖所有前置任务完成

# 预期成果
- 所有拆分后的文件不超过300行
- 每个文件职责单一，易于理解和维护
- 保持原有功能和API不变
- 提高代码的可测试性和可复用性
