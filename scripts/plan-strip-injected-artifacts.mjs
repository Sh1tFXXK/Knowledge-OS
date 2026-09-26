#!/usr/bin/env node
/**
 * PLAN（只读）：剥离「注入产物」批次 —— strip-injected-artifacts
 *
 * 背景：提交 6e69907（2026-08-31）的 `refreshRoot` 把
 *       [card.title, ...card.tabs].join(' ').replace(/\s+/g,' ')
 *       整体覆盖进 card.rootContent，导致：
 *         ① tab 内的「来源：原始行：N；官方锚点：URL」尾注被灌进解释卡正文面；
 *         ② card.title + def tab 自带的 **title** ⇒ 标题在正文里出现两次。
 * 取证：outputs/mysql-anchor-forensics/report.md
 *
 * 本批**只动 `card.rootContent`**（解释卡正文面）。tab 面不动（见 §口径）。
 *
 * 精确变换（逐实体，仅当确实命中才改）：
 *   1) 去重标题：若 rootContent 以 `T **T**` 开头（T = card.title || label）
 *      ⇒ 改写为 `**T**` + 余下内容
 *   2) 剥尾注  ：移除全部 `/来源：原始行：\d+；官方锚点：https?:\/\/\S+/g`
 *   3) 收空白  ：`/ {2,}/g → ' '`（只压连续**空格**，不动换行）+ trim
 *      —— 仅用于消化「移除尾注后留下的双空格」，不改变任何非空白字符
 *
 * ⛔ 不做的（明确排除，防越界）：
 *   - 不动 tab 面（tab 里的同类尾注是 6 月导入的原始形态，⛔ 另案）
 *   - 不恢复换行（`.replace(/\s+/g,' ')` 造成的扁平化**不可机械还原**）
 *   - 不动 `来源：<JDK 绝对路径>` 形态（不同产物，仅 1 处正文）
 *   - 不动正文里的合法「来源」散文（负对照见 §4）
 *
 * 本脚本只读：只写 outputs/strip-injected-artifacts/。⛔ 不写 data/。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const POOL = path.join(ROOT, 'data', 'node-pool.json');
const OUT = path.join(ROOT, 'outputs', 'strip-injected-artifacts');

/** ★ 唯一的注入尾注形态（全库 571 处；普查显示无第二形态） */
const RE_FOOTER = /来源：原始行：\d+；官方锚点：https?:\/\/\S+/g;
/** 粗筛（用于发现「像尾注但不是」的漏网形态 ⇒ 负对照） */
const RE_LOOSE = /来源[:：]|官方锚点[:：]/;

const md5 = (s) => createHash('md5').update(s).digest('hex');

function entitiesOf(raw) {
  const dict = raw && !Array.isArray(raw) && raw.nodes ? raw.nodes : raw;
  return Array.isArray(dict) ? dict : Object.values(dict);
}

/** 纯函数：对单个实体的 rootContent 施加本批变换 */
function transform(e) {
  const rc = e.card && typeof e.card.rootContent === 'string' ? e.card.rootContent : null;
  const title = String((e.card && e.card.title) || e.label || '').trim();
  if (rc === null) return { changed: false, reason: 'no-rootContent' };
  if (!rc) return { changed: false, reason: 'empty-rootContent' };

  let next = rc;
  const footers = [];
  const beforeFooter = next;
  next = next.replace(RE_FOOTER, (m) => {
    footers.push(m);
    return '';
  });
  const footerRemoved = footers.length > 0;

  let titleDeduped = false;
  const dupPrefix = title ? `${title} **${title}**` : '';
  if (dupPrefix && next.startsWith(dupPrefix)) {
    next = `**${title}**${next.slice(dupPrefix.length)}`;
    titleDeduped = true;
  }

  // ⚠️ 第三步「空格压缩」**仅当①或②命中时才做** —— 否则会把「无尾注、无重复标题」的实体
  //    也顺手归一化空白 = 范围越界（实测会多动 141 个实体）。
  const touched = footers.length > 0 || titleDeduped;
  const beforeSpace = next;
  if (touched) next = next.replace(/ {2,}/g, ' ').trim();
  const spaceCollapsedChars = touched ? beforeSpace.length - next.length : 0;

  const changed = next !== rc;
  return {
    changed,
    next,
    footers,
    footerRemoved,
    titleDeduped,
    spaceCollapsedChars,
    footerDroppedChars: beforeFooter.length - (beforeFooter.length - footers.reduce((s, f) => s + f.length, 0)),
    rcBeforeLen: rc.length,
    rcAfterLen: next.length,
    titleOnlyAfter: !!title && next === `**${title}**`,
    emptyAfter: next.length === 0,
    md5Before: md5(rc),
    md5After: md5(next),
  };
}

// ---------- 执行 ----------
const raw = JSON.parse(readFileSync(POOL, 'utf8'));
const ents = entitiesOf(raw);

const plan = [];
const untouched = [];
const looseOnly = []; // 含「来源/官方锚点」字样但**不**命中精确尾注 ⇒ 必须保持原样（负对照）
let footersRemoved = 0;
let titleDeduped = 0;
let titleOnlyAfter = 0;
let spaceCollapsedChars = 0;

for (const e of ents) {
  const r = transform(e);
  const rc = (e.card && e.card.rootContent) || '';
  if (RE_LOOSE.test(rc)) {
    const strict = (rc.match(RE_FOOTER) || []).length;
    if (strict === 0) looseOnly.push({ id: e.id, label: e.label, strict, head: rc.slice(0, 70) });
  }
  if (!r.changed) {
    untouched.push(e.id);
    continue;
  }
  footersRemoved += r.footers.length;
  if (r.titleDeduped) titleDeduped++;
  if (r.titleOnlyAfter) titleOnlyAfter++;
  spaceCollapsedChars += r.spaceCollapsedChars;
  plan.push({
    id: e.id,
    label: e.label,
    title: (e.card && e.card.title) || e.label,
    titleDeduped: r.titleDeduped,
    footers: r.footers,
    footerCount: r.footers.length,
    rcBeforeLen: r.rcBeforeLen,
    rcAfterLen: r.rcAfterLen,
    spaceCollapsedChars: r.spaceCollapsedChars,
    titleOnlyAfter: r.titleOnlyAfter,
    md5Before: r.md5Before,
    md5After: r.md5After,
    headBefore: rc.slice(0, 90),
    headAfter: (r.next || '').slice(0, 90),
  });
}

// 幂等性自检：对「变换后」的结果再跑一次，必须 0 变化
let idempotentViolations = 0;
for (const p of plan) {
  const e = ents.find((x) => x.id === p.id);
  const again = transform({ ...e, card: { ...e.card, rootContent: transform(e).next } });
  if (again.changed) idempotentViolations++;
}

// 索引一致：raw 结构不被修改
const poolKeysAfter = raw && !Array.isArray(raw) && raw.nodes ? Object.keys(raw) : [];

mkdirSync(OUT, { recursive: true });

const summary = {
  batchId: 'strip-injected-artifacts',
  generatedAt: new Date().toISOString(),
  scope: 'card.rootContent only',
  pool: { entities: ents.length, md5: md5(readFileSync(POOL)) },
  counts: {
    entitiesChanged: plan.length,
    entitiesUntouched: untouched.length,
    footersRemoved,
    entitiesTitleDeduped: titleDeduped,
    entitiesTitleOnlyAfter: titleOnlyAfter,
    spaceCollapsedChars,
  },
  controls: {
    looseOnlyNotMatchingStrict: looseOnly.length,
    idempotentViolations,
    entitiesEmptyAfter: plan.filter((p) => p.rcAfterLen === 0).length,
  },
  plan,
};

writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(summary, null, 2));

const L = [];
const P = (s = '') => L.push(s);
P('# PLAN · 剥离「注入产物」（strip-injected-artifacts）');
P();
P(`> 生成：${summary.generatedAt} · 由 \`scripts/plan-strip-injected-artifacts.mjs\` 计算（数字全部脚本产出）`);
P('> ⛔ 本脚本只读，未写 `data/`。');
P();
P('## 1. 口径');
P();
P('- **作用面**：仅 `card.rootContent`（解释卡**正文面**）。');
P('- **不动**：`card.tabs[].content`（tab 面同类尾注是 6 月导入的原始形态，另案）、树 / 边 / 问题库。');
P('- **变换三步**：① 去重标题 `T **T**` → `**T**`；② 移除 `/来源：原始行：\\d+；官方锚点：https?:\\/\\/\\S+/g`；③ `/ {2,}/g → \' \'`（只压空格，不动换行）+ trim。');
P();
P('## 2. 计数');
P();
P('| 指标 | 值 |');
P('|---|---|');
P(`| 池实体总数 | ${ents.length} |`);
P(`| **会被改动** | **${plan.length}** |`);
P(`| 保持不变（逐字节） | ${untouched.length} |`);
P(`| 移除的尾注处数 | **${footersRemoved}** |`);
P(`| 去重标题的实体数 | **${titleDeduped}** |`);
P(`| 压缩掉的空格字符数 | ${spaceCollapsedChars} |`);
P();
P('## 3. 自检（负对照 / 幂等）');
P();
P(`- **幂等性**：对变换结果再跑一次，产生变化的实体数 = **${idempotentViolations}**（须 0）`);
P(`- **清理后正文为空**：**${summary.controls.entitiesEmptyAfter}**（须 0 ⇒ UI 不会退回 def tab 兜底）`);
P(`- **⚠️ 清理后仅剩标题的实体**：**${titleOnlyAfter}**（机械正确，但卡面只剩粗体标题；见 §5）`);
P();
P('## 4. 负对照：含「来源/官方锚点」字样但**不**命中精确尾注的实体');
P();
P(`> 这些**必须保持原样**（它们是合法散文或另一种产物）。共 **${looseOnly.length}** 个。`);
P();
P('| 实体 | label | 正文开头 |');
P('|---|---|---|');
for (const x of looseOnly.slice(0, 25)) P(`| \`${x.id}\` | ${x.label} | ${JSON.stringify(x.head)} |`);
if (looseOnly.length > 25) P(`| … | 其余 ${looseOnly.length - 25} 个见 plan.json | |`);
P();
P('## 5. ⚠️ 清理后仅剩标题的实体（需你裁决，本批默认**保持**该结果）');
P();
P('| 实体 | title | 前 → 后（字） |');
P('|---|---|---|');
for (const p of plan.filter((x) => x.titleOnlyAfter).slice(0, 40)) {
  P(`| \`${p.id}\` | ${p.title} | ${p.rcBeforeLen} → ${p.rcAfterLen} |`);
}
if (titleOnlyAfter > 40) P(`| … | 其余 ${titleOnlyAfter - 40} 个见 plan.json | |`);
P();
P('## 6. 改动明细（前 40 条）');
P();
P('| 实体 | 标题去重 | 尾注数 | 前 → 后（字） | 清理后开头 |');
P('|---|---|---|---|---|');
for (const p of plan.slice(0, 40)) {
  P(`| \`${p.id}\` | ${p.titleDeduped ? '✔' : '—'} | ${p.footerCount} | ${p.rcBeforeLen} → ${p.rcAfterLen} | ${JSON.stringify(p.headAfter.slice(0, 50))} |`);
}
if (plan.length > 40) P(`| … | | | | 其余 ${plan.length - 40} 条见 plan.json |`);
P();

writeFileSync(path.join(OUT, 'plan.md'), L.join('\n'));

console.log('批次 strip-injected-artifacts · PLAN（只读）');
console.log(`  池实体 ${ents.length} | 将被改动 ${plan.length} | 保持不变 ${untouched.length}`);
console.log(`  移除尾注 ${footersRemoved} 处 | 去重标题 ${titleDeduped} 实体 | 压缩空格 ${spaceCollapsedChars} 字符`);
console.log(`  自检：幂等违规 ${idempotentViolations}（须0） · 清理后为空 ${summary.controls.entitiesEmptyAfter}（须0） · 仅剩标题 ${titleOnlyAfter}`);
console.log(`  负对照：含「来源」字样但不命中精确尾注 ${looseOnly.length}（须保持原样）`);
console.log(`  产物 -> outputs/strip-injected-artifacts/plan.{md,json}`);
