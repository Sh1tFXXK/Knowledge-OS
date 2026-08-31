// Redis / MongoDB 双根融合（2026-08-31）
//  - k_vault_redis_notes（学习大纲，role: reference）：内容折入 demo_redis 新增
//    「学习大纲」标签页 + 根卡补定义；摘树归档 redirect -> demo_redis。
//  - k_vault_mongo_notes（仅"文档数据库"一词，被 demo_mongodb 定义覆盖）：
//    无独有内容，摘树归档 redirect -> demo_mongodb。
//  按 CONTEXT.md 不变量：池节点保留、不物理删除、redirect 登记。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fuse-redis-mongo-${ts}`);
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
const byRef = (ref) => findWithParent(tree, (n) => n.nodeRef === ref);
function refreshRoot(node) {
  const card = node.card;
  card.rootContent = [card.title || node.label, ...card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try { renameSync(tmp, join(DATA, file)); ok = true; }
    catch (err) {
      if (i === 7) throw err;
      console.log('rename busy, retry...');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}

const dropped = new Set();

// ---------- 1) Redis：大纲折入 + 根卡补定义 ----------
{
  const demo = pool['demo_redis'];
  const vault = pool['k_vault_redis_notes'];
  if (!demo || !vault) throw new Error('redis node missing');
  // 根卡定义
  const defTab = demo.card.tabs.find(t => t.id === 'def') || (demo.card.tabs.push({ id: 'def', label: '定义', content: '' }), demo.card.tabs[0]);
  if (!(defTab.content || '').trim()) {
    defTab.content = '**Redis**\n基于内存的键值 NoSQL 数据库：数据常驻内存并以单线程命令执行为主，读写延迟极低；支持 String/List/Hash/Set/ZSet 等多种数据结构，配套 RDB/AOF 持久化、主从复制、哨兵与 Cluster 水平扩展，广泛用于缓存、分布式锁与计数排队等场景。';
    demo.role = 'subsystem';
    refreshRoot(demo);
    console.log('demo_redis 定义已补');
  }
  // 学习大纲 tab（vault 独有内容整体保留）
  if (!demo.card.tabs.some(t => t.id === 'outline')) {
    const outline = (vault.card.tabs[0]?.content || '').trim();
    demo.card.tabs.push({ id: 'outline', label: '学习大纲（笔记）', content: outline });
    refreshRoot(demo);
    console.log('大纲折入 demo_redis');
  }
  // 摘树归档
  const entry = byRef('k_vault_redis_notes');
  if (!entry) throw new Error('vault redis tree entry missing');
  if ((entry.node.children || []).length) throw new Error('vault redis has children');
  entry.parent.children.splice(entry.parent.children.indexOf(entry.node), 1);
  vault.status = 'archived-redirect';
  gov.redirects.push({
    id: 'redirect:k_vault_redis_notes', from: 'k_vault_redis_notes', to: 'demo_redis',
    status: 'accepted', contentStatus: 'archived-redirect',
    rationale: 'Obsidian 笔记导入的 Redis 学习大纲（reference 单节点）与 Redis 主树（demo_redis）同名重复；大纲全文折入 demo_redis「学习大纲」标签页后摘树归档。',
  });
  dropped.add('k_vault_redis_notes');
  console.log('k_vault_redis_notes archived -> demo_redis');
}

// ---------- 2) MongoDB：vault 单词卡归档 ----------
{
  const demo = pool['demo_mongodb'];
  const vault = pool['k_vault_mongo_notes'];
  if (!demo || !vault) throw new Error('mongo node missing');
  const entry = byRef('k_vault_mongo_notes');
  if (!entry) throw new Error('vault mongo tree entry missing');
  if ((entry.node.children || []).length) throw new Error('vault mongo has children');
  entry.parent.children.splice(entry.parent.children.indexOf(entry.node), 1);
  vault.status = 'archived-redirect';
  gov.redirects.push({
    id: 'redirect:k_vault_mongo_notes', from: 'k_vault_mongo_notes', to: 'demo_mongodb',
    status: 'accepted', contentStatus: 'archived-redirect',
    rationale: '笔记导入的 MongoDB 单节点仅含"文档数据库"，语义已被 demo_mongodb 定义（面向文档的 NoSQL，JSON 格式存储）完全覆盖，摘树归档。',
  });
  dropped.add('k_vault_mongo_notes');
  console.log('k_vault_mongo_notes archived -> demo_mongodb');
}

// ---------- 3) 边与 placement 同步 ----------
const out = edges.filter(e => !(e.id.startsWith('treebind:') && (dropped.has(e.source) || dropped.has(e.target))));
console.log('treebind removed:', edges.length - out.length);
for (const id of dropped) {
  gov.placements = gov.placements.filter(p => p.nodeId !== id);
}

// ---------- 校验 ----------
for (const id of dropped) {
  if (byRef(id)) throw new Error('still in tree: ' + id);
}
// 题目链接不受影响（vault 节点 0 关联，双重确认）
const qs = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));
const bad = qs.filter(q => dropped.has(q.relatedNodeId));
if (bad.length) throw new Error('questions still link dropped nodes: ' + bad.map(q => q.id).join(','));
console.log('校验通过：摘净、无题目悬挂');

atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('fuse-redis-mongo complete');
