# 交易对选择器改进任务列表

## 任务依赖关系
```
[Task 1] 创建 PairSelector 组件
    ↓
[Task 2] 添加加密货币图标支持
    ↓
[Task 3] 更新页面标题布局
    ↓
[Task 4] 简化 StatsSection
    ↓
[Task 5] 清理 PriceTableSection
    ↓
[Task 6] 测试验证
```

## 任务详情

- [x] **Task 1: 创建 PairSelector 组件**
  - [x] SubTask 1.1: 创建 `src/app/cross-oracle/components/PairSelector.tsx`
    - 实现自定义下拉选择器 UI
    - 支持搜索过滤功能
    - 添加键盘导航支持（上下箭头、Enter、Escape）
    - 实现点击外部关闭下拉菜单
  - [x] SubTask 1.2: 添加样式和动画
    - 使用 Dune 风格的扁平化设计
    - 添加展开/收起动画
    - 添加选中状态样式
  - [x] SubTask 1.3: 导出组件
    - 在 `src/app/cross-oracle/components/index.ts` 中添加导出

- [x] **Task 2: 添加加密货币图标支持**
  - [x] SubTask 2.1: 创建图标映射配置
    - 在 `src/app/cross-oracle/constants.tsx` 中添加交易对图标映射
    - 支持 BTC、ETH、SOL、AVAX 的图标
  - [x] SubTask 2.2: 实现图标组件
    - 创建或使用现有的加密货币图标组件
    - 确保图标风格统一

- [x] **Task 3: 更新页面标题布局**
  - [x] SubTask 3.1: 修改 `src/app/cross-oracle/page.tsx`
    - 在标题区域添加 PairSelector 组件
    - 调整布局使选择器与标题同行
    - 移除 StatsSection 中的 onSymbolChange 传递
  - [x] SubTask 3.2: 优化响应式布局
    - 确保移动端显示正常
    - 小屏幕下调整布局

- [x] **Task 4: 简化 StatsSection**
  - [x] SubTask 4.1: 修改 `src/app/cross-oracle/components/StatsSection.tsx`
    - 移除交易对选择器相关代码（第 75-89 行）
    - 移除 onSymbolChange prop
    - 保留交易对显示（第 93-98 行）
  - [x] SubTask 4.2: 更新组件接口
    - 从 StatsSectionProps 中移除 onSymbolChange

- [x] **Task 5: 清理 PriceTableSection**
  - [x] SubTask 5.1: 修改 `src/app/cross-oracle/components/PriceTableSection.tsx`
    - 移除交易对选择器相关代码（第 67-80 行）
    - 移除 onSymbolChange prop
    - 简化标题区域布局
  - [x] SubTask 5.2: 更新组件接口
    - 从 PriceTableSectionProps 中移除 onSymbolChange 和 selectedSymbol

- [x] **Task 6: 测试验证**
  - [x] SubTask 6.1: 功能测试
    - 验证选择器可以正常展开/收起
    - 验证可以切换不同交易对
    - 验证数据正确更新
  - [x] SubTask 6.2: 视觉测试
    - 验证图标正确显示
    - 验证动画效果正常
    - 验证响应式布局
  - [x] SubTask 6.3: 键盘测试
    - 验证键盘导航正常工作
    - 验证搜索功能正常

## 设计参考

### PairSelector 组件接口
```typescript
interface PairSelectorProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
  symbols: string[];
}
```

### 样式规范
- 选择器按钮：圆角边框，hover 时背景色变化
- 下拉菜单：白色背景，阴影，圆角
- 选中项：蓝色背景或边框标识
- 图标：24x24px，与文字垂直居中

### 交互规范
- 点击选择器按钮展开/收起下拉菜单
- 点击选项切换交易对并关闭菜单
- 点击外部区域关闭菜单
- 键盘上下箭头导航选项
- 键盘 Enter 确认选择
- 键盘 Escape 关闭菜单
