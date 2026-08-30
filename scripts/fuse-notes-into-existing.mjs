// 拆除所有「（笔记）」包装层，内容融合进已有知识结构（2026-08-29）
// 软件工程/设计模式（笔记）→ 并入已有的 软件设计/设计模式 子树
// 软件工程/面向对象（笔记）/DRY/身份认证 → 去掉（笔记）后缀，直接挂 软件工程 下
// 分布式系统/架构设计（笔记）→ 拆掉包装层，内容节点直接挂 分布式系统 下（去掉（笔记）后缀）
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fuse-notes-into-existing-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
function findTreeByName(node, name) { if (node.name === name) return node; for (const c of node.children ?? []) { const f = findTreeByName(c, name); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };
const cleanBind = (nodeRef) => { edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === nodeRef || e.source === nodeRef))); };

// ========== A. 软件工程：设计模式（笔记）→ 并入已有 设计模式 子树 ==========
const dmNotes = findTreeByName(tree, '设计模式（笔记）');
const dmExisting = findTreeByName(tree, '设计模式');
if (dmNotes && dmExisting) {
  // 把 创建型/结构型/行为型 三个子组直接挂到已有 设计模式 下（去掉（笔记）后缀）
  for (const sub of [...(dmNotes.children ?? [])]) {
    sub.name = sub.name.replace(/（笔记）/g, '');
    dmNotes.children = dmNotes.children.filter((c) => c !== sub);
    dmExisting.children.push(sub);
    cleanBind(sub.nodeRef);
    upsertEdge({ id: `treebind:${dmExisting.id}:${sub.id}`, source: dmExisting.nodeRef, target: sub.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
  }
  // 把 设计模式.md 的 index 内容追加到已有 设计模式 节点的卡片
  const wikiDm = pool['k_oop_wiki_design_patterns'];
  if (wikiDm) {
    const notesIdx = pool['k_vault_se_design_patterns'];
    if (notesIdx) {
      const idxContent = (notesIdx.card?.tabs?.[0]?.content ?? '').trim();
      if (idxContent) {
        wikiDm.card.tabs[0].content = String(wikiDm.card.tabs[0].content).trimEnd() + `\n\n【设计模式笔记总览】\n${idxContent}`;
      }
    }
  }
  // 摘除 设计模式（笔记） 包装组
  const swEng = findTreeByName(tree, '软件工程');
  swEng.children = (swEng.children ?? []).filter((c) => c.id !== dmNotes.id);
  cleanBind(dmNotes.nodeRef);
  delete pool[dmNotes.nodeRef];
  console.log('设计模式（笔记）→ 已并入已有 设计模式 子树');
}

// 软件工程/面向对象（笔记）→ 改名 面向对象（笔记）去掉后缀，提升到 软件工程 直下
const ooNotes = findTreeByName(tree, '面向对象（笔记）');
if (ooNotes) {
  ooNotes.name = '面向对象';
  if (pool[ooNotes.nodeRef]) { pool[ooNotes.nodeRef].label = '面向对象'; if (pool[ooNotes.nodeRef].card) pool[ooNotes.nodeRef].card.title = '面向对象'; }
}
// DRY/身份认证 去掉（笔记）
for (const c of findTreeByName(tree, '软件工程').children ?? []) {
  if (c.name === 'DRY 原则（笔记）') c.name = 'DRY 原则';
  if (c.name === '身份认证（笔记）') c.name = '身份认证';
}
if (pool['k_vault_se_dry']) pool['k_vault_se_dry'].label = 'DRY 原则';
if (pool['k_vault_se_auth']) pool['k_vault_se_auth'].label = '身份认证';

// ========== B. 分布式系统：拆掉 架构设计（笔记） 包装层 ==========
const archNotes = findTreeByName(tree, '架构设计（笔记）');
const distTree = findTreeByName(tree, '分布式系统');
if (archNotes && distTree) {
  // 先把 高并发架构（笔记）/服务可用性治理（笔记）/唯一ID生成器（笔记）/存储层技术（笔记） 拆掉
  for (const sub of [...(archNotes.children ?? [])]) {
    const subName = sub.name.replace(/（笔记）/g, '');
    sub.name = subName;
    if (pool[sub.nodeRef]) { pool[sub.nodeRef].label = subName; if (pool[sub.nodeRef].card) pool[sub.nodeRef].card.title = subName; }
    // 把子组的子节点提升到 分布式系统 直下
    for (const leaf of [...(sub.children ?? [])]) {
      sub.children = sub.children.filter((c) => c !== leaf);
      leaf.name = leaf.name.replace(/（笔记）/g, '');
      if (pool[leaf.nodeRef]) { pool[leaf.nodeRef].label = leaf.name.replace(/（维基）/g, ''); if (pool[leaf.nodeRef].card) pool[leaf.nodeRef].card.title = leaf.name; }
      distTree.children.push(leaf);
      cleanBind(leaf.nodeRef);
      upsertEdge({ id: `treebind:${distTree.id}:${leaf.id}`, source: distTree.nodeRef, target: leaf.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['database'] });
    }
    // 摘除子组
    archNotes.children = archNotes.children.filter((c) => c !== sub);
    cleanBind(sub.nodeRef);
    delete pool[sub.nodeRef];
    console.log('dissolved:', subName, '-> children promoted to 分布式系统');
  }
  // 处理 架构设计（笔记） 直下的叶子（用户登录服务/服务发现/读，写请求路由方式/读&写分离架构）
  for (const leaf of [...(archNotes.children ?? [])]) {
    leaf.name = leaf.name.replace(/（笔记）/g, '');
    if (pool[leaf.nodeRef]) { pool[leaf.nodeRef].label = leaf.name; if (pool[leaf.nodeRef].card) pool[leaf.nodeRef].card.title = leaf.name; }
    archNotes.children = archNotes.children.filter((c) => c !== leaf);
    distTree.children.push(leaf);
    cleanBind(leaf.nodeRef);
    upsertEdge({ id: `treebind:${distTree.id}:${leaf.id}`, source: distTree.nodeRef, target: leaf.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['database'] });
  }
  // 摘除 架构设计（笔记） 包装组
  distTree.children = distTree.children.filter((c) => c.id !== archNotes.id);
  cleanBind(archNotes.nodeRef);
  delete pool[archNotes.nodeRef];
  distTree.count = distTree.children.length;
  console.log('架构设计（笔记）已解散，内容提升到 分布式系统 直下');
}

// ========== 清理文件名残留 ==========
function cleanSuffixes(n) {
  if (n.name.includes('（笔记）')) { n.name = n.name.replace(/（笔记）/g, ''); if (pool[n.nodeRef]) { pool[n.nodeRef].label = n.name; if (pool[n.nodeRef].card) pool[n.nodeRef].card.title = n.name; } }
  for (const c of n.children ?? []) cleanSuffixes(c);
}
cleanSuffixes(tree);

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
// 不得再有（笔记）组
const s = JSON.stringify(tree);
if (s.includes('（笔记）')) problems.push('still has （笔记） groups');
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error(`integrity failed: ${problems.length}`); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
console.log(`fuse-notes-into-existing complete:
  - 设计模式（笔记）→ 并入已有 设计模式 子树
  - 分布式系统 下架构笔记全部提升为直系子节点
  - 所有（笔记）后缀清除`);
