/**
 * Vercel 构建入口（vercel.json 的 buildCommand = `npm run vercel-build`）。
 *
 * 与本地 `npm run build` 的差别只有一处：**强制打上只读部署标记**。
 * 线上产物是静态托管：没有 PUT 处理器、也没有 /api/data-events。客户端必须知道
 * 这件事（见 src/knowledge/deploymentMode.ts），否则会出现两种线上错相：
 *   - 把 PUT 打到不存在的端点：先弹「已保存到本地文件」，再弹「保存失败」
 *   - 用 EventSource 反复重连一个 404 的路由（每轮约 2 秒）
 *
 * 标记放在这里而不是 Vercel 后台环境变量里，是为了不依赖任何后台开关：
 * 只要构建走的是 vercel-build，产物就一定是只读的。
 * 本地验收用的可写产物走 `npm run build`（配 `vite preview`，见 AGENTS.md）。
 *
 * 运行：node scripts/deploy/vercel-build.mjs   （等价于原来的 vite build && node scripts/copy-deploy-data.mjs）
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { READ_ONLY_ENV_KEY } from './read-only-flag.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const env = { ...process.env };
if (env[READ_ONLY_ENV_KEY] === undefined) env[READ_ONLY_ENV_KEY] = '1';

// 子进程承载 vite：标记必须在 vite.config.js 求值前就在环境里
const build = spawnSync(process.execPath, [viteBin, 'build'], {
  cwd: root,
  stdio: 'inherit',
  env,
});
if (build.error) throw build.error;
if (build.status !== 0) {
  console.error(`✖ vite build 失败（退出码 ${build.status}）`);
  process.exit(build.status ?? 1);
}

// 6 个真源随产物发布：vercel.json 的 rewrites 指向 dist/api-data/*
await import('../copy-deploy-data.mjs');
