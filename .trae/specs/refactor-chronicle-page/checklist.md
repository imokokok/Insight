# Chronicle 页面重构检查清单

## 代码实现检查

- [x] **类型定义**
  - [x] `ChronicleTabId` 类型正确定义（market, network, validators, makerdao, scuttlebutt, cross-oracle, risk）
  - [x] 所有 Props 接口已定义
  - [x] 数据接口（NetworkStats, ValidatorData 等）已定义

- [x] **Hook 实现**
  - [x] `useChroniclePage` hook 正确创建
  - [x] 使用 `useChronicleAllData` 获取数据
  - [x] `activeTab` 状态管理正确
  - [x] `refresh` 和 `exportData` 功能正常

- [x] **视图组件**
  - [x] `ChronicleMarketView` 正确实现
  - [x] `ChronicleNetworkView` 正确实现
  - [x] `ChronicleValidatorsView` 正确实现
  - [x] `ChronicleMakerDAOView` 正确实现
  - [x] `ChronicleScuttlebuttView` 正确实现
  - [x] `ChronicleRiskView` 正确实现

- [x] **侧边栏组件**
  - [x] `ChronicleSidebar` 正确创建
  - [x] 所有菜单项正确显示
  - [x] 高亮逻辑正确
  - [x] 点击切换正常

- [x] **主页面重构**
  - [x] Hero 区域正确显示
  - [x] LiveStatusBar 组件使用正确
  - [x] 价格和涨跌幅显示正确
  - [x] 刷新和导出按钮功能正常
  - [x] 统计卡片显示正确
  - [x] 侧边栏 + 内容区域布局正确
  - [x] 移动端菜单功能正常
  - [x] 根据 activeTab 正确渲染对应视图

## 布局检查

- [x] **桌面端布局**
  - [x] Hero 区域宽度为 max-w-[1600px]
  - [x] 侧边栏宽度为 256px (w-64)
  - [x] 内容区域自适应剩余宽度
  - [x] 统计卡片为 4 列网格布局

- [x] **移动端布局**
  - [x] 移动端菜单按钮显示
  - [x] 侧边栏以抽屉形式展示
  - [x] 点击遮罩层关闭菜单
  - [x] 内容区域正确适配

## 功能检查

- [x] **数据获取**
  - [x] 价格数据正确获取
  - [x] 历史数据正确获取
  - [x] 网络统计数据正确获取
  - [x] 验证者数据正确获取
  - [x] MakerDAO 数据正确获取
  - [x] Scuttlebutt 数据正确获取

- [x] **交互功能**
  - [x] 刷新按钮正常工作
  - [x] 导出按钮正常工作
  - [x] 侧边栏导航切换正常
  - [x] 移动端菜单打开/关闭正常

- [x] **图表展示**
  - [x] 价格趋势图表正确显示
  - [x] 图表高度为 300px
  - [x] 工具栏正常显示

## 样式检查

- [x] **颜色主题**
  - [x] 使用 Chronicle 的主题色（amber/橙色）
  - [x] 统计卡片颜色正确
  - [x] 侧边栏高亮颜色正确

- [x] **间距和排版**
  - [x] 使用 compact 布局
  - [x] 减少不必要的间距
  - [x] 字体大小合适

- [x] **响应式**
  - [x] 桌面端显示正常
  - [x] 平板端显示正常
  - [x] 移动端显示正常

## 国际化检查

- [x] **翻译键**
  - [x] 所有新文本使用翻译键
  - [x] 翻译键命名规范
  - [x] 必要的翻译键已添加

## 性能检查

- [x] **代码分割**
  - [x] 视图组件按需加载
  - [x] 无不必要的重渲染

- [x] **数据获取优化**
  - [x] 使用 React Query 缓存
  - [x] 避免重复请求
