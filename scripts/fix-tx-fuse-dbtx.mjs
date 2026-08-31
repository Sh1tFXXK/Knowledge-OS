// 「数据库事务」与章节融合（2026-08-30 第六轮）
// 用户反馈：事务系统章节本身就在「数据库」之下，章节语境里事务即数据库事务，
// 「数据库事务」域级中间层冗余，继续融合。
// 改动：
//  1) 数据库事务卡的全部标签页并入「MySQL 事务」卡（定义、本体、目的、事务性数据库、
//     对象数据库、分布式事务、事务性的文件系统），MySQL 事务 def 尾部改回直指本体。
//  2) 图上恢复直接链：MySQL 事务 -instance-of-> 事务（concept_transaction）；
//     删除 数据库事务 -instance-of-> 事务 边。
//  3) 数据库事务 摘树 + archived-redirect → MySQL 事务（内容已并入）。
//  4) 章节一级：MySQL 事务 成为首节，其余顺序不变。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-tx-fuse-dbtx-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

function findWithParent(node, pred, parent = null) {
  if (pred(node)) return { node, parent };
  for (const c of node.children || []) {
    const hit = findWithParent(c, pred, node);
    if (hit) return hit;
  }
  return null;
}
const byRef = (nodeRef) => findWithParent(tree, (n) => n.nodeRef === nodeRef);
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try { renameSync(tmp, join(DATA, file)); ok = true; }
    catch (err) {
      if (i === 7) throw err;
      console.log(`rename ${file} busy, retry ${i + 1}/7...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}
function refreshRootContent(node) {
  const card = node.card;
  card.rootContent = [card.title || node.label, ...card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}

const DBTX = 'k_1783250593540_v2w5hy';
const MYTX = 'n_ag24bbkc';

// 1) 标签页并入 MySQL 事务
const dbTx = pool[DBTX];
const myTx = pool[MYTX];
const defTab = myTx.card.tabs.find((t) => t.id === 'def');
const insertAt = myTx.card.tabs.indexOf(defTab) + 1;
for (const tab of dbTx.card.tabs) {
  const label = tab.id === 'ontology' ? '本体（事务 / transaction）' : tab.label;
  const id = tab.id === 'ontology' ? 'ontology' : `dbtx_${tab.id}`;
  if (myTx.card.tabs.some((t) => t.id === id)) continue;
  myTx.card.tabs.splice(insertAt, 0, { id, label, content: tab.content });
}
defTab.content = defTab.content.replace(
  '本节点是 MySQL 对「数据库事务」的产品实现；「数据库事务」上承「事务 / transaction」通用本体。',
  '本节点是实例，其本体见「事务 / transaction」概念节点（章节语境下即数据库事务）。',
);
refreshRootContent(myTx);
console.log('标签页并入 MySQL 事务:', myTx.card.tabs.map((t) => t.label).join(' | '));

// 2) 图：恢复直接 instance-of 链
const childEdge = edges.find((e) => e.id === `rel:${DBTX}:instance-of:${MYTX}`);
if (!childEdge) throw new Error('MySQL 事务→数据库事务 edge not found');
childEdge.id = 'rel:concept_transaction:instance-of:n_ag24bbkc';
childEdge.target = 'concept_transaction';
console.log('edge retargeted: MySQL 事务 -instance-of-> 事务');
const before = edges.length;
const out = edges.filter((e) => !(e.id === `rel:concept_transaction:instance-of:${DBTX}`));
console.log('removed 数据库事务 instance-of edge:', before - out.length);

// 3) 摘树 + 归档重定向
const hit = byRef(DBTX);
if (!hit) throw new Error('数据库事务 tree entry not found');
const i = hit.parent.children.indexOf(hit.node);
hit.parent.children.splice(i, 1);
pool[DBTX].status = 'archived-redirect';
gov.redirects.push({
  id: `redirect:${DBTX}`, from: DBTX, to: MYTX,
  status: 'accepted', contentStatus: 'archived-redirect',
  rationale: '事务系统章节位于「数据库」之下，章节语境中事务即数据库事务，域级中间层取消；全部标签页（定义、本体、目的、事务性数据库、对象数据库、分布式事务、事务性的文件系统）已并入「MySQL 事务」卡片。',
});
gov.placements = gov.placements.filter((p) => p.nodeId !== DBTX);
console.log('数据库事务 unmounted + redirect -> MySQL 事务');

// 4) MySQL 事务 placement 指向本体
{
  const pl = gov.placements.find((p) => p.nodeId === MYTX);
  if (pl) {
    pl.canonicalParentNodeId = 'concept_transaction';
    pl.pathHint = ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', 'MySQL 事务'];
    console.log('placement updated: MySQL 事务 -> concept_transaction');
  }
}

// 5) 章节顺序确认：MySQL 事务 应为首节
const TX = '七、事务系统';
const chapter = findWithParent(tree, (n) => n.name === TX).node;
console.log('章节一级:', chapter.children.map((c) => c.name).join(' → '));

atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('fix-tx-fuse-dbtx complete');
