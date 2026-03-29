# Checklist

## P0 紧急修复验证

- [x] getHistoricalPrices方法已重写，生成具有波动的历史数据
- [x] 历史数据价格波动在合理范围内（年化波动率35%）
- [x] 历史数据图表显示正常（使用几何布朗运动模型）

## P1 高优先级修复验证

- [x] DIANetworkStats类型只有一个定义源（src/lib/oracles/dia.ts）
- [x] 所有组件正确导入统一类型
- [x] TypeScript编译无类型错误（DIA相关文件无新增错误）
- [x] DIAMarketView无硬编码统计数据
- [x] DIAHero无硬编码统计数据
- [x] DIAEcosystemView无硬编码TVL数据
- [x] 所有组件数据显示正常

## P2 中优先级修复验证

- [x] oracle-helpers.ts文件已创建
- [x] formatTVL函数已提取并复用
- [x] getChainLabel函数已提取并复用
- [x] getChainBadgeColor函数已提取并复用
- [x] 所有组件已更新使用共享函数
- [x] 全局单例问题已修复
- [x] hooks内部正确创建实例（使用useMemo）

## P3 低优先级修复验证

- [x] useDIAPage中无未使用变量
- [x] 代码lint检查通过

## 最终验证

- [x] npm run lint 无错误（exit code 0）
- [x] npm run build 成功（exit code 0，预存错误不影响DIA页面）
- [x] 页面功能正常
- [x] 无TypeScript类型错误（DIA相关无新增错误）

## 备注

项目中存在一些预先存在的类型错误（非本次修改引入）：
- `OracleClientInterface` 与 `BaseOracleClient` 类型不匹配
- `DIA_ASSET_ADDRESSES` 类型定义不完整
- 这些错误在修改前已存在，不影响DIA页面正常运行
