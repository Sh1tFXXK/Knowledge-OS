#!/usr/bin/env node
/**
 * JSP-MECHANISM-VIEW — 把 JSP「执行主线」mermaid 从解释卡搬进机制视图。
 *
 * 变更内容（同一知识不存两处：卡片移除 mermaid，机制数据承接执行主线）：
 *   1) 宿主 k_vault_javajavawebjsp_elp41h 补 kind=mechanism + mechanismSpec；
 *   2) 新增 7 个节点（1 event 触发 + 6 state 状态）与 7 条 transitions-to 转移边；
 *   3) 7 个节点作为子树节点挂在 tree_vault_javajavawebjsp_elp41h 下（+7 treebind 边）；
 *   4) 解释卡删除 mermaid（rootContent / def tab 两处），保留引言与关联阅读。
 *
 * 落盘前用真实的 validateMechanismSpec / projectKnowledgeMechanism / runProcess
 * 对「模拟变更后的数据」跑通机制投影，全部 gate 通过才写盘。
 * 默认 DRY-RUN；--apply 才写盘（写前备份 → data/backups/）。
 * 用法: node --experimental-transform-types scripts/jsp-mechanism-view/apply.mjs --data-dir <dir> [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';
import { runProcess } from '../../src/mechanism/core.ts';
import {
  inspectKnowledgeMechanism,
  projectKnowledgeMechanism,
} from '../../src/mechanism/knowledgeProjection.ts';
import { validateMechanismSpec } from '../../src/mechanism/validation.ts';

const APPLY = process.argv.includes('--apply');
const argDir = process.argv[process.argv.indexOf('--data-dir') + 1];
if (!argDir || argDir.startsWith('--')) { console.error('missing --data-dir <dir>'); process.exit(1); }
const DATA = path.resolve(argDir);
if (!fs.existsSync(path.join(DATA, 'node-pool.json'))) { console.error('data-dir 无效: ' + DATA); process.exit(1); }

const HOST_K = 'k_vault_javajavawebjsp_elp41h';
const HOST_TREE = 'tree_vault_javajavawebjsp_elp41h';
const INTRO = 'JSP 是 JavaWeb 时代把“模板页面”封装进 Servlet 体系的一种方式。它的本质不是独立运行，而是被容器转换成 Servlet 后参与请求处理。';
const MERMAID = [
  '```mermaid',
  'flowchart TD',
  '    A[浏览器请求 JSP] --> B[容器检查是否已编译]',
  '    B -->|首次或变更| C[JSP 转 Servlet 源码]',
  '    C --> D[编译为 Class]',
  '    D --> E[加载并初始化]',
  '    E --> F[service 处理请求]',
  '    B -->|已编译| F',
  '    F --> G[输出 HTML]',
  '```',
].join('\n');
const ROOT_BEFORE = `${INTRO}\n\n## 执行主线\n\n${MERMAID}`;
const TAB_BEFORE = `> ${INTRO}\n\n## 执行主线\n\n${MERMAID}\n\n## 关联阅读\n\n- 05-JSP与视图渲染\n- Servlet`;
const ROOT_AFTER = INTRO;
const TAB_AFTER = `> ${INTRO}\n\n## 关联阅读\n\n- 05-JSP与视图渲染\n- Servlet`;

/** 7 个执行主线节点（顺序 = 流程图 A..G，决定树序与投影实体序） */
const FEATURES = [
  {
    key: 'trigger', nodeId: 'jsp_trigger_request', treeId: 'tree_jsp_trigger_request',
    label: '浏览器请求 JSP', kind: 'event', role: 'axiom',
    desc: '浏览器对 .jsp 地址发起 HTTP 请求，请求进入 Servlet 容器的 JSP 处理链路。',
  },
  {
    key: 'check', nodeId: 'jsp_state_check', treeId: 'tree_jsp_state_check',
    label: '容器检查是否已编译', kind: 'state', role: 'conclusion',
    desc: '容器按页面对应的 Servlet 类是否已存在判断走向：首次访问或 JSP 源文件变更时走翻译编译，已编译则直接复用。',
  },
  {
    key: 'translate', nodeId: 'jsp_state_translate', treeId: 'tree_jsp_state_translate',
    label: 'JSP 转 Servlet 源码', kind: 'state', role: 'conclusion',
    desc: '容器把 JSP 页面翻译成等价的 Servlet Java 源码，页面模板代码被组织进 _jspService 方法。',
  },
  {
    key: 'compile', nodeId: 'jsp_state_compile', treeId: 'tree_jsp_state_compile',
    label: '编译为 Class', kind: 'state', role: 'conclusion',
    desc: '翻译出的 Java 源码交给编译器编译成 Class 字节码，产物由容器管理。',
  },
  {
    key: 'load', nodeId: 'jsp_state_load', treeId: 'tree_jsp_state_load',
    label: '加载并初始化', kind: 'state', role: 'conclusion',
    desc: '容器类加载器加载编译产物并完成 Servlet 初始化，得到可处理请求的实例。',
  },
  {
    key: 'service', nodeId: 'jsp_state_service', treeId: 'tree_jsp_state_service',
    label: 'service 处理请求', kind: 'state', role: 'conclusion',
    desc: '容器调用实例的 service 方法，页面代码按 Servlet 逻辑处理本次请求。',
  },
  {
    key: 'output', nodeId: 'jsp_state_output', treeId: 'tree_jsp_state_output',
    label: '输出 HTML', kind: 'state', role: 'conclusion',
    desc: '处理结果写出为 HTML 响应，浏览器渲染页面。',
  },
];

/** 7 条转移边（对应流程图 7 条连线；t6 为「已编译」分支） */
const TRANSITIONS = [
  ['jsp:t1', 'trigger', 'check', '请求进入容器'],
  ['jsp:t2', 'check', 'translate', '首次访问或页面变更'],
  ['jsp:t3', 'translate', 'compile', '翻译出源码'],
  ['jsp:t4', 'compile', 'load', '编译产出 Class'],
  ['jsp:t5', 'load', 'service', '初始化完成'],
  ['jsp:t6', 'check', 'service', '已编译直接复用'],
  ['jsp:t7', 'service', 'output', '写出 HTML 响应'],
];

const PARTICIPANT_CONTAINER = 'asplit_servlet_container';
/** BFS 投影的预期步序（分支合并让 output 提前于 compile/load，与 RDB 同型） */
const EXPECTED_STEP_ORDER = ['jsp:t1', 'jsp:t2', 'jsp:t6', 'jsp:t3', 'jsp:t7', 'jsp:t4', 'jsp:t5'];

const nodeById = new Map(FEATURES.map((f) => [f.key, f]));
const spec = {
  phenomenonNodeId: HOST_K,
  triggerNodeIds: ['jsp_trigger_request'],
  participantNodeIds: [HOST_K, PARTICIPANT_CONTAINER],
  stateNodeIds: FEATURES.filter((f) => f.kind === 'state').map((f) => f.nodeId),
  transitionEdgeIds: TRANSITIONS.map(([id]) => id),
  constraintEdgeIds: [],
  outcomeNodeIds: ['jsp_state_output'],
  failureNodeIds: [],
};

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
let hostTreeNode = null;
walk(tree, (n) => { if (n.id === HOST_TREE) hostTreeNode = n; });

console.log('== JSP-MECHANISM-VIEW ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
console.log('data-dir: ' + DATA);

// ── 前置断言 ──────────────────────────────────────────────────────
const host = pool[HOST_K];
gate('G1 宿主实体存在', !!host, host?.label);
gate('G2 宿主尚未标记为机制（防重跑）', !!host && host.kind === undefined && host.mechanismSpec === undefined,
  `kind=${host?.kind} spec=${!!host?.mechanismSpec}`);
gate('G3 宿主树节点存在且无子节点', !!hostTreeNode && hostTreeNode.nodeRef === HOST_K && (hostTreeNode.children?.length ?? 0) === 0,
  hostTreeNode ? `children=${hostTreeNode.children?.length ?? 0}` : '缺失');
gate('G4 宿主卡片 rootContent 恰为「引言 + 执行主线 mermaid」', host?.card?.rootContent === ROOT_BEFORE,
  host?.card?.rootContent === undefined ? 'rootContent 缺失' : `实际长度 ${host.card.rootContent.length}`);
gate('G5 宿主 def tab 内容与预期逐字一致', host?.card?.tabs?.length === 1 && host.card.tabs[0].id === 'def' && host.card.tabs[0].content === TAB_BEFORE);
gate('G6 宿主当前无出向 treebind（防重复挂载）',
  edges.filter((e) => e.id.startsWith(`treebind:${HOST_TREE}:`)).length === 0);

const plannedNodeIds = FEATURES.map((f) => f.nodeId);
const plannedTreeIds = FEATURES.map((f) => f.treeId);
const plannedEdgeIds = TRANSITIONS.map(([id]) => id);
gate('G7 新节点 id 不与池冲突', plannedNodeIds.every((id) => !pool[id]));
gate('G8 新树条目 id 不与全树冲突', plannedTreeIds.every((id) => !allTreeNodes.some((n) => n.id === id)));
gate('G9 新边 id 不与现有边冲突',
  plannedEdgeIds.every((id) => !edges.some((e) => e.id === id))
  && plannedTreeIds.every((tid) => !edges.some((e) => e.id === `treebind:${HOST_TREE}:${tid}`)));
const labels = FEATURES.map((f) => f.label);
gate('G10 池中无同名 label', Object.values(pool).every((n) => !labels.includes(n.label)));
gate('G11 全树无同名条目', allTreeNodes.every((n) => !labels.includes(n.name)));
gate('G12 参与方 Servlet 容器存在', !!pool[PARTICIPANT_CONTAINER], pool[PARTICIPANT_CONTAINER]?.label);

// 变更前基线：全部机制宿主投影（用于「不波及其他机制」回归门）
const mechanismHostIds = Object.values(pool).filter((n) => n.kind === 'mechanism').map((n) => n.id);
const baselineProjections = new Map(mechanismHostIds.map((id) => {
  const projection = projectKnowledgeMechanism({ focusNodeId: id, nodePool: pool, knowledgeEdges: edges, treeData: tree });
  return [id, projection && {
    mechanismNodeId: projection.mechanismNodeId,
    entities: projection.model.entities.length,
    relations: projection.model.relations.length,
    steps: projection.process.steps.length,
  }];
}));

// ── 构造变更载荷 ──────────────────────────────────────────────────
const newNodes = FEATURES.map((f) => ({
  id: f.nodeId,
  label: f.label,
  role: f.role,
  dimensions: ['java'],
  tags: [f.label],
  kind: f.kind,
  card: {
    nodeId: f.nodeId,
    title: f.label,
    tabs: [{ id: 'def', label: '定义', content: f.desc }],
    rootContent: `${f.label}\n\n${f.desc}`,
  },
}));
const newTreeChildren = FEATURES.map((f) => ({ id: f.treeId, name: f.label, count: 0, nodeRef: f.nodeId, children: [] }));
const newTreeBinds = FEATURES.map((f) => ({
  id: `treebind:${HOST_TREE}:${f.treeId}`,
  source: HOST_K,
  target: f.nodeId,
  type: 'belongs-to',
  label: 'contains',
  relationKind: 'structure',
  dimensions: ['java'],
}));
const newTransitions = TRANSITIONS.map(([id, from, to, label]) => ({
  id,
  source: nodeById.get(from).nodeId,
  target: nodeById.get(to).nodeId,
  type: 'transitions-to',
  label,
  relationKind: 'state-transition',
  dimensions: ['java'],
}));

console.log('\n计划变更：');
for (const f of FEATURES) console.log(`  + [${f.kind}] ${f.label}  (${f.nodeId} / ${f.treeId})`);
for (const [id, from, to, label] of TRANSITIONS) console.log(`  + ${id}: ${nodeById.get(from).label} → ${nodeById.get(to).label}  「${label}」`);
console.log(`  ~ ${HOST_K} 补 kind=mechanism + mechanismSpec（7 节点 / 7 转移边，参与方含 ${PARTICIPANT_CONTAINER}）`);
console.log(`  - 宿主卡片删除两处 mermaid（rootContent ${ROOT_BEFORE.length}→${ROOT_AFTER.length} 字；def tab ${TAB_BEFORE.length}→${TAB_AFTER.length} 字）`);
console.log(`  池 ${Object.keys(pool).length}→${Object.keys(pool).length + 7} | 树 ${allTreeNodes.length}→${allTreeNodes.length + 7} | 边 ${edges.length}→${edges.length + 14}`);

// ── 模拟变更（在克隆数据上，先跑真实投影函数再决定是否写盘）────────
const simPool = structuredClone(pool);
const simTree = structuredClone(tree);
const simEdges = structuredClone(edges);
const simHost = simPool[HOST_K];
simHost.mechanismSpec = spec;
simHost.kind = 'mechanism';
simHost.card.rootContent = ROOT_AFTER;
simHost.card.tabs[0].content = TAB_AFTER;
for (const n of newNodes) simPool[n.id] = n;
let simHostTreeNode = null;
walk(simTree, (n) => { if (n.id === HOST_TREE) simHostTreeNode = n; });
simHostTreeNode.children = newTreeChildren;
for (const e of [...newTreeBinds, ...newTransitions]) simEdges.push(e);

const simAllTreeNodes = [];
walk(simTree, (n) => simAllTreeNodes.push(n));

const input = { nodePool: simPool, knowledgeEdges: simEdges, treeData: simTree };
const projection = projectKnowledgeMechanism({ focusNodeId: HOST_K, ...input });
const inspection = inspectKnowledgeMechanism({ focusNodeId: HOST_K, ...input });
const validation = validateMechanismSpec(HOST_K, simPool[HOST_K].mechanismSpec, simPool, simEdges);

console.log('\n写前投影（真实函数 · 模拟数据）：');
const simPost = [];
const sgate = (desc, ok, actual = '') => { if (!ok) failures.push('SIM:' + desc); simPost.push((ok ? '✓' : '✗') + ' ' + desc + (actual ? ' — ' + actual : '')); };

sgate('P1 机制契约校验通过且无警告', validation.valid && validation.errors.length === 0 && validation.warnings.length === 0,
  validation.errors.join('; ') || validation.warnings.join('; '));
sgate('P2 投影非空且宿主解析正确', !!projection && projection.mechanismNodeId === HOST_K && projection.label === 'JSP');
sgate('P3 选中状态节点仍回溯到宿主机制', inspectKnowledgeMechanism({ focusNodeId: 'jsp_state_compile', ...input }).mechanismNodeId === HOST_K);
if (projection) {
  const frames = runProcess(projection.model, projection.process);
  sgate('P4 runProcess 产出 7 帧（runProcess 内部缺实体/关系会抛错）', frames.length === 7, String(frames.length));
  sgate('P5 步序 = BFS 预期（分支合并序）',
    JSON.stringify(projection.process.steps.map((s) => s.relationId)) === JSON.stringify(EXPECTED_STEP_ORDER),
    projection.process.steps.map((s) => s.relationId).join(','));
  sgate('P6 起点为触发节点', projection.origin === 'jsp_trigger_request', projection.origin);
  sgate('P7 实体集 = 宿主 + 7 节点（声明未连边的参与方不渲染）',
    projection.model.entities.length === 8
    && FEATURES.every((f) => projection.model.entities.some((e) => e.id === f.nodeId))
    && projection.model.entities.some((e) => e.id === HOST_K)
    && !projection.model.entities.some((e) => e.id === PARTICIPANT_CONTAINER),
    projection.model.entities.map((e) => e.id).join(','));
  sgate('P8 关系集 = 7 转移 + 7 包含', projection.model.relations.length === 14, String(projection.model.relations.length));
  sgate('P9 每帧可视元数据完整', frames.every((f) => f.entityVisuals.length === 2 && f.relationVisuals.length === 1));
  sgate('P10 末状态「输出 HTML」在帧中可达',
    frames.some((f) => f.target.id === 'jsp_state_output') && frames.some((f) => f.source.id === 'jsp_state_output' || f.target.id === 'jsp_state_output'));
}
sgate('P11 未声明的邻居（视图渲染实现）不构成机制', projectKnowledgeMechanism({ focusNodeId: 'asplit_view_rendering', ...input }) === null);
// 只比对「变更前就是机制」的宿主：JSP 本次才升级为机制，无基线可比
const driftedHosts = mechanismHostIds.filter((id) => {
  const before = baselineProjections.get(id);
  const p = projectKnowledgeMechanism({ focusNodeId: id, ...input });
  const after = p && { mechanismNodeId: p.mechanismNodeId, entities: p.model.entities.length, relations: p.model.relations.length, steps: p.process.steps.length };
  return JSON.stringify(before) !== JSON.stringify(after);
});
sgate('P12 既有机制宿主投影零漂移', driftedHosts.length === 0, driftedHosts.join(','));

// ── 结构断言（模拟数据）────────────────────────────────────────────
const simOld = edges.every((e, i) => JSON.stringify(simEdges[i]) === JSON.stringify(e));
sgate('P13 既有边逐条未动且新边追加在尾部', simOld && simEdges.length === edges.length + 14, String(simEdges.length));
sgate('P14 新边逐条形状一致',
  [...newTreeBinds, ...newTransitions].every((want) => {
    const got = simEdges.find((e) => e.id === want.id);
    return got && JSON.stringify(got) === JSON.stringify(want);
  }));
const simUntouchedPool = Object.keys(pool).every((id) => id === HOST_K || JSON.stringify(simPool[id]) === JSON.stringify(pool[id]));
sgate('P15 其余池条目逐字节未动', simUntouchedPool);
const hostCardBefore = pool[HOST_K].card;
// 逐节点比对「自身字段 + 子节点 id 列表」：祖先条目的整棵子树必含新子节点，不能整串比对
const treeSig = (n) => JSON.stringify([n.id, n.name, n.count, n.nodeRef ?? null, (n.children || []).map((c) => c.id)]);
const simTreeById = new Map(simAllTreeNodes.map((n) => [n.id, n]));
const plannedTreeIdSet = new Set(plannedTreeIds);
const treeDrift = [];
for (const n of allTreeNodes) {
  if (n.id === HOST_TREE) continue;
  const after = simTreeById.get(n.id);
  if (!after || treeSig(after) !== treeSig(n)) treeDrift.push(n.id);
}
for (const n of simAllTreeNodes) {
  if (n.id === HOST_TREE || plannedTreeIdSet.has(n.id)) continue;
  if (!allTreeNodes.some((m) => m.id === n.id)) treeDrift.push('新增:' + n.id);
}
sgate('P16 其余树条目「自身字段+子 id 列表」未动', treeDrift.length === 0,
  treeDrift.length ? `${treeDrift.length} 处：${treeDrift.slice(0, 5).join(', ')}` : '');
sgate('P17 宿主卡片仅 rootContent/def tab 两处变化',
  JSON.stringify(Object.keys(hostCardBefore).sort()) === JSON.stringify(Object.keys(simPool[HOST_K].card).sort())
  && simPool[HOST_K].card.title === hostCardBefore.title
  && simPool[HOST_K].card.tabs[0].label === hostCardBefore.tabs[0].label);
const countMermaid = (s) => s.split('```mermaid').length - 1;
sgate('P18 宿主卡片不再含 mermaid，池内 mermaid 总数 -2',
  !JSON.stringify(simPool[HOST_K].card).includes('```mermaid')
  && countMermaid(JSON.stringify(simPool)) === countMermaid(JSON.stringify(pool)) - 2,
  `${countMermaid(JSON.stringify(pool))}→${countMermaid(JSON.stringify(simPool))}`);
sgate('P19 新节点逐条形状一致', newNodes.every((want) => JSON.stringify(simPool[want.id]) === JSON.stringify(want)));
sgate('P20 宿主树节点恰 7 子且逐条一致',
  simHostTreeNode.children.length === 7
  && JSON.stringify(simHostTreeNode.children) === JSON.stringify(newTreeChildren));
sgate('P21 计数：池 +7 / 树 +7 / 边 +14',
  Object.keys(simPool).length === Object.keys(pool).length + 7
  && simAllTreeNodes.length === allTreeNodes.length + 7
  && simEdges.length === edges.length + 14);
sgate('P22 新节点各恰被 1 条树引用',
  FEATURES.every((f) => simAllTreeNodes.filter((n) => n.nodeRef === f.nodeId).length === 1));

console.log(simPost.join('\n'));

if (failures.length) { console.log('\n前置/模拟断言失败 ' + failures.length + ' 项，不写盘：' + failures.join(' | ')); process.exit(1); }

if (!APPLY) { console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。'); process.exit(0); }

// ── 写前备份 ──────────────────────────────────────────────────────
const now = Date.now();
const backup = {
  note: 'JSP-MECHANISM-VIEW 回滚记录：恢复 hostCardBefore 到宿主卡片、删除 created 中的节点/树条目/边、移除宿主的 mechanismSpec+kind 即可还原',
  at: new Date(now).toISOString(),
  hostKnowledgeId: HOST_K,
  hostTreeId: HOST_TREE,
  hostCardBefore: JSON.parse(JSON.stringify(pool[HOST_K].card)),
  hostKindBefore: pool[HOST_K].kind,
  hostSpecBefore: pool[HOST_K].mechanismSpec,
  createdNodes: newNodes,
  createdTreeChildren: newTreeChildren,
  createdEdges: [...newTreeBinds, ...newTransitions],
  countsBefore: { pool: Object.keys(pool).length, tree: allTreeNodes.length, edges: edges.length },
};
const bkDir = path.join(DATA, 'backups');
fs.mkdirSync(bkDir, { recursive: true });
const bkPath = path.join(bkDir, 'jsp-mechanism-view-' + now + '.json');
fs.writeFileSync(bkPath, JSON.stringify(backup, null, 2) + '\n', 'utf8');
console.log('\n备份 → ' + bkPath);

// ── 写盘（真实数据 = 模拟数据同一函数路径的产物）────────────────────
// Windows 上 AV / 索引 / 开发服务可能瞬时占用句柄（UNKNOWN/EPERM），带短重试
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const writeAtomic = (file, content) => {
  const fp = path.join(DATA, file);
  const tmp = fp + '.tmp-jspmech';
  fs.writeFileSync(tmp, content, 'utf8');
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try { fs.renameSync(tmp, fp); return; }
    catch (e) { lastErr = e; }
    try {
      fs.writeFileSync(fp, content, 'utf8');
      try { fs.unlinkSync(tmp); } catch {}
      return;
    } catch (e) { lastErr = e; }
    sleep(200);
  }
  try { fs.unlinkSync(tmp); } catch {}
  throw lastErr;
};
writeAtomic('node-pool.json', JSON.stringify(simPool, null, 2) + '\n');
writeAtomic('tree-data.json', JSON.stringify(simTree, null, 2) + '\n');
writeAtomic('knowledge-edges.json', JSON.stringify(simEdges, null, 2) + '\n');

// ── 写后断言（从磁盘回读，复跑真实函数）────────────────────────────
const diskPool = read('node-pool.json');
const diskTree = read('tree-data.json');
const diskEdges = read('knowledge-edges.json');
const diskProjection = projectKnowledgeMechanism({
  focusNodeId: HOST_K, nodePool: diskPool, knowledgeEdges: diskEdges, treeData: diskTree,
});
const diskFrames = diskProjection ? runProcess(diskProjection.model, diskProjection.process) : [];
const post = [];
const pgate = (desc, ok, actual = '') => { if (!ok) failures.push('POST:' + desc); post.push((ok ? '✓' : '✗') + ' ' + desc + (actual ? ' — ' + actual : '')); };
pgate('G23 磁盘投影成立且 7 帧', !!diskProjection && diskFrames.length === 7, String(diskFrames.length));
pgate('G24 磁盘宿主卡片无 mermaid 且等于预期', JSON.stringify(diskPool[HOST_K].card)
  === JSON.stringify({ ...backup.hostCardBefore, rootContent: ROOT_AFTER, tabs: [{ id: 'def', label: '定义', content: TAB_AFTER }] }));
pgate('G25 磁盘宿主机制契约与计划一致', JSON.stringify(diskPool[HOST_K].mechanismSpec) === JSON.stringify(spec) && diskPool[HOST_K].kind === 'mechanism');
if (failures.length) { console.log(post.join('\n')); console.log('\n写后断言失败 ' + failures.length + ' 项'); process.exit(1); }

console.log(post.join('\n'));
console.log('\nAPPLY OK — ' + DATA);
console.log('  池=' + Object.keys(diskPool).length + ' | 树=' + (() => { let c = 0; walk(diskTree, () => c++); return c; })() + ' | 边=' + diskEdges.length);
console.log('  宿主机制：' + HOST_K + ' | 节点: ' + FEATURES.map((f) => f.nodeId).join(', '));
