# 统一预言机 Hero 组件改进验收清单

## 基础组件验收

- [x] LiveStatusBar 组件实现完成
  - [x] UTC 时间显示正确（精确到秒）
  - [x] WebSocket 连接状态指示正常
  - [x] 网络延迟显示准确
  - [x] 数据新鲜度指示器工作正常
  - [x] 自动刷新功能正常

- [x] SparklineChart 组件实现完成
  - [x] SVG 路径绘制正确
  - [x] 正趋势显示绿色，负趋势显示红色
  - [x] 面积填充效果正常（可选）
  - [x] 动画效果流畅

- [x] StatCard 组件实现完成
  - [x] 集成 SparklineChart 正常
  - [x] 变化趋势指示正确（箭头+颜色）
  - [x] 悬停效果正常
  - [x] 加载状态显示正确

- [x] MobileSidebar 组件实现完成
  - [x] 滑动动画流畅
  - [x] 自定义标题和内容正常
  - [x] 遮罩层点击关闭功能正常
  - [x] 类型定义导出正确

## Hero 组件重构验收

- [x] API3Hero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

- [x] PythHero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

- [x] BandProtocolHero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

- [x] UMAHero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

- [x] DIAHero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

- [x] TellorHero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

- [x] ChronicleHero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

- [x] RedStoneHero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

- [x] WinklinkHero 重构完成
  - [x] 包含 LiveStatusBar
  - [x] 8 个统计指标卡片完整
  - [x] 每个卡片都有 Sparkline 趋势图
  - [x] 链上实时指标面板正常
  - [x] 网络健康度评分显示正确
  - [x] 多链支持展示完整
  - [x] 快速操作按钮可用
  - [x] 最新动态滚动条正常

## 页面集成验收

- [x] API3 页面使用 MobileSidebar
- [x] Chainlink 页面使用 MobileSidebar
- [x] Pyth 页面使用 MobileSidebar
- [x] Band Protocol 页面使用 MobileSidebar
- [x] UMA 页面使用 MobileSidebar
- [x] DIA 页面使用 MobileSidebar
- [x] Tellor 页面使用 MobileSidebar
- [x] Chronicle 页面使用 MobileSidebar
- [x] RedStone 页面使用 MobileSidebar
- [x] WINkLink 页面使用 MobileSidebar

## View 组件填充验收

- [ ] ChainlinkNodesView 实现完成
- [ ] ChainlinkDataFeedsView 实现完成
- [ ] ChainlinkServicesView 实现完成
- [ ] ChainlinkEcosystemView 实现完成
- [ ] BandProtocolDataFeedsView 实现完成
- [ ] BandProtocolRiskView 实现完成

## 国际化验收

- [ ] 所有标签页键名统一为 tabs 命名空间
- [ ] LiveStatusBar 国际化文本完整
- [ ] StatCard 国际化文本完整
- [ ] Hero 组件国际化文本完整
- [ ] 所有语言版本翻译完整

## 整体质量验收

- [x] 所有页面 Hero 组件风格统一
- [x] 主题色彩应用正确（从 config.themeColor 获取）
- [x] 移动端体验良好
- [x] 暗色模式显示正常
- [x] 无控制台错误
- [x] TypeScript 类型检查通过（新组件无错误）
- [x] ESLint 检查通过
- [x] 构建成功（新组件部分）
