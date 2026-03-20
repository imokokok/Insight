# Insight UI 完整优化规格

## 概述

继续完成 UI 专业化增强规划中的所有剩余任务（排除深色模式），并将所有优化应用到整个项目中。

## 已完成任务回顾

### P0 - 核心改进 ✅
- 色彩系统升级
- 卡片组件升级
- 按钮组件统一
- 表格样式优化

## 待完成任务

### P1 - 重要改进
1. 排版系统升级
2. 数据可视化配色
3. 导航栏优化
4. 表单组件统一

### P2 - 增强体验
1. 动画系统完善
2. 微交互细节
3. 响应式优化

### P3 - 锦上添花
1. 高级图表组件
2. 状态指示器完善
3. 图标系统规范

## 详细规格

### 1. 排版系统升级

#### 字体配置
```
标题字体: Inter, SF Pro Display, -apple-system, sans-serif
正文字体: Inter, SF Pro Text, -apple-system, sans-serif
数据字体: JetBrains Mono, Fira Code, ui-monospace, monospace
```

#### 字号规范
```
Display: 48px/56px, font-weight: 700
H1: 36px/44px, font-weight: 700
H2: 30px/38px, font-weight: 600
H3: 24px/32px, font-weight: 600
H4: 20px/28px, font-weight: 600
H5: 18px/26px, font-weight: 600
H6: 16px/24px, font-weight: 600
Body Large: 18px/28px
Body: 16px/24px
Body Small: 14px/20px
Caption: 12px/16px
Overline: 11px/16px, uppercase, letter-spacing: 0.05em
```

### 2. 数据可视化配色

#### 图表配色方案
```
Primary: #3b82f6
Secondary: #8b5cf6
Tertiary: #10b981
Quaternary: #f59e0b
Quinary: #ef4444
Senary: #06b6d4
```

#### 图表样式
- Line Chart: 线条宽度 2px, 数据点 4px
- Bar Chart: 圆角 2px, 间距 20%
- Area Chart: 渐变填充, 线条 2px

### 3. 导航栏优化

#### 样式规范
- 高度: 64px
- 背景: white + backdrop-blur
- 边框: 1px solid gray-200
- Logo hover: scale(1.02)
- 导航链接: 默认 gray-600, hover primary-600 + bg-primary-50

### 4. 表单组件统一

#### Input 组件
- 高度: 40px
- 边框: 1px solid gray-300
- 圆角: 6px
- Focus: border-primary-500, ring 2px primary-100
- Error: border-danger-500, bg-danger-50

#### Select 组件
- 同 Input 基础样式
- 下拉箭头图标
- 选项悬停效果

### 5. 动画系统

#### 页面过渡
```
Fade In: opacity 0→1, duration 0.3s
Slide Up: translateY(20px)→0 + opacity, duration 0.4s
```

#### 组件动画
```
Card Hover: translateY(-2px), shadow-lg, duration 0.2s
Button Press: scale(0.98), duration 0.1s
Dropdown: translateY(-8px)→0 + opacity, duration 0.2s
```

### 6. 微交互细节

#### 悬停效果
- 链接: color transition + underline
- 卡片: 轻微上浮 + 阴影增强
- 按钮: 背景色加深 + 轻微放大

#### 焦点状态
- outline: 2px solid primary-500
- outline-offset: 2px

### 7. 响应式优化

#### 断点
```
Mobile: < 640px
Tablet: 640px - 1024px
Desktop: 1024px - 1280px
Large: > 1280px
```

#### 触摸目标
- 最小尺寸: 44px x 44px

### 8. 状态指示器

#### Skeleton
- 背景: linear-gradient shimmer
- 动画: 1.5s infinite

#### Spinner
- 尺寸: 24px (默认), 16px (小), 32px (大)
- 颜色: primary-600
- 动画: rotate 1s linear infinite

#### Empty State
- 图标: 48px, gray-300
- 标题: 16px, gray-700
- 描述: 14px, gray-500

#### Error State
- 图标: AlertCircle, danger-500
- 标题: 错误信息
- 操作: 重试按钮

### 9. 高级图表组件

#### Sparkline Chart
- 迷你趋势图
- 用于卡片内嵌

#### Gauge Chart
- 仪表盘样式
- 用于健康度评分

#### Heatmap Grid
- 热力图网格
- 用于相关性分析

### 10. 图标系统

#### 尺寸规范
```
xs: 12px
sm: 16px
md: 20px (默认)
lg: 24px
xl: 32px
```

#### 颜色规范
```
默认: gray-500
悬浮: gray-700
激活: primary-600
禁用: gray-300
```

## 实施范围

所有优化需要应用到：
- src/app/[locale]/* - 所有页面
- src/components/* - 所有组件
- src/hooks/* - 相关 hooks
- src/lib/* - 工具库

## 验收标准

1. 所有页面使用统一的排版系统
2. 所有图表使用新的配色方案
3. 所有表单使用统一的组件
4. 所有交互都有动画反馈
5. 移动端体验优化完成
6. 所有状态都有对应的指示器
