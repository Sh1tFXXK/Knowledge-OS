// 同题合并收尾（2026-08-30 第三轮）
//  1) 把上一步追加到卡片末尾的合并块移动到正文内的正确位置
//     （词条卡插在「另见/来源」之前，实例卡插在「本节点是实例」尾巴之前）。
//  2) 「MySQL 锁模式与锁操作」为纯主题索引、无独立信息点且无子节点，
//     同题合并归档到「MySQL 锁模式」词条。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-tx-merge-position-${ts}`);
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
function refreshRootContent(node) {
  const card = node.card;
  card.rootContent = [card.title || node.label, ...card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}

// 1) 重定位合并块：[nodeId, 合并块首行特征, 插入锚点]
const REPOS = [
  ['k_dict_yvuxhe74', '又称**读锁**（S Lock）', '\n\n另请参见'],
  ['mysql_glossary_exclusive_lock_ksqz5a', '又称**排他锁**（X Lock）', '\n\n另请参阅'],
  ['mysql_glossary_auto_increment_locking_lrps8v', 'InnoDB 的自增锁模式由', '\n\n另见'],
  ['mysql_glossary_table_lock_15y9vl', '粒度为**整张表**', '\n\n另请参阅'],
  ['demo_optimistic', '**InnoDB 中的乐观策略**', '\n\n本节点是实例'],
  ['demo_pessimistic', '**InnoDB 中的悲观策略**', '\n\n本节点是实例'],
];
for (const [id, head, anchor] of REPOS) {
  const tab = pool[id].card.tabs.find((t) => t.id === 'def') || pool[id].card.tabs[0];
  const idx = tab.content.indexOf(head);
  if (idx < 0) throw new Error(`merge block not found in ${id}`);
  const block = tab.content.slice(idx);
  if (tab.content.slice(0, idx).endsWith(anchor)) { console.log('already positioned:', id); continue; }
  tab.content = tab.content.slice(0, idx).trimEnd();
  const at = tab.content.indexOf(anchor);
  if (at < 0) throw new Error(`anchor not found in ${id}: ${anchor}`);
  tab.content = tab.content.slice(0, at) + '\n\n' + block.trim() + tab.content.slice(at);
  refreshRootContent(pool[id]);
  console.log('repositioned merge block:', id);
}

// 2) 锁模式与锁操作：纯索引归档
{
  const dupId = 'mysql_lock_modes', canon = 'mysql_glossary_lock_mode_h31or1';
  const hit = byRef(dupId);
  if (!hit) throw new Error('tree entry not found: ' + dupId);
  if ((hit.node.children || []).length) throw new Error(dupId + ' has children');
  const i = hit.parent.children.indexOf(hit.node);
  hit.parent.children.splice(i, 1);
  pool[dupId].status = 'archived-redirect';
  gov.redirects.push({
    id: `redirect:${dupId}`, from: dupId, to: canon,
    status: 'accepted', contentStatus: 'archived-redirect',
    rationale: '内容为操作层主题索引（锁模式、锁定、锁升级、锁定读），无独立信息点；锁模式由词条承载，锁升级/锁定读已各自成节点。同题合并归档。',
  });
  const before = gov.placements.length;
  gov.placements = gov.placements.filter((p) => p.nodeId !== dupId);
  if (gov.placements.length !== before) console.log('placement removed:', dupId);
  console.log('redirect registered:', dupId, '->', canon);
}

// 3) treebind 同步
const UNMOUNTED = new Set(['mysql_lock_modes']);
const mounts = new Map();
(function walk(n, parent) {
  if (n.nodeRef) mounts.set(n.nodeRef, { entryId: n.id, parentEntryId: parent?.id ?? null, parentNodeRef: parent?.nodeRef ?? null });
  for (const c of n.children || []) walk(c, n);
})(tree, null);
const out = edges.filter((e) => !(e.id.startsWith('treebind:') && (UNMOUNTED.has(e.source) || UNMOUNTED.has(e.target))));
console.log('treebind removed:', edges.length - out.length, `(edges ${edges.length} -> ${out.length})`);

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('fix-tx-merge-position complete');
