#!/usr/bin/env node
/**
 * VERIFY（独立验证）：剥离「注入产物」批次 —— strip-injected-artifacts
 *
 * 纪律：⛔ 不 import apply / plan 的任何代码；本文件**自持一份 regex 与算法**，
 *       完全由「快照（before）↔ 当前（after）」反推，避免「用来路不明的判据证明自己」。
 *
 * before 取自 apply 的备份：data/backups/strip-injected-artifacts-<ISO>/（可用 --before 指定）
 *
 * 断言（任一 ✘ ⇒ 退出码 1）：
 *   V1 正文面残留尾注 = 0，且无实体正文以 `T **T**` 开头
 *   V2 逐实体「非空白字符多重集」对账：before - 声明的移除串 === after
 *   V3 未改动实体逐字节不变（实体级 JSON md5）
 *   V4 其余 data 文件与快照逐字节一致（本批只许改 node-pool.json）
 *   V5 负对照：含「来源」字样但非精确尾注的实体，正文必须**未变**
 *   V6 实体总数与顶层键序不变
 *   V7 声明性读数：tab 面残留（本批排除，不算失败，但必须报出）
 *   V8 全局：正文面残留总数 = 0（跨全部实体）
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const BATCH = 'strip-injected-artifacts';
const OUT = path.join(ROOT, 'outputs', BATCH);

// ---- 独立自持的判据 ----
const FOOTER = /来源：原始行：\d+；官方锚点：https?:\/\/\S+/g;
const LOOSE = /来源[:：]|官方锚点[:：]/;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const stripWs = (s) => String(s).replace(/\s/g, '');
function bag(s) {
  const m = new Map();
  for (const ch of stripWs(s)) m.set(ch, (m.get(ch) || 0) + 1);
  return m;
}
function bagSub(a, b) {
  const r = new Map(a);
  for (const [k, v] of b) r.set(k, (r.get(k) || 0) - v);
  return r;
}
function bagZero(m) {
  for (const v of m.values()) if (v !== 0) return false;
  return true;
}
const entsOf = (raw) => {
  const d = raw && !Array.isArray(raw) && raw.nodes ? raw.nodes : raw;
  return Array.isArray(d) ? d : Object.values(d);
};

// ---- 定位 before 快照 ----
const argIdx = process.argv.indexOf('--before');
let beforeDir = argIdx > -1 ? process.argv[argIdx + 1] : null;
if (!beforeDir) {
  const cands = readdirSync(path.join(DATA, 'backups'))
    .filter((d) => d.startsWith(BATCH + '-'))
    .sort()
    .reverse();
  if (!cands.length) {
    console.error(`⛔ 找不到 ${BATCH} 的备份目录，无法独立验证。`);
    process.exit(2);
  }
  beforeDir = path.join(DATA, 'backups', cands[0]);
}
const beforePoolPath = path.join(beforeDir, 'node-pool.json');
if (!existsSync(beforePoolPath)) {
  console.error(`⛔ 备份目录缺少 node-pool.json：${beforeDir}`);
  process.exit(2);
}

const beforeRaw = readFileSync(beforePoolPath, 'utf8');
const afterRaw = readFileSync(path.join(DATA, 'node-pool.json'), 'utf8');
const before = JSON.parse(beforeRaw);
const after = JSON.parse(afterRaw);
const bef = new Map(entsOf(before).map((e) => [e.id, e]));
const aft = new Map(entsOf(after).map((e) => [e.id, e]));

const checks = [];
const C = (id, name, ok, detail) => checks.push({ id, name, ok: !!ok, detail });

// ---- 逐实体重算 ----
const changed = [];
const v1bad = [];
const v2bad = [];
const v5bad = [];
const negatives = [];
let rcResidualTotal = 0;
let tabResidualTotal = 0;

for (const [id, a] of aft) {
  const b = bef.get(id);
  if (!b) continue;
  const bc = b.card || {};
  const ac = a.card || {};
  const bRc = String(bc.rootContent || '');
  const aRc = String(ac.rootContent || '');
  const title = String(bc.title || b.label || '').trim();

  // V8 正文面残留（跨全部实体）
  rcResidualTotal += (aRc.match(FOOTER) || []).length;
  for (const t of ac.tabs || []) tabResidualTotal += (String(t.content || '').match(FOOTER) || []).length;

  // V1 形态：正文不得再以 `T **T**` 开头
  const stillDup = !!title && aRc.startsWith(`${title} **${title}**`);
  if (stillDup) v1bad.push(id);

  // V5 负对照：含「来源」字样但不含精确尾注的实体 ⇒ 正文必须未变
  if (LOOSE.test(bRc) && !bRc.match(FOOTER)) {
    negatives.push(id);
    if (bRc !== aRc) v5bad.push(id);
  }

  if (bRc === aRc) continue;

  // V2 多重集对账：before - 声明移除 === after
  const declaredFooters = bRc.match(FOOTER) || [];
  const expected = new Map(bag(declaredFooters.join('')));
  if (title && bRc.startsWith(`${title} **${title}**`)) {
    for (const [k, v] of bag(`${title} `)) expected.set(k, (expected.get(k) || 0) + v);
  }
  const actuallyRemoved = bagSub(bag(bRc), bag(aRc));
  if (!bagZero(bagSub(actuallyRemoved, expected))) v2bad.push(id);

  changed.push({
    id,
    titleDeduped: !!title && bRc.startsWith(`${title} **${title}**`),
    footers: declaredFooters.length,
    beforeLen: bRc.length,
    afterLen: aRc.length,
  });
}

// ---- V3 未改动实体逐字节不变 ----
let v3bad = 0;
const changedIds = new Set(changed.map((c) => c.id));
for (const id of bef.keys()) {
  if (changedIds.has(id)) continue;
  if (JSON.stringify(before[id]) !== JSON.stringify(after[id])) v3bad++;
}

// ---- V4 其余 data 文件逐字节一致 ----
const otherFiles = ['tree-data.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json', 'version-chains.json'];
const v4bad = [];
for (const f of otherFiles) {
  const b = path.join(beforeDir, f);
  const a = path.join(DATA, f);
  if (!existsSync(b) && !existsSync(a)) continue;
  if (!existsSync(b) || !existsSync(a)) {
    v4bad.push(f + '(仅一侧存在)');
    continue;
  }
  if (md5(readFileSync(b)) !== md5(readFileSync(a))) v4bad.push(f);
}

// ---- V6 实体数与键序 ----
const v6ok = bef.size === aft.size && Object.keys(before).join('|') === Object.keys(after).join('|');

// ---- 汇总 ----
C('V1', '正文面形态（无 `T **T**` 残留）', v1bad.length === 0, `违规 ${v1bad.length}（须 0）${v1bad.slice(0, 5).join(', ')}`);
C('V2', '内容零丢失（多重集对账）', v2bad.length === 0, `${changed.length} 个改动实体，非「仅少声明串」的 ${v2bad.length}（须 0）${v2bad.slice(0, 5).join(', ')}`);
C('V3', '未改动实体逐字节不变', v3bad === 0, `${bef.size - changedIds.size} 个未改动实体，漂移 ${v3bad}（须 0）`);
C('V4', '其余 data 文件未被本批改动', v4bad.length === 0, v4bad.length ? v4bad.join(', ') : `${otherFiles.length} 个文件逐字节一致`);
C('V5', '负对照：含「来源」散文的实体未变', v5bad.length === 0, `${negatives.length} 个负对照实体（${negatives.join(', ')}），被误改 ${v5bad.length}（须 0）`);
C('V6', '实体总数与顶层键序不变', v6ok, `${bef.size} → ${aft.size}`);
C('V7', '声明性读数：tab 面残留（本批排除）', true, `${tabResidualTotal} 处（另案，不算失败）`);
C('V8', '全库正文面残留尾注总数 = 0', rcResidualTotal === 0, `正文面残留 ${rcResidualTotal}（须 0）`);

const failed = checks.filter((c) => !c.ok);
mkdirSync(OUT, { recursive: true });
const report = {
  batchId: BATCH,
  at: new Date().toISOString(),
  before: { dir: path.relative(ROOT, beforeDir).replace(/\\/g, '/'), bytes: Buffer.byteLength(beforeRaw, 'utf8'), md5: md5(beforeRaw), entities: bef.size },
  after: { bytes: Buffer.byteLength(afterRaw, 'utf8'), md5: md5(afterRaw), entities: aft.size },
  changedEntities: changed.length,
  residual: { rootContent: rcResidualTotal, tabs: tabResidualTotal },
  checks,
  verdict: failed.length === 0 ? 'PASS' : 'FAIL',
  changeList: changed,
};
writeFileSync(path.join(OUT, 'verify-report.json'), JSON.stringify(report, null, 2));

const L = [];
const P = (s = '') => L.push(s);
P('# VERIFY · 剥离「注入产物」（strip-injected-artifacts）');
P();
P(`> ${report.at} · 独立验证（不 import apply）· 由快照反推`);
P(`> before = \`${report.before.dir}\`（md5 \`${report.before.md5}\`）`);
P(`> after  = \`data/node-pool.json\`（md5 \`${report.after.md5}\`）`);
P();
P(`## 判定：**${report.verdict}**`);
P();
P('| 断言 | 结果 | 说明 |');
P('|---|---|---|');
for (const c of checks) P(`| ${c.id} ${c.name} | ${c.ok ? '✔' : '✘'} | ${c.detail} |`);
P();
P(`- 改动实体：**${changed.length}**`);
P(`- 正文面残留尾注：**${rcResidualTotal}**（须 0）`);
P(`- tab 面残留尾注：**${tabResidualTotal}**（⛔ 本批声明排除，另案）`);
P();
writeFileSync(path.join(OUT, 'verify-report.md'), L.join('\n'));

console.log(`批次 ${BATCH} · VERIFY`);
console.log(`  before ${report.before.dir} (md5 ${report.before.md5})`);
console.log(`  after  md5 ${report.after.md5} | 改动实体 ${changed.length}`);
for (const c of checks) console.log(`  ${c.ok ? '✔' : '✘'} ${c.id} ${c.name} — ${c.detail}`);
console.log(`\n判定：${report.verdict}（${checks.filter((c) => c.ok).length}/${checks.length}）`);
process.exit(failed.length ? 1 : 0);
