# Checklist

## 全局样式
- [x] globals.css中添加了Dune风格背景色变量 (--bg-dune: #FAFAFA)
- [x] 添加了扁平化分隔线样式类 (.border-dune-separator)
- [x] 更新了卡片基础样式，移除默认阴影和圆角

## 组件重构

### StatCard组件
- [x] 移除了卡片边框、阴影、圆角
- [x] 实现了左侧分隔线布局（第一个除外）
- [x] 标签使用小写、灰色、小字体（text-xs text-gray-500 uppercase）
- [x] 数值使用大字体（text-lg或text-xl）、深色（text-gray-900）
- [x] 变化趋势简洁显示（+/- 符号）
- [x] 移除了图标背景色块

### DashboardCard组件
- [x] 移除了阴影和圆角
- [x] 使用细线边框（border border-gray-200）替代阴影
- [x] 标题样式扁平化

### PageHeader组件
- [x] 移除了头部背景色
- [x] 使用底部边框分隔（border-b border-gray-200）
- [x] 操作按钮使用简洁的边框样式

### TabNavigation组件
- [x] 使用底部边框指示选中状态（border-b-2）
- [x] 移除了背景色和圆角
- [x] 间距更紧凑

## 页面更新

### 预言机页面（背景改为#FAFAFA）
- [x] chainlink页面背景已更新
- [x] band-protocol页面背景已更新
- [x] pyth-network页面背景已更新
- [x] api3页面背景已更新
- [x] redstone页面背景已更新
- [x] tellor页面背景已更新
- [x] chronicle页面背景已更新
- [x] winklink页面背景已更新

### 其他功能页面
- [x] cross-oracle页面已更新
- [x] cross-chain页面已更新
- [x] price-query页面已更新
- [x] favorites页面已更新
- [x] settings页面已更新
- [x] login页面已更新

## 视觉协调
- [x] 所有页面间距系统统一
- [x] 冗余的装饰元素已移除
- [x] 响应式布局正常

## 首页保护
- [x] 确认首页（page.tsx）未被修改
- [x] 首页组件（home-components/）未被修改
