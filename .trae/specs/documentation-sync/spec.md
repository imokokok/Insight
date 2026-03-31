# 文档同步更新规范

## Why

Insight项目在开发过程中进行了大量更新，包括：
- 新的API层架构（版本控制、中间件、验证、响应格式化）
- 新的依赖注入系统
- 扩展的测试体系（单元测试、集成测试、E2E测试）
- 新的监控和可观测性功能
- 增强的错误处理和恢复机制
- 多个新预言机支持（API3、Pyth、Band Protocol等）
- 新的数据导出和分析功能

现有文档与代码实际状态存在较大差距，需要系统性地同步更新所有文档。

## What Changes

### 文档审计与分类
- 清点项目所有现有文档
- 识别文档与代码实际状态的差异
- 分类文档更新优先级

### 核心文档更新
- README.md - 项目概览、技术栈、安装说明
- ARCHITECTURE.md - 系统架构、组件结构、数据流
- API_REFERENCE.md - API端点、认证、错误码、缓存策略

### 规范文档更新
- docs/architecture/*.md - 各层面架构文档
- docs/api/*.md - API设计文档
- docs/development/*.md - 开发规范
- docs/deployment/*.md - 部署文档
- docs/performance/*.md - 性能优化文档

### 测试与质量文档更新
- 测试覆盖目标与现状
- 性能基准文档
- 安全审计文档

## Impact

### Affected Specs
- platform-improvements/spec.md - 需要重新评估当前状态

### Affected Documentation
- 所有.md文档文件需要审查和更新

## ADDED Requirements

### Requirement: 文档同步

系统 SHALL 确保所有项目文档与代码实际状态保持一致。

#### Scenario: 文档审计
- **WHEN** 执行文档同步任务时
- **THEN** 需要清点所有文档、识别差异、分类优先级

#### Scenario: 核心文档更新
- **WHEN** 更新README、ARCHITECTURE、API_REFERENCE时
- **THEN** 必须反映最新的项目结构、技术栈、API设计

#### Scenario: 规范文档更新
- **WHEN** 更新开发、部署、架构文档时
- **THEN** 必须基于代码中实际的目录结构、配置、模式

## MODIFIED Requirements

### Requirement: 项目状态同步

**原要求**：基于旧的platform-improvements spec

**修改后**：
- 评估platform-improvements任务完成状态
- 根据实际代码更新spec中的任务清单
- 更新checklist反映真实完成情况

## REMOVED Requirements

无移除的需求。
