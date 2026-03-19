# 收藏功能应用 Spec

## Why
项目已经实现了完整的收藏功能基础设施（包括 useFavorites hooks、FavoriteButton 组件、收藏管理页面等），但目前只在 cross-oracle 页面集成了收藏功能。用户希望在其他可以收藏配置的页面（price-query 和 cross-chain）也能使用收藏功能，以便快速保存和恢复常用的查询配置。

## What Changes
- 在 Price Query 页面添加收藏按钮，支持收藏当前查询配置（symbol + oracles + chains）
- 在 Cross Chain 页面添加收藏按钮，支持收藏当前链配置（provider + symbol + chains）
- 在 Price Query 页面添加收藏下拉菜单，快速应用已保存的收藏
- 在 Cross Chain 页面添加收藏下拉菜单，快速应用已保存的收藏
- **BREAKING**: 无破坏性变更

## Impact
- Affected specs: 收藏功能、Price Query 页面、Cross Chain 页面
- Affected code: 
  - `/src/app/[locale]/price-query/page.tsx`
  - `/src/app/[locale]/price-query/components/QueryHeader.tsx`
  - `/src/app/[locale]/price-query/hooks/usePriceQuery.ts`
  - `/src/app/[locale]/cross-chain/page.tsx`
  - `/src/app/[locale]/cross-chain/components/CrossChainFilters.tsx`
  - `/src/app/[locale]/cross-chain/useCrossChainData.ts`

## ADDED Requirements

### Requirement: Price Query 页面收藏功能
The system SHALL provide a favorite button in the Price Query page header that allows users to save the current query configuration.

#### Scenario: Save favorite
- **WHEN** user clicks the favorite button
- **THEN** the current configuration (selectedSymbol, selectedOracles, selectedChains) is saved as a favorite with type 'symbol'

#### Scenario: Apply favorite
- **WHEN** user selects a favorite from the dropdown
- **THEN** the saved configuration is applied to the query form
- **AND** the query is automatically refreshed with the new configuration

### Requirement: Cross Chain 页面收藏功能
The system SHALL provide a favorite button in the Cross Chain page header that allows users to save the current chain configuration.

#### Scenario: Save favorite
- **WHEN** user clicks the favorite button
- **THEN** the current configuration (selectedProvider, selectedSymbol, visibleChains) is saved as a favorite with type 'chain_config'

#### Scenario: Apply favorite
- **WHEN** user selects a favorite from the dropdown
- **THEN** the saved configuration is applied
- **AND** the data is automatically refreshed

## MODIFIED Requirements
无

## REMOVED Requirements
无
