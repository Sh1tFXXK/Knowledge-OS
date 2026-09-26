#!/usr/bin/env node
/**
 * P-WEB-COOKIE-SESSION · 落盘脚本（默认 dry-run，--apply 才写）
 *
 * 裁决（与 p-web-http-scope 同构）：协议机制不进 JavaWeb，JavaWeb 只留类型抽象和生命周期管理。
 *   ① Cookie → HTTP 协议本体（RFC 6265，Set-Cookie / Cookie 头）
 *   ② Session → 通用 Web 概念（服务端状态保持，非 Java 专有）
 *   ③ Web 状态管理 → 通用 Web 问题域（Cookie / Session / URL 重写 / Token 都是解法）
 *   ④ JavaWeb 只留 Java API 实现：javax.servlet.http.Cookie ──represents──→ HTTP Cookie；
 *      HttpSession ──represents──→ Session；Session 生命周期与配置归 Servlet 规范实现机制
 *
 * ⚠️ 本批**不写** evolution-events.json —— 2026-09-15 裁决「批次脚本不得向本文件写入
 *    操作日志类事件」（src/knowledge/timelineEvolution.ts 头注），操作日志由 git + batch-manifests 承载。
 *
 * 用法：
 *   node scripts/apply-p-web-cookie-session.mjs            # dry-run
 *   node scripts/apply-p-web-cookie-session.mjs --apply    # 落盘
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
// Windows 上大文件写完后，杀毒/索引器会短暂持有目标文件（本项目 vite.config.js 的 withFsRetry
// 记录了同类现象：占用可长达数秒，需指数退避）。实测本批 node-pool.json（12MB）rename 曾抛
// UV_UNKNOWN（errno -4094，非 EPERM）—— 故把 UNKNOWN/EBUSY/EACCES 一并纳入可重试集。
const sleepSync = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { const end = Date.now() + ms; while (Date.now() < end) { /* spin */ } } };
const RETRYABLE_FS = new Set(['EPERM', 'EEXIST', 'EBUSY', 'EACCES', 'UNKNOWN']);
const withFsRetry = (fn, label) => {
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try { return fn(); } catch (e) {
      const code = String((e && e.code) || '');
      if (!RETRYABLE_FS.has(code) || attempt === maxAttempts - 1) throw e;
      console.warn(`[apply] fs ${code} on ${label}, retry #${attempt + 1}`);
      sleepSync(250 * 2 ** attempt);
    }
  }
};
const writeJsonAtomic = (file, obj) => {
  const base = path.basename(file);
  const indent = detectIndent(fs.readFileSync(file, 'utf8'));
  const body = JSON.stringify(obj, null, indent) + '\n';
  const tmp = path.join(path.dirname(file), `.${base}.tmp-${process.pid}`);
  withFsRetry(() => fs.writeFileSync(tmp, body), `${base}:write-temp`);
  try {
    withFsRetry(() => fs.renameSync(tmp, file), `${base}:rename`);
  } catch (e) {
    // 退避耗尽仍无法 rename：原地直写（放弃原子性，保住落盘）
    console.warn(`[apply] ${base} rename 退避耗尽（${e.code}），退回原地直写`);
    withFsRetry(() => fs.writeFileSync(file, body), `${base}:write-inplace`);
    try { fs.unlinkSync(tmp); } catch { /* noop */ }
  }
};

const K = {
  httpTree: 'tree_1786898710541_l4hgm2',
  httpPool: 'k_1786898710067_dpzp8r',
  appLayerTree: 'tree_1786874260927_9y92b2',
  appLayerPool: 'k_1786874260568_6d4ruq',
  webTree: 'tree_java_fw_javaweb',
  webPool: 'k_java_fw_javaweb',
  servletTree: 'tree_java_fw_servlet',
  servletPool: 'k_1784340526295_skm8iw',
  wsTree: 'tree_java_fw_web_state_management',
  wsPool: 'asplit_web_state_management',
  sessionTree: 'atomic_k_dict_ef30sdky',
  sessionPool: 'k_dict_ef30sdky',
  cookieTree: 'atomic_atomic_cookie',
  cookiePool: 'atomic_cookie',
  badEdge: 'asplit:s18:session-state',
};
const T = {
  urlRewrite: 'tree_concept_url_rewrite',
  token: 'tree_concept_token',
  servletCookie: 'tree_java_fw_http_servlet_cookie',
  servletSession: 'tree_java_fw_http_servlet_session',
  sessionLifecycle: 'tree_java_fw_session_lifecycle',
};
const P = {
  urlRewrite: 'concept_url_rewrite',
  token: 'concept_token',
  servletCookie: 'concept_http_servlet_cookie',
  servletSession: 'concept_http_servlet_session',
  sessionLifecycle: 'concept_session_lifecycle',
};

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
// 节点自身字段（剔除 children/nodes 容器）——内容无损比对用
const ownJson = (n) => { const { children, nodes, ...rest } = n; return JSON.stringify(rest); };

// ─── 内容 ─────────────────────────────────────────────────────────────────
const CONTENT = {
  urlRewrite: [
    'URL 重写：把会话标识编码进 URL 的会话跟踪方案，不依赖 Cookie（如 ;jsessionid=xxx）。',
    '',
    '- 每次响应都要重写页面中的链接与表单 action',
    '- 会话标识暴露在地址栏与日志中，安全性与可用性受限',
    '- Cookie 被禁用时的经典回退方案',
  ].join('\n'),
  token: [
    'Token：把状态编码进令牌（如 JWT）由客户端携带、服务端校验的状态管理方案。',
    '',
    '- 常见于 Authorization 请求头（Bearer 令牌）',
    '- 无状态：服务端不存会话数据，便于水平扩展与跨域',
    '- 与 Session 的取舍：可撤销性 vs 可扩展性',
  ].join('\n'),
  servletCookie: [
    'javax.servlet.http.Cookie：Servlet 规范对 HTTP Cookie 的 Java 类型抽象（Java 侧的**类型**，不是 HTTP 本身）。',
    '',
    '- 写入：new Cookie(name, value) + response.addCookie(...)',
    '- 读取：request.getCookies()',
    '- 常用属性：maxAge / path / domain / httpOnly / secure',
    '- 与协议本体的关系：它是 HTTP Cookie（Set-Cookie / Cookie 头）在 Java 容器里的封装表示（引用，不是拥有）',
  ].join('\n'),
  servletSession: [
    'HttpSession：Servlet 规范对服务端会话的 Java 类型抽象（Java 侧的**类型**，不是 Session 概念本身）。',
    '',
    '- 获取：request.getSession() / getSession(false)',
    '- 存取：setAttribute / getAttribute / removeAttribute',
    '- 会话标识：JSESSIONID（Cookie 或 URL 重写承载）关联到服务端会话对象',
    '- 与概念本体的关系：它是「跨请求认住同一个客户端」的 Java 容器实现（引用，不是拥有）',
  ].join('\n'),
  sessionLifecycle: [
    'Session 生命周期与配置：Servlet 规范里会话的创建、超时与持久化机制。',
    '',
    '- web.xml `<session-config>`：`<session-timeout>` 配置超时分钟数',
    '- 超时：Tomcat 默认 30 分钟；HttpSession.setMaxInactiveInterval() 可调',
    '- 钝化 / 活化：闲置时序列化到磁盘，再次访问时恢复',
    '- 失效：invalidate()；监听器 HttpSessionListener / HttpSessionAttributeListener',
  ].join('\n'),
};

// 实体样式对齐各自邻居：
//   Web 侧（asplit_web_state_management / asplit_web_attribute_scope）：role plain · kind concept · 无维度 · rootContent 带 label 前缀
//   Java 类型侧（concept_http_servlet_request）：role plain · kind Concept · dims [JavaWeb, Servlet API] · rootContent 即正文
const mkWebEntity = (id, label, content) => ({
  id,
  label,
  role: 'plain',
  kind: 'concept',
  dimensions: [],
  tags: [label],
  card: { nodeId: id, title: label, tabs: [{ id: 'def', label: '定义', content }], rootContent: `${label}\n\n${content}` },
});
const mkJavaEntity = (id, label, content) => ({
  id,
  label,
  role: 'plain',
  kind: 'Concept',
  dimensions: ['JavaWeb', 'Servlet API'],
  tags: [label, 'JavaWeb', 'Servlet API'],
  card: { nodeId: id, title: label, tabs: [{ id: 'def', label: '定义', content }], rootContent: content },
});

// ─── 状态构建（预检与实跑共用同一函数） ───────────────────────────────────
const buildState = () => {
  const tree = readJson(F.tree);
  const edgesRaw = readJson(F.edges);
  const pool = readJson(F.pool);
  const edges = Array.isArray(edgesRaw) ? edgesRaw : edgesRaw.edges;

  const log = [];
  const before = { tree: null, pool: Object.keys(pool).length, edges: edges.length };
  const countTree = (n) => { let c = 1; for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const x of n[k]) c += countTree(x); return c; };
  before.tree = countTree(tree);

  // ── 源门禁（构建前置断言：源不在位即终止，不做任何"猜测性移动"）──
  const src = [];
  const inTree = (id) => !!findNode(tree, id);
  src.push(['G1', '三个 mover（Web 状态管理 / Session / Cookie）在树且当前父 = JavaWeb',
    [K.wsTree, K.sessionTree, K.cookieTree].every((id) => findLoc(tree, id)?.parent?.id === K.webTree),
    [K.wsTree, K.sessionTree, K.cookieTree].map((id) => `${id.slice(-12)}=${findLoc(tree, id)?.parent?.id?.slice(-10)}`).join(' ')]);
  src.push(['G2', '目标挂载父节点存在（应用层 / HTTP / Servlet）且 mover 尚未在目标位（防重复执行）',
    inTree(K.appLayerTree) && inTree(K.httpTree) && inTree(K.servletTree)
      && findLoc(tree, K.wsTree)?.parent?.id !== K.appLayerTree
      && findLoc(tree, K.cookieTree)?.parent?.id !== K.httpTree,
    `app=${inTree(K.appLayerTree)} http=${inTree(K.httpTree)} servlet=${inTree(K.servletTree)} ws父=${findLoc(tree, K.wsTree)?.parent?.id?.slice(-12)}`]);
  src.push(['G3', '5 个新池 id / 树 id 全部无冲突',
    [T.urlRewrite, T.token, T.servletCookie, T.servletSession, T.sessionLifecycle].every((id) => !inTree(id))
      && [P.urlRewrite, P.token, P.servletCookie, P.servletSession, P.sessionLifecycle].every((id) => !pool[id]),
    [T.urlRewrite, T.token, T.servletCookie, T.servletSession, T.sessionLifecycle].filter(inTree).join(',') || '无冲突']);
  src.push(['G4', '4 条待删边全部在位（3 条 JavaWeb treebind + 错误声明 asplit:s18:session-state）',
    [`treebind:${K.webTree}:${K.wsTree}`, `treebind:${K.webTree}:${K.sessionTree}`, `treebind:${K.webTree}:${K.cookieTree}`, K.badEdge]
      .every((id) => edges.some((e) => e.id === id)),
    `命中=${[`treebind:${K.webTree}:${K.wsTree}`, `treebind:${K.webTree}:${K.sessionTree}`, `treebind:${K.webTree}:${K.cookieTree}`, K.badEdge].filter((id) => edges.some((e) => e.id === id)).length}/4`]);
  src.push(['G5', '本批涉及父 treeId 均不含冒号（split(\':\') 陷阱不适用）',
    [K.httpTree, K.appLayerTree, K.webTree, K.servletTree, K.wsTree].every((id) => !id.includes(':')),
    '复用位与新建位 treeId 无冒号']);
  src.push(['G6', '三个 mover 池实体在位（本批 0 删除、0 内容损失）',
    [K.wsPool, K.sessionPool, K.cookiePool].every((id) => !!pool[id]),
    `${[K.wsPool, K.sessionPool, K.cookiePool].map((id) => `${id}=${!!pool[id]}`).join(' ')}`]);

  const srcFailed = src.filter(([, , ok]) => !ok);
  if (srcFailed.length) {
    for (const [id, desc, ok, detail] of src) console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${desc}  [${detail}]`);
    throw new Error(`源门禁未过 ${srcFailed.length} 项，终止（未做任何修改）`);
  }

  // ── 内容无损基线（构建前快照：三个 mover 池实体 + 三个 mover 树节点自身字段）──
  // 树节点比较剔除 children：本批**有意**给 Web 状态管理追加 3 个子项，children 变化由 P1-P5 断言；
  // 此处只证明节点自身（id/name/count/nodeRef/supplement…）逐字节未变，内容不因移动而丢失或改写。
  const preserve = {
    pool: Object.fromEntries([K.wsPool, K.sessionPool, K.cookiePool].map((id) => [id, JSON.stringify(pool[id])])),
    tree: Object.fromEntries([K.wsTree, K.sessionTree, K.cookieTree].map((id) => [id, ownJson(findNode(tree, id))])),
  };

  // ① 新建 5 个池实体
  pool[P.urlRewrite] = mkWebEntity(P.urlRewrite, 'URL 重写', CONTENT.urlRewrite);
  pool[P.token] = mkWebEntity(P.token, 'Token', CONTENT.token);
  pool[P.servletCookie] = mkJavaEntity(P.servletCookie, 'javax.servlet.http.Cookie', CONTENT.servletCookie);
  pool[P.servletSession] = mkJavaEntity(P.servletSession, 'HttpSession', CONTENT.servletSession);
  pool[P.sessionLifecycle] = mkWebEntity(P.sessionLifecycle, 'Session 生命周期与配置', CONTENT.sessionLifecycle);
  log.push(`新建池实体 5：${[P.urlRewrite, P.token, P.servletCookie, P.servletSession, P.sessionLifecycle].join(', ')}`);

  // ② 引用关系（原生机制：展示原子 —— 引用而非拥有）
  const bind = (host, dimName, hint, atomNode, desc) => {
    pool[host].viewDimensions = [{
      id: 'concept_binding',
      name: dimName,
      color: '#2F80ED',
      hint,
      sections: [{ id: 'concept_binding_grid', title: dimName, layout: 'grid', atoms: [{ nodeId: atomNode, desc }] }],
      groups: [],
    }];
  };
  bind(P.servletCookie, '绑定的协议本体', 'Java 侧类型只是 HTTP 协议机制的容器封装；点开看协议层定义。', K.cookiePool, 'HTTP Cookie：Set-Cookie / Cookie 头机制（RFC 6265）');
  bind(P.servletSession, '绑定的概念本体', 'Java 侧类型只是通用概念的容器封装；点开看概念层定义。', K.sessionPool, 'Session：跨请求认住同一个客户端的通用服务端方案');
  log.push('建立引用（viewDimensions 展示原子）2：javax.servlet.http.Cookie → Cookie；HttpSession → Session');

  // ③ 树：移动挂载（先摘出、留住节点对象本身，避免丢掉 supplement）
  const nWs = detach(tree, K.wsTree);
  const nSession = detach(tree, K.sessionTree);
  const nCookie = detach(tree, K.cookieTree);
  attach(tree, K.appLayerTree, nWs);
  attach(tree, K.wsTree, nSession);
  attach(tree, K.wsTree, mkNode(T.urlRewrite, 'URL 重写', P.urlRewrite));
  attach(tree, K.wsTree, mkNode(T.token, 'Token', P.token));
  attach(tree, K.httpTree, nCookie);
  attach(tree, K.servletTree, mkNode(T.servletCookie, 'javax.servlet.http.Cookie', P.servletCookie));
  attach(tree, K.servletTree, mkNode(T.servletSession, 'HttpSession', P.servletSession));
  attach(tree, K.servletTree, mkNode(T.sessionLifecycle, 'Session 生命周期与配置', P.sessionLifecycle));
  log.push('树结构：Cookie → HTTP 之下；Web 状态管理 → 网络 > 应用层 之下（含 Session / URL 重写 / Token）');
  log.push('树结构：JavaWeb > Servlet 追加 javax.servlet.http.Cookie / HttpSession / Session 生命周期与配置');
  log.push('三个 mover 树节点原对象迁移（supplement/字段零改动）—— 移动不计入树节点增删');

  // ④ 边
  const removeIds = new Set([
    `treebind:${K.webTree}:${K.wsTree}`,
    `treebind:${K.webTree}:${K.sessionTree}`,
    `treebind:${K.webTree}:${K.cookieTree}`,
    K.badEdge,
  ]);
  const removed = edges.filter((e) => removeIds.has(e.id));
  const kept = edges.filter((e) => !removeIds.has(e.id));
  const mkEdge = (id, source, target) => ({ id, source, target, type: 'structure', label: '结构包含', relationKind: 'structure' });
  const added = [
    mkEdge(`treebind:${K.appLayerTree}:${K.wsTree}`, K.appLayerPool, K.wsPool),
    mkEdge(`treebind:${K.wsTree}:${K.sessionTree}`, K.wsPool, K.sessionPool),
    mkEdge(`treebind:${K.wsTree}:${T.urlRewrite}`, K.wsPool, P.urlRewrite),
    mkEdge(`treebind:${K.wsTree}:${T.token}`, K.wsPool, P.token),
    mkEdge(`treebind:${K.httpTree}:${K.cookieTree}`, K.httpPool, K.cookiePool),
    mkEdge(`treebind:${K.servletTree}:${T.servletCookie}`, K.servletPool, P.servletCookie),
    mkEdge(`treebind:${K.servletTree}:${T.servletSession}`, K.servletPool, P.servletSession),
    mkEdge(`treebind:${K.servletTree}:${T.sessionLifecycle}`, K.servletPool, P.sessionLifecycle),
  ];
  log.push(`边：删 ${removed.length} 条（含错误父子声明 ${K.badEdge}），加 ${added.length} 条 treebind`);
  log.push('边保留：atomic:s1:session-cookie（Session 依赖 Cookie 传递 SessionId，跨分支真实依赖语义）');
  log.push('⚠️ 不写 evolution-events.json —— 2026-09-15 裁决：批次脚本不得写入操作日志类事件（git + batch-manifests 承载）');

  // 结果快照
  const flat = new Map();
  (function walk(n, anc) { flat.set(n.id, { node: n, parentIds: anc }); for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) walk(c, [...anc, n.id]); })(tree, []);
  const after = { tree: countTree(tree), pool: Object.keys(pool).length, edges: kept.length + added.length };

  return { tree, pool, edges: [...kept, ...added], log, before, after, flat, src, preserve, removed, added };
};

// ─── 运行 ─────────────────────────────────────────────────────────────────
const evoNow = () => (fs.existsSync(F.evo) ? fs.readFileSync(F.evo, 'utf8') : null);
const orig = {
  tree: fs.readFileSync(F.tree, 'utf8'),
  edges: fs.readFileSync(F.edges, 'utf8'),
  pool: fs.readFileSync(F.pool, 'utf8'),
  evo: evoNow(),
};

let S;
try {
  S = buildState();
} catch (e) {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
}

// ── 预检（结果态门禁）──
const pre = [];
const flat = S.flat;
const byId = (id) => flat.get(id)?.node;
const parentOf = (id) => flat.get(id)?.parentIds?.at(-1);
const childIds = (id) => (byId(id)?.children || []).map((c) => c.id);
pre.push(['P1', 'Web 状态管理挂在 网络 > 应用层 下', parentOf(K.wsTree) === K.appLayerTree, `父=${parentOf(K.wsTree)}`]);
pre.push(['P2', 'Web 状态管理下为 Session / URL 重写 / Token，Session 居首', childIds(K.wsTree).join(',') === [K.sessionTree, T.urlRewrite, T.token].join(','), `子=[${(byId(K.wsTree)?.children || []).map((c) => c.name).join(' / ')}]`]);
pre.push(['P3', 'Cookie 挂在 HTTP 下，HTTP 子项 = HTTP Request / HTTP Response / Cookie', childIds(K.httpTree).join(',') === ['tree_concept_http_request', 'tree_concept_http_response', K.cookieTree].join(','), `子=[${(byId(K.httpTree)?.children || []).map((c) => c.name).join(' / ')}]`]);
pre.push(['P4', 'JavaWeb 不再直接含 Web 状态管理 / Session / Cookie，前三位为 Servlet / JSP / HTTP 请求', (() => { const c = childIds(K.webTree); return !c.includes(K.wsTree) && !c.includes(K.sessionTree) && !c.includes(K.cookieTree) && c.slice(0, 3).join(',') === ['tree_java_fw_servlet', 'tree_vault_javajavawebjsp_elp41h', 'tree_java_fw_http_request'].join(','); })(), `首三=[${(byId(K.webTree)?.children || []).slice(0, 3).map((c) => c.name).join(' / ')}] 残留=${[K.wsTree, K.sessionTree, K.cookieTree].filter((id) => childIds(K.webTree).includes(id)).length}`]);
pre.push(['P5', 'Servlet 下为 HttpServletRequest / HttpServletResponse / 生命周期 / javax.servlet.http.Cookie / HttpSession / Session 生命周期与配置', childIds(K.servletTree).join(',') === ['tree_java_fw_http_servlet_request', 'tree_java_fw_http_servlet_response', 'tree_java_fw_servlet_lifecycle', T.servletCookie, T.servletSession, T.sessionLifecycle].join(','), `子=[${(byId(K.servletTree)?.children || []).map((c) => c.name).join(' / ')}]`]);
pre.push(['P6', '错误边 asplit:s18:session-state 已删除', !S.edges.some((e) => e.id === K.badEdge), `命中=${S.edges.filter((e) => e.id === K.badEdge).length}`]);
pre.push(['P7', '池实体：5 个新建到位；三个 mover 池实体保留未删', [P.urlRewrite, P.token, P.servletCookie, P.servletSession, P.sessionLifecycle].every((id) => !!S.pool[id]) && [K.wsPool, K.sessionPool, K.cookiePool].every((id) => !!S.pool[id]), `新建=${[P.urlRewrite, P.token, P.servletCookie, P.servletSession, P.sessionLifecycle].filter((id) => !!S.pool[id]).length}/5`]);
pre.push(['P8', '引用原子指向的本体存在于池（Cookie / Session 池查表可解析）', S.pool[P.servletCookie].viewDimensions[0].sections[0].atoms.every((a) => !!S.pool[a.nodeId]) && S.pool[P.servletSession].viewDimensions[0].sections[0].atoms.every((a) => !!S.pool[a.nodeId]), `${S.pool[P.servletCookie].viewDimensions[0].sections[0].atoms.map((a) => a.nodeId)} · ${S.pool[P.servletSession].viewDimensions[0].sections[0].atoms.map((a) => a.nodeId)}`]);
pre.push(['P9', '内容无损：三个 mover 的池实体逐字节未变；树节点自身字段（剔除 children）逐字节未变',
  [K.wsPool, K.sessionPool, K.cookiePool].every((id) => JSON.stringify(S.pool[id]) === S.preserve.pool[id])
  && [K.wsTree, K.sessionTree, K.cookieTree].every((id) => ownJson(byId(id)) === S.preserve.tree[id]),
  `池 ${[K.wsPool, K.sessionPool, K.cookiePool].filter((id) => JSON.stringify(S.pool[id]) === S.preserve.pool[id]).length}/3 · 树自身字段 ${[K.wsTree, K.sessionTree, K.cookieTree].filter((id) => ownJson(byId(id)) === S.preserve.tree[id]).length}/3`]);
pre.push(['P10', '计数：树 3216→3221（+5 新建）· 池 3860→3865（+5 新建）· 边 4151→4155（删 4 加 8）',
  S.before.tree === 3216 && S.after.tree === 3221 && S.before.pool === 3860 && S.after.pool === 3865 && S.before.edges === 4151 && S.after.edges === 4155,
  `树 ${S.before.tree}→${S.after.tree} 池 ${S.before.pool}→${S.after.pool} 边 ${S.before.edges}→${S.after.edges}`]);
pre.push(['P11', '边增删集合恰为本批声明（删 4 加 8），无夹带',
  S.removed.length === 4 && S.added.length === 8 && S.added.every((e) => e.type === 'structure' && e.label === '结构包含'),
  `删=[${S.removed.map((e) => e.id.slice(-24)).join(', ')}]`]);
pre.push(['P12', '本批新增 8 条 treebind 全部可解析（两端 treeId 均在树中）', (() => {
  const known = new Set(flat.keys());
  const parseTb = (id) => {
    if (!/^treebind:/.test(id || '')) return null;
    const body = id.slice('treebind:'.length);
    for (let i = 1; i < body.length - 1; i += 1) {
      if (body[i] !== ':') continue;
      const a = body.slice(0, i); const b = body.slice(i + 1);
      if (known.has(a) && known.has(b)) return { a, b };
    }
    return null;
  };
  const bad = S.added.filter((e) => !parseTb(e.id));
  return bad.length === 0;
})(), `新增=${S.added.length} 不可解析=${S.added.filter((e) => { const known = new Set(flat.keys()); const body = e.id.slice('treebind:'.length); for (let i = 1; i < body.length - 1; i += 1) { if (body[i] !== ':') continue; const a = body.slice(0, i); const b = body.slice(i + 1); if (known.has(a) && known.has(b)) return false; } return true; }).length}`]);
pre.push(['P13', '演化事件文件零改动（本批不写：2026-09-15 裁决）', evoNow() === orig.evo, `字节 ${orig.evo === null ? '(文件不存在)' : Buffer.byteLength(orig.evo)} → ${evoNow() === null ? '(文件不存在)' : Buffer.byteLength(evoNow())} 逐字节${evoNow() === orig.evo ? '相等' : '不等'}`]);

const preFailed = pre.filter(([, , ok]) => !ok);
for (const [id, desc, ok, detail] of pre) console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(4)} ${desc}  [${detail}]`);
console.log(`\n源门禁 ${S.src.length}/${S.src.length} · 预检 ${pre.length - preFailed.length}/${pre.length}`);
console.log(`计数 前: 树 ${S.before.tree} 池 ${S.before.pool} 边 ${S.before.edges}`);
console.log(`计数 后: 树 ${S.after.tree} 池 ${S.after.pool} 边 ${S.after.edges}`);
S.log.forEach((l) => console.log('  · ' + l));

if (preFailed.length) { console.error('\n预检未过，终止'); process.exit(1); }

if (!APPLY) {
  console.log('\n[DRY-RUN] 未写入任何文件。加 --apply 落盘。');
} else {
  writeJsonAtomic(F.tree, S.tree);
  writeJsonAtomic(F.pool, S.pool);
  writeJsonAtomic(F.edges, Array.isArray(readJson(F.edges)) ? S.edges : { edges: S.edges });
  const okTree = JSON.stringify(readJson(F.tree)) === JSON.stringify(S.tree);
  const okPool = JSON.stringify(readJson(F.pool)) === JSON.stringify(S.pool);
  const okEdges = JSON.stringify(readJson(F.edges)) === JSON.stringify(S.edges);
  const okEvo = evoNow() === orig.evo;
  console.log(`\n[APPLY] 已落盘 tree/pool/edges（未触碰 evolution-events / questions）；回读一致性 tree=${okTree} pool=${okPool} edges=${okEdges} evo未变=${okEvo}`);
  if (!okTree || !okPool || !okEdges || !okEvo) { console.error('落盘后回读不一致，请检查'); process.exit(1); }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'p-web-cookie-session-apply-report.md'), [
  `# P-WEB-COOKIE-SESSION · ${APPLY ? 'APPLY' : 'DRY-RUN'} 报告`,
  '',
  `- 时间：${new Date().toISOString()}`,
  `- 数据目录：\`${DATA_DIR}\``,
  `- 裁决依据：与 p-web-http-scope 同构 —— 协议机制不进 JavaWeb，JavaWeb 只留类型抽象和生命周期管理`,
  '',
  '## 源门禁',
  '',
  '| 项 | 说明 | 结果 | 读数 |',
  '|---|---|---|---|',
  ...S.src.map(([id, desc, ok, detail]) => `| ${id} | ${desc} | ${ok ? 'PASS' : '**FAIL**'} | ${detail} |`),
  '',
  '## 预检',
  '',
  '| 项 | 说明 | 结果 | 读数 |',
  '|---|---|---|---|',
  ...pre.map(([id, desc, ok, detail]) => `| ${id} | ${desc} | ${ok ? 'PASS' : '**FAIL**'} | ${detail} |`),
  '',
  '## 计数',
  '',
  `- 前：树 ${S.before.tree} / 池 ${S.before.pool} / 边 ${S.before.edges}`,
  `- 后：树 ${S.after.tree} / 池 ${S.after.pool} / 边 ${S.after.edges}`,
  `- 演化事件：**未写入**（2026-09-15 裁决：批次脚本不得向 evolution-events.json 写操作日志类事件；操作日志由 git 提交 + batch-manifests 承载）—— 落盘前后逐字节比对${evoNow() === orig.evo ? '**相等**' : '**不等**'}`,
  '',
  '## 操作日志',
  '',
  ...S.log.map((l) => `- ${l}`),
  '',
  '## 边清单',
  '',
  '### 删除',
  '',
  ...S.removed.map((e) => `- \`${e.id}\`（${e.source} → ${e.target}）`),
  '',
  '### 新增',
  '',
  ...S.added.map((e) => `- \`${e.id}\`（${e.source} → ${e.target}）`),
  '',
].join('\n'));
console.log(`报告 → outputs/tree-violation-scan/p-web-cookie-session-apply-report.md`);
