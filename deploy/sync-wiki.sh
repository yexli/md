#!/bin/bash
#
# 让服务器上的站点与 GitHub 仓库保持一致。
#
# 用法：把本文件放到服务器（例如 /www/wwwroot/sync-wiki.sh），
#       然后在宝塔「计划任务」里建一个 Shell 脚本任务定时执行，也可以手动跑一次。
#
# 前提：服务器上已经克隆过本仓库，例如
#       cd /www/wwwroot && git clone https://github.com/yexli/md.git md
#
# 说明：md/ 目录是运行时读取的，同步完刷新页面即生效，不需要构建、不需要重启。
#       界面代码（index.html / assets/）是构建产物，只在 src/ 改动时才需要重新生成，
#       默认不处理，需要时把文件末尾那几行注释打开。
#
set -euo pipefail

REPO_DIR="${REPO_DIR:-/www/wwwroot/md}"
SITE_DIR="${SITE_DIR:-/www/wwwroot/md.oneyer.cc}"

log() { echo "[$(date '+%F %T')] $*"; }

cd "$REPO_DIR"

# 1. 拉取仓库最新提交
git pull --ff-only
log "仓库已更新到 $(git rev-parse --short HEAD)"

# 2. 同步文档目录（这是日常唯一需要同步的东西）
mkdir -p "$SITE_DIR/md"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete md/ "$SITE_DIR/md/"
else
  rm -rf "$SITE_DIR/md"
  cp -r md "$SITE_DIR/md"
fi
log "文档已同步：$(find "$SITE_DIR/md" -name '*.md' -o -name '*.markdown' | wc -l) 篇"

# 3. 界面代码（可选）
#    src/ 或 vite.config.js 有改动时才需要，服务器要先装 Node
# export PATH=/www/server/nodejs/v22.12.0/bin:$PATH
# npm ci
# npm run build
# rsync -a --delete dist/index.html dist/assets "$SITE_DIR/"
# log "界面代码已重新构建"
