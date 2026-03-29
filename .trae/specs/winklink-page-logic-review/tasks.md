# Tasks

## P0 - 必须修复 (Critical)

- [x] Task 1: 修复 WinklinkDataTable 类型安全问题
  - [x] SubTask 1.1: 定义强类型的 Column 接口，支持泛型
  - [x] SubTask 1.2: 移除 `as unknown as` 双重类型断言
  - [x] SubTask 1.3: 为排序函数添加类型守卫
  - [x] SubTask 1.4: 更新所有使用 DataTable 的组件，确保类型正确

- [x] Task 2: 修复视图组件中的类型断言问题
  - [x] SubTask 2.1: 审查 WinklinkTRONView 中的类型断言
  - [x] SubTask 2.2: 审查 WinklinkGamingView 中的类型断言
  - [x] SubTask 2.3: 审查 WinklinkVRFView 中的类型断言
  - [x] SubTask 2.4: 定义正确的类型接口，移除强制断言

## P1 - 应该修复 (High)

- [x] Task 3: 改进 VRF 验证功能
  - [x] SubTask 3.1: 添加 "演示模式" 标签，明确告知用户这是模拟功能
  - [x] SubTask 3.2: 添加官方验证链接（TRON Scan）
  - [x] SubTask 3.3: 改进错误提示信息

- [x] Task 4: 改进错误处理机制
  - [x] SubTask 4.1: 实现细粒度的错误状态管理
  - [x] SubTask 4.2: 为每个数据源添加独立的加载/错误状态
  - [x] SubTask 4.3: 添加部分数据加载失败时的降级展示
  - [x] SubTask 4.4: 改进 CopyButton 的错误反馈

- [x] Task 5: 实现实时 WIN 价格获取
  - [x] SubTask 5.1: 在 useWinklinkPage hook 中暴露 price 数据
  - [x] SubTask 5.2: 将实时价格传递给 StakingRewardsCalculator
  - [x] SubTask 5.3: 添加价格来源说明（实时/预估）

- [x] Task 6: 统一数据源定义
  - [x] SubTask 6.1: 审查所有数据源相关类型定义
  - [x] SubTask 6.2: 创建统一的数据源状态管理
  - [x] SubTask 6.3: 添加数据源状态指示器

## P2 - 建议修复 (Medium)

- [x] Task 7: 提取共享组件
  - [x] SubTask 7.1: 创建共享的 CopyButton 组件
  - [x] SubTask 7.2: 创建共享的 StatRow 组件
  - [x] SubTask 7.3: 提取状态颜色工具函数到 utils 文件

- [x] Task 8: 优化性能
  - [x] SubTask 8.1: 将静态数据移到组件外部
  - [x] SubTask 8.2: 使用 useMemo 优化对象创建
  - [x] SubTask 8.3: 简化 useMemo 依赖

- [x] Task 9: 完善国际化
  - [x] SubTask 9.1: 检查所有硬编码文本
  - [x] SubTask 9.2: 添加缺失的 i18n 键
  - [x] SubTask 9.3: 更新翻译文件（英文和中文）

- [x] Task 10: 代码清理
  - [x] SubTask 10.1: 定义常量替代魔法数字
  - [x] SubTask 10.2: 创建 constants.ts 文件
  - [x] SubTask 10.3: 更新组件使用常量

# Task Dependencies
- [Task 1] 和 [Task 2] 已完成
- [Task 5] 和 [Task 6] 已完成
- [Task 7] 已完成
- [Task 8] 和 [Task 10] 已完成
