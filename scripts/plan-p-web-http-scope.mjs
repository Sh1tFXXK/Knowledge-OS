#!/usr/bin/env node
/**
 * P-WEB-HTTP-SCOPE · 只读预检 + 计划生成
 *
 * 裁决来源（用户 2026-09-15）：
 *   「asplit_http_request_response 删除；HTTP Request/Response 回归 HTTP 本体；
 *     HttpServletRequest/Response 留在 JavaWeb 作为引用类型；
 *     Web 属性作用域单独归 Web 生命周期，不和 HTTP Request/Response 绑定。」
 *
 * 本脚本只读，绝不写真源。产出：
 *   outputs/tree-violation-scan/p-web-http-scope-plan.json
 *   outputs/tree-violation-scan/p-web-http-scope-preflight.md
 *
 * 用法：node scripts/plan-p-web-http-scope.mjs
 *   KNOWLEDGE_OS_DATA_DIR 可重定向数据目录（测试用，不许打真数据）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data');
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan');
const BACKUP_DIR = 'data/backups/p-web-http-scope-2026-09-14T16-26-47-000Z';

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const treePath = path.join(DATA_DIR, 'tree-data.json');
const edgePath = path.join(DATA_DIR, 'knowledge-edges.json');
const poolPath = path.join(DATA_DIR, 'node-pool.json');
const evoPath = path.join(DATA_DIR, 'evolution-events.json');

// ─── 目标对象常量（全部来自只读勘察，不猜） ────────────────────────────────
const K = {
  httpTree: 'tree_1786898710541_l4hgm2', // 计算机科学 > 网络 > 网络协议 > HTTP
  httpPool: 'k_1786898710067_dpzp8r',
  netProtoTree: 'tree_acm2012_networks_network_protocols', // 网络协议
  webTree: 'tree_java_fw_javaweb', // JavaWeb
  webPool: 'k_java_fw_javaweb',
  servletPool: 'k_1784340526295_skm8iw', // 已存在，复用（kind=concept）
  fmtTree: 'tree_1786898830078_iopwk0', // 报文格式（卸树留池）
  fmtPool: 'k_1786898829740_rz93sq',
  reqMsgTree: 'tree_1786898852112_uph5k3', // 请求报文
  reqMsgPool: 'k_1786898851657_b3uj1z',
  respMsgTree: 'tree_1786898862413_xhmyno', // 响应报文
  respMsgPool: 'k_1786898862091_zxw3qo',
  scopeTree: 'tree_java_fw_web_attribute_scope', // Web 属性作用域
  scopePool: 'asplit_web_attribute_scope',
  svcLcTree: 'tree_java_fw_servlet_lifecycle', // Servlet 生命周期
  svcLcPool: 'asplit_servlet_lifecycle',
  residueTree: 'tree_java_fw_http_request_response', // 源残留节点（要删）
  residuePool: 'asplit_http_request_response',
  badEdge: 'asplit:s18:req-scope', // 错误父子声明（要删）
};

// 新建对象
const NEW = {
  httpRequest: { pool: 'concept_http_request', tree: 'tree_concept_http_request', label: 'HTTP Request' },
  httpResponse: { pool: 'concept_http_response', tree: 'tree_concept_http_response', label: 'HTTP Response' },
  servletTree: { tree: 'tree_java_fw_servlet', label: 'Servlet', reusePool: K.servletPool },
  javaReq: { pool: 'concept_http_servlet_request', tree: 'tree_java_fw_http_servlet_request', label: 'HttpServletRequest' },
  javaResp: { pool: 'concept_http_servlet_response', tree: 'tree_java_fw_http_servlet_response', label: 'HttpServletResponse' },
};

// ─── 读取真源 ─────────────────────────────────────────────────────────────
const tree = readJson(treePath);
const edgesRaw = readJson(edgePath);
const pool = readJson(poolPath);
const evo = readJson(evoPath);
const edges = Array.isArray(edgesRaw) ? edgesRaw : edgesRaw.edges || [];
// 口径钉死：tree-data.json 顶层**本身就是一个节点**（universe / 知识宇宙），
// 项目既有基线 3212 含它。计数必须从顶层对象自身起算，否则会少 1。
const countNode = (n) => {
  let c = 1;
  for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const x of n[k]) c += countNode(x);
  return c;
};
const countTree = () => (Array.isArray(tree) ? tree.reduce((a, n) => a + countNode(n), 0) : countNode(tree));

const flat = new Map();
(function walk(n, ancestors) {
  const p = [...ancestors, n.id];
  flat.set(n.id, { node: n, parentIds: ancestors, path: ancestors.map((a) => flat.get(a)?.node?.name ?? a).join(' > ') });
  for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) walk(c, p);
})(tree, []);

const byId = (id) => flat.get(id)?.node;
const parentOf = (id) => flat.get(id)?.parentIds?.at(-1);
const edgeById = (id) => edges.find((e) => e.id === id);
const relKind = (e) => e.relationKind || e.type;
const parseTreebind = (eid) => {
  if (!/^treebind:/.test(eid || '')) return null;
  const body = eid.slice('treebind:'.length);
  for (let i = 1; i < body.length - 1; i += 1) {
    if (body[i] !== ':') continue;
    const a = body.slice(0, i);
    const b = body.slice(i + 1);
    if (flat.has(a) && flat.has(b)) return { parent: a, child: b };
  }
  return null;
};

// ─── 门 ───────────────────────────────────────────────────────────────────
const gates = [];
const gate = (id, desc, pass, detail) => gates.push({ id, desc, pass: !!pass, detail });

// G1 目标父节点存在
gate('G1-parents', '目标挂载父节点全部存在（HTTP / JavaWeb / Servlet-javaweb 复用位）',
  byId(K.httpTree) && byId(K.webTree) && byId(K.netProtoTree),
  `HTTP=${!!byId(K.httpTree)} 网络协议=${!!byId(K.netProtoTree)} JavaWeb=${!!byId(K.webTree)}`);

// G2 新建 id 在池/树中均无冲突
{
  const poolHits = [NEW.httpRequest, NEW.httpResponse, NEW.javaReq, NEW.javaResp].filter((x) => pool[x.pool]);
  const treeHits = [NEW.httpRequest, NEW.httpResponse, NEW.javaReq, NEW.javaResp, NEW.servletTree].filter((x) => flat.has(x.tree));
  gate('G2-id-free', '新建池 id / 树 id 全部无冲突', poolHits.length === 0 && treeHits.length === 0,
    `池冲突=${poolHits.map((x) => x.pool).join(',') || '无'} 树冲突=${treeHits.map((x) => x.tree).join(',') || '无'}`);
}

// G3 复用的 Servlet 池实体存在且是 concept
{
  const v = pool[K.servletPool];
  gate('G3-reuse-servlet', '复用的 Servlet 池实体存在且 kind=concept', v && v.kind === 'concept',
    v ? `label=${v.label} kind=${v.kind} rootLen=${(v.card?.rootContent || '').length}` : '池实体缺失');
}

// G4 移动源在位且父正确
{
  const checks = [
    ['请求报文', K.reqMsgTree, K.fmtTree],
    ['响应报文', K.respMsgTree, K.fmtTree],
    ['Web 属性作用域', K.scopeTree, K.webTree],
    ['Servlet 生命周期', K.svcLcTree, K.webTree],
  ];
  const bad = checks.filter(([, id, wantParent]) => !byId(id) || parentOf(id) !== wantParent);
  gate('G4-move-src', '四个移动源在位且当前父节点符合预期', bad.length === 0,
    checks.map(([n, id, p]) => `${n}:${flat.has(id) ? (parentOf(id) === p ? 'OK' : `父=${parentOf(id)}≠${p}`) : '缺失'}`).join(' | '));
}

// G5 删除目标在位
{
  const t = !!byId(K.residueTree);
  const p = !!pool[K.residuePool];
  const be = !!edgeById(K.badEdge);
  const tb = `treebind:${K.webTree}:${K.residueTree}`;
  const tbe = !!edgeById(tb);
  gate('G5-delete-src', '删除目标全部在位（残留树节点 / 残留池实体 / 错误边 / 其 treebind）',
    t && p && be && tbe, `树节点=${t} 池实体=${p} 错误边=${be} treebind=${tbe}`);
}

// G6 「报文格式」卸树零内容损失
{
  const n = byId(K.fmtTree);
  const v = pool[K.fmtPool];
  const childIds = (n?.children || []).map((c) => c.id);
  const onlyMovees = childIds.every((c) => c === K.reqMsgTree || c === K.respMsgTree);
  const rc = v?.card?.rootContent;
  const tabLens = (v?.card?.tabs || []).map((t) => (t.content || '').length);
  const zeroContent = (!rc || !rc.trim()) && tabLens.every((l) => l === 0);
  gate('G6-shell-lossless', '「报文格式」卸树后内容损失为 0（子项只含待移动两条，自身无正文/无非空 tab）',
    onlyMovees && zeroContent,
    `子项=[${childIds.join(',')}] rc=${JSON.stringify(rc)} tab长度=[${tabLens.join(',')}]`);
}

// G7 引用机制形状可用（取现存样例校验结构）
{
  const sample = pool['k_java_fw_mybatis'];
  const ok = sample
    && Array.isArray(sample.viewDimensions)
    && sample.viewDimensions[0]?.sections?.[0]?.atoms?.[0]?.nodeId;
  gate('G7-ref-mechanism', '引用机制 = viewDimensions[].sections[].atoms[].nodeId 形状可用（样例 k_java_fw_mybatis）',
    !!ok, ok ? `样例原子=${sample.viewDimensions[0].sections[0].atoms.length} 个，首个 nodeId=${sample.viewDimensions[0].sections[0].atoms[0].nodeId}` : '样例结构不符');
}

// G8 冒号陷阱：涉及父 treeId 一律不含 ':'
{
  const ids = [K.httpTree, K.webTree, K.netProtoTree, NEW.servletTree.tree, K.fmtTree];
  const bad = ids.filter((i) => i.includes(':'));
  gate('G8-colon-safe', '本批涉及的父 treeId 均不含冒号（split(\':\') 陷阱不适用）', bad.length === 0,
    bad.length ? `含冒号=${bad.join(',')}` : `已核 ${ids.length} 个 id，全不含冒号`);
}

// G9 备份存在且与当前真源逐字节一致
{
  const files = ['tree-data.json', 'knowledge-edges.json', 'node-pool.json', 'evolution-events.json'];
  const bdir = path.join(ROOT, BACKUP_DIR);
  const rows = files.map((f) => {
    const b = path.join(bdir, f);
    if (!fs.existsSync(b)) return { f, same: false, why: '备份缺失' };
    const same = fs.readFileSync(b).equals(fs.readFileSync(path.join(DATA_DIR, f)));
    return { f, same, why: same ? '逐字节相同' : '不一致' };
  });
  gate('G9-backup', '备份存在且与当前真源逐字节一致', rows.every((r) => r.same), rows.map((r) => `${r.f}:${r.why}`).join(' | '));
}

// G10 悬空基线（不得劣化）
{
  const treeRefs = new Set([...flat.values()].map((x) => x.node.nodeRef).filter(Boolean));
  const poolKeys = new Set(Object.keys(pool));
  const danglingRef = [...treeRefs].filter((r) => !poolKeys.has(r));
  const treebinds = edges.filter((e) => /^treebind:/.test(e.id || ''));
  const unresolved = treebinds.filter((e) => !parseTreebind(e.id));
  gate('G10-dangling-baseline', '悬空基线记录（nodeRef 悬空 0 · treebind 不可解析 18，既有债不得劣化）',
    danglingRef.length === 0,
    `nodeRef 悬空=${danglingRef.length}${danglingRef.length ? ' [' + danglingRef.join(',') + ']' : ''} | treebind 总数=${treebinds.length} 不可解析=${unresolved.length}`);
}

// G11 内容迁移源可读
{
  const n = byId(K.residueTree);
  const tabs = n?.supplement?.tabs || [];
  const src = tabs.find((t) => /^asplit:/.test(t.id || ''));
  gate('G11-migrate-src', '待迁移的源残留原文 tab 存在且非空', src && (src.content || '').length > 200,
    src ? `tab=${src.id} label=${src.label} len=${(src.content || '').length}` : '未找到原文 tab');
}

// G12 计数基线
{
  const t = countTree();
  const e = edges.length;
  const p = Object.keys(pool).length;
  gate('G12-baseline', '计数基线 = 树 3212（含顶层宇宙节点）/ 池 3855 / 边 4159', t === 3212 && p === 3855 && e === 4159,
    `树=${t} 池=${p} 边=${e}`);
}

// G13 演化事件 id 无冲突
{
  const evs = Array.isArray(evo) ? evo : evo.events || [];
  const has = evs.some((x) => /p-web-http-scope/.test(x.id || ''));
  gate('G13-evo-free', '演化事件 id 无同名批次冲突', !has, `现有事件=${evs.length}，p-web-http-scope 冲突=${has}`);
}

// ─── 计划 ─────────────────────────────────────────────────────────────────
const plan = {
  batchId: 'p-web-http-scope',
  generatedAt: new Date().toISOString(),
  dataDir: DATA_DIR,
  basis: '用户 2026-09-15 裁决：源残留节点删除；HTTP Request/Response 回归 HTTP 本体；HttpServletRequest/Response 留 JavaWeb 作引用类型；Web 属性作用域归 Servlet 生命周期，不与 HTTP Request/Response 绑定。',
  decisions: {
    anchorForScope: 'Servlet > 生命周期（复用已有 tree_java_fw_servlet_lifecycle，改名「生命周期」）',
    referenceMechanism: 'viewDimensions[].sections[].atoms[].nodeId（原生展示原子，非新增边）',
    servletReuse: `复用既有池实体 ${K.servletPool}，在 JavaWeb 下二次挂载（同 ref 多挂载是既有机制）`,
    shellHandling: `「报文格式」${K.fmtTree} 卸树留池（0 内容损失），池实体保留`,
  },
  operations: {
    createPool: [
      { id: NEW.httpRequest.pool, label: NEW.httpRequest.label, kind: 'concept', at: `${K.httpTree} > ${NEW.httpRequest.tree}` },
      { id: NEW.httpResponse.pool, label: NEW.httpResponse.label, kind: 'concept', at: `${K.httpTree} > ${NEW.httpResponse.tree}` },
      { id: NEW.javaReq.pool, label: NEW.javaReq.label, kind: 'concept', at: `${K.webTree} > ${NEW.servletTree.tree} > ${NEW.javaReq.tree}` },
      { id: NEW.javaResp.pool, label: NEW.javaResp.label, kind: 'concept', at: `${K.webTree} > ${NEW.servletTree.tree} > ${NEW.javaResp.tree}` },
    ],
    createTreeMount: [
      { id: NEW.httpRequest.tree, name: NEW.httpRequest.label, ref: NEW.httpRequest.pool, parent: K.httpTree },
      { id: NEW.httpResponse.tree, name: NEW.httpResponse.label, ref: NEW.httpResponse.pool, parent: K.httpTree },
      { id: NEW.servletTree.tree, name: NEW.servletTree.label, ref: K.servletPool, parent: K.webTree },
      { id: NEW.javaReq.tree, name: NEW.javaReq.label, ref: NEW.javaReq.pool, parent: NEW.servletTree.tree },
      { id: NEW.javaResp.tree, name: NEW.javaResp.label, ref: NEW.javaResp.pool, parent: NEW.servletTree.tree },
    ],
    moveMount: [
      { id: K.reqMsgTree, name: '请求报文', from: K.fmtTree, to: NEW.httpRequest.tree },
      { id: K.respMsgTree, name: '响应报文', from: K.fmtTree, to: NEW.httpResponse.tree },
      { id: K.svcLcTree, name: 'Servlet 生命周期 → 生命周期', from: K.webTree, to: NEW.servletTree.tree, renameTo: '生命周期' },
      { id: K.scopeTree, name: 'Web 属性作用域', from: K.webTree, to: K.svcLcTree },
    ],
    detachKeepPool: [{ id: K.fmtTree, name: '报文格式', ref: K.fmtPool, reason: '空壳中间层，子项已分别归入 HTTP Request / HTTP Response；池实体保留' }],
    deleteNode: [{ id: K.residueTree, name: 'HTTP Request/Response', ref: K.residuePool, deletePoolEntity: true, reason: 'a-split 源残留容器，复合名 + 原文分片，非稳定知识实体；内容先迁移后删' }],
    edgeRemove: [K.badEdge, `treebind:${K.webTree}:${K.residueTree}`, `treebind:${K.webTree}:${K.svcLcTree}`, `treebind:${K.webTree}:${K.scopeTree}`, `treebind:${K.fmtTree}:${K.reqMsgTree}`, `treebind:${K.fmtTree}:${K.respMsgTree}`],
    edgeAdd: [
      { id: `treebind:${K.httpTree}:${NEW.httpRequest.tree}`, source: K.httpPool, target: NEW.httpRequest.pool, relationKind: 'structure' },
      { id: `treebind:${K.httpTree}:${NEW.httpResponse.tree}`, source: K.httpPool, target: NEW.httpResponse.pool, relationKind: 'structure' },
      { id: `treebind:${NEW.httpRequest.tree}:${K.reqMsgTree}`, source: NEW.httpRequest.pool, target: K.reqMsgPool, relationKind: 'structure' },
      { id: `treebind:${NEW.httpResponse.tree}:${K.respMsgTree}`, source: NEW.httpResponse.pool, target: K.respMsgPool, relationKind: 'structure' },
      { id: `treebind:${K.webTree}:${NEW.servletTree.tree}`, source: K.webPool, target: K.servletPool, relationKind: 'structure' },
      { id: `treebind:${NEW.servletTree.tree}:${NEW.javaReq.tree}`, source: K.servletPool, target: NEW.javaReq.pool, relationKind: 'structure' },
      { id: `treebind:${NEW.servletTree.tree}:${NEW.javaResp.tree}`, source: K.servletPool, target: NEW.javaResp.pool, relationKind: 'structure' },
      { id: `treebind:${NEW.servletTree.tree}:${K.svcLcTree}`, source: K.servletPool, target: K.svcLcPool, relationKind: 'structure' },
      { id: `treebind:${K.svcLcTree}:${K.scopeTree}`, source: K.svcLcPool, target: K.scopePool, relationKind: 'structure' },
    ],
    referenceAtoms: [
      { host: NEW.javaReq.pool, dimId: 'http_binding', dimName: '绑定的协议本体', atom: { nodeId: NEW.httpRequest.pool, desc: 'HTTP 请求：方法 / URL / 请求头 / 请求体' } },
      { host: NEW.javaResp.pool, dimId: 'http_binding', dimName: '绑定的协议本体', atom: { nodeId: NEW.httpResponse.pool, desc: 'HTTP 响应：状态码 / 响应头 / 响应体' } },
    ],
    contentMigration: [
      { from: `${K.residueTree}.supplement.tabs[asplit:s18:s13:orig]`, to: `${NEW.javaReq.pool}.card.tabs[]`, part: '两个核心对象 · HttpServletRequest 行', lossless: true },
      { from: `${K.residueTree}.supplement.tabs[asplit:s18:s13:orig]`, to: `${NEW.javaResp.pool}.card.tabs[]`, part: '两个核心对象 · HttpServletResponse 行', lossless: true },
      { from: `${K.residueTree}.supplement.tabs[asplit:s18:s13:orig]`, to: `${K.servletPool}.card.tabs[]`, part: '请求处理的本质 + 常见能力', lossless: true },
      { from: `${K.residueTree}.supplement.tabs[asplit:s18:s13:orig]`, to: `${K.scopePool}.card.tabs[]`, part: '作用域理解', lossless: true },
    ],
    evolutionEvent: { id: 'event:tree-refactor:p-web-http-scope', title: 'P-WEB：HTTP Request/Response 回归 HTTP 本体 + JavaWeb 改为类型引用 + 作用域归 Servlet 生命周期' },
  },
  expectedDelta: {
    tree: '+5 −1 −1 = +3（3212 → 3215）',
    pool: '+4 −1 = +3（3855 → 3858）',
    edges: '删 7 条（含错误声明 asplit:s18:req-scope 与 6 条旧 treebind）· 加 9 条 treebind = +2（4159 → 4161）',
    evolution: '+1（7 → 8）',
  },
  gates,
  gateSummary: { total: gates.length, passed: gates.filter((g) => g.pass).length, failed: gates.filter((g) => !g.pass).map((g) => g.id) },
  verdict: gates.every((g) => g.pass) ? 'PREFLIGHT_OK' : 'PREFLIGHT_FAILED',
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'p-web-http-scope-plan.json'), JSON.stringify(plan, null, 1) + '\n');

const md = [
  '# P-WEB-HTTP-SCOPE · 只读预检',
  '',
  `- 生成时间：${plan.generatedAt}`,
  `- 数据目录：\`${DATA_DIR}\``,
  `- 结论：**${plan.verdict}**（${plan.gateSummary.passed}/${plan.gateSummary.total}）`,
  '',
  '## 裁决依据',
  '',
  plan.basis,
  '',
  '## 门',
  '',
  '| 门 | 说明 | 结果 | 读数 |',
  '|---|---|---|---|',
  ...gates.map((g) => `| ${g.id} | ${g.desc} | ${g.pass ? 'PASS' : '**FAIL**'} | ${g.detail} |`),
  '',
  '## 预期变化',
  '',
  `- 树：${plan.expectedDelta.tree}`,
  `- 池：${plan.expectedDelta.pool}`,
  `- 边：${plan.expectedDelta.edges}`,
  `- 演化事件：${plan.expectedDelta.evolution}`,
  '',
].join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'p-web-http-scope-preflight.md'), md);

for (const g of gates) console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${g.id.padEnd(22)} ${g.detail}`);
console.log(`\n${plan.verdict}  ${plan.gateSummary.passed}/${plan.gateSummary.total}`);
process.exit(plan.verdict === 'PREFLIGHT_OK' ? 0 : 1);
