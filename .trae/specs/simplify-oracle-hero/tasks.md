# Tasks

## 阶段一：核心组件重构

- [x] Task 1: 重构 OracleHero 基础组件，实现简化布局
  - [x] SubTask 1.1: 创建新的简化核心统计组件（2-3个大指标，水平布局）
  - [x] SubTask 1.2: 创建整合次要指标行组件（去除卡片背景）
  - [x] SubTask 1.3: 创建紧凑信息区组件（整合链上指标、健康度、多链支持）
  - [x] SubTask 1.4: 更新响应式布局适配

## 阶段二：十个预言机页面改造

- [x] Task 2: Chainlink 页面 Hero 简化
  - [x] SubTask 2.1: 更新 ChainlinkHero 使用新的简化布局
  - [x] SubTask 2.2: 调整统计数据展示方式

- [x] Task 3: Pyth 页面 Hero 简化
  - [x] SubTask 3.1: 更新 PythHero 使用新的简化布局
  - [x] SubTask 3.2: 调整统计数据展示方式

- [x] Task 4: API3 页面 Hero 简化
  - [x] SubTask 4.1: 更新 API3Hero 使用新的简化布局
  - [x] SubTask 4.2: 调整统计数据展示方式

- [x] Task 5: Tellor 页面 Hero 简化
  - [x] SubTask 5.1: 更新 TellorHero 使用新的简化布局
  - [x] SubTask 5.2: 调整统计数据展示方式

- [x] Task 6: UMA 页面 Hero 简化
  - [x] SubTask 6.1: 更新 UMAHero 使用新的简化布局
  - [x] SubTask 6.2: 调整统计数据展示方式

- [x] Task 7: Band Protocol 页面 Hero 简化
  - [x] SubTask 7.1: 更新 BandProtocolHero 使用新的简化布局
  - [x] SubTask 7.2: 调整统计数据展示方式

- [x] Task 8: DIA 页面 Hero 简化
  - [x] SubTask 8.1: 更新 DIAHero 使用新的简化布局
  - [x] SubTask 8.2: 调整统计数据展示方式

- [x] Task 9: RedStone 页面 Hero 简化
  - [x] SubTask 9.1: 更新 RedStoneHero 使用新的简化布局
  - [x] SubTask 9.2: 调整统计数据展示方式

- [x] Task 10: Chronicle 页面 Hero 简化
  - [x] SubTask 10.1: 更新 ChronicleHero 使用新的简化布局
  - [x] SubTask 10.2: 调整统计数据展示方式

- [x] Task 11: Winklink 页面 Hero 简化
  - [x] SubTask 11.1: 更新 WinklinkHero 使用新的简化布局
  - [x] SubTask 11.2: 调整统计数据展示方式

## 阶段三：验证与测试

- [x] Task 12: 响应式测试
  - [x] SubTask 12.1: 测试桌面端（lg）布局
  - [x] SubTask 12.2: 测试平板端（md）布局
  - [x] SubTask 12.3: 测试移动端（sm）布局

- [x] Task 13: 主题色验证
  - [x] SubTask 13.1: 验证每个预言机页面的主题色应用
  - [x] SubTask 13.2: 验证深色模式下的颜色表现

- [x] Task 14: 代码质量检查
  - [x] SubTask 14.1: 运行 TypeScript 类型检查
  - [x] SubTask 14.2: 运行 ESLint 检查

# Task Dependencies

- Task 2-11 依赖于 Task 1 完成
- Task 12-14 依赖于 Task 2-11 完成
- 各预言机页面任务（Task 2-11）之间无依赖，可并行执行
