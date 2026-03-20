# Tasks

- [x] Task 1: 更新项目规范文档和全局样式
  - [x] SubTask 1.1: 更新 `.trae/rules/project_rules.md` 中的圆角规范章节
  - [x] SubTask 1.2: 更新项目特点描述为"专业现代设计"
  - [x] SubTask 1.3: 更新示例代码中的圆角类名
  - [x] SubTask 1.4: 检查并确认 globals.css 中的圆角变量值
  - [x] SubTask 1.5: 更新全局组件样式类（btn, card, input 等）
  - [x] SubTask 1.6: 确保 CSS 变量与 Tailwind 类一致

- [x] Task 2: 更新基础 UI 组件 (src/components/ui/)
  - [x] SubTask 2.1: 更新 Button.tsx - 统一使用 rounded-md
  - [x] SubTask 2.2: 更新 Card.tsx - 统一使用 rounded-lg
  - [x] SubTask 2.3: 更新 Input.tsx - 统一使用 rounded-md
  - [x] SubTask 2.4: 更新 Select.tsx - 统一使用 rounded-md
  - [x] SubTask 2.5: 更新 Textarea.tsx - 统一使用 rounded-md
  - [x] SubTask 2.6: 更新 Badge.tsx - 统一使用 rounded-full
  - [x] SubTask 2.7: 更新 Tooltip.tsx - 统一使用 rounded-md
  - [x] SubTask 2.8: 更新 Checkbox.tsx - 统一使用 rounded
  - [x] SubTask 2.9: 更新 Radio.tsx - 统一使用 rounded-full
  - [x] SubTask 2.10: 更新 Skeleton.tsx - 统一使用 rounded-md
  - [x] SubTask 2.11: 更新 Toast.tsx - 统一使用 rounded-lg
  - [x] SubTask 2.12: 更新 ErrorDisplay.tsx - 统一使用 rounded-lg
  - [x] SubTask 2.13: 更新其他 UI 组件

- [x] Task 3: 更新业务组件 (src/components/oracle/)
  - [x] SubTask 3.1: 更新 panels 目录下的所有面板组件 (25+ 文件)
  - [x] SubTask 3.2: 更新 charts 目录下的所有图表组件 (30+ 文件)
  - [x] SubTask 3.3: 更新 common 目录下的通用组件 (20+ 文件)
  - [x] SubTask 3.4: 更新 indicators 目录下的指标组件

- [x] Task 4: 更新其他业务组件
  - [x] SubTask 4.1: 更新 comparison 目录组件 (5 文件)
  - [x] SubTask 4.2: 更新 alerts 目录组件 (7 文件)
  - [x] SubTask 4.3: 更新 export 目录组件 (2 文件)
  - [x] SubTask 4.4: 更新 navigation 目录组件 (2 文件)
  - [x] SubTask 4.5: 更新 search 目录组件 (2 文件)
  - [x] SubTask 4.6: 更新 settings 目录组件 (4 文件)

- [x] Task 5: 更新页面组件 (src/app/)
  - [x] SubTask 5.1: 更新所有 page.tsx 中的容器圆角 (19 文件)
  - [x] SubTask 5.2: 更新 error.tsx 和 not-found.tsx (2 文件)
  - [x] SubTask 5.3: 更新 auth 目录下的所有页面 (4 文件)

- [x] Task 6: 验证和测试
  - [x] SubTask 6.1: 运行 TypeScript 类型检查
  - [x] SubTask 6.2: 运行 ESLint 检查
  - [x] SubTask 6.3: 确认所有修改符合规范

# Task Dependencies
- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 2
- Task 4 依赖于 Task 2
- Task 5 依赖于 Task 2
- Task 6 依赖于 Task 3, 4, 5
