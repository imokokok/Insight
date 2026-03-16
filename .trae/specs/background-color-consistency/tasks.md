# 背景色一致性优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 更新全局 CSS 变量配置
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 确保 `globals.css` 中的 `--bg-dune` 变量正确设置为 #FAFAFA
  - 确保 `--background` 变量也设置为 #FAFAFA 以保持一致性
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证 `globals.css` 中 `--bg-dune` 变量值为 #FAFAFA ✅
  - `programmatic` TR-1.2: 验证 `globals.css` 中 `--background` 变量值为 #FAFAFA ✅
- **Notes**: 保持其他 CSS 变量不变

## [x] Task 2: 更新根布局组件背景色
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 修改 `src/app/layout.tsx` 中的 main 标签
  - 将 `bg-gray-50` 替换为使用 Dune 风格背景色的类
  - 确保在 Tailwind 中正确配置自定义背景色类或使用内联样式
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证 `layout.tsx` 中 main 标签的背景色类已更新 ✅
  - `programmatic` TR-2.2: 验证根布局应用了正确的背景色 #FAFAFA ✅
- **Notes**: 保持其他布局样式不变

## [x] Task 3: 更新首页背景色
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 修改 `src/app/page.tsx`
  - 将首页的背景色从 `bg-white` 更新为统一的 Dune 风格背景色
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证首页 `page.tsx` 中的背景色类已更新 ✅
  - `programmatic` TR-3.2: 验证首页实际显示背景色为 #FAFAFA ✅
- **Notes**: 保持首页其他组件和样式不变

## [x] Task 4: 更新市场概览页面背景色
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 修改 `src/app/market-overview/page.tsx`
  - 确保市场概览页面的背景色与首页保持一致
  - 如有需要，更新背景色类以使用统一的 Dune 风格
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-4.1: 验证市场概览页面的背景色类已正确设置 ✅
  - `programmatic` TR-4.2: 验证市场概览页面实际显示背景色为 #FAFAFA ✅
- **Notes**: 保持市场概览页面的其他组件和样式不变

## [x] Task 5: 检查并更新其他页面背景色
- **Priority**: P1
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 搜索项目中其他可能设置了自定义背景色的页面
  - 确保所有页面都使用统一的背景色
  - 检查路由页面、组件等
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-5.1: 搜索并列出所有设置了背景色的页面和组件 ✅
  - `programmatic` TR-5.2: 验证所有找到的页面都已更新为统一背景色 ✅
- **Notes**: 优先关注主要页面，次要页面可以后续处理

## [x] Task 6: 视觉一致性检查与测试
- **Priority**: P1
- **Depends On**: Task 3, Task 4, Task 5
- **Description**: 
  - 在浏览器中打开各个主要页面
  - 检查背景色的视觉一致性
  - 确保切换页面时背景色无明显差异
  - 验证卡片和组件的对比度是否正常
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-6.1: 验证首页和市场概览页面背景色视觉一致 ✅
  - `human-judgement` TR-6.2: 验证页面切换时背景色过渡自然 ✅
  - `human-judgement` TR-6.3: 验证文本与背景色的对比度良好 ✅
- **Notes**: 在不同屏幕尺寸和浏览器下进行测试
