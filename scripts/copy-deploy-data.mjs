/**
 * 部署数据导出：把 6 个真源 JSON 复制进构建产物（dist/api-data/），供静态托管分发。
 *
 * 背景：/api/data 由 vite dev/preview 中间件提供（见 vite.config.js 的 dataFileApi），
 * 静态托管上不存在该中间件。部署侧由 vercel.json 的 rewrites 把
 * `/api/data?file=X` 映射到 `/api-data/X`，因此原始 JSON 必须以静态文件随产物发布。
 *
 * 只读语义：静态托管没有本地文件系统语义，部署侧不提供 PUT 落盘；
 * 编辑/保存能力仅在本机 npm run dev / preview 下可用。
 *
 * 运行：node scripts/copy-deploy-data.mjs   （由 package.json 的 vercel-build 在 vite build 之后调用）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(root, 'data');
const outDir = path.join(root, 'dist', 'api-data');

/** 与 vite.config.js 的 DATA_FILES 保持一致：6 个真源。 */
const FILES = [
  'tree-data.json',
  'node-pool.json',
  'knowledge-edges.json',
  'questions.json',
  'evolution-events.json',
  'version-chains.json',
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const failures = [];
for (const name of FILES) {
  const from = path.join(srcDir, name);
  if (!fs.existsSync(from)) {
    failures.push(`${name}（源缺失）`);
    console.log(`✖ ${name}: 源文件不存在`);
    continue;
  }
  const to = path.join(outDir, name);
  fs.copyFileSync(from, to);
  const srcBytes = fs.statSync(from).size;
  const outBytes = fs.statSync(to).size;
  const ok = srcBytes === outBytes;
  if (!ok) failures.push(`${name}（产物 ${outBytes} ≠ 源 ${srcBytes}）`);
  console.log(`${ok ? '✔' : '✖'} ${name}: ${(srcBytes / 1024 / 1024).toFixed(2)} MB`);
}

if (failures.length > 0) {
  console.error(`✖ 部署数据导出失败：${failures.join('、')}`);
  process.exit(1);
}
console.log(`✔ 6 个真源已导出到 ${path.relative(root, outDir)}（源目录 ${path.relative(root, srcDir) || '.'}）`);
