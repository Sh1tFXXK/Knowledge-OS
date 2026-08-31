// 同步 fix-tx-system-ontology 移动/摘除节点的 treebind 结构边（2026-08-30）
// repair:data 因 demo_mysql 旧根早已移除而不可用（与本次改动无关），
// 故只针对本次触碰的节点重建绑定，其余历史分歧保持现状。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-tx-treebind-sync-${ts}`);
mkdirSync(backupDir, { recursive: true });
copyFileSync(join(DATA, 'knowledge-edges.json'), join(backupDir, 'knowledge-edges.json'));
console.log('backup ->', backupDir);

const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

const MOVED = new Set([
  'concept_phantom_read', 'concept_non_repeatable_read', 'concept_dirty_read',
  'k_dict_8o426b5j', 'k_dict_c9sxzvqt',
  'k_1783250593540_v2w5hy', 'n_ag24bbkc',
  'k_dict_kgntvds7', 'mysql_glossary_intention_lock_1ejpzi',
  'k_dict_o5254svl',
  'k_dict_3dltrcza', 'k_dict_o0jw5g8p', 'k_dict_4zr5j9bz', 'k_dict_i1g9hhj8',
]);
const UNMOUNTED = new Set([
  'mysql_glossary_read_phenomena_n0vs4m', 'mysql_lock_latches', 'mysql_lock_intention',
  'demo_shared_lock', 'demo_exclusive_lock', 'mysql_lock_auto_increment',
  'mysql_glossary_mdl_braceg', 'mysql_lock_metadata', 'k_1782024439070_bvfq6r',
]);

// 当前树的挂载事实：nodeRef -> {entryId, parentEntryId, parentNodeRef}
const mounts = new Map();
(function walk(n, parent) {
  if (n.nodeRef) mounts.set(n.nodeRef, { entryId: n.id, parentEntryId: parent?.id ?? null, parentNodeRef: parent?.nodeRef ?? null });
  for (const c of n.children || []) walk(c, n);
})(tree, null);

const dimsOf = (nodeRef) => []; // 结构边维度沿用旧边，不推断

let updated = 0, created = 0, removed = 0;
// 1) 摘除节点：删除其全部 treebind 边
const kept = [];
for (const e of edges) {
  if (e.id.startsWith('treebind:') && (UNMOUNTED.has(e.source) || UNMOUNTED.has(e.target))) { removed++; continue; }
  kept.push(e);
}
// 2) 移动节点：保留恰好一条与树一致的绑定
const perTarget = new Map();
for (const e of kept) {
  if (!e.id.startsWith('treebind:')) { continue; }
  if (MOVED.has(e.target)) {
    if (!perTarget.has(e.target)) perTarget.set(e.target, []);
    perTarget.get(e.target).push(e);
    continue;
  }
}
const dropIds = new Set();
for (const [nodeRef, list] of perTarget) {
  const m = mounts.get(nodeRef);
  const want = list.find((e) => e.source === m.parentNodeRef);
  if (want) {
    for (const e of list) if (e !== want) dropIds.add(e.id);
    // 修正 id 与 source 至当前父
    const newId = `treebind:${m.parentEntryId}:${m.entryId}`;
    if (want.source !== m.parentNodeRef || want.id !== newId) {
      want.source = m.parentNodeRef;
      want.id = newId;
      updated++;
    }
  } else {
    // 没有指向当前父的绑定：改第一条，其余丢弃
    const first = list[0];
    first.source = m.parentNodeRef;
    first.id = `treebind:${m.parentEntryId}:${m.entryId}`;
    updated++;
    for (const e of list.slice(1)) dropIds.add(e.id);
  }
}
let out = kept.filter((e) => !dropIds.has(e.id));
removed += dropIds.size;
// 3) 缺绑定的新/移动节点补建
for (const nodeRef of MOVED) {
  const m = mounts.get(nodeRef);
  if (!m || !m.parentNodeRef) continue;
  const wantId = `treebind:${m.parentEntryId}:${m.entryId}`;
  if (out.some((e) => e.id === wantId)) continue;
  if (out.some((e) => e.id.startsWith('treebind:') && e.target === nodeRef)) continue;
  out.push({
    id: wantId, source: m.parentNodeRef, target: nodeRef,
    type: 'belongs-to', label: 'contains', relationKind: 'structure',
    dimensions: dimsOf(nodeRef),
  });
  created++;
}
console.log(`treebind synced: updated=${updated} created=${created} removed=${removed} (edges ${edges.length} -> ${out.length})`);

const tmp = join(DATA, `knowledge-edges.json.tmp-${process.pid}`);
writeFileSync(tmp, JSON.stringify(out, null, 2), 'utf8');
renameSync(tmp, join(DATA, 'knowledge-edges.json'));
console.log('fix-tx-treebind-sync complete');
