// 修正：concept_lru_list（LRU 链表）归置到数据结构域（2026-08-23）
// 用户质疑：「lru链表是数据结构，为啥放在mysql下？」
// 核实：concept_lru_list 被归到 database_principles（数据库原理），但它是通用数据结构
// （缓存淘汰策略），系统已有 theory_domain_data_structures（数据结构域，计算理论 > 算法），
// 且其下已挂 B树/R树/列表/双向链表。故把 concept_lru_list 移到数据结构域。
//
// 改动：
//  1. tree-data.json：tree_concept_lru_list 从 database_principles.children 移到 theory_domain_data_structures.children
//  2. knowledge-governance.json：更新 concept_lru_list placement（canonicalParentNodeId=theory_domain_data_structures）
//  3. 给实例 k_1782008637396_62wc7w 补 placement（此前缺失）
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-lru-placement-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, n => { if (!hit && n.id === id) hit = n; }); return hit; }

const CONCEPT = 'concept_lru_list';
const ENTRY = 'tree_concept_lru_list';
const FROM = 'database_principles';
const TO = 'theory_domain_data_structures';
const INST = 'k_1782008637396_62wc7w';

const fromNode = findNode(FROM);
const toNode = findNode(TO);
const entryNode = findNode(ENTRY);
if (!fromNode || !toNode || !entryNode) { console.error('missing node', { fromNode: !!fromNode, toNode: !!toNode, entryNode: !!entryNode }); process.exit(1); }

// 1) 从 database_principles 摘出
let removed = false;
walk(fromNode, (n, parent) => {
  if (parent && n.id === ENTRY) {
    const i = parent.children.indexOf(n);
    if (i >= 0) { parent.children.splice(i, 1); removed = true; }
  }
});
if (!removed) { console.error('tree_concept_lru_list not found under database_principles'); process.exit(1); }

// 2) 挂到数据结构域
toNode.children = toNode.children || [];
toNode.children.push(entryNode);
console.log('moved', ENTRY, '->', TO);

// 3) 更新 concept placement
const placements = gov.placements;
let conceptPl = placements.find(p => p.nodeId === CONCEPT);
if (conceptPl) {
  conceptPl.canonicalParentNodeId = TO;
  conceptPl.pathHint = ['计算机科学', '计算理论', '算法', '数据结构', pool[CONCEPT].label];
  conceptPl.rationale = 'LRU 链表是通用数据结构（缓存淘汰策略），归置数据结构域 theory_domain_data_structures；MySQL 侧保留为实例并 instance-of 回指。';
  conceptPl.rule = 'cross-domain-peeling-v1';
  console.log('updated concept placement:', CONCEPT);
} else {
  placements.push({
    id: `placement:concept:${CONCEPT}`, nodeId: CONCEPT,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: TO, canonicalTreeEntryId: ENTRY,
    pathHint: ['计算机科学', '计算理论', '算法', '数据结构', pool[CONCEPT].label],
    confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: 'LRU 链表是通用数据结构（缓存淘汰策略），归置数据结构域 theory_domain_data_structures；MySQL 侧保留为实例并 instance-of 回指。',
  });
  console.log('created concept placement:', CONCEPT);
}

// 4) 给实例补 placement
if (!placements.find(p => p.nodeId === INST)) {
  placements.push({
    id: `placement:instance:${INST}`, nodeId: INST,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: CONCEPT, canonicalTreeEntryId: ENTRY,
    pathHint: ['计算机科学', '计算理论', '算法', '数据结构', pool[CONCEPT].label, pool[INST].label],
    confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: 'MySQL 实例，自 MySQL 缓冲池簇剥离；本体见「LRU 链表 / LRU list」（数据结构域）。',
  });
  console.log('created instance placement:', INST);
} else {
  console.log('instance placement already exists:', INST);
}

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-governance.json', gov);
console.log('fix-lru-placement complete');
