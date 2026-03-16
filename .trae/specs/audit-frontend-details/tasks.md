# Tasks

## Phase 1: 修复圆角样式不统一问题

- [x] Task 1.1: 修复 EmptyState.tsx 圆角样式
  - [x] 移除第 48 行的 `rounded-lg` 类名
  - [x] 移除第 58 行的 `rounded-lg` 类名
  - [x] 移除第 66 行的 `rounded-lg` 类名
  - [x] 验证组件渲染效果

- [x] Task 1.2: 修复 ChartSkeleton.tsx 圆角样式
  - [x] 移除所有 `rounded-md` 类名
  - [x] 移除所有 `rounded` 类名
  - [x] 验证骨架屏渲染效果

- [x] Task 1.3: 修复 Toast.tsx 圆角样式
  - [x] 检查并统一圆角类名使用
  - [x] 验证 Toast 渲染效果

- [x] Task 1.4: 检查并修复其他 UI 组件圆角
  - [x] 检查 Card.tsx 圆角设置
  - [x] 检查其他 UI 组件
  - [x] 统一应用 Dune Style Flat Design

## Phase 2: 修复颜色对比度问题

- [x] Task 2.1: 修复 Footer.tsx Logo 对比度
  - [x] 修改第 124-127 行的背景色或文字颜色
  - [x] 确保对比度符合 WCAG AA 标准
  - [x] 验证渲染效果

- [x] Task 2.2: 修复 Navbar.tsx 默认头像对比度
  - [x] 修改第 126 行的背景色或文字颜色
  - [x] 确保对比度符合 WCAG AA 标准
  - [x] 验证渲染效果

## Phase 3: 统一颜色配置

- [x] Task 3.1: 更新 lib/config/colors.ts
  - [x] 添加空状态组件所需的颜色配置
  - [x] 添加骨架屏组件所需的颜色配置
  - [x] 确保颜色命名规范统一

- [x] Task 3.2: 重构 EmptyState.tsx 颜色
  - [x] 替换硬编码的 `bg-gray-100` 为配置颜色
  - [x] 替换硬编码的 `text-gray-900` 为配置颜色
  - [x] 替换硬编码的 `text-gray-500` 为配置颜色
  - [x] 替换硬编码的 `bg-blue-600` 为品牌色
  - [x] 验证颜色显示正确

- [x] Task 3.3: 检查并修复其他组件硬编码颜色
  - [x] 搜索所有硬编码颜色值
  - [x] 替换为配置颜色
  - [x] 验证颜色显示正确

## Phase 4: 添加错误处理文件

- [x] Task 4.1: 创建 error.tsx
  - [x] 在 src/app 下创建 error.tsx
  - [x] 实现错误边界组件
  - [x] 添加重试功能
  - [x] 使用 i18n 支持多语言

- [x] Task 4.2: 创建 global-error.tsx
  - [x] 在 src/app 下创建 global-error.tsx
  - [x] 实现全局错误处理
  - [x] 添加返回首页功能
  - [x] 使用 i18n 支持多语言

- [x] Task 4.3: 创建 not-found.tsx
  - [x] 在 src/app 下创建 not-found.tsx
  - [x] 实现 404 页面设计
  - [x] 添加返回首页链接
  - [x] 使用 i18n 支持多语言

## Phase 5: 统一加载状态

- [x] Task 5.1: 审查现有加载状态实现
  - [x] 检查所有页面的加载状态实现
  - [x] 识别使用全屏加载的页面
  - [x] 制定统一方案

- [x] Task 5.2: 统一使用骨架屏
  - [x] 更新使用全屏加载的页面
  - [x] 统一使用 ChartSkeleton/MetricCardSkeleton
  - [x] 验证加载效果

## Phase 6: 代码格式规范

- [x] Task 6.1: 修复 ChartSkeleton.tsx 多余空格
  - [x] 移除第 196、198、207 行等多余空格
  - [x] 检查其他类似问题
  - [x] 验证代码格式

- [x] Task 6.2: 检查其他组件代码格式
  - [x] 检查所有 UI 组件
  - [x] 修复多余空格、空行问题
  - [x] 统一代码风格

## Phase 7: 验证和测试

- [x] Task 7.1: 视觉回归测试
  - [x] 检查所有修改后的组件渲染效果
  - [x] 验证圆角样式统一
  - [x] 验证颜色对比度正常

- [x] Task 7.2: 错误处理测试
  - [x] 测试 error.tsx 功能
  - [x] 测试 global-error.tsx 功能
  - [x] 测试 not-found.tsx 功能

- [x] Task 7.3: 类型检查
  - [x] 运行 TypeScript 类型检查
  - [x] 修复类型错误（注：发现 4 个原有代码错误，非本次修改引入）

- [x] Task 7.4: 构建测试
  - [x] 运行生产构建
  - [x] 验证构建成功

# Task Dependencies

- Phase 3 依赖 Phase 1 和 Phase 2 完成
- Phase 4 可以独立进行
- Phase 5 可以独立进行
- Phase 6 可以独立进行
- Phase 7 依赖所有其他 Phase 完成
