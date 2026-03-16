# Tasks

## Task 1: 修复 useChronicleAllData hook 返回字段名
**描述**: 修改 hook 返回的字段名，使其与页面使用一致
- [x] 将 `scuttlebuttData` 改为 `scuttlebutt`
- [x] 将 `makerDAOData` 改为 `makerDAO`
- [x] 将 `validatorData` 改为 `validatorMetrics`
- [x] 更新 useMemo 的依赖数组中的字段名

## Task 2: 添加 Staking 数据获取
**描述**: 在 useChronicleAllData hook 中添加 staking 数据的获取
- [x] 在 useQueries 中添加 staking 数据查询
- [x] 添加 stakingResult 到结果解构
- [x] 在返回对象中添加 `staking` 字段
- [x] 更新 useMemo 的依赖数组

## Task 3: 验证页面功能
**描述**: 确保所有 tab 正确显示内容
- [x] 验证 Scuttlebutt 安全 tab 显示内容
- [x] 验证 MakerDAO 集成 tab 显示内容
- [x] 验证验证者 tab 显示内容
- [x] 验证质押 APR 数据正确显示

# Task Dependencies
- Task 2 依赖 Task 1（需要先修复字段名）
- Task 3 依赖 Task 1 和 Task 2（需要数据修复完成）
