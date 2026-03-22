#!/bin/bash

# 同步 doudizhu/web-client 源代码到当前目录
# 用法: ./sync-from-doudizhu.sh [commit_message]

set -e

SOURCE_DIR="/Users/xjt520/taker/ai/doudizhu/web-client"
TARGET_DIR="/Users/xjt520/taker/ai/web-client"

# 检查源目录是否存在
if [ ! -d "$SOURCE_DIR" ]; then
    echo "错误: 源目录不存在: $SOURCE_DIR"
    exit 1
fi

echo "开始同步..."

# 1. 同步 src 目录
echo "同步 src/ ..."
rm -rf "$TARGET_DIR/src"
cp -r "$SOURCE_DIR/src" "$TARGET_DIR/src"

# 2. 同步 public 目录
echo "同步 public/ ..."
rm -rf "$TARGET_DIR/public"
cp -r "$SOURCE_DIR/public" "$TARGET_DIR/public"

# 3. 同步根目录源代码文件
echo "同步根目录文件..."
cp "$SOURCE_DIR/package.json" "$TARGET_DIR/"
cp "$SOURCE_DIR/package-lock.json" "$TARGET_DIR/"
cp "$SOURCE_DIR/index.html" "$TARGET_DIR/"
cp "$SOURCE_DIR/vite.config.ts" "$TARGET_DIR/"
cp "$SOURCE_DIR/tsconfig.json" "$TARGET_DIR/"
cp "$SOURCE_DIR/tsconfig.node.json" "$TARGET_DIR/"
cp "$SOURCE_DIR/tailwind.config.js" "$TARGET_DIR/"
cp "$SOURCE_DIR/postcss.config.js" "$TARGET_DIR/"
cp "$SOURCE_DIR/.env.example" "$TARGET_DIR/"
cp "$SOURCE_DIR/.env.cloud" "$TARGET_DIR/"

# 4. 删除多余文件（保留配置文件和 gitpages）
echo "清理多余文件..."
rm -f "$TARGET_DIR/e2e-test-report.html"
rm -rf "$TARGET_DIR/test-results"
rm -rf "$TARGET_DIR/.idea"

# 5. 保留的文件（不删除）:
# - .env, .env.local (本地配置)
# - .github/ (gitpages workflow)
# - .git, node_modules/, dist/

echo "同步完成!"

# 6. 显示变更
echo ""
echo "变更文件:"
cd "$TARGET_DIR"
git status --short

# 7. 提交
COMMIT_MSG="${1:-feat: sync all source code from doudizhu/web-client}"
echo ""
echo "提交更改..."
git add -A
git commit -m "$(cat <<EOF
$COMMIT_MSG

💘 Generated with Crush

Assisted-by: GLM-5 via Crush <crush@charm.land>

EOF
)"

echo ""
echo "提交完成!"
git log --oneline -1
