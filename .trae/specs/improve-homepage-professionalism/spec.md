# 首页专业度提升规格文档

## Why
作为专业预言机数据分析平台，首页是用户的第一印象。当前首页存在一些视觉设计和用户体验上的不足，需要通过专业的设计改进来提升平台的专业形象和可信度。

## What Changes
- **视觉层次优化**: 改进 Hero 区域的视觉层次，增强信息架构清晰度
- **色彩系统统一**: 规范色彩使用，建立更专业的金融数据平台视觉语言
- **动效优化**: 减少过度动画，提升页面性能和专业感
- **排版改进**: 优化字体大小、行高和间距，提升可读性
- **组件一致性**: 统一卡片、按钮等组件的圆角、阴影和边框样式
- **数据可视化优化**: 改进图表展示方式，增强数据可信度

## Impact
- Affected specs: 首页视觉设计、用户体验、品牌形象
- Affected code: 
  - `/src/app/[locale]/page.tsx`
  - `/src/app/[locale]/home-components/ProfessionalHero.tsx`
  - `/src/app/[locale]/home-components/BentoMetricsGrid.tsx`
  - `/src/app/[locale]/home-components/LivePriceTicker.tsx`
  - `/src/app/[locale]/home-components/OracleMarketOverview.tsx`
  - `/src/app/[locale]/home-components/ProfessionalCTA.tsx`
  - `/src/app/[locale]/home-components/HeroBackground.tsx`
  - `/src/app/globals.css`

## ADDED Requirements

### Requirement 1: Hero 区域专业度提升

#### Scenario: 首屏展示
- **WHEN** 用户访问首页
- **THEN** 看到清晰的信息层次：品牌标识 → 核心价值主张 → 搜索入口 → 关键指标

#### 具体改进点：
1. **背景优化**
   - 当前渐变光晕动画过于花哨，建议简化为静态或微动效
   - 网格背景线条应更细腻，降低透明度至 0.03-0.05
   - 移除噪点纹理叠加，保持界面干净

2. **标题排版**
   - 主标题字体过大（3xl-6xl），建议调整为 2xl-5xl
   - 行高应适当增加（leading-tight → leading-snug）
   - 副标题颜色对比度不足，建议使用 gray-700 而非 gray-600

3. **搜索框**
   - 圆角过大（rounded-2xl），建议改为 rounded-lg 或 rounded-xl
   - 聚焦时的缩放动效（scale-[1.02]）过于突兀，建议移除或改为边框颜色变化
   - 阴影效果应更克制，使用更柔和的阴影值

4. **实时徽章**
   - 当前设计过于复杂（多元素组合），建议简化为简洁的 Live 指示器
   - 脉冲动画频率应降低，避免视觉干扰

### Requirement 2: 指标卡片专业度提升

#### Scenario: 数据展示
- **WHEN** 用户浏览核心指标
- **THEN** 看到清晰、易读、专业的数据卡片

#### 具体改进点：
1. **卡片样式统一**
   - 当前卡片边框为直角（无圆角），与搜索框等其他组件不一致
   - 建议统一使用 rounded-lg 圆角
   - 边框颜色应更淡（gray-200 → gray-100）

2. **图表优化**
   - 迷你图表高度应适当增加（h-14 → h-16）
   - 渐变填充透明度应降低（0.2 → 0.1）
   - 移除图表动画，改为静态展示，提升专业感

3. **数据标签**
   - 涨跌幅标签样式应更简洁，移除边框
   - 趋势图标（TrendingUp/Down）尺寸应统一

### Requirement 3: 实时价格滚动条优化

#### Scenario: 价格展示
- **WHEN** 用户查看实时价格
- **THEN** 看到流畅但不干扰的价格滚动

#### 具体改进点：
1. **滚动速度**
   - 当前 35s 循环一次过慢，建议调整为 25-28s
   - 鼠标悬停暂停功能保留

2. **卡片样式**
   - 价格卡片应使用更细的边框
   - 代币图标占位符应使用实际图标而非文字截取
   - 涨跌幅颜色应遵循金融行业标准（绿涨红跌或反之）

3. **布局优化**
   - 左右渐变遮罩应更宽（w-20 → w-24），过渡更自然

### Requirement 4: Bento 网格专业度提升

#### Scenario: 平台指标展示
- **WHEN** 用户浏览平台核心指标
- **THEN** 看到整洁、专业的数据网格

#### 具体改进点：
1. **网格布局**
   - 当前卡片大小不一导致视觉混乱
   - 建议统一使用等大小卡片，或采用更规律的布局模式

2. **Live 指示器**
   - 当前位置（右上角）会遮挡内容
   - 建议移至标题行右侧或卡片底部

3. **图表样式**
   - 面积图渐变应更柔和
   - 坐标轴和网格线应更淡（gray-300 → gray-100）

4. **信息密度**
   - 当前卡片信息过多，建议精简
   - 描述文字可通过 Tooltip 展示，减少视觉负担

### Requirement 5: 市场概览图表优化

#### Scenario: 数据分析
- **WHEN** 用户查看市场概览
- **THEN** 看到清晰、专业的数据可视化

#### 具体改进点：
1. **饼图优化**
   - 标签文字应使用更细的字体（font-medium → font-normal）
   - 百分比标签位置应更精确，避免重叠
   - 选中状态的高亮效果应更 subtle

2. **折线图优化**
   - 线条粗细应统一（当前有 3px 和 2px 混用）
   - 数据点（dot）应在悬停时才显示
   - 图例应清晰可点击

3. **柱状图优化**
   - 柱子宽度应适当
   - 颜色应遵循品牌色系

4. **时间选择器**
   - 当前按钮样式不够突出
   - 建议增加选中状态的视觉权重

### Requirement 6: CTA 区域优化

#### Scenario: 行动号召
- **WHEN** 用户浏览到页面底部
- **THEN** 看到引人注目的但不过分夸张的行动号召

#### 具体改进点：
1. **背景处理**
   - 当前纯深灰背景过于单调
   - 建议添加微妙的渐变或纹理

2. **按钮样式**
   - 当前按钮 hover 效果（scale-105）过于突兀
   - 建议改为颜色加深或轻微阴影

3. **文案层次**
   - 标题、描述、按钮的间距应更合理
   - 建议使用 mb-6 → mb-8 增加呼吸感

### Requirement 7: 全局样式统一

#### Scenario: 整体设计
- **WHEN** 用户浏览整个首页
- **THEN** 感受到一致的设计语言

#### 具体改进点：
1. **圆角统一**
   - 所有卡片：rounded-lg
   - 所有按钮：rounded-md 或 rounded-lg
   - 所有输入框：rounded-lg
   - 所有标签/徽章：rounded-full

2. **阴影统一**
   - 卡片默认：shadow-sm
   - 卡片悬停：shadow-md
   - 弹窗/下拉：shadow-lg
   - 避免使用 colored shadow（如 shadow-emerald-500/10）

3. **间距统一**
   - 区块间距：py-16 → py-20（增加呼吸感）
   - 卡片内边距：p-5 → p-6
   - 组件间距：gap-4 → gap-6

4. **边框统一**
   - 所有边框颜色：gray-200（比当前更淡）
   - 悬停边框：gray-300

5. **字体统一**
   - 标题：font-semibold 或 font-bold
   - 正文：font-normal
   - 数据/数字：font-tabular-nums（等宽数字）

## MODIFIED Requirements

### Requirement: 性能优化

#### Scenario: 页面加载
- **WHEN** 用户访问首页
- **THEN** 页面应在 2s 内完成首屏渲染

#### 优化措施：
1. 减少动画复杂度，优先使用 CSS 动画
2. 图表组件延迟加载（已部分实现）
3. 图片资源优化（使用 WebP 格式）

### Requirement: 响应式优化

#### Scenario: 多设备访问
- **WHEN** 用户在不同设备访问
- **THEN** 页面应自适应展示

#### 优化措施：
1. 移动端字体大小应适当缩小
2. 卡片布局在平板端应调整为 2 列
3. 搜索框在移动端应全宽显示

## REMOVED Requirements

### Requirement: 过度动画效果
**Reason**: 过度动画会降低专业感并影响性能
**Migration**: 
- 移除所有 scale transform 动画
- 简化脉冲动画
- 使用 opacity 和 color transition 替代复杂动画
