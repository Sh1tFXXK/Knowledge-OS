#!/usr/bin/env node
/**
 * JAVA-LIB-OVERLAP-A · 独立验证
 *
 * 纪律：**不 import apply 脚本**。所有结论从「批前快照 ↔ 当前真源」反推得出，
 *       否则验证只是把 apply 的逻辑再跑一遍，等于没验。
 *
 * 本批语义（用户裁决）：
 *   类/java.lang/Object/Files  (A = k_1785378637961_iecl2a, tree = tree_1785378638150_sai7z9)
 *   → 合并并删除：A 独有的 bestPractices tab 逐字节搬入
 *     java.nio.file.Files (B = k_java_nio_file_files)，随后删 A 实体 + 其 treebind 边 + 树节点。
 *   其余 Files 方法 tab 不动。
 *
 * 用法：
 *   node scripts/verify-java-overlap-a.mjs [--snapshot <dir>]
 *   默认 snapshot = data/backups/java-overlap-a-2026-09-15T16-29-40-980Z
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR) : path.join(ROOT, 'data');

const args = process.argv.slice(2);
const snapIdx = args.indexOf('--snapshot');
const DEFAULT_SNAP = 'data/backups/java-overlap-a-2026-09-15T16-29-40-980Z';
const SNAPSHOT = snapIdx >= 0 ? args[snapIdx + 1] : DEFAULT_SNAP;
const BACKUP = path.isAbsolute(SNAPSHOT) ? SNAPSHOT : path.join(ROOT, SNAPSHOT);

// ── 本批事实常量（来自用户裁决文档，不来自 apply 脚本）──
const A_ID = 'k_1785378637961_iecl2a';           // 旧实体「类/Files」
const B_ID = 'k_java_nio_file_files';            // 承接方 java.nio.file.Files
const A_TREE_ID = 'tree_1785378638150_sai7z9';   // A 的树节点
const PARENT_TREE_ID = 'tree_java_source_020f0cac60da5755_s_type_a6b9e05051861242'; // java.lang/Object
const EDGE_ID = 'treebind:' + PARENT_TREE_ID + ':' + A_TREE_ID;
const MOVED_TAB_ID = 'bestPractices';
const MOVED_TAB_MD5 = '9de89c83fa4c03cab1d93e2a1ff255c5';
const EXP = { poolBefore: 3857, poolAfter: 3856, treeBefore: 3214, treeAfter: 3213, edgesBefore: 4162, edgesAfter: 4161, bTabsBefore: 31, bTabsAfter: 32 };

const md5 = (s) => createHash('md5').update(s).digest('hex');
const read = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

const now = { tree: read(DATA_DIR, 'tree-data.json'), pool: read(DATA_DIR, 'node-pool.json'), edges: read(DATA_DIR, 'knowledge-edges.json') };
const nowEdges = Array.isArray(now.edges) ? now.edges : now.edges.edges;

const rows = [];
const V = (id, desc, pass, detail) => rows.push({ id, desc, pass: !!pass, detail });

// ── V1 备份可用 ──
const bakOk = exists(path.join(BACKUP, 'node-pool.json')) && exists(path.join(BACKUP, 'tree-data.json')) && exists(path.join(BACKUP, 'knowledge-edges.json'));
V('V1', '批前快照可读（三文件齐备）', bakOk, BACKUP.replace(ROOT + path.sep, ''));
if (!bakOk) { report(); process.exit(2); }
const bak = { tree: read(BACKUP, 'tree-data.json'), pool: read(BACKUP, 'node-pool.json'), edges: read(BACKUP, 'knowledge-edges.json') };
const bakEdges = Array.isArray(bak.edges) ? bak.edges : bak.edges.edges;

// ── helpers ──
const countTree = (root) => { const w = (ns) => ns.reduce((s, n) => s + 1 + w(n.children ?? []), 0); return 1 + w(root.children ?? []); };
const walkAll = (root) => { const out = []; (function w(ns, parent, p) { for (const n of ns) { const pp = p + '/' + (n.name ?? ''); out.push({ node: n, parent, path: pp }); w(n.children ?? [], n, pp); } })(root.children ?? [], root, '/' + (root.name ?? '')); return out; };
const nodeById = (root, id) => walkAll(root).find((x) => x.node.id === id)?.node ?? null;
const N = walkAll(now.tree);

// ── V2 计数 ──
const pb = Object.keys(bak.pool).length, pa = Object.keys(now.pool).length;
const tb = countTree(bak.tree), ta = countTree(now.tree);
V('V2a', `池 ${EXP.poolBefore} → ${EXP.poolAfter}`, pb === EXP.poolBefore && pa === EXP.poolAfter, `${pb} → ${pa}`);
V('V2b', `树 ${EXP.treeBefore} → ${EXP.treeAfter}`, tb === EXP.treeBefore && ta === EXP.treeAfter, `${tb} → ${ta}`);
V('V2c', `边 ${EXP.edgesBefore} → ${EXP.edgesAfter}`, bakEdges.length === EXP.edgesBefore && nowEdges.length === EXP.edgesAfter, `${bakEdges.length} → ${nowEdges.length}`);

// ── V3 池实体集合差异：removed 恰为 {A}，added 恰为 ∅ ──
const bk = new Set(Object.keys(bak.pool)), nk = new Set(Object.keys(now.pool));
const removed = [...bk].filter((k) => !nk.has(k));
const added = [...nk].filter((k) => !bk.has(k));
V('V3', '池 removed 恰 = {A} 且 added = ∅', removed.length === 1 && removed[0] === A_ID && added.length === 0,
  `removed=[${removed.join(',')}] added=[${added.join(',')}]`);

// ── V4 池 modified 恰 = {B}（仅 B 发生变化）──
const modified = [...bk].filter((k) => nk.has(k) && JSON.stringify(bak.pool[k]) !== JSON.stringify(now.pool[k]));
V('V4', '池 modified 恰 = {B}', modified.length === 1 && modified[0] === B_ID, `modified=[${modified.join(',')}]`);

// ── V5 B 的变化恰为「末尾追加 1 个 tab」 ──
const bTabsNow = now.pool[B_ID]?.card?.tabs ?? [];
const bTabsBak = bak.pool[B_ID]?.card?.tabs ?? [];
V('V5a', `B.tabs 计数 ${EXP.bTabsBefore} → ${EXP.bTabsAfter}`, bTabsBak.length === EXP.bTabsBefore && bTabsNow.length === EXP.bTabsAfter, `${bTabsBak.length} → ${bTabsNow.length}`);
const appended = bTabsNow[bTabsNow.length - 1];
const bakATabs = bak.pool[A_ID]?.card?.tabs ?? [];
const bakAMoved = bakATabs.find((t) => t.id === MOVED_TAB_ID);
V('V5b', `追加 tab 的 id/label 正确`, appended?.id === MOVED_TAB_ID && bakAMoved && appended?.label === bakAMoved.label,
  `id=${appended?.id} label=${JSON.stringify(appended?.label)}`);
V('V5c', `搬运 tab 逐字节等于 A 原 tab（md5）`, !!bakAMoved && appended?.content === bakAMoved.content && md5(appended?.content ?? '') === MOVED_TAB_MD5,
  `md5=${md5(appended?.content ?? '')} 期望=${MOVED_TAB_MD5}`);

// ── V6 B 原有 tabs 逐字节未动（前缀全等）──
const prefixEqual = bTabsBak.every((t, i) => JSON.stringify(t) === JSON.stringify(bTabsNow[i]));
V('V6', 'B 原有 tabs 顺序/内容逐字节不变', prefixEqual, `前 ${bTabsBak.length} 项全等=${prefixEqual}`);

// ── V7 其余池实体 0 漂移 ──
const drift = [...bk].filter((k) => k !== B_ID && nk.has(k) && JSON.stringify(bak.pool[k]) !== JSON.stringify(now.pool[k]));
V('V7', '池其余实体 0 漂移', drift.length === 0, drift.length ? `漂移=[${drift.slice(0, 5).join(',')}...]` : '0 条');

// ── V8 树节点集合差异：removed 恰 = {A 树节点} ──
const bIds = new Set(walkAll(bak.tree).map((x) => x.node.id));
const nIds = new Set(N.map((x) => x.node.id));
const tRemoved = [...bIds].filter((x) => !nIds.has(x));
const tAdded = [...nIds].filter((x) => !bIds.has(x));
V('V8', '树 removed 恰 = {A 树节点} 且 added = ∅', tRemoved.length === 1 && tRemoved[0] === A_TREE_ID && tAdded.length === 0,
  `removed=[${tRemoved.join(',')}] added=[${tAdded.join(',')}]`);

// ── V9 父节点(Object) children = 旧顺序抽掉目标 ──
const objBak = nodeById(bak.tree, PARENT_TREE_ID), objNow = nodeById(now.tree, PARENT_TREE_ID);
const bakChildIds = (objBak?.children ?? []).map((c) => c.id);
const expChildIds = bakChildIds.filter((x) => x !== A_TREE_ID);
const nowChildIds = (objNow?.children ?? []).map((c) => c.id);
V('V9', `Object.children 顺序 = 旧顺序抽掉目标（${bakChildIds.length} → ${expChildIds.length}）`,
  !!objNow && JSON.stringify(nowChildIds) === JSON.stringify(expChildIds), `now=${nowChildIds.join('|')}`);

// ── V10 边集合差异：removed 恰 = {EDGE_ID}，added = ∅ ──
const bEid = new Set(bakEdges.map((e) => e.id)), nEid = new Set(nowEdges.map((e) => e.id));
const eRemoved = [...bEid].filter((x) => !nEid.has(x));
const eAdded = [...nEid].filter((x) => !bEid.has(x));
V('V10', '边 removed 恰 = {treebind(A)} 且 added = ∅', eRemoved.length === 1 && eRemoved[0] === EDGE_ID && eAdded.length === 0,
  `removed=[${eRemoved.join(',')}] added=[${eAdded.join(',')}]`);

// ── V11 其余边逐条不变（含顺序）──
const eRestBak = bakEdges.filter((e) => e.id !== EDGE_ID);
V('V11', '其余边逐条逐序不变', JSON.stringify(eRestBak) === JSON.stringify(nowEdges),
  `${eRestBak.length} 条比对${JSON.stringify(eRestBak) === JSON.stringify(nowEdges) ? '全等' : '有差异'}`);

// ── V12 A 的残留引用扫描（池/树/边）——用户显式要求 ──
const refs = [];
for (const k of Object.keys(now.pool)) if (k === A_ID) refs.push('pool[' + k + ']');
for (const x of N) { if (x.node.id === A_TREE_ID) refs.push('tree.id=' + x.path); if (x.node.nodeRef === A_ID) refs.push('tree.nodeRef=' + x.path); }
for (const e of nowEdges) { if (e.id?.includes(A_ID) || e.id?.includes(A_TREE_ID)) refs.push('edge.id=' + e.id); if (e.source === A_ID || e.target === A_ID) refs.push('edge端点=' + e.id); }
V('V12', 'A 实体/树节点 在池·树·边中零残留引用', refs.length === 0, refs.length ? refs.slice(0, 5).join(' ; ') : '0 处');

// ── V13 跨树 / 源码 / 文档 引用 —— 用户显式要求 ──
const rawScan = [];
const scanFiles = [];
const grepDir = (dir, exts) => { if (!fs.existsSync(dir)) return; (function w(d) { for (const ent of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, ent.name); if (ent.isDirectory()) { if (['node_modules', 'dist', '.git', 'backups'].includes(ent.name)) continue; w(p); } else if (exts.some((x) => ent.name.endsWith(x))) scanFiles.push(p); } })(dir); };
grepDir(path.join(ROOT, 'src'), ['.ts', '.tsx']);
grepDir(path.join(ROOT, 'docs'), ['.md']);
grepDir(path.join(ROOT, 'data'), ['.json']);
for (const f of scanFiles) {
  if (f.includes(path.sep + 'backups' + path.sep)) continue;
  const txt = fs.readFileSync(f, 'utf8');
  if (txt.includes(A_ID) || txt.includes(A_TREE_ID)) rawScan.push(path.relative(ROOT, f));
}
V('V13', 'src/docs/data 全量文本零引用 A（含跨树）', rawScan.length === 0, rawScan.length ? rawScan.slice(0, 8).join(' ; ') : `扫描 ${scanFiles.length} 文件，0 命中`);

// ── V14 承接方 B 的「最佳实践」tab 就位（内容非空）──
V('V14', 'B 的 bestPractices tab 存在且内容非空', !!appended && typeof appended.content === 'string' && appended.content.trim().length > 0,
  `长度=${appended?.content?.length ?? 0}`);

// ── V15 treebind 边无可解析缺陷新增（本批删除的边不得留下悬空）──
const aliasWalk = (root) => { const s = new Set(); (function w(ns) { for (const n of ns) { s.add(n.id); w(n.children ?? []); } })(root.children ?? []); return s; };
const knownIds = aliasWalk(now.tree);
const parseTb = (id) => { if (!/^treebind:/.test(id || '')) return null; const body = id.slice(9); for (let i = 1; i < body.length - 1; i++) { if (body[i] !== ':') continue; const a = body.slice(0, i), b = body.slice(i + 1); if (knownIds.has(a) && knownIds.has(b)) return { a, b }; } return null; };
const tbEdges = nowEdges.filter((e) => /^treebind:/.test(e.id || ''));
const unresolved = tbEdges.filter((e) => !parseTb(e.id));
const unresolvedBak = bakEdges.filter((e) => /^treebind:/.test(e.id || '')).filter((e) => { const s = new Set(); (function w(ns) { for (const n of ns) { s.add(n.id); w(n.children ?? []); } })(bak.tree.children ?? []); const b = e.id.slice(9); for (let i = 1; i < b.length - 1; i++) { if (b[i] !== ':') continue; if (s.has(b.slice(0, i)) && s.has(b.slice(i + 1))) return false; } return true; });
V('V15', 'treebind 边未新增悬空（无法解析数不增）', unresolved.length <= unresolvedBak.length,
  `批前 ${unresolvedBak.length} → 现 ${unresolved.length}`);

report();

function report() {
  console.log('════ JAVA-LIB-OVERLAP-A · 独立验证 ════');
  console.log('快照 =', BACKUP.replace(ROOT + path.sep, ''));
  console.log('真源 =', DATA_DIR.replace(ROOT + path.sep, ''));
  console.log('');
  for (const r of rows) console.log('  ' + (r.pass ? '✅' : '❌') + ' ' + r.id + '  ' + r.desc + (r.detail ? '   [' + r.detail + ']' : ''));
  const bad = rows.filter((r) => !r.pass);
  console.log('');
  console.log(bad.length ? `⛔ ${bad.length}/${rows.length} 项失败：${bad.map((b) => b.id).join(', ')}` : `✅ 全部 ${rows.length} 项通过`);
  if (bad.length) process.exit(1);
}
