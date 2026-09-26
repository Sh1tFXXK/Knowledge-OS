#!/usr/bin/env node
/**
 * GO-TOOLS-TO-SUBTREE — 「工具」解释卡工具清单物化为 12 个子树节点
 * 父卡 k_1787732744683_8upi39（树节点 tree_1787732745218_n1p4hc，go 之下）的
 * 10 条 go 命令 + gopls + 第三方工具生态段落，就地转成子节点：
 * 说明入子卡 rootContent，父卡清空为容器（对齐兄弟「模块」空卡容器形态与
 * treeUtils 规范化叶子形态——无 children 键；「同一知识不存两处」）。
 * 子卡内容 = 父卡原文逐字节子串（仅剥源头遗留的孤立引号 "）。
 * 默认 DRY-RUN；--apply 才写盘（写前快照 → outputs/tree-violation-scan/go-tools-to-subtree-snapshot/）。
 * 用法: node scripts/go-tools-to-subtree/apply.mjs --data-dir <dir> [--apply] [--snapshot <dir>]
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const argAt = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const DATA = path.resolve(argAt('--data-dir') || '');
if (!DATA || !fs.existsSync(path.join(DATA, 'node-pool.json'))) {
  console.error('missing/invalid --data-dir <dir>'); process.exit(1);
}
const SNAPSHOT = path.resolve(argAt('--snapshot') || 'outputs/tree-violation-scan/go-tools-to-subtree-snapshot');

const PARENT_TREE = 'tree_1787732745218_n1p4hc';
const PARENT_K = 'k_1787732744683_8upi39';
const NAMES = ['go build', 'go test', 'go fmt', 'go install', 'go vet', 'go run', 'go doc', 'go generate', 'go mod', 'go tool', 'gopls', '第三方工具'];

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

console.log('== GO-TOOLS-TO-SUBTREE ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
console.log('data-dir: ' + DATA);

// ── 前置断言 ──────────────────────────────────────────────────────
gate('G1 父树节点存在且当前无子节点', !!parentTreeNode && !(parentTreeNode.children?.length), parentTreeNode ? `${parentTreeNode.name} children=${parentTreeNode.children?.length ?? 0}` : '缺失');
gate('G2 父树节点 nodeRef 指向父实体', parentTreeNode?.nodeRef === PARENT_K);

const parentNode = pool[PARENT_K];
gate('G3 父实体存在', !!parentNode, parentNode?.label);

const src = parentNode?.card?.rootContent ?? '';
gate('G4 父卡 rootContent 非空（容器化前有内容可拆）', src.length > 0, src.length + ' 字');

// 逐字节子串派生：前 9 行各成一段；第 10-11 行合并为 go tool；
// 空行后的两个段落分别为 gopls 与第三方工具。剥孤立引号（源头拷贝残留）。
const lines = src.split('\n');
const stripQ = (s) => s.replace(/^"/, '').replace(/"$/, '');
gate('G5 行数与空行布局符合预期（10 命令行 + 空 + 段落 + 空 + 段落 = 15 行）', lines.length === 15 && lines[11] === '' && lines[13] === '', String(lines.length));
const derived = [];
for (let i = 0; i < 9; i++) derived.push([NAMES[i], stripQ(lines[i])]);
derived.push([NAMES[9], stripQ(lines[9]) + '\n' + stripQ(lines[10])]);
derived.push([NAMES[10], lines[12]]);
derived.push([NAMES[11], lines[14]]);
gate('G6 派生段名与预期一致', JSON.stringify(derived.map(([n]) => n)) === JSON.stringify(NAMES));
gate('G7 12 段内容均非空且无残余孤立引号', derived.every(([, c]) => c.length > 0 && !/^"|"$/.test(c.trim())));

const dupTree = allTreeNodes.filter((n) => NAMES.includes(n.name)).map((n) => n.id);
gate('G8 全树无同名节点（12 工具名）', dupTree.length === 0, dupTree.join(','));
const dupPool = Object.values(pool).filter((n) => NAMES.includes(n.label)).map((n) => n.id);
gate('G9 池中无同名 label', dupPool.length === 0, dupPool.join(','));

const parentOutTb = edges.filter((e) => e.id.startsWith(`treebind:${PARENT_TREE}:`));
gate('G10 父树节点当前无 treebind 出边（防重复挂载）', parentOutTb.length === 0, String(parentOutTb.length));

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
const created = NAMES.map((name) => {
  const knowledgeId = genId('k');
  const treeId = genId('tree');
  return { name, knowledgeId, treeId };
});
gate('G11 新 id 均无碰撞', created.every((c) => !Object.keys(pool).includes(c.knowledgeId) && !allTreeNodes.some((n) => n.id === c.treeId)));

// ── 变更计划 ──────────────────────────────────────────────────────
console.log('\n计划变更：');
for (let i = 0; i < 12; i++) console.log(`  + ${NAMES[i]}  (${created[i].treeId} / ${created[i].knowledgeId})  「${derived[i][1].slice(0, 40)}${derived[i][1].length > 40 ? '…' : ''}」`);
console.log(`  ~ 父卡 ${PARENT_K} 删除 rootContent（${src.length} 字）清空为容器`);
console.log(`  池 ${Object.keys(pool).length}→${Object.keys(pool).length + 12} | 树 ${allTreeNodes.length}→${allTreeNodes.length + 12} | 边 ${edges.length}→${edges.length + 12}`);

if (failures.length) { console.log('\n前置断言失败 ' + failures.length + ' 项，不写盘'); process.exit(1); }
if (!APPLY) { console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。'); process.exit(0); }

// ── 写前快照（verify 以此为 before 独立反推；目录不入库，excludedSet 登记）──
fs.mkdirSync(SNAPSHOT, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) {
  fs.copyFileSync(path.join(DATA, f), path.join(SNAPSHOT, f));
}
console.log('\n快照 → ' + SNAPSHOT);

// ── 变更 ─────────────────────────────────────────────────────────
// 1) 新实体：说明入子卡 rootContent（复刻 createKnowledgeNode + rootContent，
//    card 键序 nodeId,title,tabs,rootContent）
for (let i = 0; i < 12; i++) {
  const { knowledgeId, name } = created[i];
  pool[knowledgeId] = {
    id: knowledgeId,
    label: name,
    tags: [name],
    card: { nodeId: knowledgeId, title: name, tabs: [], rootContent: derived[i][1] },
  };
}
// 2) 父树节点挂 12 个子条目（叶子形态：无 children 键，同 createTreeEntry/「模块」）
parentTreeNode.children = created.map((c) => ({ id: c.treeId, name: c.name, count: 0, nodeRef: c.knowledgeId }));
// 3) treebind 边（复刻 createTreeBindingEdge 形态；无 dimensions → 省略该键）
const wantEdges = created.map((c) => ({
  id: `treebind:${PARENT_TREE}:${c.treeId}`, source: PARENT_K, target: c.knowledgeId,
  type: 'belongs-to', label: 'contains', relationKind: 'structure',
}));
const poolBefore = read('node-pool.json');
const countsBefore = { pool: Object.keys(poolBefore).length, tree: allTreeNodes.length, edges: edges.length };
const parentCardBefore = JSON.parse(JSON.stringify(parentNode.card));
for (const e of wantEdges) edges.push(e);
// 4) 父卡清空为容器（删 rootContent 键，对齐「模块」card 形态 {nodeId,title,tabs}）
delete parentNode.card.rootContent;

// ── 写后断言 ──────────────────────────────────────────────────────
const allTreeNodesAfter = [];
walk(tree, (n) => allTreeNodesAfter.push(n));
const post = [];
const pgate = (desc, ok, actual = '') => { if (!ok) failures.push('POST:' + desc); post.push((ok ? '✓' : '✗') + ' ' + desc + (actual ? ' — ' + actual : '')); };
pgate('G12 父卡已无 rootContent 键', !('rootContent' in parentNode.card));
pgate('G13 父卡形态 {nodeId,title,tabs}', JSON.stringify(Object.keys(parentNode.card).sort()) === JSON.stringify(['nodeId', 'tabs', 'title']), Object.keys(parentNode.card).join(','));
pgate('G14 父树节点恰 12 子且名称/顺序一致', parentTreeNode.children.length === 12 && JSON.stringify(parentTreeNode.children.map((c) => c.name)) === JSON.stringify(NAMES));
pgate('G15 每条子条目指向新实体且 count=0 无 children 键', parentTreeNode.children.every((c, i) => c.nodeRef === created[i].knowledgeId && c.count === 0 && !('children' in c)));
pgate('G16 池 +12', Object.keys(pool).length === countsBefore.pool + 12, String(Object.keys(pool).length));
pgate('G17 树 +12', allTreeNodesAfter.length === allTreeNodes.length + 12, String(allTreeNodesAfter.length));
pgate('G18 边 +12 且形态一致', edges.length === countsBefore.edges + 12 && wantEdges.every((want) => {
  const got = edges.find((e) => e.id === want.id);
  return got && JSON.stringify(got) === JSON.stringify(want);
}), String(edges.length));
pgate('G19 新实体各恰被 1 条树引用', created.every((c) => allTreeNodesAfter.filter((n) => n.nodeRef === c.knowledgeId).length === 1));
pgate('G20 新实体卡 rootContent = 派生段原文', created.every((c, i) => pool[c.knowledgeId].card.rootContent === derived[i][1]));
pgate('G21 无重复边 id', new Set(edges.map((e) => e.id)).size === edges.length);
pgate('G22 除本批外池实体零改动', Object.entries(pool).every(([id, n]) =>
  created.some((c) => c.knowledgeId === id) || id === PARENT_K ||
  JSON.stringify(n) === JSON.stringify(poolBefore[id])));

if (failures.length) { console.log(post.join('\n')); console.log('\n写后断言失败 ' + failures.length + ' 项，不写盘'); process.exit(1); }

// ── 原子写盘 ──────────────────────────────────────────────────────
const writeAtomic = (file, content) => {
  const fp = path.join(DATA, file);
  const tmp = fp + '.tmp-gotools';
  fs.writeFileSync(tmp, content, 'utf8');
  try { fs.renameSync(tmp, fp); }
  catch {
    fs.writeFileSync(fp, content, 'utf8');
    try { fs.unlinkSync(tmp); } catch {}
  }
};
writeAtomic('node-pool.json', JSON.stringify(pool, null, 2) + '\n');
writeAtomic('tree-data.json', JSON.stringify(tree, null, 2) + '\n');
writeAtomic('knowledge-edges.json', JSON.stringify(edges, null, 2) + '\n');

console.log(post.join('\n'));
console.log('\nAPPLY OK — ' + DATA);
console.log('  池=' + Object.keys(pool).length + ' | 树=' + allTreeNodesAfter.length + ' | 边=' + edges.length);
console.log('  父卡变更前形态已存快照 parentCardBefore（如需回滚：删 12 实体 + 12 边 + 父 children 清空 + 回填 rootContent）');
void parentCardBefore;
