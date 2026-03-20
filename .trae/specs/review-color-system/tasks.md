# 颜色系统改进任务

## 高优先级

- [ ] **Task 1: 修复 shadowColors 占位符问题**
  - [ ] 分析 shadowColors 的使用场景
  - [ ] 填充实际的阴影颜色值，或移除未使用的配置
  - [ ] 更新使用 shadowColors 的代码

- [ ] **Task 2: 统一 marketOverview 命名规范**
  - [ ] 将 `band` 改为 `bandProtocol` 或 `band-protocol`
  - [ ] 检查并更新所有引用该颜色的组件
  - [ ] 确保命名与 oracle 对象中的键名一致

## 中优先级

- [ ] **Task 3: 添加类型接口定义**
  - [ ] 为 ColorScale 添加类型接口（50-900 色阶）
  - [ ] 为 SemanticColor 添加类型接口
  - [ ] 为渐变和图表颜色添加类型定义
  - [ ] 验证类型定义的正确性

- [ ] **Task 4: 完善 JSDoc 注释**
  - [ ] 为 `getColorblindHeatmapColor` 添加详细参数说明
  - [ ] 为 `getColorblindCorrelationColor` 添加算法说明
  - [ ] 为 `getColorblindDiffColor` 添加使用示例
  - [ ] 检查所有工具函数的注释完整性

## 低优先级

- [ ] **Task 5: 添加单元测试**
  - [ ] 创建 `colors.test.ts` 测试文件
  - [ ] 测试 `getContrastTextColor` 的各种输入
  - [ ] 测试 `getColorblindCorrelationColor` 的颜色计算
  - [ ] 测试 `needsDarkText` 的边界情况

- [ ] **Task 6: 优化 colorblindHeatmapGradient**
  - [ ] 审查颜色来源的一致性
  - [ ] 考虑统一从单一颜色源构建
  - [ ] 添加设计意图的注释说明

- [ ] **Task 7: 考虑深色模式支持**
  - [ ] 评估项目是否需要深色模式
  - [ ] 设计深色模式配色方案
  - [ ] 实现深色模式颜色配置

## 可选优化

- [ ] **Task 8: 代码清理**
  - [ ] 运行代码覆盖率分析
  - [ ] 识别并移除未使用的颜色导出
  - [ ] 优化导入/导出结构

# Task Dependencies
- Task 2 依赖 Task 1（如果 shadowColors 在 marketOverview 中使用）
- Task 5 建议在 Task 3 完成后进行（类型定义有助于测试）
