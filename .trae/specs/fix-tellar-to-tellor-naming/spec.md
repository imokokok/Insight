# 修复 Tellar 命名错误为 Tellor Spec

## Why
项目中错误地将 Tellor 预言机命名为了 "Tellar"。这是一个拼写错误，需要将所有错误的 "Tellar" 命名修正为正确的 "Tellor"，并删除相关的错误代码和配置。

## What Changes
- **修正导航配置** - 将 `/tellar` 路由修改为 `/tellor`
- **修正国际化翻译** - 将 `tellar` 相关键名修改为 `tellor`
- **删除重复的颜色配置** - 删除 `colors.ts` 中错误的 `tellar` 颜色配置（因为正确的 `tellor` 已存在）
- **更新 spec 文档** - 更新 `integrate-dia-tellar-oracles` spec 文档中的命名

## Impact
- Affected specs: `integrate-dia-tellar-oracles`
- Affected code: 
  - `src/lib/config/colors.ts` - 删除错误的 tellar 颜色
  - `src/components/navigation/config.ts` - 修正导航路由
  - `src/i18n/en.json` - 修正英文翻译
  - `src/i18n/zh-CN.json` - 修正中文翻译

## ADDED Requirements

### Requirement: 修正命名错误
系统 SHALL 使用正确的 "Tellor" 命名，而非错误的 "Tellar"。

#### Scenario: 导航链接正确
- **WHEN** 用户查看导航菜单
- **THEN** 显示的链接指向 `/tellor` 而非 `/tellar`

#### Scenario: 国际化文本正确
- **WHEN** 用户查看任何语言的界面
- **THEN** 显示的预言机名称为 "Tellor" 而非 "Tellar"

#### Scenario: 颜色配置正确
- **WHEN** 系统渲染 Tellor 相关图表
- **THEN** 使用正确的 `tellor` 颜色配置

## REMOVED Requirements

### Requirement: Tellar 相关错误代码
**Reason**: Tellar 是 Tellor 的拼写错误，需要删除所有相关错误代码
**Migration**: 使用已存在的正确 Tellor 实现
