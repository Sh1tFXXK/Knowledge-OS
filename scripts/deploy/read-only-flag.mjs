/**
 * 只读部署标记：构建期唯一判定处。
 *
 * 背景：线上是静态托管 —— `/api/data` 只有 GET（vercel.json 把 `/api/data?file=X`
 * 重写到静态产物 `dist/api-data/X`），既没有 PUT 处理器，也没有 `/api/data-events`。
 * 可写环境只有本地：`/api/data` 的读写中间件由 vite.config.js 的 dataFileApi 提供，
 * 且只挂在 configureServer / configurePreviewServer 上。
 *
 * 所以「当前产物是不是只读部署」必须在构建期钉死，再由 vite define 注入客户端
 * （见 src/knowledge/deploymentMode.ts）。判定顺序：
 *
 *   1. `KNOWLEDGE_OS_READ_ONLY=1|true`  → 只读（Vercel 侧由 scripts/deploy/vercel-build.mjs 设置）
 *   2. `KNOWLEDGE_OS_READ_ONLY=0|false` → 可写（逃生口：本地想跑只读产物时反过来用）
 *   3. 未设置 → 回落 `VERCEL=1`（Vercel 构建/运行时自动注入的 system env var）
 *   4. 都没命中 → 可写（本地 npm run dev / npm run build + vite preview）
 */

export const READ_ONLY_ENV_KEY = 'KNOWLEDGE_OS_READ_ONLY';

const TRUE_VALUES = new Set(['1', 'true']);
const FALSE_VALUES = new Set(['0', 'false']);

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {boolean} 该次构建是否产出只读产物
 */
export function resolveReadOnlyDeployment(env = {}) {
  const explicit = typeof env[READ_ONLY_ENV_KEY] === 'string'
    ? env[READ_ONLY_ENV_KEY].trim().toLowerCase()
    : '';

  if (TRUE_VALUES.has(explicit)) return true;
  if (FALSE_VALUES.has(explicit)) return false;

  return env.VERCEL === '1';
}
