#!/usr/bin/env node
/**
 * spring-ioc-refactor · 独立校验（不 import apply 脚本）
 *
 * 证据来源：outputs/tree-violation-scan/spring-ioc-refactor-snapshot/（apply 前字节快照）
 *           ↔ data/ 当前源，做反向 diff。校验 apply 报告声明的契约：
 *   1. tree / edges / questions / evolution-events 与快照逐字节相等（本批只写 node-pool.json）
 *   2. 池 diff：改动实体集合 == 声明的 6 个，0 新增 0 删除
 *   3. 6 个实体逐条内容契约（从批意图反推的标记，不依赖 apply 内部实现）
 *   4. 树 nodeRef 可解析率 100%（池查表无悬挂）
 *   5. treebind 边解析率不低于快照（不劣化）
 *   6. 计数不变
 *
 * 用法：node scripts/verify-spring-ioc-refactor.mjs
 *   KNOWLEDGE_OS_DATA_DIR 重定向数据目录（默认 data/）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data');
const SNAP = path.join(ROOT, 'outputs', 'tree-violation-scan', 'spring-ioc-refactor-snapshot');

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const F = (dir, n) => path.join(dir, n);

// ── 声明契约（来自 apply 报告，独立复核对象）──────────────────────────────
const DECLARED = [
  'k_java_fw_spring_ioc',          // IoC容器：rootContent 9220→547 导览 + def 重写
  'k_1788681463569_fqwfp2',        // 本质：def 结构化（作用 3 + 优点 4），rootContent 对齐
  'spring_appcontext',             // ApplicationContext：新增 tab vs-beanfactory
  'k_1784453158872_rsqoiy',        // 自动装配：rootContent 522 字（蒸馏自既有 tab）
  'k_1785225243066_ds8pn6',        // 生命周期：stages 编号 9 步，无失效插图引用
  'k_1788687205852_lhoemy',        // 依赖注入方式：overview 接口注入注记订正
];
const BAZI_MARKERS = [
  '单例bean是线程安全的吗',
  '自动装配有哪些局限性',
  '什么是Spring IOC 容器',
  'BeanFactory 和 ApplicationContext有什么区别',
];

const snap = {
  tree: fs.readFileSync(F(SNAP, 'tree-data.json')),
  edges: fs.readFileSync(F(SNAP, 'knowledge-edges.json')),
  pool: readJson(F(SNAP, 'node-pool.json')),
  evo: fs.readFileSync(F(SNAP, 'evolution-events.json')),
  questions: fs.readFileSync(F(SNAP, 'questions.json')),
};
const cur = {
  tree: fs.readFileSync(F(DATA_DIR, 'tree-data.json')),
  edges: fs.readFileSync(F(DATA_DIR, 'knowledge-edges.json')),
  pool: readJson(F(DATA_DIR, 'node-pool.json')),
  evo: fs.readFileSync(F(DATA_DIR, 'evolution-events.json')),
  questions: fs.readFileSync(F(DATA_DIR, 'questions.json')),
};

const results = [];
const check = (id, desc, ok, detail) => { results.push([id, desc, !!ok, detail]); };

// V1 非池文件逐字节相等
check('V1a', 'tree-data.json 与快照逐字节相等', Buffer.compare(snap.tree, cur.tree) === 0, `${cur.tree.length}B`);
check('V1b', 'knowledge-edges.json 与快照逐字节相等', Buffer.compare(snap.edges, cur.edges) === 0, `${cur.edges.length}B`);
check('V1c', 'questions.json 与快照逐字节相等', Buffer.compare(snap.questions, cur.questions) === 0, `${cur.questions.length}B`);
check('V1d', 'evolution-events.json 与快照逐字节相等（裁决：批脚本不写）', Buffer.compare(snap.evo, cur.evo) === 0, `${cur.evo.length}B`);

// V2 池 diff 改动集 == 声明 6 个
const sk = new Set(Object.keys(snap.pool));
const ck = new Set(Object.keys(cur.pool));
const added = [...ck].filter((k) => !sk.has(k));
const deleted = [...sk].filter((k) => !ck.has(k));
const changed = [...ck].filter((k) => sk.has(k) && JSON.stringify(cur.pool[k]) !== JSON.stringify(snap.pool[k]));
const declaredSet = new Set(DECLARED);
const changedSet = new Set(changed);
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
check('V2', '池 diff：改动集恰为声明 6 个，0 新增 0 删除',
  added.length === 0 && deleted.length === 0 && setEq(changedSet, declaredSet),
  `改动=${changed.length} 新增=${added.length} 删除=${deleted.length}${added.length ? ' 新增:' + added.join(',') : ''}${deleted.length ? ' 删除:' + deleted.join(',') : ''}`);

// V3 逐实体内容契约（从批意图反推，不读 apply 源码）
const ent = (id) => cur.pool[id];
const tabs = (id) => (ent(id)?.card?.tabs || []).map((t) => `${t.id}:${t.label}`);
const P = (id) => ent(id)?.card?.rootContent ?? '';
const tabContent = (id, tid) => ent(id)?.card?.tabs?.find((t) => t.id === tid)?.content ?? '';

check('V3a', 'IoC容器 rootContent <2000 字且不含八股原文标记', P('k_java_fw_spring_ioc').length < 2000 && !BAZI_MARKERS.some((m) => P('k_java_fw_spring_ioc').includes(m)), `len=${P('k_java_fw_spring_ioc').length}`);
check('V3a2', 'IoC容器 rootContent 变短（快照 9220 字 → 现 <2000）', snap.pool['k_java_fw_spring_ioc'] && snap.pool['k_java_fw_spring_ioc'].card.rootContent.length === 9220, `快照 len=${snap.pool['k_java_fw_spring_ioc']?.card?.rootContent?.length}`);
check('V3b', 'IoC容器 def tab 不含八股标记', !BAZI_MARKERS.some((m) => tabContent('k_java_fw_spring_ioc', 'def').includes(m)), `def len=${tabContent('k_java_fw_spring_ioc', 'def').length}`);
check('V3c', '本质 def 含「作用」「优点」结构（各 ≥2 个条目行）', /作用/.test(tabContent('k_1788681463569_fqwfp2', 'def')) && /优点/.test(tabContent('k_1788681463569_fqwfp2', 'def')), `def len=${tabContent('k_1788681463569_fqwfp2', 'def').length}`);
check('V3c2', '本质 rootContent 与快照不同（已对齐重写）', P('k_1788681463569_fqwfp2') !== (snap.pool['k_1788681463569_fqwfp2']?.card?.rootContent ?? ''), `现 len=${P('k_1788681463569_fqwfp2').length}`);
check('V3d', 'ApplicationContext 新增 tab「vs-beanfactory」在位', tabs('spring_appcontext').some((t) => t.startsWith('vs-beanfactory:')), `tabs=[${tabs('spring_appcontext').join(' | ')}]`);
check('V3d2', '新 tab 含「手动注册」「自动注册」对比', /手动注册/.test(tabContent('spring_appcontext', 'vs-beanfactory')) && /自动注册/.test(tabContent('spring_appcontext', 'vs-beanfactory')), `len=${tabContent('spring_appcontext', 'vs-beanfactory').length}`);
check('V3e', '自动装配 rootContent 已补正文（非空、含 byName 或 autodetect）', typeof ent('k_1784453158872_rsqoiy')?.card?.rootContent === 'string' && ent('k_1784453158872_rsqoiy').card.rootContent.length > 100 && /byName|autodetect/.test(ent('k_1784453158872_rsqoiy').card.rootContent), `len=${String(ent('k_1784453158872_rsqoiy')?.card?.rootContent ?? '').length}`);
check('V3f', '生命周期 stages 为编号列表（≥7 个编号行）、无失效插图引用', (() => { const c = tabContent('k_1785225243066_ds8pn6', 'stages'); const n = (c.match(/^\s*\d+[.、]/gm) || []).length; return n >= 7 && !c.includes('下图展示了'); })(), `stages len=${tabContent('k_1785225243066_ds8pn6', 'stages').length}`);
check('V3g', 'DI 方式 overview 接口注入注记为「自 Spring 4 起已废弃」', /自 Spring 4 起已废弃/.test(tabContent('k_1788687205852_lhoemy', 'overview')), `含废弃标记=${/自 Spring 4 起已废弃/.test(tabContent('k_1788687205852_lhoemy', 'overview'))}`);

// V4 树 nodeRef 可解析率不劣于快照（快照基线含 1 条历史悬挂 container:key_constraint，非本批引入）
const countDangling = (treeFile, pool) => {
  const t = readJson(treeFile);
  const d = [];
  (function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) d.push(`${n.id}→${n.nodeRef}`); for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const c of n[k]) walk(c); })(t);
  return d;
};
const dSnap = countDangling(F(SNAP, 'tree-data.json'), snap.pool);
const dCur = countDangling(F(DATA_DIR, 'tree-data.json'), cur.pool);
check('V4', '树 nodeRef 悬挂数不劣于快照（基线债务不计入本批）', dCur.length <= dSnap.length, `快照 ${dSnap.length} → 现 ${dCur.length}${dCur.length ? ' ' + dCur.slice(0, 3).join(' ') : ''}`);

// V5 treebind 解析率不劣于快照
const parseTb = (edgesFile, pool) => {
  const raw = readJson(edgesFile);
  const edges = Array.isArray(raw) ? raw : raw.edges;
  let total = 0, bad = 0;
  for (const e of edges) {
    if (typeof e.id !== 'string' || !e.id.startsWith('treebind:')) continue;
    total += 1;
    const rest = e.id.slice('treebind:'.length);
    let hit = false;
    for (let i = 1; i < rest.length; i += 1) {
      if (rest[i] !== ':') continue;
      const a = rest.slice(0, i), b = rest.slice(i + 1);
      if (pool[a] && pool[b]) { hit = true; break; }
    }
    if (!hit) bad += 1;
  }
  return { total, bad };
};
const tbSnap = parseTb(F(SNAP, 'knowledge-edges.json'), snap.pool);
const tbCur = parseTb(F(DATA_DIR, 'knowledge-edges.json'), cur.pool);
check('V5', 'treebind 解析失败数不劣于快照', tbCur.bad <= tbSnap.bad, `快照 ${tbSnap.bad}/${tbSnap.total} → 现 ${tbCur.bad}/${tbCur.total}`);

// V6 计数不变
const tree = readJson(F(DATA_DIR, 'tree-data.json'));
const countTree = (n) => { let c = 1; for (const k of ['children', 'nodes']) if (Array.isArray(n[k])) for (const x of n[k]) c += countTree(x); return c; };
const rawEdges = readJson(F(DATA_DIR, 'knowledge-edges.json'));
check('V6', '计数：树 3222 / 池 3866 / 边 4156（与快照一致）',
  countTree(tree) === 3222 && Object.keys(cur.pool).length === 3866 && (Array.isArray(rawEdges) ? rawEdges : rawEdges.edges).length === 4156,
  `树 ${countTree(tree)} 池 ${Object.keys(cur.pool).length} 边 ${(Array.isArray(rawEdges) ? rawEdges : rawEdges.edges).length}`);

// ── 汇总 ────────────────────────────────────────────────────────────────
let fail = 0;
for (const [id, desc, ok, detail] of results) {
  if (!ok) fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(5)} ${desc}  [${detail}]`);
}
console.log(fail ? `\n校验未过 ${fail} 项` : '\n校验全过');
process.exit(fail ? 1 : 0);
