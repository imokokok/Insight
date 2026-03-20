# 更新数据分析平台文档规格

## Why
项目经过大量更新后，现有文档已无法准确反映当前功能。需要更新所有文档以确保：
1. 新加入的5个预言机（RedStone, DIA, Tellor, Chronicle, WINkLink）被正确记录
2. 所有功能页面和组件都有对应的文档说明
3. 用户和开发者能够获得准确的平台信息

## What Changes
- **更新 README.md**: 添加新预言机、更新项目结构、完善功能列表
- **更新 ORACLE_INTEGRATION.md**: 添加5个新预言机的详细集成文档
- **更新 ARCHITECTURE.md**: 更新组件架构、新增模块说明
- **更新 USER_GUIDE.md**: 添加新预言机页面和功能的用户指南

## Impact
- 影响文档：README.md, ORACLE_INTEGRATION.md, ARCHITECTURE.md, USER_GUIDE.md
- 影响范围：所有用户和开发者文档

## ADDED Requirements

### Requirement: 文档完整性
The system SHALL provide complete and accurate documentation for all platform features.

#### Scenario: 新预言机文档
- **WHEN** 用户查看预言机集成文档
- **THEN** 应能看到所有10个预言机的详细信息

#### Scenario: 项目结构文档
- **WHEN** 开发者查看架构文档
- **THEN** 应能了解所有组件和模块的组织结构

## MODIFIED Requirements

### Requirement: README 更新
更新 README.md 以反映当前平台状态。

**修改内容：**
- 预言机数量：5个 → 10个
- 添加 RedStone, DIA, Tellor, Chronicle, WINkLink 介绍
- 更新项目结构树
- 更新支持的区块链列表
- 更新 API 端点列表

### Requirement: ORACLE_INTEGRATION 更新
更新 ORACLE_INTEGRATION.md 以包含所有预言机。

**修改内容：**
- 添加 RedStone 集成文档
- 添加 DIA 集成文档
- 添加 Tellor 集成文档
- 添加 Chronicle 集成文档
- 添加 WINkLink 集成文档
- 更新预言机对比表格

### Requirement: ARCHITECTURE 更新
更新 ARCHITECTURE.md 以反映最新架构。

**修改内容：**
- 更新组件目录结构
- 添加新预言机客户端说明
- 更新国际化结构
- 添加新功能模块说明

### Requirement: USER_GUIDE 更新
更新 USER_GUIDE.md 以包含新功能指南。

**修改内容：**
- 添加新预言机页面说明
- 更新导航说明
- 添加新功能使用指南
