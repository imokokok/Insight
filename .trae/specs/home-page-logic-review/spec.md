# 首页代码逻辑审查 Spec

## Why
用户请求审查首页代码逻辑，发现存在多个潜在问题需要修复，包括路由配置错误、代码重复、类型安全等问题。

## What Changes
- 修复 `searchConfig.ts` 中预言机路径配置错误（路径与实际页面不匹配）
- 优化 `ProfessionalHero.tsx` 中的代码重复问题
- 改进类型定义以提高类型安全性
- **BREAKING**: 无破坏性变更

## Impact
- Affected specs: 首页搜索功能、导航功能
- Affected code: 
  - `src/lib/constants/searchConfig.ts`
  - `src/app/[locale]/home-components/ProfessionalHero.tsx`
  - `src/app/[locale]/page.tsx`

## ADDED Requirements

### Requirement: 搜索结果路径正确性
系统 SHALL 确保搜索结果中的路径与实际页面路由匹配。

#### Scenario: 用户点击预言机搜索结果
- **WHEN** 用户在首页搜索框输入 "chainlink" 并点击搜索结果
- **THEN** 系统应正确导航到 `/{locale}/chainlink` 页面，而不是 `/{locale}/oracle/chainlink`

#### Scenario: 用户点击代币搜索结果
- **WHEN** 用户在首页搜索框输入 "BTC" 并点击搜索结果
- **THEN** 系统应正确导航到 `/{locale}/price-query?symbol=BTC` 页面

### Requirement: 代码无重复逻辑
系统 SHALL 避免在多处重复相同的业务逻辑代码。

#### Scenario: Enter 键提交搜索
- **WHEN** 用户在搜索框按下 Enter 键
- **THEN** 系统应通过统一的处理函数处理搜索请求，而非在多处重复相同逻辑

## MODIFIED Requirements

### Requirement: 类型安全
`dropdownItems` 的类型定义 SHALL 更加明确，避免复杂的类型推断。

## 发现的问题详情

### 问题 1: 预言机路径配置错误（严重）

**文件**: `src/lib/constants/searchConfig.ts`

**问题描述**: 
搜索配置中预言机的路径设置为 `/oracle/chainlink`、`/oracle/pyth` 等，但实际页面路径是 `/chainlink`、`/pyth` 等（没有 `/oracle` 前缀）。

**影响**: 用户点击预言机搜索结果时会跳转到 404 页面。

**示例**:
```typescript
// 当前配置（错误）
path: '/oracle/chainlink'

// 实际页面路径
// /[locale]/chainlink/page.tsx
```

### 问题 2: Enter 键处理逻辑重复

**文件**: `src/app/[locale]/home-components/ProfessionalHero.tsx`

**问题描述**: 
`handleSubmit` 函数（第 120-138 行）和 `handleKeyDown` 函数（第 161-178 行）中存在完全相同的 Enter 键处理逻辑。

**代码重复**:
```typescript
// handleSubmit 中
if (highlightedIndex >= 0 && highlightedIndex < dropdownItems.length) {
  const selectedItem = dropdownItems[highlightedIndex];
  if (selectedItem.type === 'search' && 'score' in selectedItem.item) {
    handleSearch(selectedItem.item as SearchResult);
  } else if ('symbol' in selectedItem.item) {
    handleSearch(selectedItem.item.symbol);
  }
} else if (searchQuery.trim()) {
  // ...
}

// handleKeyDown 中 - 完全相同的逻辑
case 'Enter':
  e.preventDefault();
  if (highlightedIndex >= 0 && highlightedIndex < dropdownItems.length) {
    // 相同的代码...
  }
```

### 问题 3: 类型定义复杂

**文件**: `src/app/[locale]/home-components/ProfessionalHero.tsx`

**问题描述**: 
`dropdownItems` 的类型定义使用了复杂的联合类型和可选属性，可能导致类型推断问题。

```typescript
const items: {
  type: 'history' | 'popular' | 'search';
  item: SearchResult | { symbol: string };
  resultType?: 'token' | 'oracle' | 'chain' | 'protocol';
}[] = [];
```

### 问题 4: 潜在的 SSR 水合问题

**文件**: `src/app/[locale]/page.tsx`

**问题描述**: 
使用 `dynamic` 导入 `ProfessionalHero` 时设置了 `ssr: true`，但组件内部使用了 `localStorage`（通过 `getSearchHistory`）和 `useRouter` 等客户端 API，这可能导致服务端渲染和客户端渲染内容不一致。

**当前代码**:
```typescript
const ProfessionalHero = dynamic(() => import('./home-components/ProfessionalHero'), {
  loading: () => <HeroSkeleton />,
  ssr: true,  // 可能导致水合问题
});
```

### 问题 5: 搜索历史加载时机

**文件**: `src/app/[locale]/home-components/ProfessionalHero.tsx`

**问题描述**: 
搜索历史在 `useEffect` 中加载，但初始渲染时 `searchHistory` 为空数组。如果用户快速操作，可能会看到短暂的闪烁。

**建议**: 可以考虑使用 `useState` 的惰性初始化或添加加载状态。

## 优先级建议

| 问题 | 严重程度 | 建议 |
|------|----------|------|
| 预言机路径配置错误 | 🔴 高 | 立即修复 |
| Enter 键处理逻辑重复 | 🟡 中 | 建议重构 |
| 类型定义复杂 | 🟡 中 | 建议优化 |
| SSR 水合问题 | 🟡 中 | 需要验证 |
| 搜索历史加载时机 | 🟢 低 | 可选优化 |
