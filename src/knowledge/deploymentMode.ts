/**
 * 部署形态：当前产物是不是只读部署。
 *
 * 线上是静态托管（Vercel）：`/api/data` 只有 GET —— vercel.json 把
 * `/api/data?file=X` 重写到静态产物 `dist/api-data/X`；既没有 PUT 处理器，
 * 也没有 `/api/data-events`。可写环境只有本地 dev/preview，那里的
 * `/api/data` 由 vite.config.js 的 dataFileApi 中间件提供。
 *
 * 这个值是**构建期注入的字面量**（vite.config.js 的 define ← scripts/deploy/read-only-flag.mjs），
 * 不是运行时探测：只读产物里它是 true，可写产物里是 false。
 * 未注入时（node 单测/脚本直接 import 本模块）按可写处理，与本地语义一致。
 */
declare const __KNOWLEDGE_OS_READ_ONLY__: boolean | undefined;

export const READ_ONLY_DEPLOYMENT: boolean = (() => {
  try {
    return __KNOWLEDGE_OS_READ_ONLY__ === true;
  } catch {
    return false;
  }
})();
