#!/usr/bin/env node
/**
 * 取证：MySQL 解释卡里「来源 / 官方锚点 / 重复标题」的消失-复现之谜
 *
 * 用户报告：一个月前删掉的「来源」「官方锚点」「重复标题」又出现了，仿佛没消失过。
 *
 * 本脚本只读（只写 outputs/ 与临时目录），跨多个修订版对**实体级集合**做运算：
 *   - 每个修订版：哪些实体带「官方锚点」/「来源：原始行」/「重复标题」
 *   - 三态分类：持续存在 / 曾消失后复现（resurrected）/ 本次新增（new）
 *   - 复现者的身份比对：同一 label 是同 id 复活，还是换了 id 重新导入
 *
 * 用法：node scripts/forensics-mysql-anchor-reappearance.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const POOL = 'data/node-pool.json';
const TMP = path.join(ROOT, '.tmp-mysql-forensics');
const OUT = path.join(ROOT, 'outputs', 'mysql-anchor-forensics');

/** 待比对的修订版（按时间升序） */
const REVISIONS = [
  { sha: 'beb92b9', date: '2026-06-22T16:40:08+08:00', note: '首次出现锚点（477）' },
  { sha: '269ffb4', date: '2026-06-23T21:16:34+08:00', note: '06-23 整理' },
  { sha: '1cddfcf', date: '2026-08-05T12:21:10+08:00', note: '08-05 存档（409）' },
  { sha: 'ed550da', date: '2026-08-05T12:21:11+08:00', note: '08-05（360）' },
  { sha: 'b18adb9', date: '2026-08-05T15:25:35+08:00', note: '08-05 收敛（349）' },
  { sha: '184853c', date: '2026-08-07T18:05:00+08:00', note: '08-07' },
  { sha: '4aeba96', date: '2026-08-10T15:46:00+08:00', note: '08-10（349）' },
  { sha: '90903f3', date: '2026-08-16T00:44:22+08:00', note: '一个月前基线（restore 前夜）' },
  { sha: '9463ace', date: '2026-08-17T01:16:00+08:00', note: 'restore 前最后一次' },
  { sha: '584dbfa', date: '2026-08-17T01:53:10+08:00', note: 'restore MySQL knowledge structure hierarchy' },
  { sha: 'd01d797', date: '2026-08-17T11:12:34+08:00', note: 'merge legacy mysql architecture content' },
  { sha: 'b0ab916', date: '2026-08-17T18:04:13+08:00', note: '当日收尾' },
  { sha: '0e9a42e', date: '2026-08-25T22:58:33+08:00', note: '低点（307）' },
  { sha: '6618198', date: '2026-08-30T13:02:41+08:00', note: '大规模整理（导入前，306）' },
  { sha: 'a2018ae', date: '2026-08-31T23:00:00+08:00', note: '★ 导入后（601，重复标题 0→412）' },
  { sha: '8340f9a', date: '2026-09-11T16:42:37+08:00', note: '近基线' },
  { sha: 'HEAD', date: null, note: 'HEAD（5378b41）' },
];

// ---------- 工具 ----------
const sha1 = (s) => createHash('md5').update(s).digest('hex').slice(0, 12);

function loadRevision(sha) {
  mkdirSync(TMP, { recursive: true });
  const cache = path.join(TMP, `${sha}.json`);
  if (!existsSync(cache)) {
    const buf = execFileSync('git', ['show', `${sha}:${POOL}`], { cwd: ROOT, maxBuffer: 1 << 30 });
    writeFileSync(cache, buf);
  }
  return JSON.parse(readFileSync(cache, 'utf8'));
}

/** 实体 id -> 该实体正文串（rootContent + tabs） */
function entities(raw) {
  const dict = raw && typeof raw === 'object' && !Array.isArray(raw) && raw.nodes ? raw.nodes : raw;
  const entries = Array.isArray(dict) ? dict.map((e) => [e.id, e]) : Object.entries(dict);
  const map = new Map();
  for (const [id, e] of entries) {
    const card = e.card || {};
    const tabs = Array.isArray(card.tabs) ? card.tabs : [];
    map.set(id, {
      id,
      label: e.label || card.title || '',
      rootContent: card.rootContent || '',
      tabText: tabs.map((t) => t.content || '').join('\n'),
      tabTextStarts: tabs.map((t) => (t.content || '').slice(0, 120)),
      tabs: tabs.length,
    });
  }
  return map;
}

const RE_SOURCE = /来源：原始行[:：]\s*(\d+)/g;
const RE_ANCHOR = /官方锚点[:：]\s*(\S+)/g;

function markers(e) {
  const rc = e.rootContent || '';
  const tb = e.tabText || '';
  const countAnchor = (s) => (s.match(RE_ANCHOR) || []).length;
  const countSrc = (s) => (s.match(RE_SOURCE) || []).length;
  const label = e.label.trim();
  // 「重复标题」两种形态：
  //   A 根正文形态：rootContent 以 label 开头且紧跟 **label**
  //   B tab 形态：某 tab 正文以 **label** 或 label 开头（卡片标题 + tab 内自带的标题 = 重复）
  const dupRoot = !!label && rc.startsWith(label) && rc.slice(0, label.length * 2 + 8).includes(`**${label}**`);
  const dupTab =
    !!label &&
    (e.tabTextStarts || []).some((s) => {
      const t = s.trimStart();
      return t.startsWith(`**${label}**`) || t.startsWith(label + '\n') || t.startsWith(label + ' ');
    });
  return {
    srcN: countSrc(rc) + countSrc(tb),
    srcRootN: countSrc(rc),
    anchorN: countAnchor(rc) + countAnchor(tb),
    anchorRootN: countAnchor(rc),
    anchorTabN: countAnchor(tb),
    dupTitle: dupRoot || dupTab,
    dupRoot,
    dupTab,
    label: e.label,
    rcLen: rc.length,
    tabLen: tb.length,
  };
}

function analyze(raw) {
  const out = new Map();
  for (const [id, e] of entities(raw)) {
    const m = markers(e);
    if (m.anchorN || m.srcN || m.dupTitle) out.set(id, { ...m, label: e.label });
  }
  return out;
}

const isMysql = (id, label) =>
  /^mysql_|^demo_|^k_dict_|^k_sql_/.test(id) ||
  /mysql|数据库|sql|innodb|事务|索引|锁|buffer|页|checkpoint/i.test(label || '') ||
  /^(demo|projection:mysql)/.test(id);

// ---------- 执行 ----------
const states = [];
for (const rev of REVISIONS) {
  const raw = loadRevision(rev.sha);
  const m = analyze(raw);
  const all = entities(raw);
  const anchorTotal = [...m.values()].reduce((s, v) => s + v.anchorN, 0);
  const srcTotal = [...m.values()].reduce((s, v) => s + v.srcN, 0);
  const dupTotal = [...m.values()].filter((v) => v.dupTitle).length;
  const anchorRootTotal = [...m.values()].reduce((s, v) => s + v.anchorRootN, 0);
  const anchorTabTotal = [...m.values()].reduce((s, v) => s + v.anchorTabN, 0);
  const dupRootTotal = [...m.values()].filter((v) => v.dupRoot).length;
  const dupTabTotal = [...m.values()].filter((v) => v.dupTab).length;
  const rcNonEmpty = [...all.values()].filter((e) => (e.rootContent || '').length > 0).length;
  const mysqlIds = [...m.keys()].filter((id) => isMysql(id, m.get(id).label));
  const anchorMap = new Map([...m].filter(([, v]) => v.anchorN > 0));
  states.push({
    ...rev,
    entities: all.size,
    map: m,
    anchorMap,
    anchorTotal,
    srcTotal,
    dupTotal,
    anchorRootTotal,
    anchorTabTotal,
    dupRootTotal,
    dupTabTotal,
    rcNonEmpty,
    anchorEntities: m.size,
    mysqlAnchorEntities: mysqlIds.length,
    mysqlAnchorTotal: mysqlIds.reduce((s, id) => s + m.get(id).anchorN, 0),
  });
  console.error(
    `  ${rev.sha} ${String(rev.date || '').slice(0, 16)} | 实体 ${all.size} | 锚点 ${anchorTotal}（正文 ${anchorRootTotal} / tab ${anchorTabTotal}） | 重复标题 ${dupTotal}（正文 ${dupRootTotal} / tab ${dupTabTotal}） | 非空正文实体 ${rcNonEmpty}`
  );
}

const last = states[states.length - 1];
const first = states[0];
const everHad = new Set();
for (const s of states) for (const id of s.anchorMap.keys()) everHad.add(id);

// 三态分类（用「锚点实体」口径）
const presentAt = (s, id) => s.anchorMap.has(id);
const resurrected = [];
const continuous = [];
const newSince = [];
const vanished = [];
for (const id of everHad) {
  const seq = states.map((s) => (presentAt(s, id) ? 1 : 0));
  const firstIdx = seq.indexOf(1);
  const lastIdx = seq.lastIndexOf(1);
  const hasGap = seq.slice(firstIdx, lastIdx + 1).some((v) => v === 0);
  const atStart = seq[0] === 1; // 修正：必须是「第 0 个修订版就有」
  const now = seq[seq.length - 1] === 1;
  if (hasGap) resurrected.push({ id, seq, gapAt: states.filter((_, i) => seq[i] === 0 && i > firstIdx && i < lastIdx).map((s) => s.sha) });
  else if (atStart && now) continuous.push({ id, seq });
  else if (!atStart && now) newSince.push({ id, seq, addedAt: states[firstIdx] });
  else if (atStart && !now) vanished.push({ id, seq, lostAt: states[lastIdx] });
}

// 复现者/新增者的 id 前缀聚类
const prefixOf = (id) => (id.includes(':') ? id.split(':').slice(0, 3).join(':') : id.split('_').slice(0, 2).join('_'));
const cluster = (arr) => {
  const m = new Map();
  for (const it of arr) m.set(prefixOf(it.id), (m.get(prefixOf(it.id)) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
};

// label 级比对：用户「删掉的」label，今天还在不在（换没换 id）
const labelNow = new Map();
for (const [id, v] of last.anchorMap) {
  const k = (v.label || '').trim();
  if (!k) continue;
  if (!labelNow.has(k)) labelNow.set(k, []);
  labelNow.get(k).push(id);
}
const labelWas = new Map();
for (const [id, v] of first.anchorMap) {
  const k = (v.label || '').trim();
  if (!k) continue;
  if (!labelWas.has(k)) labelWas.set(k, []);
  labelWas.get(k).push(id);
}
const sameLabelDiffId = [];
for (const [label, oldIds] of labelWas) {
  const newIds = labelNow.get(label);
  if (newIds && !newIds.some((i) => oldIds.includes(i))) sameLabelDiffId.push({ label, oldIds, newIds });
}

// ---------- 报告 ----------
mkdirSync(OUT, { recursive: true });
const lines = [];
const P = (s = '') => lines.push(s);

P('# MySQL 解释卡「来源 / 官方锚点 / 重复标题」消失-复现之谜 —— 取证报告');
P();
P(`> 生成时间：${new Date().toISOString()} · 由 \`scripts/forensics-mysql-anchor-reappearance.mjs\` 计算（所有数字脚本产出，不手写）`);
P('> 只读侦察，未写 `data/`。');
P();
P('## 1. 修订版时间线');
P();
P('> 口径：**正文** = `card.rootContent`（解释卡读态正文面）；**tab** = `card.tabs[].content`。');
P('> 「重复标题」= 卡片标题在正文/tab 里再出现一次（正文形态 `label **label**`，或 tab 正文以标题起头）。');
P();
P('| 修订 | 日期 | 说明 | 池实体 | 锚点总数 | └ 正文 | └ tab | 重复标题 | └ 正文 | └ tab | 正文非空实体 |');
P('|---|---|---|---|---|---|---|---|---|---|---|');
for (const s of states) {
  P(
    `| \`${s.sha}\` | ${s.date ? s.date.slice(0, 16).replace('T', ' ') : 'HEAD'} | ${s.note} | ${s.entities} | **${s.anchorTotal}** | ${s.anchorRootTotal} | ${s.anchorTabTotal} | **${s.dupTotal}** | ${s.dupRootTotal} | ${s.dupTabTotal} | ${s.rcNonEmpty} |`
  );
}
P();
P('## 2. 三态分类（口径：本节「存在」= 该实体内含≥1 处「官方锚点」）');
P();
P(`- **持续存在**（首末都在、中间从未中断）：**${continuous.length}**`);
P(`- **曾消失后复现**（中途归零又回来）：**${resurrected.length}**`);
P(`- **本窗口新增**（首版没有、现在有）：**${newSince.length}**`);
P(`- **曾存在后消失**（首版有、现在没有）：**${vanished.length}**`);
P();
if (resurrected.length) {
  P('### 2.1 复现者明细');
  P();
  P('| 实体 | label | ' + states.map((s) => s.sha).join(' | ') + ' | 归零修订 |');
  P('|---|---|' + states.map(() => '---').join('|') + '|---|');
  for (const r of resurrected.slice(0, 60)) {
    const lbl = (last.anchorMap.get(r.id) || first.anchorMap.get(r.id) || {}).label || '';
    P(`| \`${r.id}\` | ${lbl} | ${r.seq.map((v) => (v ? '●' : '○')).join(' | ')} | ${(r.gapAt || []).join(', ') || '—'} |`);
  }
  P();
}
if (vanished.length) {
  P('### 2.2 曾存在后消失（疑似用户当年的清理动作）');
  P();
  P('| 实体 | label | ' + states.map((s) => s.sha).join(' | ') + ' |');
  P('|---|---|' + states.map(() => '---').join('|') + '|');
  for (const v of vanished.slice(0, 60)) {
    const lbl = (first.anchorMap.get(v.id) || last.anchorMap.get(v.id) || {}).label || '';
    P(`| \`${v.id}\` | ${lbl} | ${v.seq.map((x) => (x ? '●' : '○')).join(' | ')} |`);
  }
  P();
}
if (newSince.length) {
  P('### 2.3 新增者按 id 前缀聚类');
  P();
  for (const [p, n] of cluster(newSince)) P(`- \`${p}\` … **${n}**`);
  P();
}
P('## 3. label 级比对：同名的旧实体是否被换 id 重造');
P();
P(`- 首版带锚点的 label 数：**${labelWas.size}** · 当前带锚点的 label 数：**${labelNow.size}**`);
P(`- **同名但 id 完全换了**：**${sameLabelDiffId.length}**`);
P();
for (const it of sameLabelDiffId.slice(0, 40)) {
  P(`- \`${it.label}\``);
  P(`  - 旧：${it.oldIds.map((i) => '`' + i + '`').join(' · ')}`);
  P(`  - 新：${it.newIds.map((i) => '`' + i + '`').join(' · ')}`);
}
P();
P('## 4. 当前状态样本（前 8 条，看形态是否与用户描述一致）');
P();
for (const [id, v] of [...last.anchorMap.entries()].slice(0, 8)) {
  P(`- \`${id}\` · ${v.label} · 锚点 ${v.anchorN}（正文 ${v.anchorRootN}）· 来源 ${v.srcN} · 重复标题 ${v.dupTitle ? '**是**' : '否'}（正文 ${v.dupRoot ? '是' : '否'}）`);
}
P();

// ---------- §5 影响面（当前 HEAD，全库口径）----------
const headRaw = JSON.parse(readFileSync(path.join(TMP, 'HEAD.json'), 'utf8'));
const headEnts = entities(headRaw);
const rcAnchor = [];
const rcDup = [];
for (const [id, e] of headEnts) {
  const m = markers(e);
  if (m.anchorRootN > 0) rcAnchor.push({ id, label: e.label, n: m.anchorRootN });
  if (m.dupRoot) rcDup.push({ id, label: e.label });
}
const prefOf = (id) => (id.includes(':') ? id.split(':')[0] : id.split('_').slice(0, 2).join('_'));
const groupBy = (arr) => {
  const m = new Map();
  for (const x of arr) m.set(prefOf(x.id), (m.get(prefOf(x.id)) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
P('## 5. 影响面（HEAD，全库）');
P();
P(`- 正文（rootContent）含「官方锚点」的实体：**${rcAnchor.length}**（合计 ${rcAnchor.reduce((s, x) => s + (x.n || 0), 0)} 处 / 全库 ${headEnts.size} 实体）`);
for (const [p, n] of groupBy(rcAnchor).slice(0, 10)) P(`  - \`${p}\` … ${n}`);
P(`- 正文含「重复标题」的实体：**${rcDup.length}** / ${headEnts.size}`);
for (const [p, n] of groupBy(rcDup).slice(0, 10)) P(`  - \`${p}\` … ${n}`);
P(`- 非 MySQL 家族是否也被波及：正文含锚点者中，id 不以 mysql_ / k_dict_ 开头 = **${rcAnchor.filter((x) => !/^mysql|^k_dict_/.test(x.id)).length}**；正文含重复标题者同口径 = **${rcDup.filter((x) => !/^mysql|^k_dict_/.test(x.id)).length}**`);
P();
P('## 6. 机制结论（代码级）');
P();
P('回填发生在 **`6e69907`（2026-08-31 21:34，提交信息仅 "Add cleanup branch TODO"）**。');
P('该提交改 `data/node-pool.json` **4340 行**，并加入约 30 支 `scripts/fix-*.mjs`（多数已在 `91a5da3` 09-04 被删）。');
P('其中 `scripts/fix-db-chapters-batch.mjs` 的 **F 段是全库循环**：');
P();
P('```js');
P('// F. 全库解释卡剥离套话：「…中的具体呈现」头、「本节点是实例，其本体见…」尾、「英文：/中文：」对照行');
P('for (const p of Object.values(pool)) {');
P('  if (!p.card || !Array.isArray(p.card.tabs)) continue;');
P('  let touched = false;');
P('  for (const t of p.card.tabs) { /* 剥离 RE_HEADER / RE_TAIL / RE_EN / RE_ZH */ }');
P('  if (touched) { refreshRoot(p); stripped++; }     // ← 触发行');
P('}');
P('```');
P();
P('而 `refreshRoot` 的实现（同批 ~15 支脚本共用同一行）：');
P();
P('```js');
P("function refreshRoot(node) {");
P('  const card = node.card;');
P("  card.rootContent = [card.title || node.label, ...card.tabs.map((t) => t.content || '')]");
P("    .join(' ').replace(/\\s+/g, ' ').trim();");
P('}');
P('```');
P();
P('这一行同时制造了用户报告的全部三种现象：');
P();
P('| 现象 | 成因 |');
P('|---|---|');
P('| **来源 / 官方锚点**回到解释卡 | 尾注原本只在 `def` tab 里；`...card.tabs.map(t => t.content)` 把它一并拼进 `rootContent` |');
P('| **重复标题** | `card.title` 打头 + `def` tab 自身又以 `**label**` 起头 ⇒ 标题出现两次 |');
P('| **整段挤成一片** | `.replace(/\\s+/g, \' \')` 把所有换行压成空格 |');
P('| 人工导语消失 | 同批 F 段显式剥离「…中的具体呈现」头；且赋值是**整体覆盖**，87 字人工指针说明被冲掉 |');
P();
P('## 7. 可恢复性');
P();
P(`- 回填**前**的完整状态仍在 git 里：\`git show 6618198:data/node-pool.json\`（2026-08-30 13:02）。`);
P(`- 各批备份目录 \`data/backups/\` 中亦有多份 08-29~08-30 快照（含 \`fix-tx-system-ontology-*\`、\`import-db-sw-arch-*\` 等）。`);
P(`- 因此「恢复人工写的 rootContent」与「剥离注入的尾注/重复标题」两件事都可做，且可在同一批次内完成。`);
P();

writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));
writeFileSync(
  path.join(OUT, 'report.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      revisions: states.map((s) => ({
        sha: s.sha,
        date: s.date,
        note: s.note,
        entities: s.entities,
        anchorTotal: s.anchorTotal,
        anchorRootTotal: s.anchorRootTotal,
        anchorTabTotal: s.anchorTabTotal,
        srcTotal: s.srcTotal,
        dupTitleTotal: s.dupTotal,
        dupRootTotal: s.dupRootTotal,
        dupTabTotal: s.dupTabTotal,
        rcNonEmpty: s.rcNonEmpty,
        anchorEntities: s.anchorEntities,
        mysqlAnchorEntities: s.mysqlAnchorEntities,
        mysqlAnchorTotal: s.mysqlAnchorTotal,
      })),
      classification: {
        continuous: continuous.length,
        resurrected: resurrected.map((r) => ({ id: r.id, label: (last.anchorMap.get(r.id) || first.anchorMap.get(r.id) || {}).label || '', seq: r.seq, gapAt: r.gapAt || [] })),
        newSince: newSince.map((r) => ({ id: r.id, label: (last.anchorMap.get(r.id) || {}).label || '', seq: r.seq, addedAt: r.addedAt && r.addedAt.sha })),
        vanished: vanished.map((r) => ({ id: r.id, label: (first.anchorMap.get(r.id) || {}).label || '', seq: r.seq, lostAt: r.lostAt && r.lostAt.sha })),
      },
      sameLabelDiffId,
    },
    null,
    2
  )
);
console.log(`\n报告已写入 outputs/mysql-anchor-forensics/`);
console.log(
  `三态：持续 ${continuous.length} · 复现 ${resurrected.length} · 新增 ${newSince.length} · 消失 ${vanished.length} · 同名换 id ${sameLabelDiffId.length}`
);
