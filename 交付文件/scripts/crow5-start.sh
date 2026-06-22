#!/bin/sh
set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
if [ ! -d "$ROOT_DIR/./node_modules" ]; then
  echo "[Crow5] 未发现依赖，先执行: npm install"
  (cd "$ROOT_DIR/." && npm install) || exit 1
fi

cd "$ROOT_DIR/."
echo "[Crow5] 启动项目：npm run dev"
exec npm run dev
