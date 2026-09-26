#!/usr/bin/env node
/**
 * GO-TOOLS-TO-SUBTREE 独立校验器 — 不复用 apply 的任何代码，
 * 从写前快照独立反推期望终态，再与写后实况逐字节比对。
 * 校验项：
 *   V1  快照三文件齐备且为合法 JSON
 *   V2  父卡容器形态（无 rootContent，键恰 {nodeId,tabs,title}）
 *   V3  父树节点恰 12 子、名称/顺序与快照原文派生一致
 *   V4  子条目形态（nodeRef 指向新实体、count=0、无 children 键）
 *   V5  12 新实体存在，rootContent = 快照父卡原文的逐字节子段（独立重派生）
 *   V6  12 条 treebind 边存在且字段逐一相等
 *   V7  池/树/边各恰 +12（对快照基线）
 *   V8  批次外零漂移：除本批改动外，三文件其余部分与快照逐字节一致
 * 用法: node scripts/go-tools-to-subtree/verify.mjs --data-dir <dir> [--snapshot <dir>]
 * 退出码 0=全 PASS；1=有 FAIL。
 */
import fs from 'node:fs';
import path from 'node:path';

const argAt = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const DATA = path.resolve(argAt('--data-dir') || '');
const SNAPSHOT = path.resolve(argAt('--snapshot') || 'outputs/tree-violation-scan/go-tools-to-subtree-snapshot');
if (!DATA || !fs.existsSync(path.join(DATA, 'node-pool.json'))) {
  console.error('missing/invalid --data-dir <dir>'); process.exit(1);
}

const NAMES = ['go build', 'go test', 'go fmt', 'go install', 'go vet', 'go run', 'go doc', 'go generate', 'go mod', 'go tool', 'gopls', '第三方工具'];
const PARENT_TREE = 'tree_1787732745218_n1p4hc';
const PARENT_K = 'k_1787732744683_8upi39';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json'];

let fails = 0;
const check = (desc, ok, actual = '') => {
  if (!ok) fails++;
  console.log((ok ? '✓' : '✗') + ' ' + desc + (actual ? ' — ' + actual : ''));
};

// V1 快照齐备
const snap = {};
let snapOk = true;
for (const f of FILES) {
  try {
    snap[f] = JSON.parse(fs.readFileSync(path.join(SNAPSHOT, f), 'utf8'));
  } catch (e) {
    snapOk = false;
    console.log('✗ V1 快照 ' + f + ' 读取/解析失败: ' + e.message);
  }
}
check('V1 快照三文件齐备且为合法 JSON', snapOk, SNAPSHOT);
if (!snapOk) process.exit(1);

// 实况
const pool = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(fs.readFileSync(path.join(DATA, 'knowledge-edges.json'), 'utf8'));

const walk = (n, cb, p) => { cb(n, p); (n.children || []).forEach((c) => walk(c, cb, n)); };
const liveNodes = [];
walk(tree, (n) => liveNodes.push(n));
const snapNodes = [];
walk(snap['tree-data.json'], (n) => snapNodes.push(n));

const parentTree = liveNodes.find((n) => n.id === PARENT_TREE);
const parentNode = pool[PARENT_K];

// V2 父卡容器形态
check('V2 父卡容器形态（无 rootContent，键恰 {nodeId,tabs,title}）',
  !!parentNode && !('rootContent' in parentNode.card) &&
  JSON.stringify(Object.keys(parentNode.card).sort()) === JSON.stringify(['nodeId', 'tabs', 'title']),
  parentNode ? Object.keys(parentNode.card).join(',') : '父实体缺失');

// V5 的独立派生：从【快照】父卡原文重切 12 段（与 apply 相同规则，但数据源是快照）
const src = snap['node-pool.json'][PARENT_K]?.card?.rootContent ?? '';
const lines = src.split('\n');
const stripQ = (s) => s.replace(/^"/, '').replace(/"$/, '');
const derived = [];
for (let i = 0; i < 9; i++) derived.push([NAMES[i], stripQ(lines[i])]);
derived.push([NAMES[9], stripQ(lines[9]) + '\n' + stripQ(lines[10])]);
derived.push([NAMES[10], lines[12]]);
derived.push([NAMES[11], lines[14]]);

// V3 父树 12 子、名称/顺序一致
const children = parentTree?.children ?? [];
check('V3 父树节点恰 12 子且名称/顺序与派生一致',
  children.length === 12 && JSON.stringify(children.map((c) => c.name)) === JSON.stringify(NAMES),
  children.map((c) => c.name).join(','));

// V4 子条目形态
check('V4 子条目 nodeRef 指向池中实体、count=0、无 children 键',
  children.every((c) => c.nodeRef && pool[c.nodeRef] && c.count === 0 && !('children' in c)));

// V5 新实体 rootContent = 快照原文逐字节子段（键序也要一致：nodeId,title,tabs,rootContent）
const ents = children.map((c) => pool[c.nodeRef]);
check('V5 12 新实体存在且 rootContent 与快照原文逐字节一致',
  ents.length === 12 && ents.every((e, i) =>
    !!e && e.label === NAMES[i] && JSON.stringify(e.tags) === JSON.stringify([NAMES[i]]) &&
    e.card.rootContent === derived[i][1] &&
    JSON.stringify(Object.keys(e.card)) === JSON.stringify(['nodeId', 'title', 'tabs', 'rootContent'])),
  ents.map((e) => e ? e.card.rootContent.length : '缺失').join('/'));

// V6 treebind 边
const wantEdgeShape = (e, childK, treeId) =>
  e && e.id === `treebind:${PARENT_TREE}:${treeId}` && e.source === PARENT_K && e.target === childK &&
  e.type === 'belongs-to' && e.label === 'contains' && e.relationKind === 'structure' &&
  JSON.stringify(Object.keys(e).sort()) === JSON.stringify(['id', 'label', 'relationKind', 'source', 'target', 'type']);
check('V6 12 条 treebind 边存在且字段逐一相等',
  children.every((c) => wantEdgeShape(edges.find((e) => e.id === `treebind:${PARENT_TREE}:${c.id}`), c.nodeRef, c.id)));

// V7 计数 +12
check('V7 池/树/边各恰 +12',
  Object.keys(pool).length === Object.keys(snap['node-pool.json']).length + 12 &&
  liveNodes.length === snapNodes.length + 12 &&
  edges.length === snap['knowledge-edges.json'].length + 12,
  `池 ${Object.keys(snap['node-pool.json']).length}→${Object.keys(pool).length} | 树 ${snapNodes.length}→${liveNodes.length} | 边 ${snap['knowledge-edges.json'].length}→${edges.length}`);

// V8 批次外零漂移：池/边 = 差集比对；树 = 递归结构比对（插入只影响父链，
//    故逐节点比对标量字段 + 子项 id 序列，而非整棵子树 stringify——否则
//    父链上每个祖先都会因 children 内含新节点而被误报）
const newPoolIds = Object.keys(pool).filter((id) => !(id in snap['node-pool.json']));
const newEdgeIds = edges.map((e) => e.id).filter((id) => !snap['knowledge-edges.json'].some((e) => e.id === id));
const batchPoolIds = new Set(children.map((c) => c.nodeRef));
const batchEdgeIds = new Set(children.map((c) => `treebind:${PARENT_TREE}:${c.id}`));
const batchTreeIds = new Set(children.map((c) => c.id));

const unexpectedPool = newPoolIds.filter((id) => !batchPoolIds.has(id));
const unexpectedEdges = newEdgeIds.filter((id) => !batchEdgeIds.has(id));
// 存量实体除父卡外必须逐字节不变
const changedPool = Object.keys(snap['node-pool.json']).filter((id) =>
  id !== PARENT_K && JSON.stringify(snap['node-pool.json'][id]) !== JSON.stringify(pool[id]));
// 存量边逐字节不变（含删除检测）
const changedEdges = snap['knowledge-edges.json'].filter((e) =>
  !edges.some((x) => JSON.stringify(x) === JSON.stringify(e)));

const treeProblems = [];
const cmpSubtrees = (s, l, parentId) => {
  for (const k of new Set([...Object.keys(s), ...Object.keys(l)])) {
    if (k === 'children') continue;
    if (JSON.stringify(s[k]) !== JSON.stringify(l[k])) treeProblems.push(`树字段变动 ${l.id}.${k}`);
  }
  const sKids = s.children ?? [], lKids = l.children ?? [];
  const sById = new Map(sKids.map((c) => [c.id, c]));
  const lById = new Map(lKids.map((c) => [c.id, c]));
  const retained = lKids.filter((c) => sById.has(c.id)).map((c) => c.id);
  if (JSON.stringify(retained) !== JSON.stringify(sKids.map((c) => c.id))) treeProblems.push(`子项序列变动 @ ${l.id}`);
  for (const [id] of lById) {
    if (!sById.has(id) && !(parentId === PARENT_TREE && batchTreeIds.has(id))) treeProblems.push(`意外新增树节点 ${id} @ ${parentId}`);
  }
  for (const [id, c] of sById) {
    const lv = lById.get(id);
    if (lv) cmpSubtrees(c, lv, id);
  }
};
cmpSubtrees(snap['tree-data.json'], tree, '(root)');

check('V8 批次外零漂移（池/边无意外新增；树仅父下 +12，其余结构逐字节不变）',
  unexpectedPool.length === 0 && unexpectedEdges.length === 0 &&
  changedPool.length === 0 && changedEdges.length === 0 && treeProblems.length === 0,
  [
    unexpectedPool.length ? '意外新实体:' + unexpectedPool.join(',') : '',
    unexpectedEdges.length ? '意外新边:' + unexpectedEdges.join(',') : '',
    changedPool.length ? '被改实体:' + changedPool.join(',') : '',
    changedEdges.length ? '被改/删边:' + changedEdges.length + ' 条' : '',
    treeProblems.length ? '树:' + treeProblems.slice(0, 5).join(' | ') + (treeProblems.length > 5 ? ` …共${treeProblems.length}项` : '') : '',
  ].filter(Boolean).join(' || ') || 'clean');

// 父卡变化必须恰好是「删 rootContent」，实体其余字段（label/tags/id）不变
const snapParent = snap['node-pool.json'][PARENT_K];
const snapParentCard = JSON.parse(JSON.stringify(snapParent.card));
const beforeRC = snapParentCard.rootContent;
delete snapParentCard.rootContent;
check('V9 父卡变化恰为「rootContent 移除」，实体其余字段不变',
  snapParent.label === parentNode.label && snapParent.id === parentNode.id &&
  JSON.stringify(snapParent.tags) === JSON.stringify(parentNode.tags) &&
  JSON.stringify(snapParentCard) === JSON.stringify(parentNode.card) &&
  typeof beforeRC === 'string' && beforeRC.length > 0);

console.log(fails ? `\nFAIL ${fails} 项` : '\nALL PASS');
process.exit(fails ? 1 : 0);
