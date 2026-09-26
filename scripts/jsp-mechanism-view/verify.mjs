#!/usr/bin/env node
/**
 * JSP-MECHANISM-VIEW 落盘校验（只读）：用真实 validateMechanismSpec / projectKnowledgeMechanism /
 * runProcess 对磁盘数据复核机制投影，并逐条核对节点/树/边形状与卡片卫生（不残留 mermaid）。
 * 用法: node --experimental-transform-types scripts/jsp-mechanism-view/verify.mjs --data-dir <dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { runProcess } from '../../src/mechanism/core.ts';
import {
  inspectKnowledgeMechanism,
  projectKnowledgeMechanism,
} from '../../src/mechanism/knowledgeProjection.ts';
import { validateMechanismSpec } from '../../src/mechanism/validation.ts';

const argDir = process.argv[process.argv.indexOf('--data-dir') + 1];
if (!argDir || argDir.startsWith('--')) { console.error('missing --data-dir <dir>'); process.exit(1); }
const DATA = path.resolve(argDir);

const HOST_K = 'k_vault_javajavawebjsp_elp41h';
const HOST_TREE = 'tree_vault_javajavawebjsp_elp41h';
const INTRO = 'JSP 是 JavaWeb 时代把“模板页面”封装进 Servlet 体系的一种方式。它的本质不是独立运行，而是被容器转换成 Servlet 后参与请求处理。';
const TAB_AFTER = `> ${INTRO}\n\n## 关联阅读\n\n- 05-JSP与视图渲染\n- Servlet`;
const FEATURE_IDS = ['jsp_trigger_request', 'jsp_state_check', 'jsp_state_translate', 'jsp_state_compile', 'jsp_state_load', 'jsp_state_service', 'jsp_state_output'];
const TREE_IDS = ['tree_jsp_trigger_request', 'tree_jsp_state_check', 'tree_jsp_state_translate', 'tree_jsp_state_compile', 'tree_jsp_state_load', 'tree_jsp_state_service', 'tree_jsp_state_output'];
const EDGE_IDS = ['jsp:t1', 'jsp:t2', 'jsp:t3', 'jsp:t4', 'jsp:t5', 'jsp:t6', 'jsp:t7'];
const EXPECTED_STEP_ORDER = ['jsp:t1', 'jsp:t2', 'jsp:t6', 'jsp:t3', 'jsp:t7', 'jsp:t4', 'jsp:t5'];
const EXPECTED_LABELS = ['浏览器请求 JSP', '容器检查是否已编译', 'JSP 转 Servlet 源码', '编译为 Class', '加载并初始化', 'service 处理请求', '输出 HTML'];

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const pool = read('node-pool.json');
const tree = read('tree-data.json');
const edges = read('knowledge-edges.json');

const failures = [];
const gate = (desc, ok, actual = '') => {
  if (!ok) failures.push(desc);
  console.log((ok ? '✓' : '✗') + ' ' + desc + (actual ? ' — ' + actual : ''));
};
const walk = (n, cb) => { cb(n); (n.children || []).forEach((c) => walk(c, cb)); };
const allTreeNodes = [];
walk(tree, (n) => allTreeNodes.push(n));
let hostTreeNode = null;
walk(tree, (n) => { if (n.id === HOST_TREE) hostTreeNode = n; });

console.log('== JSP-MECHANISM-VIEW VERIFY ==');
console.log('data-dir: ' + DATA);
console.log(`计数：池=${Object.keys(pool).length} | 树=${allTreeNodes.length} | 边=${edges.length}`);

const host = pool[HOST_K];
gate('V1 宿主 kind=mechanism', host?.kind === 'mechanism');
gate('V2 宿主卡片 rootContent = 引言', host?.card?.rootContent === INTRO);
gate('V3 宿主 def tab = 引言 + 关联阅读', host?.card?.tabs?.length === 1 && host.card.tabs[0].content === TAB_AFTER);
gate('V4 宿主卡片不含 mermaid（同一知识不存两处）', !JSON.stringify(host?.card ?? {}).includes('```mermaid'));

gate('V5 7 个执行主线节点均在池中', FEATURE_IDS.every((id) => !!pool[id]));
const badNodes = FEATURE_IDS.filter((id, i) => {
  const n = pool[id];
  const wantKind = i === 0 ? 'event' : 'state';
  const wantRole = i === 0 ? 'axiom' : 'conclusion';
  return !(n && n.kind === wantKind && n.role === wantRole && n.label === EXPECTED_LABELS[i]
    && JSON.stringify(n.dimensions) === JSON.stringify(['java'])
    && JSON.stringify(n.tags) === JSON.stringify([n.label])
    && n.card?.nodeId === id && n.card?.title === n.label
    && n.card?.tabs?.length === 1 && n.card.tabs[0].id === 'def' && n.card.tabs[0].label === '定义'
    && n.card.tabs[0].content === n.card.rootContent.split('\n\n').slice(1).join('\n\n')
    && n.card.rootContent.startsWith(n.label + '\n\n'));
});
gate('V6 7 节点形状（kind/role/dims/tags/card）逐条一致', badNodes.length === 0, badNodes.join(','));

gate('V7 宿主树节点恰 7 子且指向 7 节点',
  hostTreeNode?.children?.length === 7
  && JSON.stringify(hostTreeNode.children.map((c) => c.nodeRef)) === JSON.stringify(FEATURE_IDS));
gate('V8 树条目形状 {id,name,count:0,nodeRef,children:[]} 且名称一致',
  TREE_IDS.every((tid, i) => {
    const c = hostTreeNode.children[i];
    return c && c.id === tid && c.name === EXPECTED_LABELS[i] && c.count === 0 && Array.isArray(c.children) && c.children.length === 0;
  }));
gate('V9 新节点各恰被 1 条树引用', FEATURE_IDS.every((id) => allTreeNodes.filter((n) => n.nodeRef === id).length === 1));

const treeBinds = edges.filter((e) => e.id.startsWith(`treebind:${HOST_TREE}:`));
gate('V10 7 条 treebind 边（宿主 → 子节点，belongs-to/contains/structure/java）',
  treeBinds.length === 7 && treeBinds.every((e) => e.source === HOST_K && FEATURE_IDS.includes(e.target)
    && e.type === 'belongs-to' && e.label === 'contains' && e.relationKind === 'structure'
    && JSON.stringify(e.dimensions) === JSON.stringify(['java'])));
const transitions = EDGE_IDS.map((id) => edges.find((e) => e.id === id));
gate('V11 7 条转移边（transitions-to/state-transition）',
  transitions.every((e) => e && e.type === 'transitions-to' && e.relationKind === 'state-transition')
  && FEATURE_IDS.includes(transitions[0]?.source) && transitions[0].source === 'jsp_trigger_request');
gate('V12 边 id 全库唯一', new Set(edges.map((e) => e.id)).size === edges.length);
gate('V13 宿主无重复挂载（全树仅 1 处引用）', allTreeNodes.filter((n) => n.nodeRef === HOST_K).length === 1);

const spec = host?.mechanismSpec;
const validation = validateMechanismSpec(HOST_K, spec, pool, edges);
gate('V14 契约校验通过且无警告', validation.valid && validation.errors.length === 0 && validation.warnings.length === 0,
  validation.errors.join('; ') || validation.warnings.join('; '));

const input = { nodePool: pool, knowledgeEdges: edges, treeData: tree };
const projection = projectKnowledgeMechanism({ focusNodeId: HOST_K, ...input });
gate('V15 投影成立、宿主=JSP', !!projection && projection.mechanismNodeId === HOST_K && projection.label === 'JSP');
if (projection) {
  const frames = runProcess(projection.model, projection.process);
  gate('V16 runProcess 7 帧且步序为 BFS 预期',
    frames.length === 7 && JSON.stringify(projection.process.steps.map((s) => s.relationId)) === JSON.stringify(EXPECTED_STEP_ORDER),
    String(frames.length));
  gate('V17 起点为触发节点', projection.origin === 'jsp_trigger_request', projection.origin);
  gate('V18 实体 = 宿主 + 7 节点（未连边参与方不渲染）',
    projection.model.entities.length === 8
    && FEATURE_IDS.every((id) => projection.model.entities.some((e) => e.id === id))
    && !projection.model.entities.some((e) => e.id === 'asplit_servlet_container'),
    projection.model.entities.map((e) => e.id).join(','));
  gate('V19 关系 = 7 转移 + 7 包含', projection.model.relations.length === 14, String(projection.model.relations.length));
  const toOutput = frames.filter((f) => f.target.id === 'jsp_state_output');
  const fromOutput = frames.filter((f) => f.source.id === 'jsp_state_output');
  gate('V20 「输出 HTML」是唯一汇点（仅 jsp:t7 指向，无出边）',
    toOutput.length === 1 && toOutput[0].relation.id === 'jsp:t7' && fromOutput.length === 0,
    `入 ${toOutput.map((f) => f.relation.id).join(',') || '无'} / 出 ${fromOutput.length}`);
} else {
  gate('V16 runProcess 7 帧且步序为 BFS 预期', false, '无投影');
}
gate('V21 状态节点选中时回溯宿主', inspectKnowledgeMechanism({ focusNodeId: 'jsp_state_service', ...input }).mechanismNodeId === HOST_K);
gate('V22 无关节点（视图渲染实现）不构成机制', projectKnowledgeMechanism({ focusNodeId: 'asplit_view_rendering', ...input }) === null);

const hosts = Object.values(pool).filter((n) => n.kind === 'mechanism');
const nullHosts = hosts.filter((n) => {
  const v = validateMechanismSpec(n.id, n.mechanismSpec, pool, edges);
  const p = projectKnowledgeMechanism({ focusNodeId: n.id, ...input });
  return v.valid && !p && (n.mechanismSpec?.transitionEdgeIds?.length ?? 0) > 0;
}).map((n) => n.id);
gate('V23 全库其他机制无因本批变更而失效', nullHosts.length === 0, nullHosts.join(','));
console.log(`  机制宿主 ${hosts.length} 个；JSP 投影步数 ${projection ? projection.process.steps.length : 0}`);

if (failures.length) { console.log('\nVERIFY 失败 ' + failures.length + ' 项：' + failures.join(' | ')); process.exit(1); }
console.log('\nVERIFY OK — ' + DATA);
