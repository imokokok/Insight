# 统一预言机 Hero 组件改进任务清单

## 阶段 1: 基础组件开发

- [x] Task 1: 创建 LiveStatusBar 实时状态栏组件
  - [x] SubTask 1.1: 创建组件文件 src/components/ui/LiveStatusBar.tsx
  - [x] SubTask 1.2: 实现 UTC 时间显示（精确到秒）
  - [x] SubTask 1.3: 实现 WebSocket 连接状态指示
  - [x] SubTask 1.4: 实现网络延迟显示
  - [x] SubTask 1.5: 实现数据新鲜度指示器
  - [x] SubTask 1.6: 添加自动刷新功能

- [x] Task 2: 创建 SparklineChart 迷你趋势图组件
  - [x] SubTask 2.1: 创建组件文件 src/components/charts/SparklineChart.tsx
  - [x] SubTask 2.2: 实现 SVG 路径绘制
  - [x] SubTask 2.3: 支持正负趋势颜色区分
  - [x] SubTask 2.4: 支持可选的面积填充
  - [x] SubTask 2.5: 添加动画效果

- [x] Task 3: 创建 StatCard 增强统计卡片组件
  - [x] SubTask 3.1: 创建组件文件 src/components/ui/StatCard.tsx
  - [x] SubTask 3.2: 集成 SparklineChart
  - [x] SubTask 3.3: 实现变化趋势指示（箭头+颜色）
  - [x] SubTask 3.4: 添加悬停效果
  - [x] SubTask 3.5: 支持加载状态

- [x] Task 4: 创建 MobileSidebar 通用移动端侧边栏组件
  - [x] SubTask 4.1: 创建组件文件 src/components/ui/MobileSidebar.tsx
  - [x] SubTask 4.2: 实现滑动动画
  - [x] SubTask 4.3: 支持自定义标题和内容
  - [x] SubTask 4.4: 添加遮罩层点击关闭
  - [x] SubTask 4.5: 导出类型定义

## 阶段 2: Hero 组件重构

- [x] Task 5: 重构 API3Hero 组件
  - [x] SubTask 5.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 5.2: 添加 LiveStatusBar
  - [x] SubTask 5.3: 实现 8 个统计指标卡片
  - [x] SubTask 5.4: 添加链上实时指标面板
  - [x] SubTask 5.5: 添加网络健康度评分
  - [x] SubTask 5.6: 添加多链支持展示
  - [x] SubTask 5.7: 添加快速操作按钮
  - [x] SubTask 5.8: 添加最新动态滚动条

- [x] Task 6: 重构 PythHero 组件
  - [x] SubTask 6.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 6.2: 添加 LiveStatusBar
  - [x] SubTask 6.3: 实现 8 个统计指标卡片
  - [x] SubTask 6.4: 添加链上实时指标面板
  - [x] SubTask 6.5: 添加网络健康度评分
  - [x] SubTask 6.6: 添加多链支持展示
  - [x] SubTask 6.7: 添加快速操作按钮
  - [x] SubTask 6.8: 添加最新动态滚动条

- [x] Task 7: 重构 BandProtocolHero 组件
  - [x] SubTask 7.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 7.2: 添加 LiveStatusBar
  - [x] SubTask 7.3: 实现 8 个统计指标卡片
  - [x] SubTask 7.4: 添加链上实时指标面板
  - [x] SubTask 7.5: 添加网络健康度评分
  - [x] SubTask 7.6: 添加多链支持展示
  - [x] SubTask 7.7: 添加快速操作按钮
  - [x] SubTask 7.8: 添加最新动态滚动条

- [x] Task 8: 重构 UMAHero 组件
  - [x] SubTask 8.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 8.2: 添加 LiveStatusBar
  - [x] SubTask 8.3: 实现 8 个统计指标卡片
  - [x] SubTask 8.4: 添加链上实时指标面板
  - [x] SubTask 8.5: 添加网络健康度评分
  - [x] SubTask 8.6: 添加多链支持展示
  - [x] SubTask 8.7: 添加快速操作按钮
  - [x] SubTask 8.8: 添加最新动态滚动条

- [x] Task 9: 重构 DIAHero 组件
  - [x] SubTask 9.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 9.2: 添加 LiveStatusBar
  - [x] SubTask 9.3: 实现 8 个统计指标卡片
  - [x] SubTask 9.4: 添加链上实时指标面板
  - [x] SubTask 9.5: 添加网络健康度评分
  - [x] SubTask 9.6: 添加多链支持展示
  - [x] SubTask 9.7: 添加快速操作按钮
  - [x] SubTask 9.8: 添加最新动态滚动条

- [x] Task 10: 重构 TellorHero 组件
  - [x] SubTask 10.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 10.2: 添加 LiveStatusBar
  - [x] SubTask 10.3: 实现 8 个统计指标卡片
  - [x] SubTask 10.4: 添加链上实时指标面板
  - [x] SubTask 10.5: 添加网络健康度评分
  - [x] SubTask 10.6: 添加多链支持展示
  - [x] SubTask 10.7: 添加快速操作按钮
  - [x] SubTask 10.8: 添加最新动态滚动条

- [x] Task 11: 重构 ChronicleHero 组件
  - [x] SubTask 11.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 11.2: 添加 LiveStatusBar
  - [x] SubTask 11.3: 实现 8 个统计指标卡片
  - [x] SubTask 11.4: 添加链上实时指标面板
  - [x] SubTask 11.5: 添加网络健康度评分
  - [x] SubTask 11.6: 添加多链支持展示
  - [x] SubTask 11.7: 添加快速操作按钮
  - [x] SubTask 11.8: 添加最新动态滚动条

- [x] Task 12: 重构 RedStoneHero 组件
  - [x] SubTask 12.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 12.2: 添加 LiveStatusBar
  - [x] SubTask 12.3: 实现 8 个统计指标卡片
  - [x] SubTask 12.4: 添加链上实时指标面板
  - [x] SubTask 12.5: 添加网络健康度评分
  - [x] SubTask 12.6: 添加多链支持展示
  - [x] SubTask 12.7: 添加快速操作按钮
  - [x] SubTask 12.8: 添加最新动态滚动条

- [x] Task 13: 重构 WinklinkHero 组件
  - [x] SubTask 13.1: 参考 ChainlinkHero 结构重写
  - [x] SubTask 13.2: 添加 LiveStatusBar
  - [x] SubTask 13.3: 实现 8 个统计指标卡片
  - [x] SubTask 13.4: 添加链上实时指标面板
  - [x] SubTask 13.5: 添加网络健康度评分
  - [x] SubTask 13.6: 添加多链支持展示
  - [x] SubTask 13.7: 添加快速操作按钮
  - [x] SubTask 13.8: 添加最新动态滚动条

## 阶段 3: 页面集成优化

- [x] Task 14: 更新 API3 页面使用 MobileSidebar
  - [x] SubTask 14.1: 替换内联移动端菜单代码
  - [x] SubTask 14.2: 验证移动端功能正常

- [x] Task 15: 更新 Chainlink 页面使用 MobileSidebar
  - [x] SubTask 15.1: 替换内联移动端菜单代码
  - [x] SubTask 15.2: 验证移动端功能正常

- [x] Task 16: 更新 Pyth 页面使用 MobileSidebar
  - [x] SubTask 16.1: 替换内联移动端菜单代码
  - [x] SubTask 16.2: 验证移动端功能正常

- [x] Task 17: 更新 Band Protocol 页面使用 MobileSidebar
  - [x] SubTask 17.1: 替换内联移动端菜单代码
  - [x] SubTask 17.2: 验证移动端功能正常

- [x] Task 18: 更新 UMA 页面使用 MobileSidebar
  - [x] SubTask 18.1: 替换内联移动端菜单代码
  - [x] SubTask 18.2: 验证移动端功能正常

- [x] Task 19: 更新 DIA 页面使用 MobileSidebar
  - [x] SubTask 19.1: 替换内联移动端菜单代码
  - [x] SubTask 19.2: 验证移动端功能正常

- [x] Task 20: 更新 Tellor 页面使用 MobileSidebar
  - [x] SubTask 20.1: 替换内联移动端菜单代码
  - [x] SubTask 20.2: 验证移动端功能正常

- [x] Task 21: 更新 Chronicle 页面使用 MobileSidebar
  - [x] SubTask 21.1: 替换内联移动端菜单代码
  - [x] SubTask 21.2: 验证移动端功能正常

- [x] Task 22: 更新 RedStone 页面使用 MobileSidebar
  - [x] SubTask 22.1: 替换内联移动端菜单代码
  - [x] SubTask 22.2: 验证移动端功能正常

- [x] Task 23: 更新 WINkLink 页面使用 MobileSidebar
  - [x] SubTask 23.1: 替换内联移动端菜单代码
  - [x] SubTask 23.2: 验证移动端功能正常

## 阶段 4: View 组件填充

- [ ] Task 24: 实现 ChainlinkNodesView 组件
  - [ ] SubTask 24.1: 创建组件结构
  - [ ] SubTask 24.2: 添加节点列表展示
  - [ ] SubTask 24.3: 添加节点统计信息

- [ ] Task 25: 实现 ChainlinkDataFeedsView 组件
  - [ ] SubTask 25.1: 创建组件结构
  - [ ] SubTask 25.2: 添加数据喂价列表
  - [ ] SubTask 25.3: 添加喂价统计信息

- [ ] Task 26: 实现 ChainlinkServicesView 组件
  - [ ] SubTask 26.1: 创建组件结构
  - [ ] SubTask 26.2: 添加服务列表展示
  - [ ] SubTask 26.3: 添加服务描述信息

- [ ] Task 27: 实现 ChainlinkEcosystemView 组件
  - [ ] SubTask 27.1: 创建组件结构
  - [ ] SubTask 27.2: 添加生态系统概览
  - [ ] SubTask 27.3: 添加合作伙伴展示

- [ ] Task 28: 实现 BandProtocolDataFeedsView 组件
  - [ ] SubTask 28.1: 创建组件结构
  - [ ] SubTask 28.2: 添加数据喂价列表
  - [ ] SubTask 28.3: 添加喂价统计信息

- [ ] Task 29: 实现 BandProtocolRiskView 组件
  - [ ] SubTask 29.1: 创建组件结构
  - [ ] SubTask 29.2: 添加风险评估指标
  - [ ] SubTask 29.3: 添加风险图表

## 阶段 5: 国际化更新

- [ ] Task 30: 更新国际化键名统一为 tabs 命名空间
  - [ ] SubTask 30.1: 更新 Chainlink 标签页键名
  - [ ] SubTask 30.2: 更新 Band Protocol 标签页键名
  - [ ] SubTask 30.3: 更新 UMA 标签页键名
  - [ ] SubTask 30.4: 更新 Pyth 标签页键名
  - [ ] SubTask 30.5: 更新 API3 标签页键名
  - [ ] SubTask 30.6: 更新 RedStone 标签页键名
  - [ ] SubTask 30.7: 更新 DIA 标签页键名
  - [ ] SubTask 30.8: 更新 Tellor 标签页键名
  - [ ] SubTask 30.9: 更新 Chronicle 标签页键名
  - [ ] SubTask 30.10: 更新 WINkLink 标签页键名

- [ ] Task 31: 添加新组件的国际化文本
  - [ ] SubTask 31.1: 添加 LiveStatusBar 相关文本
  - [ ] SubTask 31.2: 添加 StatCard 相关文本
  - [ ] SubTask 31.3: 添加 Hero 组件相关文本

# Task Dependencies

- Task 5-13 依赖 Task 1-4（基础组件必须先完成）
- Task 14-23 依赖 Task 4（MobileSidebar）
- Task 24-29 可以并行执行
- Task 30-31 可以在任何阶段执行
