#!/bin/bash

# Insight UI 批量更新脚本
# 这个脚本用于批量更新项目中的 UI 组件

set -e

echo "🚀 开始批量更新 UI 组件..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/Users/imokokok/Documents/foresight-build/insight"
cd "$PROJECT_ROOT"

# 统计信息
TOTAL_FILES=0
UPDATED_FILES=0
SKIPPED_FILES=0

# 函数：更新文件中的按钮样式
update_buttons() {
    local file=$1
    
    # 检查文件是否包含 button 元素
    if grep -q "<button" "$file"; then
        echo -e "${YELLOW}处理文件: $file${NC}"
        
        # 创建备份
        cp "$file" "$file.bak"
        
        # 替换常见的按钮模式
        # 注意：这些是简单的替换，复杂的需要手动处理
        
        # 1. 替换 bg-blue-600 为 bg-primary-600
        sed -i '' 's/bg-blue-600/bg-primary-600/g' "$file"
        sed -i '' 's/bg-blue-700/bg-primary-700/g' "$file"
        sed -i '' 's/bg-blue-800/bg-primary-800/g' "$file"
        sed -i '' 's/text-blue-600/text-primary-600/g' "$file"
        sed -i '' 's/text-blue-700/text-primary-700/g' "$file"
        sed -i '' 's/hover:bg-blue-50/hover:bg-primary-50/g' "$file"
        sed -i '' 's/hover:text-blue-600/hover:text-primary-600/g' "$file"
        
        # 2. 替换红色相关
        sed -i '' 's/bg-red-50/bg-danger-50/g' "$file"
        sed -i '' 's/bg-red-100/bg-danger-100/g' "$file"
        sed -i '' 's/text-red-600/text-danger-600/g' "$file"
        sed -i '' 's/text-red-700/text-danger-700/g' "$file"
        sed -i '' 's/hover:bg-red-50/hover:bg-danger-50/g' "$file"
        
        # 3. 替换绿色相关
        sed -i '' 's/bg-green-50/bg-success-50/g' "$file"
        sed -i '' 's/bg-green-100/bg-success-100/g' "$file"
        sed -i '' 's/text-green-600/text-success-600/g' "$file"
        sed -i '' 's/text-green-700/text-success-700/g' "$file"
        
        # 4. 替换黄色/橙色相关
        sed -i '' 's/bg-yellow-50/bg-warning-50/g' "$file"
        sed -i '' 's/bg-yellow-100/bg-warning-100/g' "$file"
        sed -i '' 's/text-yellow-600/text-warning-600/g' "$file"
        sed -i '' 's/text-yellow-700/text-warning-700/g' "$file"
        sed -i '' 's/bg-orange-50/bg-warning-50/g' "$file"
        sed -i '' 's/text-orange-600/text-warning-600/g' "$file"
        
        # 5. 移除 rounded 类（扁平化设计）
        sed -i '' 's/ rounded-md//g' "$file"
        sed -i '' 's/ rounded-lg//g' "$file"
        sed -i '' 's/ rounded-xl//g' "$file"
        sed -i '' 's/ rounded-full//g' "$file"
        
        # 6. 替换阴影（使用更微妙的阴影）
        sed -i '' 's/shadow-sm/shadow-sm/g' "$file"  # 保留 shadow-sm
        sed -i '' 's/shadow-md/shadow-sm/g' "$file"  # shadow-md -> shadow-sm
        sed -i '' 's/shadow-lg/shadow-md/g' "$file"  # shadow-lg -> shadow-md
        sed -i '' 's/shadow-xl/shadow-md/g' "$file"  # shadow-xl -> shadow-md
        
        UPDATED_FILES=$((UPDATED_FILES + 1))
        echo -e "${GREEN}✓ 已更新: $file${NC}"
        
        # 删除备份
        rm "$file.bak"
    else
        SKIPPED_FILES=$((SKIPPED_FILES + 1))
    fi
}

# 函数：处理目录中的所有 tsx 文件
process_directory() {
    local dir=$1
    echo -e "\n${YELLOW}处理目录: $dir${NC}"
    
    find "$dir" -name "*.tsx" -type f | while read -r file; do
        TOTAL_FILES=$((TOTAL_FILES + 1))
        update_buttons "$file"
    done
}

# 主流程
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Insight UI 批量更新脚本${NC}"
echo -e "${GREEN}================================${NC}\n"

# 处理核心组件目录
echo -e "${YELLOW}步骤 1: 更新核心组件${NC}"
process_directory "src/components/alerts"
process_directory "src/components/oracle/common"
process_directory "src/components/oracle/forms"
process_directory "src/components/oracle/panels"
process_directory "src/components/settings"

# 处理页面组件
echo -e "\n${YELLOW}步骤 2: 更新页面组件${NC}"
process_directory "src/app/[locale]"

# 处理其他组件
echo -e "\n${YELLOW}步骤 3: 更新其他组件${NC}"
process_directory "src/components/search"
process_directory "src/components/export"
process_directory "src/components/comparison"
process_directory "src/components/mobile"
process_directory "src/components/realtime"
process_directory "src/components/data-transparency"
process_directory "src/components/accessibility"
process_directory "src/components/navigation"

# 输出统计
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}  更新完成!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "总文件数: $TOTAL_FILES"
echo -e "已更新: $UPDATED_FILES"
echo -e "跳过: $SKIPPED_FILES"
echo -e "\n${YELLOW}注意: 复杂的组件需要手动检查和调整${NC}"
echo -e "${YELLOW}建议运行: npm run build 检查是否有错误${NC}"
