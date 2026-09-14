#!/usr/bin/env node
/**
 * P-WEB-HTTP-SCOPE · 独立验证
 *
 * 纪律：**不 import apply 脚本**。所有结论从「备份快照 ↔ 当前真源」反推得出，
 *       否则验证只是把 apply 的逻辑再跑一遍，等于没验。
 *
 * 用法：node scripts/verify-p-web-http-scope.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR) : path.join(ROOT, 'data');
const BACKUP = path.join(ROOT, 'data/backups/p-web-http-scope-2026-09-14T16-26-47-000Z');
const read = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
const now = { tree: read(DATA_DIR, 'tree-data.json'), pool: read(DATA_DIR, 'node-pool.json'), edges: read(DATA_DIR, 'knowledge-edges.json'), evo: read(DATA_DIR, 'evolution-events.json') };
const bak = { tree: read(BACKUP, 'tree-data.json'), pool: read(BACKUP, 'node-pool.json'), edges: read(BACKUP, 'knowledge-edges.json'), evo: read(BACKUP, 'evolution-events.json') };
const ee = (x) => (Array.isArray(x) ? x : x.edges);
const vv = (x) => (Array.isArray(x) ? x : x.events);

const walk = (root) => {
  const m = new Map();
  (function w(n, anc) { m.set(n.id, { node: n, parent: anc.at(-1), path: anc.map((a) => m.get(a)?.node?.name ?? a).join(' > ') }); for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) w(c, [...anc, n.id]); })(root, []);
  return m;
};
const count = (n) => { let c = 1; for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const x of n[k]) c += count(x); return c; };
// ★ treebind 解析必须用「冒号安全枚举」：逐一切点尝试，两半都必须是活着的树 id。
//   禁用 lastIndexOf(':') / split(':') —— 父 treeId 自身含冒号时会误判（本项目 P0.1 踩过：
//   同款缺陷曾把 18 条既有债虚报成 217/227）。此处落进 known 集合才算合法解析。
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

const N = walk(now.tree); const B = walk(bak.tree);
const ne = ee(now.edges); const be = ee(bak.edges);
const rows = [];
const V = (id, desc, pass, detail) => rows.push({ id, desc, pass: !!pass, detail });

// ── V1 备份可用
V('V1', '备份快照可读且四文件齐备', !!(bak.tree && bak.pool && bak.edges && bak.evo),
  `tree=${count(bak.tree)} pool=${Object.keys(bak.pool).length} edges=${be.length}`);

// ── V2~V4 计数（期望值来自用户裁决文档，不来自 apply 脚本）
V('V2', '树计数 3212 → 3215（+5 新建 −1 残留 −1 报文格式）', count(bak.tree) === 3212 && count(now.tree) === 3215,
  `${count(bak.tree)} → ${count(now.tree)}`);
V('V3', '池计数 3855 → 3858（+4 本体 −1 残留实体）', Object.keys(bak.pool).length === 3855 && Object.keys(now.pool).length === 3858,
  `${Object.keys(bak.pool).length} → ${Object.keys(now.pool).length}`);
V('V4', '边计数 4159 → 4161（删 7 加 9，净 +2）', be.length === 4159 && ne.length === 4161, `${be.length} → ${ne.length}`);

// ── V5 反推位移：树结构差异必须恰好是本批声明的移动集
{
  const MOVE = {
    tree_1786898852112_uph5k3: ['tree_1786898830078_iopwk0', 'tree_concept_http_request'],
    tree_1786898862413_xhmyno: ['tree_1786898830078_iopwk0', 'tree_concept_http_response'],
    tree_java_fw_servlet_lifecycle: ['tree_java_fw_javaweb', 'tree_java_fw_servlet'],
    tree_java_fw_web_attribute_scope: ['tree_java_fw_javaweb', 'tree_java_fw_servlet_lifecycle'],
  };
  const actual = [];
  for (const [id, [from, to]] of Object.entries(MOVE)) {
    const bp = B.get(id)?.parent; const np = N.get(id)?.parent;
    if (bp !== from || np !== to) actual.push(`${id}: ${bp}→${np}（期望 ${from}→${to}）`);
  }
  V('V5', '四个移动挂载的「父节点迁移」与声明逐条相符（反推，非断言计数）', actual.length === 0,
    actual.length ? actual.join(' | ') : Object.keys(MOVE).length + ' 条全部相符');
}

// ── V6 树节点集合差异 == 本批声明
{
  const NEW_IDS = ['tree_concept_http_request', 'tree_concept_http_response', 'tree_java_fw_servlet', 'tree_java_fw_http_servlet_request', 'tree_java_fw_http_servlet_response'];
  const GONE_IDS = ['tree_java_fw_http_request_response', 'tree_1786898830078_iopwk0'];
  const added = [...N.keys()].filter((k) => !B.has(k));
  const removed = [...B.keys()].filter((k) => !N.has(k));
  const ok = added.sort().join(',') === [...NEW_IDS].sort().join(',') && removed.sort().join(',') === [...GONE_IDS].sort().join(',');
  V('V6', '树节点增删集合恰为本批声明（+5 新建 / −2 卸除），无夹带', ok,
    `新增=[${added.join(',')}] 删除=[${removed.join(',')}]`);
}

// ── V7 「HTTP Request/Response」复合概念节点不存在
V('V7', '不存在名为「HTTP Request/Response」的复合概念节点', ![...N.values()].some((x) => x.node.name === 'HTTP Request/Response'),
  `命中=${[...N.values()].filter((x) => x.node.name === 'HTTP Request/Response').length}`);

// ── V8 HTTP Request / HTTP Response 是独立 concept 且挂在 HTTP 本体下
{
  const p1 = N.get('tree_concept_http_request'); const p2 = N.get('tree_concept_http_response');
  const ok = p1 && p2 && p1.parent === 'tree_1786898710541_l4hgm2' && p2.parent === 'tree_1786898710541_l4hgm2'
    && now.pool['concept_http_request']?.kind === 'Concept' && now.pool['concept_http_response']?.kind === 'Concept'
    && now.pool['concept_http_request'].id !== now.pool['concept_http_response'].id;
  V('V8', 'HTTP Request / HTTP Response 是两个独立 concept，且挂载在 网络>网络协议>HTTP 下', ok,
    `父=${p1?.parent} / ${p2?.parent} kind=${now.pool['concept_http_request']?.kind}/${now.pool['concept_http_response']?.kind}`);
}

// ── V9 报文层级翻转：请求报文 → HTTP Request、响应报文 → HTTP Response
V('V9', '请求报文 / 响应报文 已从「报文格式」翻转归入 HTTP Request / HTTP Response',
  N.get('tree_1786898852112_uph5k3')?.parent === 'tree_concept_http_request' && N.get('tree_1786898862413_xhmyno')?.parent === 'tree_concept_http_response',
  `${N.get('tree_1786898852112_uph5k3')?.parent} / ${N.get('tree_1786898862413_xhmyno')?.parent}`);

// ── V10 JavaWeb 只引用不拥有：Servlet 首位 + 三子项
{
  const jw = N.get('tree_java_fw_javaweb').node;
  const sv = N.get('tree_java_fw_servlet').node;
  const ok = jw.children[0]?.id === 'tree_java_fw_servlet'
    && sv.children.map((c) => c.id).join(',') === ['tree_java_fw_http_servlet_request', 'tree_java_fw_http_servlet_response', 'tree_java_fw_servlet_lifecycle'].join(',');
  V('V10', 'JavaWeb 下 Servlet 居首，其子项为 HttpServletRequest / HttpServletResponse / 生命周期', ok,
    `Servlet 子项=[${sv.children.map((c) => c.name).join(' / ')}] JavaWeb 首项=${jw.children[0]?.name}`);
}

// ── V11 Web 属性作用域 不属于 HTTP Request；且已迁到 生命周期
{
  const scope = N.get('tree_java_fw_web_attribute_scope');
  const badEdge = ne.filter((e) => e.id === 'asplit:s18:req-scope');
  const ok = scope?.parent === 'tree_java_fw_servlet_lifecycle' && badEdge.length === 0
    && N.get('tree_java_fw_javaweb').node.children.every((c) => c.id !== 'tree_java_fw_web_attribute_scope');
  V('V11', 'Web 属性作用域 不再与 HTTP Request/Response 绑定，已归 生命周期；错误父子边为 0', ok,
    `父=${scope?.parent} 错误边=${badEdge.length}`);
}

// ── V12 残留清零
V('V12', '源残留节点与池实体均已删除', !N.has('tree_java_fw_http_request_response') && !now.pool['asplit_http_request_response'],
  `树=${N.has('tree_java_fw_http_request_response')} 池=${!!now.pool['asplit_http_request_response']}`);

// ── V13 卸树留池：「报文格式」树位已卸、池实体仍在
V('V13', '「报文格式」已卸树、池实体保留（0 内容损失）', !N.has('tree_1786898830078_iopwk0') && !!now.pool['k_1786898829740_rz93sq'],
  `树=${N.has('tree_1786898830078_iopwk0')} 池=${!!now.pool['k_1786898829740_rz93sq']}`);

// ── V14 悬空不劣化
{
  const dangling = (m, pool) => [...new Set([...m.values()].map((x) => x.node.nodeRef).filter(Boolean))].filter((r) => !pool[r]);
  const tbAll = ne.filter((e) => /^treebind:/.test(e.id || ''));
  const unresolvedNow = tbAll.filter((e) => !parseTb(e.id, N));
  const unresolvedBak = be.filter((e) => /^treebind:/.test(e.id || '')).filter((e) => !parseTb(e.id, B));
  const dB = dangling(B, bak.pool); const dN = dangling(N, now.pool);
  V('V14', '悬空未劣化：nodeRef 悬空 0；treebind 不可解析仍为 18（既有债，本批未新增）',
    dN.length === 0 && unresolvedNow.length === unresolvedBak.length,
    `nodeRef 悬空 备份=${dB.length} 现状=${dN.length}${dN.length ? ' [' + dN.join(',') + ']' : ''} | treebind 不可解析 备份=${unresolvedBak.length} 现状=${unresolvedNow.length}（同口径对比，不得劣化）`);
}

// ── V15 新增 treebind 全部可解析
{
  const added = ne.filter((e) => /^treebind:/.test(e.id || '') && !be.some((x) => x.id === e.id));
  const bad = added.filter((e) => !parseTb(e.id, N));
  V('V15', '本批新增的 treebind 全部可解析（无新增悬空）', added.length === 9 && bad.length === 0,
    `新增=${added.length} 不可解析=${bad.length}`);
}

// ── V16 内容无损：原文关键片段全部落在迁移 tab
{
  const srcTab = bak.tree && (function f(n) { if (n.id === 'tree_java_fw_http_request_response') return (n.supplement?.tabs || []).find((t) => /^asplit:/.test(t.id || '')); for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) { const r = f(c); if (r) return r; } })(bak.tree);
  const orig = (srcTab?.content || '').replace(/\s+/g, '');
  const migrated = Object.values(now.pool).flatMap((v) => v.card?.tabs || []).filter((t) => t.id === 'migrated:asplit_http_request_response').map((t) => t.content).join('\n').replace(/\s+/g, '');
  const need = ['两个核心对象', 'HttpServletRequest', 'HttpServletResponse', '请求处理的本质', '读取表单和URL参数', '写入Response', '作用域理解', 'ServletContext', '这些作用域是后续Web框架状态管理的基础层'];
  const miss = need.filter((k) => !migrated.includes(k.replace(/\s+/g, '')));
  V('V16', '内容无损迁移：原文 9 个关键片段全部保留在迁移 tab 中', miss.length === 0 && (srcTab?.content || '').length > 200,
    `原文长度=${(srcTab?.content || '').length} 迁移 tab 长度=${Object.values(now.pool).flatMap((v) => v.card?.tabs || []).filter((t) => t.id === 'migrated:asplit_http_request_response').map((t) => (t.content || '').length).reduce((a, b) => a + b, 0)} 缺失=[${miss.join(',')}]`);
}

// ── V17 引用机制可解析（原子指向的实体存在）
{
  const hosts = ['concept_http_servlet_request', 'concept_http_servlet_response'];
  const atoms = hosts.flatMap((h) => (now.pool[h]?.viewDimensions || []).flatMap((d) => (d.sections || []).flatMap((s) => s.atoms || [])));
  const bad = atoms.filter((a) => !now.pool[a.nodeId]);
  V('V17', 'Java 侧类型的引用原子全部可解析到协议本体（不走树，走池查表）', atoms.length === 2 && bad.length === 0,
    `原子=${atoms.map((a) => a.nodeId).join(',')} 悬空=${bad.length}`);
}

// ── V18 新本体内容非空
{
  const ids = ['concept_http_request', 'concept_http_response', 'concept_http_servlet_request', 'concept_http_servlet_response'];
  const empty = ids.filter((i) => ((now.pool[i]?.card?.rootContent || '').trim().length < 60));
  V('V18', '四个新本体 rootContent 均非空（≥60 字）', empty.length === 0,
    ids.map((i) => `${i.replace('concept_', '')}=${(now.pool[i]?.card?.rootContent || '').length}`).join(' '));
}

// ── V19 演化事件
{
  const nev = vv(now.evo); const bev = vv(bak.evo);
  const hit = nev.filter((e) => /p-web-http-scope/.test(e.id || ''));
  V('V19', '演化事件 +1 且为本批唯一一条、changes 非空', nev.length === bev.length + 1 && hit.length === 1 && (hit[0].changes || []).length > 0,
    `${bev.length} → ${nev.length}；本批事件 changes=${hit[0]?.changes?.length ?? 0}`);
}

// ── V20 未触碰文件（questions.json 零改动由外部断言）
V('V20', 'node-pool 中与批无关实体未被动（抽样：Servlet 本体 label 未改、mybatis 宿主维度完好）',
  now.pool['k_1784340526295_skm8iw']?.label === 'Servlet'
  && (now.pool['k_java_fw_mybatis']?.viewDimensions?.[0]?.sections?.[0]?.atoms?.length === 4),
  `Servlet.label=${now.pool['k_1784340526295_skm8iw']?.label} mybatis 原子=${now.pool['k_java_fw_mybatis']?.viewDimensions?.[0]?.sections?.[0]?.atoms?.length}`);

const failed = rows.filter((r) => !r.pass);
for (const r of rows) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(4)} ${r.desc}  [${r.detail}]`);
console.log(`\n独立验证 ${rows.length - failed.length}/${rows.length}`);

const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan', 'p-web-http-scope-verification.md');
fs.writeFileSync(OUT, [
  '# P-WEB-HTTP-SCOPE · 独立验证',
  '',
  `- 时间：${new Date().toISOString()}`,
  `- 方法：从 \`data/backups/p-web-http-scope-2026-09-14T16-26-47-000Z\` 快照 ↔ 当前真源**反推**，不 import apply 脚本`,
  `- 结论：**${failed.length === 0 ? 'PASS' : 'FAIL'}**（${rows.length - failed.length}/${rows.length}）`,
  '',
  '| 项 | 说明 | 结果 | 读数 |',
  '|---|---|---|---|',
  ...rows.map((r) => `| ${r.id} | ${r.desc} | ${r.pass ? 'PASS' : '**FAIL**'} | ${r.detail} |`),
  '',
].join('\n'));
console.log(`报告 → outputs/tree-violation-scan/p-web-http-scope-verification.md`);
process.exit(failed.length ? 1 : 0);
