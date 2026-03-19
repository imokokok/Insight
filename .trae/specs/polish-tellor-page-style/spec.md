# Tellor 页面样式优化 Spec

## 评估总结

Tellor 页面整体实现良好，遵循了 Dune 风格的扁平化设计语言。页面结构清晰，功能完整，包含市场数据、网络状态、Reporter、争议解决、质押计算等多个模块。

## 当前存在的问题

### 1. StatCard 样式不一致
- **位置**: `src/app/[locale]/tellor/page.tsx` 第 188-191 行
- **问题**: StatCard 组件调用时缺少 `isFirst` prop，导致第一个卡片没有左边框分隔线，与其他预言机页面（如 Chainlink）不一致
- **影响**: 视觉一致性受损

### 2. 颜色使用不统一
- **位置**: `src/components/oracle/panels/TellorReportersPanel.tsx`
- **问题**: 
  - 使用了 `text-cyan-600` 作为主题色，但 Tellor 配置中 themeColor 为 'cyan'
  - 部分绿色使用 `text-green-600`，部分使用自定义色
- **影响**: 品牌色彩一致性不足

### 3. 间距和视觉层次可优化
- **位置**: 各 Panel 组件
- **问题**: 
  - 部分卡片内边距不一致
  - 统计数据展示区域间距可以更加统一
- **影响**: 视觉节奏感不够流畅

## 优化建议

### 改动 1: 修复 StatCard 样式
- 为 StatCard 添加 `isFirst` prop 以保持一致性
- 参考 Chainlink 页面的实现方式

### 改动 2: 统一颜色使用
- 将硬编码的颜色值替换为基于 themeColor 的动态类
- 统一使用 Tailwind 的标准色值

### 改动 3: 优化间距和视觉层次
- 统一 DashboardCard 的内边距
- 优化统计数据网格的间距
- 调整表格行的悬停效果

### 改动 4: 增强数据可视化
- 为 Reporter 排名添加更明显的视觉区分（前3名）
- 优化进度条的颜色逻辑（低风险=绿色，高风险=红色）

## 影响范围
- `src/app/[locale]/tellor/page.tsx`
- `src/components/oracle/panels/TellorReportersPanel.tsx`
- `src/components/oracle/panels/TellorRiskPanel.tsx`
- `src/components/oracle/panels/TellorDisputesPanel.tsx`

## 设计原则
1. **保持 Dune 风格**: 扁平化设计、无圆角、细边框
2. **适度优化**: 不做过度设计，保持简洁专业
3. **一致性优先**: 与其他预言机页面保持视觉统一
