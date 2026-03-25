# 国际化代码修复规范

## Why
国际化实现存在 Provider 嵌套混乱、消息加载静默失败、路径替换逻辑脆弱等问题，可能导致生产环境出现难以调试的 bug 和用户体验问题。

## What Changes
- 修复 I18nProvider 重复包装问题，移除不必要的嵌套
- 为消息加载添加开发环境警告日志
- 修复路径替换逻辑的硬编码 locale 问题
- 统一 i18n 导出，避免重复导出
- 修复消息文件命名空间使用不一致问题

## Impact
- Affected specs: 所有使用 i18n 的组件和页面
- Affected code:
  - `src/app/[locale]/layout.tsx`
  - `src/lib/i18n/provider.tsx`
  - `src/i18n/request.ts`
  - `src/i18n/index.ts`
  - `src/i18n/config.ts`

## MODIFIED Requirements

### Requirement: I18nProvider 修复
The system SHALL remove duplicate Provider wrapping and use a single source of truth for i18n context.

#### Scenario: Provider 修复
- **WHEN** 应用初始化
- **THEN** 应该只使用 NextIntlClientProvider 或 I18nProvider 之一
- **AND** I18nProvider 应该只提供额外功能（localStorage 持久化）
- **AND** 不应该重新包装 next-intl 的 hooks

### Requirement: 消息加载错误处理
The system SHALL log warnings in development environment when message files fail to load.

#### Scenario: 开发环境错误提示
- **WHEN** 消息文件加载失败
- **AND** 环境为 development
- **THEN** 应该在控制台输出警告信息，包含失败的文件路径

### Requirement: 路径替换逻辑修复
The system SHALL use dynamic locale configuration instead of hardcoded locale values.

#### Scenario: 语言切换路径修复
- **WHEN** 用户切换语言
- **THEN** 应该使用 routing.locales 动态生成正则表达式
- **AND** 不应该硬编码 'en|zh-CN'

### Requirement: 导出统一
The system SHALL consolidate all i18n exports in a single location.

#### Scenario: 导出统一
- **WHEN** 开发者导入 i18n hooks
- **THEN** 应该只从 `src/i18n/index.ts` 导入
- **AND** `src/lib/i18n/provider.tsx` 不应该直接导出 hooks

### Requirement: 命名空间统一
The system SHALL use consistent namespace strategy for all message files.

#### Scenario: 命名空间统一
- **WHEN** 组件使用翻译
- **THEN** export.json 应该与其他组件文件使用相同的命名方式
- **AND** 不应该有特殊的 'unifiedExport' 命名空间
