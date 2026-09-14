#!/usr/bin/env node
/**
 * P-WEB-HTTP-SCOPE · 落盘脚本（默认 dry-run，--apply 才写）
 *
 * 裁决：源残留节点删除；HTTP Request/Response 回归 HTTP 本体；
 *       HttpServletRequest/Response 留 JavaWeb 作引用类型；Web 属性作用域归 Servlet 生命周期。
 *
 * 用法：
 *   node scripts/apply-p-web-http-scope.mjs            # dry-run
 *   node scripts/apply-p-web-http-scope.mjs --apply    # 落盘
 *   KNOWLEDGE_OS_DATA_DIR=/tmp/x 重定向数据目录（测试用，不许打真数据）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data');
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan');

const F = {
  tree: path.join(DATA_DIR, 'tree-data.json'),
  edges: path.join(DATA_DIR, 'knowledge-edges.json'),
  pool: path.join(DATA_DIR, 'node-pool.json'),
  evo: path.join(DATA_DIR, 'evolution-events.json'),
};
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const detectIndent = (text) => {
  for (const line of text.split('\n')) {
    const m = line.match(/^(\s+)\S/);
    if (m) return m[1];
  }
  return ' ';
};
const writeJsonAtomic = (file, obj) => {
  const indent = detectIndent(fs.readFileSync(file, 'utf8'));
  const body = JSON.stringify(obj, null, indent) + '\n';
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, body);
  try {
    fs.renameSync(tmp, file);
  } catch (e) {
    if (e.code === 'EPERM' || e.code === 'EEXIST') {
      fs.writeFileSync(file, body);
      try { fs.unlinkSync(tmp); } catch { /* noop */ }
    } else throw e;
  }
};

const K = {
  httpTree: 'tree_1786898710541_l4hgm2',
  httpPool: 'k_1786898710067_dpzp8r',
  webTree: 'tree_java_fw_javaweb',
  webPool: 'k_java_fw_javaweb',
  servletPool: 'k_1784340526295_skm8iw',
  fmtTree: 'tree_1786898830078_iopwk0',
  fmtPool: 'k_1786898829740_rz93sq',
  reqMsgTree: 'tree_1786898852112_uph5k3',
  reqMsgPool: 'k_1786898851657_b3uj1z',
  respMsgTree: 'tree_1786898862413_xhmyno',
  respMsgPool: 'k_1786898862091_zxw3qo',
  scopeTree: 'tree_java_fw_web_attribute_scope',
  scopePool: 'asplit_web_attribute_scope',
  svcLcTree: 'tree_java_fw_servlet_lifecycle',
  svcLcPool: 'asplit_servlet_lifecycle',
  residueTree: 'tree_java_fw_http_request_response',
  residuePool: 'asplit_http_request_response',
  badEdge: 'asplit:s18:req-scope',
};
const T = {
  httpRequest: 'tree_concept_http_request',
  httpResponse: 'tree_concept_http_response',
  servlet: 'tree_java_fw_servlet',
  javaReq: 'tree_java_fw_http_servlet_request',
  javaResp: 'tree_java_fw_http_servlet_response',
};
const P = {
  httpRequest: 'concept_http_request',
  httpResponse: 'concept_http_response',
  javaReq: 'concept_http_servlet_request',
  javaResp: 'concept_http_servlet_response',
};
const MIGRATION_TAB = 'migrated:asplit_http_request_response';

// ─── 树工具 ───────────────────────────────────────────────────────────────
const findNode = (n, id) => {
  if (n.id === id) return n;
  for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) { const r = findNode(c, id); if (r) return r; }
  return null;
};
const findLoc = (n, id) => {
  for (const k of ['children', 'nodes']) {
    if (!Array.isArray(n[k])) continue;
    const i = n[k].findIndex((c) => c.id === id);
    if (i >= 0) return { parent: n, key: k, index: i };
    for (const c of n[k]) { const r = findLoc(c, id); if (r) return r; }
  }
  return null;
};
const detach = (root, id) => {
  const loc = findLoc(root, id);
  if (!loc) throw new Error(`detach 失败，未找到 ${id}`);
  const [node] = loc.parent[loc.key].splice(loc.index, 1);
  return node;
};
const attach = (root, parentId, node, index = -1) => {
  const parent = findNode(root, parentId);
  if (!parent) throw new Error(`attach 失败，父节点不存在 ${parentId}`);
  if (!Array.isArray(parent.children)) parent.children = [];
  if (index < 0 || index >= parent.children.length) parent.children.push(node);
  else parent.children.splice(index, 0, node);
};
const mkNode = (id, name, ref) => ({ id, name, count: 0, nodeRef: ref, children: [] });

// ─── 内容 ─────────────────────────────────────────────────────────────────
const CONTENT = {
  httpRequest: {
    root: [
      'HTTP Request（HTTP 请求）：客户端发给服务器的请求报文，以「我要做什么」为核心语义。',
      '',
      '- 请求行：方法 + 请求目标（URL / 路径）+ 协议版本',
      '- 方法：GET / POST / PUT / DELETE / PATCH，决定语义与幂等性',
      '- URL：请求目标，含路径与查询串',
      '- 请求头：Host、Content-Type、Content-Length、Cookie、Accept 等',
      '- 请求体：POST / PUT 等携带的数据（表单、JSON、二进制）',
      '',
      'HTTP Request 是协议层概念；Java 侧的 `HttpServletRequest` 是它在容器里的封装表示。',
    ].join('\n'),
  },
  httpResponse: {
    root: [
      'HTTP Response（HTTP 响应）：服务器回给客户端的结果报文，以「结果是什么」为核心语义。',
      '',
      '- 状态行：协议版本 + 状态码 + 原因短语',
      '- 状态码：1xx 信息 / 2xx 成功 / 3xx 重定向 / 4xx 客户端错误 / 5xx 服务端错误',
      '- 响应头：Content-Type、Content-Length、Cache-Control、Set-Cookie 等',
      '- 响应体：返回数据',
      '- MIME / Content-Type：决定客户端如何解析响应体',
      '',
      'HTTP Response 是协议层概念；Java 侧的 `HttpServletResponse` 是它在容器里的封装表示。',
    ].join('\n'),
  },
  javaReq: [
    'HttpServletRequest：Java Servlet API 对 HTTP 请求的编程抽象（Java 侧的**类型**，不是 HTTP 本身）。',
    '',
    '- 从容器拿到请求行 / 请求头 / 请求体',
    '- 读取请求参数、路径、会话',
    '- 与协议本体的关系：它是 HTTP Request 在 Java 容器里的封装表示（引用，不是拥有）',
  ].join('\n'),
  javaResp: [
    'HttpServletResponse：Java Servlet API 对 HTTP 响应的编程抽象（Java 侧的**类型**，不是 HTTP 本身）。',
    '',
    '- 设置响应头与状态码',
    '- 写回输出体 / 返回数据',
    '- 与协议本体的关系：它是 HTTP Response 在 Java 容器里的封装表示（引用，不是拥有）',
  ].join('\n'),
};

const dedup = (s) => {
  const t = (s || '').trim();
  for (let h = Math.floor(t.length / 2) - 6; h <= Math.ceil(t.length / 2) + 6; h += 1) {
    if (h < 40) continue;
    if (t.slice(0, h).trim() === t.slice(h).trim()) return t.slice(0, h).trim();
  }
  return t;
};
const splitSections = (text) => {
  const lines = text.split('\n');
  const out = [];
  let cur = null;
  for (const line of lines) {
    if (/^##\s/.test(line)) { cur = { head: line.trim(), body: [] }; out.push(cur); }
    else if (cur) cur.body.push(line);
    else out.push({ head: '', body: [line] });
  }
  return out;
};

// ─── 状态构建（预检与实跑共用同一函数） ───────────────────────────────────
const buildState = () => {
  const tree = readJson(F.tree);
  const edgesRaw = readJson(F.edges);
  const pool = readJson(F.pool);
  const evoRaw = readJson(F.evo);
  const edges = Array.isArray(edgesRaw) ? edgesRaw : edgesRaw.edges;
  const evo = Array.isArray(evoRaw) ? evoRaw : evoRaw.events;

  const log = [];
  const before = { tree: null, pool: Object.keys(pool).length, edges: edges.length, evo: evo.length };
  const countTree = (n) => { let c = 1; for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const x of n[k]) c += countTree(x); return c; };
  before.tree = countTree(tree);

  const residueTab = (findNode(tree, K.residueTree)?.supplement?.tabs || []).find((t) => /^asplit:/.test(t.id || ''));
  const original = dedup(residueTab?.content || '');
  const secs = splitSections(original);
  const sec = (head) => secs.find((s) => s.head.includes(head));
  const tableBlock = (sec('两个核心对象') ? ['## 两个核心对象', '', ...sec('两个核心对象').body].join('\n').trim() : '');
  const flowBlock = [sec('请求处理的本质') && ['## 请求处理的本质', ...sec('请求处理的本质').body].join('\n').trim(), sec('常见能力') && ['## 常见能力', ...sec('常见能力').body].join('\n').trim()].filter(Boolean).join('\n\n');
  const scopeBlock = sec('作用域理解') ? ['## 作用域理解', ...sec('作用域理解').body].join('\n').trim() : '';
  const title = secs.find((s) => !s.head)?.body.join('\n').trim() || '';

  // ① 新建 4 个本体池实体
  const mkEntity = (id, label, dims, root, tabs) => ({
    id, label, role: 'plain', kind: 'Concept', dimensions: dims,
    tags: [label, ...dims],
    card: { nodeId: id, title: label, tabs, rootContent: root },
  });
  pool[P.httpRequest] = mkEntity(P.httpRequest, 'HTTP Request', ['HTTP', '网络协议'], CONTENT.httpRequest.root, [{ id: 'def', label: '定义', content: CONTENT.httpRequest.root }]);
  pool[P.httpResponse] = mkEntity(P.httpResponse, 'HTTP Response', ['HTTP', '网络协议'], CONTENT.httpResponse.root, [{ id: 'def', label: '定义', content: CONTENT.httpResponse.root }]);
  pool[P.javaReq] = mkEntity(P.javaReq, 'HttpServletRequest', ['JavaWeb', 'Servlet API'], CONTENT.javaReq, [
    { id: 'def', label: '定义', content: CONTENT.javaReq },
    { id: MIGRATION_TAB, label: '迁移自 HTTP Request/Response（原文）', content: `${tableBlock}\n\n（原节点已删除，此表为无损迁移留存）` },
  ]);
  pool[P.javaResp] = mkEntity(P.javaResp, 'HttpServletResponse', ['JavaWeb', 'Servlet API'], CONTENT.javaResp, [
    { id: 'def', label: '定义', content: CONTENT.javaResp },
    { id: MIGRATION_TAB, label: '迁移自 HTTP Request/Response（原文）', content: `${tableBlock}\n\n（原节点已删除，此表为无损迁移留存）` },
  ]);
  log.push(`新建池实体 4：${[P.httpRequest, P.httpResponse, P.javaReq, P.javaResp].join(', ')}`);

  // ② 引用关系（原生机制：展示原子）
  const bind = (host, dimName, atomNode, desc) => {
    pool[host].viewDimensions = [{ id: 'http_binding', name: dimName, color: '#2F80ED', hint: 'Java 侧类型只是 HTTP 协议本体的容器封装；点开看协议层定义。', sections: [{ id: 'http_binding_grid', title: '绑定的协议本体', layout: 'grid', atoms: [{ nodeId: atomNode, desc }] }], groups: [] }];
  };
  bind(P.javaReq, '绑定的协议本体', P.httpRequest, 'HTTP 请求：方法 / URL / 请求头 / 请求体');
  bind(P.javaResp, '绑定的协议本体', P.httpResponse, 'HTTP 响应：状态码 / 响应头 / 响应体');
  log.push('建立引用（viewDimensions 展示原子）2：HttpServletRequest → HTTP Request；HttpServletResponse → HTTP Response');

  // ③ 内容迁移到 Servlet / 作用域（无损）
  const servlet = pool[K.servletPool];
  servlet.card.tabs = [...(servlet.card.tabs || []), { id: MIGRATION_TAB, label: '迁移自 HTTP Request/Response（原文）', content: [title, flowBlock].filter(Boolean).join('\n\n') }];
  const scope = pool[K.scopePool];
  scope.card.tabs = [...(scope.card.tabs || []), { id: MIGRATION_TAB, label: '迁移自 HTTP Request/Response（原文）', content: scopeBlock }];
  log.push(`内容迁移：Servlet(${K.servletPool}) / 作用域(${K.scopePool}) 各挂原文 tab`);

  // ④ 树：移动挂载（先摘出、留住节点对象本身，避免丢掉 supplement）
  const nReqMsg = detach(tree, K.reqMsgTree);
  const nRespMsg = detach(tree, K.respMsgTree);
  const nSvcLc = detach(tree, K.svcLcTree);
  const nScope = detach(tree, K.scopeTree);
  const nResidue = detach(tree, K.residueTree);
  const nFmt = detach(tree, K.fmtTree);
  void nResidue;
  void nFmt;
  attach(tree, K.httpTree, mkNode(T.httpRequest, 'HTTP Request', P.httpRequest));
  attach(tree, K.httpTree, mkNode(T.httpResponse, 'HTTP Response', P.httpResponse));
  attach(tree, T.httpRequest, nReqMsg);
  attach(tree, T.httpResponse, nRespMsg);
  nSvcLc.name = '生命周期';
  attach(tree, K.webTree, mkNode(T.servlet, 'Servlet', K.servletPool), 0);
  attach(tree, T.servlet, mkNode(T.javaReq, 'HttpServletRequest', P.javaReq));
  attach(tree, T.servlet, mkNode(T.javaResp, 'HttpServletResponse', P.javaResp));
  attach(tree, T.servlet, nSvcLc);
  attach(tree, K.svcLcTree, nScope);
  log.push('树结构：HTTP Request/Response 回归 HTTP；JavaWeb 下新建 Servlet（首位）含 HttpServletRequest / HttpServletResponse / 生命周期；作用域移入生命周期');
  log.push(`卸树留池：报文格式(${K.fmtTree}) —— 池实体保留，0 内容损失`);
  log.push(`删除节点：${K.residueTree} + 池实体 ${K.residuePool}（内容已迁移）`);
  delete pool[K.residuePool];
  log.push(`改名：${K.svcLcTree} 「Servlet 生命周期」→「生命周期」（树 name 与池 label 同位同步）`);
  pool[K.svcLcPool].label = '生命周期';

  // ⑤ 边
  const removeIds = new Set([
    K.badEdge,
    `treebind:${K.webTree}:${K.residueTree}`,
    // ★ 卸树留池必须同时删「上游」那条 treebind（HTTP → 报文格式），
    //   否则会新造一条悬空 treebind —— 首跑漏了这条，被独立验证 V14 抓住。
    `treebind:${K.httpTree}:${K.fmtTree}`,
    `treebind:${K.webTree}:${K.svcLcTree}`,
    `treebind:${K.webTree}:${K.scopeTree}`,
    `treebind:${K.fmtTree}:${K.reqMsgTree}`,
    `treebind:${K.fmtTree}:${K.respMsgTree}`,
    `treebind:${K.webTree}:${T.servlet}`,
  ]);
  const removed = edges.filter((e) => removeIds.has(e.id));
  const kept = edges.filter((e) => !removeIds.has(e.id));
  const mkEdge = (id, source, target, relationKind, label) => ({ id, source, target, type: 'structure', label: label || '结构包含', relationKind });
  const added = [
    mkEdge(`treebind:${K.httpTree}:${T.httpRequest}`, K.httpPool, P.httpRequest, 'structure'),
    mkEdge(`treebind:${K.httpTree}:${T.httpResponse}`, K.httpPool, P.httpResponse, 'structure'),
    mkEdge(`treebind:${T.httpRequest}:${K.reqMsgTree}`, P.httpRequest, K.reqMsgPool, 'structure'),
    mkEdge(`treebind:${T.httpResponse}:${K.respMsgTree}`, P.httpResponse, K.respMsgPool, 'structure'),
    mkEdge(`treebind:${K.webTree}:${T.servlet}`, K.webPool, K.servletPool, 'structure'),
    mkEdge(`treebind:${T.servlet}:${T.javaReq}`, K.servletPool, P.javaReq, 'structure'),
    mkEdge(`treebind:${T.servlet}:${T.javaResp}`, K.servletPool, P.javaResp, 'structure'),
    mkEdge(`treebind:${T.servlet}:${K.svcLcTree}`, K.servletPool, K.svcLcPool, 'structure'),
    mkEdge(`treebind:${K.svcLcTree}:${K.scopeTree}`, K.svcLcPool, K.scopePool, 'structure'),
  ];
  log.push(`边：删 ${removed.length} 条（含错误声明 ${K.badEdge}），加 ${added.length} 条 treebind`);

  // ⑥ 演化事件
  const ts = Date.now();
  const event = {
    id: `event:tree-refactor:p-web-http-scope:${ts}`,
    title: 'P-WEB：HTTP Request/Response 回归 HTTP 本体 + JavaWeb 改为类型引用 + 作用域归 Servlet 生命周期',
    changes: [
      { kind: 'create', target: P.httpRequest, note: 'HTTP Request 本体（协议层）' },
      { kind: 'create', target: P.httpResponse, note: 'HTTP Response 本体（协议层）' },
      { kind: 'create', target: P.javaReq, note: 'Java 侧类型，引用 HTTP Request' },
      { kind: 'create', target: P.javaResp, note: 'Java 侧类型，引用 HTTP Response' },
      { kind: 'move', target: K.reqMsgTree, before: `${K.fmtTree}`, after: T.httpRequest },
      { kind: 'move', target: K.respMsgTree, before: `${K.fmtTree}`, after: T.httpResponse },
      { kind: 'move', target: K.svcLcTree, before: K.webTree, after: T.servlet },
      { kind: 'move', target: K.scopeTree, before: K.webTree, after: K.svcLcTree },
      { kind: 'detach', target: K.fmtTree, note: '卸树留池，0 内容损失' },
      { kind: 'delete', target: K.residueTree, note: `删除源残留节点与池实体 ${K.residuePool}，内容已迁移至 ${P.javaReq} / ${P.javaResp} / ${K.servletPool} / ${K.scopePool}` },
      { kind: 'delete-edge', target: K.badEdge, note: '删除「HTTP Request/Response → Web 属性作用域」的错误父子声明' },
    ],
  };
  evo.push(event);

  // 结果快照
  const flat = new Map();
  (function walk(n, anc) { const p = [...anc, n.id]; flat.set(n.id, { node: n, parentIds: anc }); for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) walk(c, p); })(tree, []);
  const after = { tree: countTree(tree), pool: Object.keys(pool).length, edges: kept.length + added.length, evo: evo.length };

  return { tree, pool, edges: [...kept, ...added], evo, log, before, after, flat };
};

// ─── 运行 ─────────────────────────────────────────────────────────────────
const orig = {
  tree: fs.readFileSync(F.tree, 'utf8'),
  edges: fs.readFileSync(F.edges, 'utf8'),
  pool: fs.readFileSync(F.pool, 'utf8'),
  evo: fs.readFileSync(F.evo, 'utf8'),
};

const S = buildState();

// 预检（实跑前再验一次，防并发漂移）
const pre = [];
const flat = S.flat;
const byId = (id) => flat.get(id)?.node;
const parentOf = (id) => flat.get(id)?.parentIds?.at(-1);
pre.push(['P1', 'HTTP Request/Response 已在 HTTP 下且是独立概念', parentOf(T.httpRequest) === K.httpTree && parentOf(T.httpResponse) === K.httpTree && !!byId(T.httpRequest) && !!byId(T.httpResponse), `${parentOf(T.httpRequest)} / ${parentOf(T.httpResponse)}`]);
pre.push(['P2', '请求报文挂在 HTTP Request 下、响应报文挂在 HTTP Response 下', parentOf(K.reqMsgTree) === T.httpRequest && parentOf(K.respMsgTree) === T.httpResponse, `${parentOf(K.reqMsgTree)} / ${parentOf(K.respMsgTree)}`]);
pre.push(['P3', 'JavaWeb 下 Servlet 存在且为第 1 个子项', (byId(K.webTree)?.children || [])[0]?.id === T.servlet, `第 1 项=${(byId(K.webTree)?.children || [])[0]?.id}`]);
pre.push(['P4', 'Servlet 下为 HttpServletRequest / HttpServletResponse / 生命周期', (byId(T.servlet)?.children || []).map((c) => c.id).join(',') === [T.javaReq, T.javaResp, K.svcLcTree].join(','), (byId(T.servlet)?.children || []).map((c) => c.name).join(' / ')]);
pre.push(['P5', 'Web 属性作用域已归 生命周期，不再是 JavaWeb 直接子项', parentOf(K.scopeTree) === K.svcLcTree, `父=${parentOf(K.scopeTree)}`]);
pre.push(['P6', '源残留节点与「报文格式」已不在树', !byId(K.residueTree) && !byId(K.fmtTree), `residue=${!!byId(K.residueTree)} fmt=${!!byId(K.fmtTree)}`]);
pre.push(['P7', '错误边 asplit:s18:req-scope 已删除', !S.edges.some((e) => e.id === K.badEdge), `命中=${S.edges.filter((e) => e.id === K.badEdge).length}`]);
pre.push(['P8', '池实体：4 个新建到位、残留池实体已删、报文格式池实体保留', !!S.pool[P.httpRequest] && !!S.pool[P.httpResponse] && !!S.pool[P.javaReq] && !!S.pool[P.javaResp] && !S.pool[K.residuePool] && !!S.pool[K.fmtPool], `residuePool=${!!S.pool[K.residuePool]} fmtPool=${!!S.pool[K.fmtPool]}`]);
pre.push(['P9', '引用原子指向的两个本体内存在于池', S.pool[P.javaReq].viewDimensions[0].sections[0].atoms.every((a) => !!S.pool[a.nodeId]), S.pool[P.javaReq].viewDimensions[0].sections[0].atoms.map((a) => a.nodeId).join(',')]);
pre.push(['P10', '内容迁移无损：原文关键片段全部落在迁移 tab 里', (() => {
  const merged = Object.values(S.pool)
    .flatMap((v) => v.card?.tabs || [])
    .filter((t) => t.id === MIGRATION_TAB)
    .map((t) => t.content)
    .join('\n')
    .replace(/\s+/g, '');
  const need = ['HttpServletRequest', 'HttpServletResponse', '请求处理的本质', '读取表单和URL参数', '写入Response', 'ServletContext', '这些作用域是后续Web框架状态管理的基础层'];
  const miss = need.filter((k) => !merged.includes(k.replace(/\s+/g, '')));
  return miss.length === 0;
})(), '关键片段（HttpServletRequest/写入 Response/ServletContext 等 7 项）均在迁移 tab 中']);

const preFailed = pre.filter(([, , ok]) => !ok);
for (const [id, desc, ok, detail] of pre) console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${desc}  [${detail}]`);
console.log(`\n预检 ${pre.length - preFailed.length}/${pre.length}`);
console.log(`计数 前: 树 ${S.before.tree} 池 ${S.before.pool} 边 ${S.before.edges} 事件 ${S.before.evo}`);
console.log(`计数 后: 树 ${S.after.tree} 池 ${S.after.pool} 边 ${S.after.edges} 事件 ${S.after.evo}`);
S.log.forEach((l) => console.log('  · ' + l));

if (preFailed.length) { console.error('\n预检未过，终止'); process.exit(1); }

if (!APPLY) {
  console.log('\n[DRY-RUN] 未写入任何文件。加 --apply 落盘。');
} else {
  writeJsonAtomic(F.tree, S.tree);
  writeJsonAtomic(F.pool, S.pool);
  writeJsonAtomic(F.edges, Array.isArray(readJson(F.edges)) ? S.edges : { edges: S.edges });
  writeJsonAtomic(F.evo, Array.isArray(readJson(F.evo)) ? S.evo : { events: S.evo });
  // 落地前二次确认：写出的文件必须与内存态一致
  const okTree = JSON.stringify(readJson(F.tree)) === JSON.stringify(S.tree);
  const okPool = JSON.stringify(readJson(F.pool)) === JSON.stringify(S.pool);
  console.log(`\n[APPLY] 已落盘 tree/edges/pool/evolution-events；回读一致性 tree=${okTree} pool=${okPool}`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'p-web-http-scope-apply-report.md'), [
  `# P-WEB-HTTP-SCOPE · ${APPLY ? 'APPLY' : 'DRY-RUN'} 报告`,
  '',
  `- 时间：${new Date().toISOString()}`,
  `- 数据目录：\`${DATA_DIR}\``,
  '',
  '## 预检',
  '',
  '| 项 | 说明 | 结果 | 读数 |',
  '|---|---|---|---|',
  ...pre.map(([id, desc, ok, detail]) => `| ${id} | ${desc} | ${ok ? 'PASS' : '**FAIL**'} | ${detail} |`),
  '',
  '## 计数',
  '',
  `- 前：树 ${S.before.tree} / 池 ${S.before.pool} / 边 ${S.before.edges} / 事件 ${S.before.evo}`,
  `- 后：树 ${S.after.tree} / 池 ${S.after.pool} / 边 ${S.after.edges} / 事件 ${S.after.evo}`,
  '',
  '## 操作日志',
  '',
  ...S.log.map((l) => `- ${l}`),
  '',
].join('\n'));
console.log(`报告 → outputs/tree-violation-scan/p-web-http-scope-apply-report.md`);
