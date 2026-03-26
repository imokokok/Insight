# Tasks

## 阶段一：核心组件优化

- [ ] Task 1: 重构 OracleHero 组件，实现分层统计布局
  - [ ] SubTask 1.1: 创建分层统计卡片组件（核心指标 vs 次要指标）
  - [ ] SubTask 1.2: 添加 Sparkline 趋势图支持
  - [ ] SubTask 1.3: 优化响应式网格布局（lg:4+4, md:2, sm:1）
  - [ ] SubTask 1.4: 确保主题色正确应用

- [ ] Task 2: 统一 Sidebar 设计规范
  - [ ] SubTask 2.1: 创建统一的 Sidebar 基础组件
  - [ ] SubTask 2.2: 将所有 Sidebar 迁移到 Lucide 图标
  - [ ] SubTask 2.3: 统一 Sidebar 激活状态样式
  - [ ] SubTask 2.4: 确保主题色一致性

- [ ] Task 3: 优化移动端菜单按钮
  - [ ] SubTask 3.1: 创建主题化的 MobileMenuButton 组件
  - [ ] SubTask 3.2: 在所有预言机页面应用新按钮
  - [ ] SubTask 3.3: 优化 MobileSidebar 样式

## 阶段二：十个预言机页面统一改造

- [ ] Task 4: Chainlink 页面优化
  - [ ] SubTask 4.1: 更新 ChainlinkHero 使用分层布局
  - [ ] SubTask 4.2: 更新 ChainlinkSidebar 使用 Lucide 图标
  - [ ] SubTask 4.3: 更新移动端菜单按钮

- [ ] Task 5: Pyth 页面优化
  - [ ] SubTask 5.1: 更新 PythHero 使用分层布局
  - [ ] SubTask 5.2: 更新 PythSidebar 使用 Lucide 图标
  - [ ] SubTask 5.3: 更新移动端菜单按钮

- [ ] Task 6: API3 页面优化
  - [ ] SubTask 6.1: 更新 API3Hero 使用分层布局
  - [ ] SubTask 6.2: 更新 API3Sidebar 使用 Lucide 图标
  - [ ] SubTask 6.3: 更新移动端菜单按钮

- [ ] Task 7: Tellor 页面优化
  - [ ] SubTask 7.1: 更新 TellorHero 使用分层布局
  - [ ] SubTask 7.2: 更新 TellorSidebar 使用 Lucide 图标
  - [ ] SubTask 7.3: 更新移动端菜单按钮

- [ ] Task 8: UMA 页面优化
  - [ ] SubTask 8.1: 更新 UMAHero 使用分层布局
  - [ ] SubTask 8.2: 更新 UmaSidebar 使用 Lucide 图标
  - [ ] SubTask 8.3: 更新移动端菜单按钮

- [ ] Task 9: Band Protocol 页面优化
  - [ ] SubTask 9.1: 更新 BandProtocolHero 使用分层布局
  - [ ] SubTask 9.2: 更新 BandProtocolSidebar 使用 Lucide 图标
  - [ ] SubTask 9.3: 更新移动端菜单按钮

- [ ] Task 10: DIA 页面优化
  - [ ] SubTask 10.1: 更新 DIAHero 使用分层布局
  - [ ] SubTask 10.2: 更新 DIASidebar 使用 Lucide 图标
  - [ ] SubTask 10.3: 更新移动端菜单按钮

- [ ] Task 11: RedStone 页面优化
  - [ ] SubTask 11.1: 更新 RedStoneHero 使用分层布局
  - [ ] SubTask 11.2: 更新 RedStoneSidebar 使用 Lucide 图标
  - [ ] SubTask 11.3: 更新移动端菜单按钮

- [ ] Task 12: Chronicle 页面优化
  - [ ] SubTask 12.1: 更新 ChronicleHero 使用分层布局
  - [ ] SubTask 12.2: 更新 ChronicleSidebar 使用 Lucide 图标
  - [ ] SubTask 12.3: 更新移动端菜单按钮

- [ ] Task 13: Winklink 页面优化
  - [ ] SubTask 13.1: 更新 WinklinkHero 使用分层布局
  - [ ] SubTask 13.2: 更新 WinklinkSidebar 使用 Lucide 图标
  - [ ] SubTask 13.3: 更新移动端菜单按钮

## 阶段三：验证与测试

- [ ] Task 14: 响应式测试
  - [ ] SubTask 14.1: 测试桌面端（lg）布局
  - [ ] SubTask 14.2: 测试平板端（md）布局
  - [ ] SubTask 14.3: 测试移动端（sm）布局

- [ ] Task 15: 主题色验证
  - [ ] SubTask 15.1: 验证每个预言机页面的主题色应用
  - [ ] SubTask 15.2: 验证深色模式下的颜色表现

# Task Dependencies

- Task 4-13 依赖于 Task 1-3 完成
- Task 14-15 依赖于 Task 4-13 完成
- 各预言机页面任务（Task 4-13）之间无依赖，可并行执行
