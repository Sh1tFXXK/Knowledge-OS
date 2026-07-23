# Knowledge-OS 项目长期记忆

## 项目性质
数据库内部原理的多维知识图谱系统（Vite + React 19 + Zustand + TS）。版本 3.0.0。

## 数据三件套（data/）
- `node-pool.json`（~2.2MB）：全局知识节点池，`{ id: KnowledgeNode }`。节点结构 `{ id, label, role, dimensions, card: { nodeId, title, tabs[] }, tags }`，tab=`{ id, label, content, pages? }`
- `tree-data.json`：目录树（单个根对象），节点 `{ id, name, count, nodeRef, children[] }`，nodeRef 指向 node-pool 的 id（目录只存引用不存知识本体）
- `knowledge-edges.json`：关系边数组
- `questions.json` / `subsystems.json` / `inference-responses.json` / `universe-tree.json`
- 整理文档放 `docs/notes/*.md`

## 数据脚本模式（scripts/*.mjs）
- 全部无依赖 ES module（.mjs），用 managed node 跑：`C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2\node.exe scripts/xxx.mjs`
- 幂等写入范式：`ensureNode(pool,id,label,card,tags)` + `ensureTreeChild`（按 nodeRef 去重更新）
- 例：`fill-oop-wikipedia.mjs`（手写翻译填充）、`import-mysql-glossary.mjs`、`import-wikipedia.mjs`（本次新增，自动抓取）

## 前端数据加载链路
- `vite.config.js` 的 `dataFileApi()` plugin 提供 `/api/data?file=xxx` middleware，dev/preview server 直接读写 data/*.json（带 FS retry + 原子写 temp+rename）
- `App.tsx` mount 时 `useEffect → store.initialize() → loadCompleteStateFromFiles()` 从文件加载（不依赖 localStorage 优先）
- 另有 localStorage 缓存层（persist.ts），但 initialize 从文件覆盖
- **结论：改了 data/*.json 后启动 `npm run dev` 即在 UI 生效，无需重新打包或改前端**

## 关键 nodeRef（tree-data.json 挂载点）
- `n_a03cv4sd` 知识宇宙（根）
- `n_55jiel25` 计算机科学
- `k_acm2012_hardware` 硬件

## 维基百科导入功能（scripts/import-wikipedia.mjs）
用法：`node scripts/import-wikipedia.mjs <wiki-url> --parent=<nodeRef> [--dry-run] [--lang=zh]`
- 按 == / === 章节结构映射节点树；黑名单章节（参见/参考文献等，繁简）不建节点
- 节点 id 稳定 `k_wiki_<lang>_<slug>[_sN]`，幂等
- 详见 WIKIPEDIA_IMPORT_FEATURE.md

## 工作约定
- IDE dark theme；中文环境
- 修改 data/*.json 前建议备份（cp 到 /tmp）
- 路径用绝对路径调工具；文件间引用用相对路径
