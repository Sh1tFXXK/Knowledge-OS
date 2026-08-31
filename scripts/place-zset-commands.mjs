// 「Redis 数据类型」（k_vault_redis_datatypes，ZSET 命令详解）归位：
//  改名「ZSET 命令：ZRANK 与 ZRANGE」，从 NoSQL 层移到 Redis → 数据类型 → zset 之下。
//  节点与内容整体保留（CONTEXT.md 不变量 6）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['tree-data.json', 'node-pool.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `place-zset-commands-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));

function findWithParent(node, pred, parent = null) {
  if (pred(node)) return { node, parent };
  for (const c of node.children || []) {
    const hit = findWithParent(c, pred, node);
    if (hit) return hit;
  }
  return null;
}
const byRef = (ref) => findWithParent(tree, (n) => n.nodeRef === ref);

const entry = byRef('k_vault_redis_datatypes');
if (!entry) throw new Error('tree entry missing');
const zset = byRef('k_1786235757225_82in77');
if (!zset) throw new Error('zset node missing');

// 摘出并挂到 zset 下
entry.parent.children.splice(entry.parent.children.indexOf(entry.node), 1);
zset.node.children = zset.node.children || [];
zset.node.children.push(entry.node);

// 改名 + pool label 同步
const newName = 'ZSET 命令：ZRANK 与 ZRANGE';
entry.node.name = newName;
const p = pool['k_vault_redis_datatypes'];
p.label = newName;
if (p.card) { p.card.title = newName; p.card.rootContent = [p.card.title || p.label, ...p.card.tabs.map(t => t.content || '')].join(' ').replace(/\s+/g, ' ').trim(); }

console.log('moved+renamed: Redis 数据类型 ->', newName, '(under zset)');

// placement 同步
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));
const pl = gov.placements.find(x => x.nodeId === 'k_vault_redis_datatypes');
if (pl) {
  pl.canonicalParentNodeId = 'k_1786235757225_82in77';
  pl.canonicalTreeEntryId = entry.node.id;
  console.log('placement updated');
} else {
  gov.placements.push({
    id: 'placement:k_vault_redis_datatypes', nodeId: 'k_vault_redis_datatypes',
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: 'k_1786235757225_82in77', canonicalTreeEntryId: entry.node.id,
    pathHint: ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '二、数据模型', 'NoSQL', 'Redis', '数据类型', 'zset', 'ZSET 命令'],
    confidence: 'high',
    rationale: 'ZSET 命令详解（ZRANK/ZRANGE）归位到 zset 数据类型之下；原「Redis 数据类型」标题与主树数据类型节撞名，更名后保留内容。',
  });
  console.log('placement created');
}

// treebind 同步：删旧绑定，建新绑定
let out = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
out = out.filter(e => !(e.id.startsWith('treebind:') && e.target === 'k_vault_redis_datatypes'));
out.push({
  id: `treebind:${entry.node.id}:k_vault_redis_datatypes`,
  source: 'k_1786235757225_82in77', target: 'k_vault_redis_datatypes',
  type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [],
});
console.log('treebind rebuilt');

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
atomicWrite('tree-data.json', tree);
atomicWrite('node-pool.json', pool);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('place-zset-commands complete');
