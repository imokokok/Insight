# 修复 Chronicle 页面特色 Tab 数据显示问题

## Why
Chronicle 页面的 Scuttlebutt 安全、MakerDAO 集成和验证者三个特色 tab 没有显示内容，原因是 `useChronicleAllData` hook 返回的字段名与页面组件中使用的字段名不匹配，导致数据为 undefined，条件渲染失败。

## What Changes
- 修复 `useChronicleAllData` hook 返回的字段名，使其与页面使用一致
- 添加缺失的 staking 数据获取
- 确保所有三个特色 tab 正确显示数据

## Impact
- Affected specs: Chronicle 预言机页面功能
- Affected code: 
  - `src/hooks/useChronicleData.ts`
  - `src/app/chronicle/page.tsx`

## ADDED Requirements

### Requirement: Hook 返回字段名与页面使用一致
系统 SHALL 确保 `useChronicleAllData` hook 返回的字段名与页面组件中解构使用的字段名完全一致。

#### Scenario: 数据字段名匹配
- **WHEN** 页面调用 `useChronicleAllData` hook
- **THEN** 返回的 `scuttlebutt`, `makerDAO`, `validatorMetrics`, `staking` 字段应包含正确的数据

### Requirement: Staking 数据获取
系统 SHALL 在 `useChronicleAllData` hook 中添加 staking 数据的获取功能。

#### Scenario: Staking 数据可用
- **WHEN** 页面需要显示质押 APR 等信息
- **THEN** hook 应返回有效的 staking 数据

## MODIFIED Requirements

### Requirement: Chronicle 页面数据渲染
页面 SHALL 正确渲染 Scuttlebutt 安全、MakerDAO 集成和验证者三个特色 tab 的内容。

#### Scenario: Tab 内容显示
- **WHEN** 用户切换到 Scuttlebutt/MakerDAO/验证者 tab
- **THEN** 应显示对应的面板组件和数据内容
