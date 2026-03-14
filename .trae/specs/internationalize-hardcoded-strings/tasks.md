# Tasks

## 阶段一：用户认证模块国际化

- [x] Task 1: 国际化登录页面
  - [x] SubTask 1.1: 在 i18n 文件中添加登录页面相关的翻译 key（auth.login.*）
  - [x] SubTask 1.2: 修改 src/app/login/page.tsx，使用 useI18n() hook 替换硬编码字符串
  - [x] SubTask 1.3: 测试登录页面的中英文切换功能

- [x] Task 2: 国际化注册页面
  - [x] SubTask 2.1: 在 i18n 文件中添加注册页面相关的翻译 key（auth.register.*）
  - [x] SubTask 2.2: 修改 src/app/register/page.tsx，使用 useI18n() hook 替换硬编码字符串
  - [x] SubTask 2.3: 测试注册页面的中英文切换功能

## 阶段二：设置模块国际化

- [x] Task 3: 国际化个人资料设置面板
  - [x] SubTask 3.1: 在 i18n 文件中添加个人资料相关的翻译 key（settings.profile.*）
  - [x] SubTask 3.2: 修改 src/components/settings/ProfilePanel.tsx，使用 useI18n() hook 替换硬编码字符串
  - [x] SubTask 3.3: 测试个人资料设置的中英文切换功能

- [x] Task 4: 国际化通知设置面板
  - [x] SubTask 4.1: 在 i18n 文件中添加通知设置相关的翻译 key（settings.notifications.*）
  - [x] SubTask 4.2: 修改 src/components/settings/NotificationPanel.tsx，使用 useI18n() hook 替换硬编码字符串
  - [x] SubTask 4.3: 测试通知设置的中英文切换功能

- [x] Task 5: 国际化偏好设置面板
  - [x] SubTask 5.1: 在 i18n 文件中添加偏好设置相关的翻译 key（settings.preferences.*）
  - [x] SubTask 5.2: 修改 src/components/settings/PreferencesPanel.tsx，使用 useI18n() hook 替换硬编码字符串
  - [x] SubTask 5.3: 测试偏好设置的中英文切换功能

- [x] Task 6: 国际化数据管理面板
  - [x] SubTask 6.1: 在 i18n 文件中添加数据管理相关的翻译 key（settings.data.*）
  - [x] SubTask 6.2: 修改 src/components/settings/DataManagementPanel.tsx，使用 useI18n() hook 替换硬编码字符串
  - [x] SubTask 6.3: 测试数据管理的中英文切换功能

## 阶段三：告警和收藏模块国际化

- [x] Task 7: 国际化告警配置组件
  - [x] SubTask 7.1: 在 i18n 文件中添加告警配置相关的翻译 key（alerts.create.*, alerts.condition.*）
  - [x] SubTask 7.2: 修改 src/components/alerts/AlertConfig.tsx，使用 useI18n() hook 替换硬编码字符串
  - [x] SubTask 7.3: 测试告警配置的中英文切换功能

- [x] Task 8: 国际化告警列表和历史组件
  - [x] SubTask 8.1: 在 i18n 文件中添加告警列表和历史相关的翻译 key（alerts.list.*, alerts.history.*）
  - [x] SubTask 8.2: 修改 src/components/alerts/AlertList.tsx 和 AlertHistory.tsx
  - [x] SubTask 8.3: 测试告警列表和历史的中英文切换功能

- [x] Task 9: 国际化告警页面
  - [x] SubTask 9.1: 在 i18n 文件中添加告警页面相关的翻译 key（alerts.page.*）
  - [x] SubTask 9.2: 修改 src/app/alerts/page.tsx
  - [x] SubTask 9.3: 测试告警页面的中英文切换功能

- [x] Task 10: 国际化收藏模块
  - [x] SubTask 10.1: 在 i18n 文件中添加收藏相关的翻译 key（favorites.*）
  - [x] SubTask 10.2: 修改 src/app/favorites/page.tsx 和 src/components/favorites/FavoriteCard.tsx
  - [x] SubTask 10.3: 测试收藏模块的中英文切换功能

## 阶段四：错误处理和空状态国际化

- [x] Task 11: 国际化错误边界组件
  - [x] SubTask 11.1: 在 i18n 文件中添加错误边界相关的翻译 key（error.boundary.*）
  - [x] SubTask 11.2: 修改 src/components/ErrorBoundaries.tsx
  - [x] SubTask 11.3: 测试错误边界的中英文切换功能

- [x] Task 12: 国际化空状态组件
  - [x] SubTask 12.1: 在 i18n 文件中添加空状态相关的翻译 key（emptyState.*）
  - [x] SubTask 12.2: 修改 src/components/ui/EmptyState.tsx
  - [x] SubTask 12.3: 测试空状态的中英文切换功能

## 阶段五：图表组件国际化

- [x] Task 13: 国际化价格图表组件
  - [x] SubTask 13.1: 在 i18n 文件中添加价格图表相关的翻译 key（chart.tooltip.*, chart.indicators.*, chart.timeRange.*）
  - [x] SubTask 13.2: 修改 src/components/oracle/charts/PriceChart.tsx 及相关文件
  - [x] SubTask 13.3: 测试价格图表的中英文切换功能

- [x] Task 14: 国际化跨预言机比较组件
  - [x] SubTask 14.1: 在 i18n 文件中添加跨预言机比较相关的翻译 key（crossOracle.*）
  - [x] SubTask 14.2: 修改 src/components/oracle/charts/CrossOracleComparison.tsx
  - [x] SubTask 14.3: 测试跨预言机比较的中英文切换功能

## 阶段六：预言机页面国际化

- [x] Task 15: 国际化 API3 页面
  - [x] SubTask 15.1: 在 i18n 文件中添加 API3 页面相关的翻译 key（api3.*）
  - [x] SubTask 15.2: 修改 src/app/api3/API3PageContent.tsx
  - [x] SubTask 15.3: 测试 API3 页面的中英文切换功能

- [x] Task 16: 国际化 Redstone 页面
  - [x] SubTask 16.1: 在 i18n 文件中添加 Redstone 页面相关的翻译 key（redstone.*）
  - [x] SubTask 16.2: 修改 src/app/redstone/page.tsx
  - [x] SubTask 16.3: 测试 Redstone 页面的中英文切换功能

- [x] Task 17: 国际化 UMA 模块
  - [x] SubTask 17.1: 在 i18n 文件中添加 UMA 模块相关的翻译 key（uma.*）
  - [x] SubTask 17.2: 修改 UMA 相关组件（验证者面板、争议解决面板等）
  - [x] SubTask 17.3: 测试 UMA 模块的中英文切换功能

## 阶段七：首页和通用组件国际化

- [x] Task 18: 国际化首页组件
  - [x] SubTask 18.1: 在 i18n 文件中补充首页组件缺失的翻译 key（home.hero.*, home.features.*）
  - [x] SubTask 18.2: 修改 src/app/home-components/ 下的组件
  - [x] SubTask 18.3: 测试首页的中英文切换功能

- [x] Task 19: 国际化通用文本
  - [x] SubTask 19.1: 在 i18n 文件中添加通用文本的翻译 key（common.*）
  - [x] SubTask 19.2: 修改使用通用文本的组件，统一使用 common 命名空间
  - [x] SubTask 19.3: 测试通用文本的中英文切换功能

## 阶段八：验证和优化

- [x] Task 20: 全面测试和验证
  - [x] SubTask 20.1: 运行所有单元测试，确保功能正常
  - [x] SubTask 20.2: 手动测试所有页面的中英文切换功能
  - [x] SubTask 20.3: 检查是否有遗漏的硬编码字符串
  - [x] SubTask 20.4: 优化翻译文本，确保表达准确、一致

# Task Dependencies

- Task 3, 4, 5, 6 可以并行执行（设置模块各面板独立）
- Task 7, 8, 9 可以并行执行（告警模块各部分独立）
- Task 13, 14 可以并行执行（图表组件独立）
- Task 15, 16, 17 可以并行执行（预言机页面独立）
- Task 20 依赖于所有前置任务完成
