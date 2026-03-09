# API3 页面重构 - 实现任务列表

## [x] 任务 1: 创建目录结构和基础布局框架
- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 创建 `src/app/api3/components/` 目录
  - 重构 `src/app/api3/page.tsx`，采用 Chainlink 页面的标签页架构
  - 实现 PageHeader 组件（Logo、标题、时间范围选择器、刷新/导出按钮）
  - 实现 TabNavigation 组件（5个标签页：market、network、airnodes、ecosystem、risk）
  - 设计主内容区域的布局系统
- **Acceptance Criteria**: 
  - 目录结构正确创建
  - 页面布局符合 Chainlink 风格的专业仪表板设计
  - 标签页切换正常工作
  - 响应式适配桌面/平板/移动端

## [x] 任务 2: 实现 MarketDataPanel 组件
- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 创建 `src/app/api3/components/MarketDataPanel.tsx`
  - 实现 API3 代币实时价格大字体显示（带价格变动动画）
  - 实现 24h 涨跌幅指示器（带颜色编码和趋势箭头）
  - 添加市场数据指标网格：市值、交易量（24h）、流通供应量、完全稀释估值、市值排名、供应比例
  - 实现价格变动时的视觉动画效果（绿色/红色闪烁）
  - 添加数据最后更新时间戳
  - 使用 API3Client 获取实时价格数据
- **Acceptance Criteria**: 
  - 所有市场数据正确显示
  - 价格更新时有视觉反馈（颜色变化/动画）
  - 数据精度符合金融标准（价格2位小数，大数字使用K/M/B缩写）
  - 组件支持响应式布局

## [x] 任务 3: 实现 PriceChart 组件
- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 创建 `src/app/api3/components/PriceChart.tsx`
  - 使用 Recharts 创建专业级价格走势图
  - 支持时间周期切换（1H/24H/7D/30D/90D/1Y/ALL）
  - 实现图表交互：数据提示框、十字光标
  - 添加渐变填充效果
  - 使用 API3Client 获取历史价格数据
- **Acceptance Criteria**: 
  - 图表渲染正常，无性能问题
  - 时间周期切换时数据正确更新
  - 提示框样式美观，信息完整
  - 支持响应式重绘

## [x] 任务 4: 实现 NetworkHealthPanel 组件
- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 创建 `src/app/api3/components/NetworkHealthPanel.tsx`
  - 实现网络状态指示器（在线/警告/离线）
  - 实现关键指标卡片：活跃 Airnode 数量、节点在线率、平均响应时间、dAPI 更新频率、API3 质押总量
  - 添加网络活动热力图（24小时数据请求分布，12列 x 2行 网格）
  - 实现数据新鲜度指示器（最后更新时间、数据延迟状态：优秀/良好/缓慢）
  - 使用模拟数据（参考 Chainlink 的 mockNetworkData 模式）
- **Acceptance Criteria**: 
  - 网络指标正确显示
  - 状态指示器颜色正确（绿色-在线，黄色-警告，红色-离线）
  - 热力图正确显示24小时分布
  - 数据每30秒自动更新

## [x] 任务 5: 实现 FirstPartyOraclePanel 组件
- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 创建 `src/app/api3/components/FirstPartyOraclePanel.tsx`
  - 实现 Airnode 部署统计：
    - 活跃 Airnode 数量及地理分布（饼图或地图）
    - 按区块链网络的 Airnode 分布（Ethereum、Arbitrum、Polygon）
    - API 提供商类型分布（交易所、传统金融、其他）
  - 实现 dAPI 覆盖分析：
    - 活跃的 dAPI 数量
    - 按资产类型分布（加密货币、外汇、商品、股票）
    - dAPI 更新频率统计
  - 实现第一方优势指标卡片：
    - 中间商消除
    - 数据源透明度
    - 响应时间对比
- **Acceptance Criteria**: 
  - 所有图表正确渲染
  - 数据展示符合 API3 第一方预言机特性
  - 响应式布局正常

## [x] 任务 6: 实现 QuantifiableSecurityPanel 组件
- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 创建 `src/app/api3/components/QuantifiableSecurityPanel.tsx`
  - 实现整体安全评分组件（0-100分，带评级标签）
  - 实现各维度子评分：去中心化程度、数据完整性、抗操纵性、经济安全性
  - 实现保险池状态面板：保险池总锁仓价值、保险覆盖率、历史赔付记录
  - 实现质押安全分析：总质押 API3 数量、质押年化收益率、质押者数量分布
  - 使用仪表盘或雷达图展示安全评分
- **Acceptance Criteria**: 
  - 安全评分可视化清晰
  - 各维度评分合理展示
  - 保险池和质押数据正确显示
  - 组件具有 API3 品牌特色

## [x] 任务 7: 实现 EcosystemPanel 组件
- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 创建 `src/app/api3/components/EcosystemPanel.tsx`
  - 实现 DeFi 协议集成列表（使用 dAPI 的主要协议）
  - 实现区块链覆盖展示（API3 支持的链）
  - 实现数据源提供商展示（主要 API 合作伙伴）
  - 添加生态统计卡片：集成协议数、支持区块链数、活跃 dAPI 数
- **Acceptance Criteria**: 
  - 生态数据完整展示
  - 协议列表包含主要集成方
  - 区块链覆盖清晰展示

## [x] 任务 8: 实现 RiskAssessmentPanel 组件
- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 创建 `src/app/api3/components/RiskAssessmentPanel.tsx`
  - 实现 API3 特定风险评估：
    - 第一方数据源风险（API 提供商集中风险）
    - 智能合约风险
    - 质押 slash 风险
  - 实现风险评分组件（低/中/高风险等级，带颜色编码）
  - 实现风险缓解措施面板：
    - 保险池机制
    - 去中心化治理
    - 多数据源聚合
  - 添加风险指标表格
- **Acceptance Criteria**: 
  - 风险评估逻辑合理
  - 风险等级颜色编码正确（绿色-低，黄色-中，红色-高）
  - 缓解措施清晰展示

## [x] 任务 9: 扩展 API3Client
- **Priority**: P1
- **Depends On**: None
- **Description**:
  - 扩展 `src/lib/oracles/api3.ts`
  - 添加获取 Airnode 网络统计的方法
  - 添加获取 dAPI 覆盖数据的方法
  - 添加获取质押和保险池数据的方法
  - 使用模拟数据生成器（参考 BaseOracleClient 的模式）
- **Acceptance Criteria**: 
  - 所有新方法正确返回模拟数据
  - 数据类型定义完整
  - 错误处理完善

## [x] 任务 10: 更新国际化翻译文件
- **Priority**: P1
- **Depends On**: 任务 2-8
- **Description**:
  - 更新 `src/i18n/en.json` 添加所有新模块的翻译键
  - 更新 `src/i18n/zh-CN.json` 添加对应的中文翻译
  - 添加 api3.menu.* 标签页翻译
  - 添加各 Panel 的专业术语翻译
  - 确保所有图表标签、表格列名、按钮文本支持国际化
- **Acceptance Criteria**: 
  - 中英文切换时所有文本正确显示
  - 翻译键命名规范一致
  - 无遗漏的硬编码文本

## [x] 任务 11: 响应式优化和性能调优
- **Priority**: P1
- **Depends On**: 任务 2-10
- **Description**:
  - 优化移动端布局（单列堆叠、触摸友好的交互）
  - 实现数据懒加载（针对长列表）
  - 添加图表响应式重绘
  - 优化首屏加载速度（代码分割、数据预取）
  - 确保所有动画性能流畅
- **Acceptance Criteria**: 
  - 移动端体验流畅
  - 首屏加载时间 < 3秒
  - 无明显的布局偏移

## [x] 任务 12: 代码质量检查和测试
- **Priority**: P1
- **Depends On**: 任务 1-11
- **Description**:
  - 运行 TypeScript 类型检查
  - 运行 ESLint 代码检查
  - 手动测试所有交互功能（标签切换、时间范围选择、刷新、导出）
  - 验证数据准确性
  - 检查响应式布局在各设备上的表现
- **Acceptance Criteria**: 
  - 无类型错误
  - 无 ESLint 警告
  - 所有功能正常
  - 页面与 Chainlink 页面风格一致

# 任务依赖关系
```
任务 1 (基础布局)
    ├── 任务 2 (MarketDataPanel)
    ├── 任务 3 (PriceChart)
    ├── 任务 4 (NetworkHealthPanel)
    ├── 任务 5 (FirstPartyOraclePanel)
    ├── 任务 6 (QuantifiableSecurityPanel)
    ├── 任务 7 (EcosystemPanel)
    └── 任务 8 (RiskAssessmentPanel)

任务 9 (API3Client 扩展) - 独立于 UI 任务

任务 10 (国际化) 依赖于 任务 2-8
任务 11 (响应式优化) 依赖于 任务 2-10
任务 12 (代码检查) 依赖于 任务 1-11
```

# 文件结构规划
```
src/app/api3/
├── page.tsx                          # 主页面（重构后）
├── components/
│   ├── MarketDataPanel.tsx           # 市场数据面板
│   ├── PriceChart.tsx                # 价格图表
│   ├── NetworkHealthPanel.tsx        # 网络健康度面板
│   ├── FirstPartyOraclePanel.tsx     # 第一方预言机分析面板
│   ├── QuantifiableSecurityPanel.tsx # 可量化安全面板
│   ├── EcosystemPanel.tsx            # dAPI 生态面板
│   └── RiskAssessmentPanel.tsx       # 风险评估面板

src/lib/oracles/
├── api3.ts                           # 扩展后的 API3Client
```
