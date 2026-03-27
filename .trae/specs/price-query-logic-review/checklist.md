# Checklist

## 高优先级问题
- [x] isMounted 变量正确使用 useRef 实现
- [x] 组件卸载时正确清理（设置 isMounted.current = false）
- [x] 所有 `if (!isMounted)` 检查使用 `.current` 属性
- [x] 组件卸载后不会出现状态更新警告

## 中优先级问题
- [x] 请求取消机制已实现（AbortController）
- [x] 错误状态正确管理并显示给用户
- [x] 用户可以看到哪些数据源获取失败
- [x] 对比模式数据获取时间一致性已改进

## 低优先级问题
- [x] 请求触发逻辑已优化，避免不必要的请求
- [x] 类型转换问题已修复，移除 `as unknown as`
- [x] chartData 空数据点处理已改进
- [ ] URL 参数变化可以正确响应 (未实现，保持现有行为)

## 代码质量
- [x] 所有修改通过 TypeScript 类型检查 (price-query 相关文件无错误)
- [x] 所有修改通过 ESLint 检查 (usePriceQuery.ts 无新增错误，其他 warnings 为已存在问题)
- [x] 代码注释清晰说明修复的问题
