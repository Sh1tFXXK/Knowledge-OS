// 修复 IO/NIO 目录树节点卡片正文不显示的问题（2026-08-28）
// 原因：前端 getKnowledgeExplanation 取正文用 card.rootContent 或 id 为 'def' 的 tab
//       （见 src/store/useGraph.ts），fusion 导入的节点 tab id 是 'main'，导致卡片显示「无内容」。
// 动作：IO与NIO 子树全部节点的首个 tab id 统一改为 'def'（label 不变，内容不变）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-io-nio-def-tab-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

const root = findTreeNode(tree, 'tree_java_io_nio');
if (!root) throw new Error('tree_java_io_nio not found');
const refs = new Set();
(function walk(n) { if (n.nodeRef) refs.add(n.nodeRef); for (const c of n.children ?? []) walk(c); })(root);

let fixed = 0;
for (const ref of refs) {
  const node = pool[ref];
  if (!node?.card?.tabs?.length) continue;
  let changed = false;
  for (const tab of node.card.tabs) {
    if (tab.id !== 'def') { tab.id = 'def'; changed = true; }
  }
  if (changed) fixed++;
}

const tmp = join(DATA, 'node-pool.json.tmp-' + process.pid);
writeFileSync(tmp, JSON.stringify(pool, null, 2), 'utf8');
renameSync(tmp, join(DATA, 'node-pool.json'));
console.log(`fixed tab id -> 'def' for ${fixed}/${refs.size} IO/NIO nodes`);
