#!/usr/bin/env node
/**
 * TXMGR-TYPES-TO-SUBTREE — 「事务管理器类型」解释卡表格物化为 4 个子树节点
 * 表格 4 行（类型 + 说明）就地转成子节点：说明入子卡 rootContent，父卡清空为容器
 * （对齐兄弟节点「实现方式」：容器不存正文、内容由子节点承载；「同一知识不存两处」）。
 * 默认 DRY-RUN；--apply 才写盘（写前备份 → data/backups/）。
 * 用法: node scripts/txmgr-types-to-subtree/apply.mjs --data-dir <dir> [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const argDir = process.argv[process.argv.indexOf('--data-dir') + 1];
if (!argDir || argDir.startsWith('--')) { console.error('missing --data-dir <dir>'); process.exit(1); }
const DATA = path.resolve(argDir);
if (!fs.existsSync(path.join(DATA, 'node-pool.json'))) { console.error('data-dir 无效: ' + DATA); process.exit(1); }

const PARENT_TREE = 'tree_1789990688009_p6e9n1';
const PARENT_K = 'k_1789990688000_67h3y4';
const EXPECTED = [
  ['DataSourceTransactionManager', 'JDBC事务'],
  ['HibernateTransactionManager', 'Hibernate事务'],
  ['JtaTransactionManager', 'JTA事务'],
  ['JpaTransactionManager', 'JPA事务'],
];

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const pool = read('node-pool.json');
const tree = read('tree-data.json');
const edges = read('knowledge-edges.json');

const failures = [];
const gate = (desc, ok, actual = '') => {
  if (!ok) failures.push(desc);
  console.log((ok ? '✓' : '✗') + ' ' + desc + (actual ? ' — ' + actual : ''));
};

const walk = (n, cb, p) => { cb(n, p); (n.children || []).forEach((c) => walk(c, cb, n)); };
const allTreeNodes = [];
walk(tree, (n) => allTreeNodes.push(n));
let parentTreeNode = null;
walk(tree, (n) => { if (n.id === PARENT_TREE) parentTreeNode = n; });

console.log('== TXMGR-TYPES-TO-SUBTREE ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
console.log('data-dir: ' + DATA);

// ── 前置断言 ──────────────────────────────────────────────────────
gate('G1 父树节点存在且当前无子节点', !!parentTreeNode && !(parentTreeNode.children?.length), parentTreeNode ? `${parentTreeNode.name} children=${parentTreeNode.children?.length ?? 0}` : '缺失');
gate('G2 父树节点 nodeRef 指向父实体', parentTreeNode?.nodeRef === PARENT_K);

const parentNode = pool[PARENT_K];
gate('G3 父实体存在', !!parentNode, parentNode?.label);

// 表格解析
const parseTable = (text) => {
  const rows = [];
  for (const line of String(text).split('\n')) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^[-:\s]*$/.test(c))) continue; // 分隔行
    rows.push(cells);
  }
  return rows;
};
const rows = parentNode?.card?.rootContent ? parseTable(parentNode.card.rootContent) : [];
const header = rows[0] ?? [];
const data = rows.slice(1);
gate('G4 表格表头为「类型|说明」', header.length === 2 && header[0] === '类型' && header[1] === '说明', JSON.stringify(header));
gate('G5 表格恰 4 行数据且与预期逐条一致', data.length === 4 && JSON.stringify(data) === JSON.stringify(EXPECTED), `${data.length} 行`);

const NAMES = EXPECTED.map(([n]) => n);
const dupTree = allTreeNodes.filter((n) => NAMES.includes(n.name)).map((n) => n.id);
gate('G6 全树无同名节点（4 类型名）', dupTree.length === 0, dupTree.join(','));
const dupPool = Object.values(pool).filter((n) => NAMES.includes(n.label)).map((n) => n.id);
gate('G7 池中无同名 label', dupPool.length === 0, dupPool.join(','));

const parentOutTb = edges.filter((e) => e.id.startsWith(`treebind:${PARENT_TREE}:`));
gate('G8 父树节点当前无 treebind 出边（防重复挂载）', parentOutTb.length === 0, String(parentOutTb.length));

// id 生成（复刻 genId：prefix_Date.now()_rand6）
const taken = new Set([...Object.keys(pool), ...allTreeNodes.map((n) => n.id), ...edges.map((e) => e.id)]);
const now = Date.now();
const genId = (prefix) => {
  for (let i = 0; i < 50; i++) {
    const id = `${prefix}_${now}_${Math.random().toString(36).slice(2, 8)}`;
    if (!taken.has(id)) { taken.add(id); return id; }
  }
  throw new Error('id 生成碰撞 50 次: ' + prefix);
};
const created = EXPECTED.map(([name, desc]) => {
  const knowledgeId = genId('k');
  const treeId = genId('tree');
  return { name, desc, knowledgeId, treeId };
});
gate('G9 新 id 均无碰撞', created.every((c) => !Object.keys(pool).includes(c.knowledgeId) && !allTreeNodes.some((n) => n.id === c.treeId)));

// ── 变更计划 ──────────────────────────────────────────────────────
console.log('\n计划变更：');
for (const c of created) console.log(`  + ${c.name}  (${c.treeId} / ${c.knowledgeId})  说明「${c.desc}」`);
console.log(`  - 父卡 ${PARENT_K} 删除 rootContent（${parentNode?.card?.rootContent?.length ?? 0} 字）`);
console.log(`  池 ${Object.keys(pool).length}→${Object.keys(pool).length + 4} | 树 ${allTreeNodes.length}→${allTreeNodes.length + 4} | 边 ${edges.length}→${edges.length + 4}`);

if (failures.length) { console.log('\n前置断言失败 ' + failures.length + ' 项，不写盘'); process.exit(1); }
if (!APPLY) { console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。'); process.exit(0); }

// ── 写前备份 ──────────────────────────────────────────────────────
const backup = {
  note: 'TXMGR-TYPES-TO-SUBTREE 回滚记录：删除 created 中的树/池/边实体并回填 parentCardBefore.rootContent 即可还原',
  at: new Date(now).toISOString(),
  parentTreeId: PARENT_TREE,
  parentKnowledgeId: PARENT_K,
  parentCardBefore: JSON.parse(JSON.stringify(parentNode.card)),
  created,
  edges: created.map((c) => ({
    id: `treebind:${PARENT_TREE}:${c.treeId}`, source: PARENT_K, target: c.knowledgeId,
    type: 'belongs-to', label: 'contains', relationKind: 'structure',
  })),
  countsBefore: { pool: Object.keys(pool).length, tree: allTreeNodes.length, edges: edges.length },
};
const bkDir = path.join(DATA, 'backups');
fs.mkdirSync(bkDir, { recursive: true });
const bkPath = path.join(bkDir, 'txmgr-types-to-subtree-' + now + '.json');
fs.writeFileSync(bkPath, JSON.stringify(backup, null, 2) + '\n', 'utf8');
console.log('\n备份 → ' + bkPath);

// ── 变更 ─────────────────────────────────────────────────────────
// 1) 新实体：说明入子卡 rootContent（定义→rootContent，与兄弟子节点同构）
for (const c of created) {
  pool[c.knowledgeId] = {
    id: c.knowledgeId,
    label: c.name,
    tags: [c.name],
    card: { nodeId: c.knowledgeId, title: c.name, tabs: [], rootContent: c.desc },
  };
}
// 2) 父树节点挂 4 个子条目（叶子形态：无 children 键）
parentTreeNode.children = created.map((c) => ({ id: c.treeId, name: c.name, count: 0, nodeRef: c.knowledgeId }));
// 3) treebind 边（复刻 createTreeBindingEdge 形态；父/子均无 dimensions → 省略该键）
for (const c of created) {
  edges.push(backup.edges.find((e) => e.target === c.knowledgeId));
}
// 4) 父卡清空为容器（删 rootContent 键，对齐「实现方式」card 形态）
delete parentNode.card.rootContent;

// ── 写后断言 ──────────────────────────────────────────────────────
const allTreeNodesAfter = [];
walk(tree, (n) => allTreeNodesAfter.push(n));
const post = [];
const pgate = (desc, ok, actual = '') => { if (!ok) failures.push('POST:' + desc); post.push((ok ? '✓' : '✗') + ' ' + desc + (actual ? ' — ' + actual : '')); };
pgate('G10 父卡已无 rootContent 键', !('rootContent' in parentNode.card));
pgate('G11 父卡形态 {nodeId,title,tabs}', JSON.stringify(Object.keys(parentNode.card).sort()) === JSON.stringify(['nodeId', 'tabs', 'title']), Object.keys(parentNode.card).join(','));
pgate('G12 父树节点恰 4 子且名称/顺序一致', parentTreeNode.children.length === 4 && JSON.stringify(parentTreeNode.children.map((c) => c.name)) === JSON.stringify(NAMES));
pgate('G13 每条子条目指向新实体且 count=0', parentTreeNode.children.every((c, i) => c.nodeRef === created[i].knowledgeId && c.count === 0 && !('children' in c)));
pgate('G14 池 +4', Object.keys(pool).length === backup.countsBefore.pool + 4, String(Object.keys(pool).length));
pgate('G15 树 +4', allTreeNodesAfter.length === backup.countsBefore.tree + 4, String(allTreeNodesAfter.length));
pgate('G16 边 +4 且形态一致', edges.length === backup.countsBefore.edges + 4 && backup.edges.every((want) => {
  const got = edges.find((e) => e.id === want.id);
  return got && JSON.stringify(got) === JSON.stringify(want);
}), String(edges.length));
pgate('G17 新实体各恰被 1 条树引用', created.every((c) => allTreeNodesAfter.filter((n) => n.nodeRef === c.knowledgeId).length === 1));
pgate('G18 新实体卡 rootContent = 对应说明', created.every((c) => pool[c.knowledgeId].card.rootContent === c.desc));
pgate('G19 无重复边 id', new Set(edges.map((e) => e.id)).size === edges.length);

if (failures.length) { console.log(post.join('\n')); console.log('\n写后断言失败 ' + failures.length + ' 项'); process.exit(1); }

// ── 原子写盘 ──────────────────────────────────────────────────────
const writeAtomic = (file, content) => {
  const fp = path.join(DATA, file);
  const tmp = fp + '.tmp-txmgrmove';
  fs.writeFileSync(tmp, content, 'utf8');
  try { fs.renameSync(tmp, fp); }
  catch (e) {
    if (e.code === 'EPERM' || e.code === 'UNKNOWN' || String(e).includes('EPERM')) {
      fs.writeFileSync(fp, content, 'utf8');
      try { fs.unlinkSync(tmp); } catch {}
    } else throw e;
  }
};
writeAtomic('node-pool.json', JSON.stringify(pool, null, 2) + '\n');
writeAtomic('tree-data.json', JSON.stringify(tree, null, 2) + '\n');
writeAtomic('knowledge-edges.json', JSON.stringify(edges, null, 2) + '\n');

console.log(post.join('\n'));
console.log('\nAPPLY OK — ' + DATA);
console.log('  池=' + Object.keys(pool).length + ' | 树=' + allTreeNodesAfter.length + ' | 边=' + edges.length);
console.log('  新实体: ' + created.map((c) => `${c.name}=${c.knowledgeId}`).join(', '));
