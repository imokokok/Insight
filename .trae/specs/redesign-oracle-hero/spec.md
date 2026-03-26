# 预言机页面 Hero 区域重新设计规范

## Why

当前十个预言机页面的 Hero 区域存在以下设计问题，影响专业度和用户体验：

1. **卡片堆叠过多**：4个核心统计卡片 + 4个次要统计卡片 + 3个信息卡片 = 11个卡片，视觉上过于拥挤
2. **视觉层次混乱**：所有卡片采用相似的样式，缺乏清晰的信息优先级区分
3. **信息密度过高**：用户难以快速捕捉关键指标，页面显得杂乱不专业
4. **缺乏呼吸感**：卡片之间的间距和留白不足，给人压迫感

需要重新设计 Hero 区域，采用更简洁、专业、有层次感的布局。

## What Changes

- **重构 Hero 布局架构**：从"卡片堆叠"改为"分层信息展示"
- **简化统计展示**：核心指标采用更醒目的展示方式，次要指标整合或简化
- **优化视觉层次**：通过字体大小、颜色对比、间距建立清晰的信息层级
- **增加留白和呼吸感**：合理的间距让页面更通透
- **统一十个预言机页面**：所有页面采用新的 Hero 设计

## Impact

- Affected specs: 所有预言机详情页面的 Hero 组件
- Affected code:
  - src/components/oracle/data-display/OracleHero.tsx（基础组件）
  - src/app/[locale]/chainlink/components/ChainlinkHero.tsx
  - src/app/[locale]/pyth/components/PythHero.tsx
  - src/app/[locale]/api3/components/API3Hero.tsx
  - src/app/[locale]/tellor/components/TellorHero.tsx
  - src/app/[locale]/uma/components/UMAHero.tsx
  - src/app/[locale]/band-protocol/components/BandProtocolHero.tsx
  - src/app/[locale]/dia/components/DIAHero.tsx
  - src/app/[locale]/redstone/components/RedStoneHero.tsx
  - src/app/[locale]/chronicle/components/ChronicleHero.tsx
  - src/app/[locale]/