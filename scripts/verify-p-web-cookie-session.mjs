#!/usr/bin/env node
/**
 * P-WEB-COOKIE-SESSION · 独立验证
 *
 * 纪律：**不 import apply 脚本**。所有结论从「备份快照 ↔ 当前真源」反推得出，
 *       否则验证只是把 apply 的逻辑再跑一遍，等于没验。
 *
 * 用法：node scripts/verify-p-web-cookie-session.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR) : path.join(ROOT, 'data');
const BACKUP = path.join(ROOT, 'data/backups/p-web-cookie-session-2026-09-21T13-29-17-000Z');
const read = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
const now = { tree: read(DATA_DIR, 'tree-data.json'), pool: read(DATA_DIR, 'node-pool.json'), edges: read(DATA_DIR, 'knowledge-edges.json') };
const bak = { tree: read(BACKUP, 'tree-data.json'), pool: read(BACKUP, 'node-pool.json'), edges: read(BACKUP, 'knowledge-edges.json') };
const ee = (x) => (Array.isArray(x) ? x : x.edges);

const walk = (root) => {
  const m = new Map();
  (function w(n, anc) { m.set(n.id, { node: n, parent: anc.at(-1) }); for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) w(c, [...anc, n.id]); })(root, []);
  return m;
};
const count = (n) => { let c = 1; for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const x of n[k]) c += count(x); return c; };
// ★ treebind 解析必须用「冒号安全枚举」：逐一切点尝试，两半都必须是活着的树 id。
//   禁用 lastIndexOf(':') / split(':') —— 父 treeId 自身含冒号时会误判（本项目 P0.1 踩过：
//   同款缺陷曾把 18 条既有债虚报成 217/227）。
const parseTb = (id, known) => {
  if (!/^treebind:/.test(id || '')) return null;
  const body = id.slice('treebind:'.length);
  for (let i = 1; i < body.length - 1; i += 1) {
    if (body[i] !== ':') continue;
    const a = body.slice(0, i); const b = body.slice(i + 1);
    if (known.has(a) && known.has(b)) return { a, b };
  }
  return null;
};
// 节点自身字段（剔除 children/nodes 容器）：反推「内容无损」用
const ownJson = (n) => { const { children, nodes, ...rest } = n; return JSON.stringify(rest); };
const childrenSig = (n) => ((n && n.children) || []).map((c) => c.id).join(',');

const K = {
  httpTree: 'tree_1786898710541_l4hgm2',
  appLayerTree: 'tree_1786874260927_9y92b2',
  webTree: 'tree_java_fw_javaweb',
  servletTree: 'tree_java_fw_servlet',
  wsTree: 'tree_java_fw_web_state_management',
  sessionTree: 'atomic_k_dict_ef30sdky',
  cookieTree: 'atomic_atomic_cookie',
  wsPool: 'asplit_web_state_management',
  sessionPool: 'k_dict_ef30sdky',
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

const N = walk(now.tree); const B = walk(bak.tree);
const ne = ee(now.edges); const be = ee(bak.edges);
const rows = [];
const V = (id, desc, pass, detail) => rows.push({ id, desc, pass: !!pass, detail });

// ── V1 备份可用（含 questions，逐字节比对用）
V('V1', '备份快照可读（tree / pool / edges）', !!(bak.tree && bak.pool && bak.edges),
  `tree=${count(bak.tree)} pool=${Object.keys(bak.pool).length} edges=${be.length}`);

// ── V2~V4 计数（期望值来自裁决文档，不来自 apply 脚本）
V('V2', '树计数 3216 → 3221（+5 新建，本批 0 删除）', count(bak.tree) === 3216 && count(now.tree) === 3221,
  `${count(bak.tree)} → ${count(now.tree)}`);
V('V3', '池计数 3860 → 3865（+5 新建，0 删除）', Object.keys(bak.pool).length === 3860 && Object.keys(now.pool).length === 3865,
  `${Object.keys(bak.pool).length} → ${Object.keys(now.pool).length}`);
V('V4', '边计数 4151 → 4155（删 4 加 8，净 +4）', be.length === 4151 && ne.length === 4155, `${be.length} → ${ne.length}`);

// ── V5 反推位移：三个 mover 的父迁移必须逐条相符
{
  const MOVE = {
    [K.wsTree]: [K.webTree, K.appLayerTree],
    [K.sessionTree]: [K.webTree, K.wsTree],
    [K.cookieTree]: [K.webTree, K.httpTree],
  };
  const actual = [];
  for (const [id, [from, to]] of Object.entries(MOVE)) {
    const bp = B.get(id)?.parent; const np = N.get(id)?.parent;
    if (bp !== from || np !== to) actual.push(`${id}: ${bp}→${np}（期望 ${from}→${to}）`);
  }
  V('V5', '三个 mover 的父节点迁移与裁决逐条相符（反推，非断言计数）', actual.length === 0,
    actual.length ? actual.join(' | ') : `${Object.keys(MOVE).length} 条全部相符：Web 状态管理→应用层 · Session→Web 状态管理 · Cookie→HTTP`);
}

// ── V6 树节点增删集合 == 本批声明（+5 / −0）
{
  const NEW_IDS = [T.urlRewrite, T.token, T.servletCookie, T.servletSession, T.sessionLifecycle];
  const added = [...N.keys()].filter((k) => !B.has(k));
  const removed = [...B.keys()].filter((k) => !N.has(k));
  V('V6', '树节点增删集合恰为本批声明（+5 新建 / −0 删除），无夹带',
    added.sort().join(',') === [...NEW_IDS].sort().join(',') && removed.length === 0,
    `新增=[${added.join(',')}] 删除=[${removed.join(',')}]`);
}

// ── V7 结构性最强断言：既有节点「自身字段」零改动 + children 变化集恰为 5 个声明父节点
{
  const ownChanged = [...B.keys()].filter((k) => N.has(k) && ownJson(B.get(k).node) !== ownJson(N.get(k).node));
  const EXPECT_CHILD = new Set([K.webTree, K.appLayerTree, K.wsTree, K.httpTree, K.servletTree]);
  const childChanged = [...B.keys()].filter((k) => N.has(k) && childrenSig(B.get(k).node) !== childrenSig(N.get(k).node));
  const extraChild = childChanged.filter((k) => !EXPECT_CHILD.has(k));
  V('V7', '既有节点自身字段（剔除 children）零改动；children 有变的恰为 5 个声明父节点（无夹带）',
    ownChanged.length === 0 && extraChild.length === 0 && childChanged.every((k) => EXPECT_CHILD.has(k)),
    `自身字段有变=${ownChanged.length}${ownChanged.length ? ' [' + ownChanged.join(',') + ']' : ''} · children 有变=${childChanged.length} [${childChanged.join(',')}] 越界=${extraChild.length}`);
}

// ── V8 Cookie 归 HTTP 本体，不再是 JavaWeb 直接子项；池实体保留（0 删除）
{
  const c = N.get(K.cookieTree);
  const jwKids = childrenSig(N.get(K.webTree).node).split(',');
  V('V8', 'Cookie 挂到 HTTP 之下、池实体保留未删、JavaWeb 不再直接含 Cookie',
    c?.parent === K.httpTree && !!now.pool[K.cookiePool] && !jwKids.includes(K.cookieTree),
    `Cookie 父=${c?.parent} 池=${!!now.pool[K.cookiePool]} JavaWeb 直含=${jwKids.includes(K.cookieTree)}`);
}

// ── V9 Web 状态管理 归「网络 > 应用层」，其下为 Session / URL 重写 / Token（Session 居首）
{
  const ws = N.get(K.wsTree).node;
  const ok = N.get(K.wsTree).parent === K.appLayerTree
    && childrenSig(ws) === [K.sessionTree, T.urlRewrite, T.token].join(',');
  V('V9', 'Web 状态管理挂 网络>应用层 之下；子项 = Session / URL 重写 / Token（Session 居首）', ok,
    `父=${N.get(K.wsTree).parent} 子=[${ws.children.map((x) => x.name).join(' / ')}]`);
}

// ── V10 JavaWeb 只留类型抽象：Servlet 六子项；三 mover 均不再是 JavaWeb 直接子项
{
  const jw = N.get(K.webTree).node;
  const sv = N.get(K.servletTree).node;
  const expect = ['tree_java_fw_http_servlet_request', 'tree_java_fw_http_servlet_response', 'tree_java_fw_servlet_lifecycle', T.servletCookie, T.servletSession, T.sessionLifecycle].join(',');
  const jwKids = jw.children.map((c) => c.id);
  V('V10', 'Servlet 下六项（含 javax.servlet.http.Cookie / HttpSession / Session 生命周期与配置）；JavaWeb 不再直接含三 mover',
    childrenSig(sv) === expect && [K.wsTree, K.sessionTree, K.cookieTree].every((id) => !jwKids.includes(id)) && jwKids[0] === K.servletTree,
    `Servlet 子=[${sv.children.map((c) => c.name).join(' / ')}] · JavaWeb 首项=${jw.children[0]?.name} 残留=${[K.wsTree, K.sessionTree, K.cookieTree].filter((id) => jwKids.includes(id)).length}`);
}

// ── V11 错误边删除；跨分支真实依赖边保留（删对了，也没误删）
V('V11', '与树矛盾的结构声明 asplit:s18:session-state 已删；依赖边 atomic:s1:session-cookie 保留',
  !ne.some((e) => e.id === K.badEdge) && ne.some((e) => e.id === 'atomic:s1:session-cookie'),
  `错误边=${ne.filter((e) => e.id === K.badEdge).length} 依赖边=${ne.filter((e) => e.id === 'atomic:s1:session-cookie').length}`);

// ── V12 边增删集合恰为本批声明，且既有边内容零改动
{
  const removed = be.filter((e) => !ne.some((x) => x.id === e.id)).map((e) => e.id).sort();
  const added = ne.filter((e) => !be.some((x) => x.id === e.id)).map((e) => e.id).sort();
  const EXPECT_RM = [`treebind:${K.webTree}:${K.wsTree}`, `treebind:${K.webTree}:${K.sessionTree}`, `treebind:${K.webTree}:${K.cookieTree}`, K.badEdge].sort();
  const EXPECT_ADD = [
    `treebind:${K.appLayerTree}:${K.wsTree}`,
    `treebind:${K.wsTree}:${K.sessionTree}`,
    `treebind:${K.wsTree}:${T.urlRewrite}`,
    `treebind:${K.wsTree}:${T.token}`,
    `treebind:${K.httpTree}:${K.cookieTree}`,
    `treebind:${K.servletTree}:${T.servletCookie}`,
    `treebind:${K.servletTree}:${T.servletSession}`,
    `treebind:${K.servletTree}:${T.sessionLifecycle}`,
  ].sort();
  const keptChanged = ne.filter((e) => be.some((x) => x.id === e.id)).filter((e) => JSON.stringify(e) !== JSON.stringify(be.find((x) => x.id === e.id)));
  V('V12', '边增删集合恰为本批声明（删 4 加 8），既有边内容有变 = 0（无夹带）',
    removed.join('|') === EXPECT_RM.join('|') && added.join('|') === EXPECT_ADD.join('|') && keptChanged.length === 0,
    `删=[${removed.map((x) => x.slice(-26)).join(', ')}] 加=${added.length} 既有边有变=${keptChanged.length}${keptChanged.length ? ' [' + keptChanged.map((e) => e.id).join(',') + ']' : ''}`);
}

// ── V13 新增 treebind 全部可解析，且边端 pool id 与树节点 nodeRef 一致（反查映射）
{
  const added = ne.filter((e) => !be.some((x) => x.id === e.id));
  const tbs = added.filter((e) => /^treebind:/.test(e.id));
  const badParse = tbs.filter((e) => !parseTb(e.id, N));
  const badMap = tbs.filter((e) => {
    const { a, b } = parseTb(e.id, N) || {};
    if (!a || !b) return true;
    return N.get(a)?.node?.nodeRef !== e.source || N.get(b)?.node?.nodeRef !== e.target;
  });
  V('V13', '本批新增 8 条 treebind 全部可解析，且 source/target 与两端树节点 nodeRef 一一相符',
    tbs.length === 8 && badParse.length === 0 && badMap.length === 0,
    `treebind=${tbs.length} 不可解析=${badParse.length} 映射不符=${badMap.length}${badMap.length ? ' [' + badMap.map((e) => e.id).join(',') + ']' : ''}`);
}

// ── V14 悬空不劣化（同口径对比：本批不得新增悬空；既有债原样保留不修不劣）
{
  const dangling = (m, pool) => [...new Set([...m.values()].map((x) => x.node.nodeRef).filter(Boolean))].filter((r) => !pool[r]);
  const unresolvedNow = ne.filter((e) => /^treebind:/.test(e.id || '')).filter((e) => !parseTb(e.id, N));
  const unresolvedBak = be.filter((e) => /^treebind:/.test(e.id || '')).filter((e) => !parseTb(e.id, B));
  const dB = dangling(B, bak.pool); const dN = dangling(N, now.pool);
  const newDangling = dN.filter((r) => !dB.includes(r));
  // 既有债 `container:key_constraint`（DB 章节节点，与本批无关）必须原样保留：同名同节点
  const debtNode = (m) => { const hit = [...m.values()].find((x) => x.node.nodeRef === 'container:key_constraint'); return hit ? `${hit.node.id}|${hit.node.name}|${hit.parent}` : null; };
  const debtIntact = debtNode(B) !== null && debtNode(B) === debtNode(N);
  V('V14', '悬空未劣化：无新增 nodeRef 悬空（既有债 container:key_constraint 原样保留，同节点同内容）；treebind 不可解析不增（0 → 0）',
    newDangling.length === 0 && debtIntact && unresolvedNow.length <= unresolvedBak.length,
    `nodeRef 悬空 备份=${dB.length}[${dB.join(',')}] 现状=${dN.length}[${dN.join(',')}] 新增=${newDangling.length} 既有债原样=${debtIntact}(${debtNode(N) || '-'}) | treebind 不可解析 备份=${unresolvedBak.length} 现状=${unresolvedNow.length}`);
}

// ── V15 内容无损（反推）：三个 mover 池实体逐字节未变 + 树节点自身字段逐字节未变
{
  const poolSame = [K.wsPool, K.sessionPool, K.cookiePool].filter((id) => JSON.stringify(bak.pool[id]) === JSON.stringify(now.pool[id]));
  const treeSame = [K.wsTree, K.sessionTree, K.cookieTree].filter((id) => ownJson(B.get(id).node) === ownJson(N.get(id).node));
  V('V15', '内容无损：三个 mover 池实体 3/3 逐字节未变；三个 mover 树节点自身字段 3/3 逐字节未变（移动不丢内容）',
    poolSame.length === 3 && treeSame.length === 3,
    `池 ${poolSame.length}/3 · 树自身字段 ${treeSame.length}/3（children 变化由 V7 单独断言）`);
}

// ── V16 新本体内容非空 + 引用机制可解析
{
  const ids = [P.urlRewrite, P.token, P.servletCookie, P.servletSession, P.sessionLifecycle];
  const thin = ids.filter((i) => ((now.pool[i]?.card?.rootContent || '').trim().length < 60));
  const atomsOf = (h) => (now.pool[h]?.viewDimensions || []).flatMap((d) => (d.sections || []).flatMap((s) => s.atoms || []));
  const bindings = [...atomsOf(P.servletCookie), ...atomsOf(P.servletSession)];
  const badBind = bindings.filter((a) => !now.pool[a.nodeId]);
  V('V16', '五个新本体 rootContent 均非空（≥60 字）；两条引用原子可解析到协议/概念本体（走池查表，不走树）',
    thin.length === 0 && bindings.length === 2 && badBind.length === 0
      && atomsOf(P.servletCookie)[0]?.nodeId === K.cookiePool && atomsOf(P.servletSession)[0]?.nodeId === K.sessionPool,
    `${ids.map((i) => i.replace('concept_', '') + '=' + (now.pool[i]?.card?.rootContent || '').length).join(' ')} · 原子=[${bindings.map((a) => a.nodeId).join(',')}] 悬空=${badBind.length}`);
}

// ── V17 引用而非拥有：两端语义（Java 类型是抽象，协议/概念本体不挂在 JavaWeb 下）
V('V17', '引用两端语义正确：javax.servlet.http.Cookie / HttpSession 是 type 抽象且其「被引用本体」不在 JavaWeb 直接子项内',
  now.pool[P.servletCookie]?.kind === 'Concept' && now.pool[P.servletSession]?.kind === 'Concept'
  && !childrenSig(N.get(K.webTree).node).split(',').includes(K.cookieTree),
  `kind=${now.pool[P.servletCookie]?.kind}/${now.pool[P.servletSession]?.kind}`);

// ── V18 写集外文件零改动：evolution-events / questions 逐字节比对
{
  const bytes = (d, f) => fs.readFileSync(path.join(d, f));
  const evo = bytes(DATA_DIR, 'evolution-events.json').equals(bytes(BACKUP, 'evolution-events.json'));
  const q = bytes(DATA_DIR, 'questions.json').equals(bytes(BACKUP, 'questions.json'));
  V('V18', 'evolution-events.json 与 questions.json 逐字节零改动（本批不写 evo：2026-09-15 裁决）', evo && q,
    `evo=${evo ? '相等' : '不等'} questions=${q ? '相等' : '不等'} · evo 字节=${bytes(DATA_DIR, 'evolution-events.json').length}`);
}

// ── V19 未触碰抽样：相邻既有实体完好（防误伤）
V('V19', '相邻既有实体未被误伤（Servlet 本体 label / JSP 节点 / mybatis 宿主视图维度）',
  now.pool['k_1784340526295_skm8iw']?.label === 'Servlet'
  && N.has('tree_vault_javajavawebjsp_elp41h')
  && now.pool['k_java_fw_mybatis']?.viewDimensions?.[0]?.sections?.[0]?.atoms?.length === 4,
  `Servlet.label=${now.pool['k_1784340526295_skm8iw']?.label} JSP=${N.has('tree_vault_javajavawebjsp_elp41h')} mybatis 原子=${now.pool['k_java_fw_mybatis']?.viewDimensions?.[0]?.sections?.[0]?.atoms?.length}`);

// ── V20 树无重复 id（防 attach 造成重复挂载）
{
  const ids = [];
  (function w(n) { ids.push(n.id); for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) w(c); })(now.tree);
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  V('V20', '树上无重复 treeId（mover 迁移未造成重复挂载）', dup.length === 0, `重复=${dup.length}${dup.length ? ' [' + dup.join(',') + ']' : ''}`);
}

const failed = rows.filter((r) => !r.pass);
for (const r of rows) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(4)} ${r.desc}  [${r.detail}]`);
console.log(`\n独立验证 ${rows.length - failed.length}/${rows.length}`);

const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan', 'p-web-cookie-session-verification.md');
fs.writeFileSync(OUT, [
  '# P-WEB-COOKIE-SESSION · 独立验证',
  '',
  `- 时间：${new Date().toISOString()}`,
  `- 方法：从 \`data/backups/p-web-cookie-session-2026-09-21T13-29-17-000Z\` 快照 ↔ 当前真源**反推**，不 import apply 脚本`,
  `- 结论：**${failed.length === 0 ? 'PASS' : 'FAIL'}**（${rows.length - failed.length}/${rows.length}）`,
  '',
  '| 项 | 说明 | 结果 | 读数 |',
  '|---|---|---|---|',
  ...rows.map((r) => `| ${r.id} | ${r.desc} | ${r.pass ? 'PASS' : '**FAIL**'} | ${r.detail} |`),
  '',
].join('\n'));
console.log(`报告 → outputs/tree-violation-scan/p-web-cookie-session-verification.md`);
process.exit(failed.length ? 1 : 0);
