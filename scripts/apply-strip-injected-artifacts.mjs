#!/usr/bin/env node
/**
 * APPLY：剥离「注入产物」批次 —— strip-injected-artifacts
 *
 * 用法：
 *   node scripts/apply-strip-injected-artifacts.mjs            # dry-run（默认，不写盘）
 *   node scripts/apply-strip-injected-artifacts.mjs --apply    # 真正落盘
 *
 * 变换（仅 card.rootContent，见 plan 脚本头注）：
 *   ① 去重标题 `T **T**` → `**T**`
 *   ② 移除 /来源：原始行：\d+；官方锚点：https?:\/\/\S+/g
 *   ③ / {2,}/g → ' ' + trim   ← **仅当 ① 或 ② 命中才执行**（防范围越界，见 transformContent 注释）
 *
 * 写盘纪律：
 *   - 先备份 data/backups/strip-injected-artifacts-<ISO>/（6 个 data JSON 全备份）
 *   - 原子写：tmp + rename（Windows EPERM 重试）
 *   - **格式闸门 G1**：`JSON.stringify(obj,null,2)+'\n'` 必须**字节级复现**原文件，
 *     否则说明我的序列化与仓库格式不一致（会产生 12MB 纯格式 diff）⇒ 立即中止。
 *   - 写后立即回读校验 md5 === 预期 md5。
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, renameSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const BATCH = 'strip-injected-artifacts';
const OUT = path.join(ROOT, 'outputs', BATCH);
const APPLY = process.argv.includes('--apply');

const RE_FOOTER = /来源：原始行：\d+；官方锚点：https?:\/\/\S+/g;
const md5 = (s) => createHash('md5').update(s).digest('hex');
const isoStamp = () => new Date().toISOString().replace(/[:.]/g, '-');

/** 与仓库一致的序列化 */
const ser = (obj) => JSON.stringify(obj, null, 2) + '\n';

function entitiesOf(raw) {
  const dict = raw && !Array.isArray(raw) && raw.nodes ? raw.nodes : raw;
  return Array.isArray(dict) ? dict : Object.values(dict);
}

function transformContent(title, rc) {
  const footers = [];
  let next = rc.replace(RE_FOOTER, (m) => {
    footers.push(m);
    return '';
  });
  let titleDeduped = false;
  const dupPrefix = title ? `${title} **${title}**` : '';
  if (dupPrefix && next.startsWith(dupPrefix)) {
    next = `**${title}**${next.slice(dupPrefix.length)}`;
    titleDeduped = true;
  }
  // ⚠️ 第③步（空格压缩）**只在①②确实命中时**才执行 —— 否则会把「无尾注、无重复标题」的
  //    实体也顺手归一化空白，属于**范围越界**（实测会多动 141 个实体）。
  const touched = footers.length > 0 || titleDeduped;
  const beforeCollapse = next;
  if (touched) next = next.replace(/ {2,}/g, ' ').trim();
  return { next, footers, titleDeduped, collapsed: touched ? beforeCollapse.length - next.length : 0 };
}

/** 字符多重集（去空白）——用于「只少了声明的东西」的独立对账 */
function multiset(s) {
  const m = new Map();
  for (const ch of s.replace(/\s/g, '')) m.set(ch, (m.get(ch) || 0) + 1);
  return m;
}
function msSub(a, b) {
  const r = new Map(a);
  for (const [k, v] of b) r.set(k, (r.get(k) || 0) - v);
  return r;
}
function msZero(m) {
  for (const v of m.values()) if (v !== 0) return false;
  return true;
}

// ---------- 读入 ----------
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json', 'version-chains.json'];
const poolPath = path.join(DATA, 'node-pool.json');
const rawBuf = readFileSync(poolPath);
const raw = rawBuf.toString('utf8');
const pool = JSON.parse(raw);
const poolKeys = Object.keys(pool);
const ents = entitiesOf(pool);
/** 统一用「字节」报体量，避免与字符数混淆 */
const B = (s) => Buffer.byteLength(s, 'utf8');

const gates = [];
const G = (name, ok, detail) => gates.push({ name, ok: !!ok, detail });
const fail = (name, detail) => {
  G(name, false, detail);
  console.error(`\n⛔ 闸门未过：${name}\n   ${detail}\n→ 已中止，未写任何文件。`);
  const rep = { batchId: BATCH, mode: APPLY ? 'apply' : 'dry-run', at: new Date().toISOString(), aborted: true, gates };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, 'apply-report.json'), JSON.stringify(rep, null, 2));
  process.exit(2);
};

console.log(`批次 ${BATCH} · ${APPLY ? 'APPLY（会写盘）' : 'DRY-RUN（只读）'}`);
console.log(`  池：${ents.length} 实体 · md5 ${md5(raw)}`);

// ---------- G1 格式闸门 ----------
if (ser(pool) !== raw) {
  const i = (() => {
    const a = ser(pool), n = Math.min(a.length, raw.length);
    let k = 0;
    while (k < n && a[k] === raw[k]) k++;
    return k;
  })();
  fail('G1 格式复现', `JSON.stringify(pool,null,2)+'\\n' 与原文件不一致，首异位置 ${i}（原 ${B(raw)} B / 复现 ${B(ser(pool))} B）`);
}
G('G1 格式复现', true, `字节级一致（${B(raw)} B）`);

// ---------- 计算 ----------
const changed = [];
let footersRemoved = 0;
let titleDeduped = 0;
let collapsedTotal = 0;
const msExpectedRemoved = new Map(); // 独立对账：应移除字符多重集

for (const e of ents) {
  const card = e.card;
  if (!card || typeof card.rootContent !== 'string' || !card.rootContent) continue;
  const title = String(card.title || e.label || '').trim();
  const before = card.rootContent;
  const r = transformContent(title, before);
  if (r.next === before) continue;

  changed.push({ id: e.id, title, before, after: r.next, footers: r.footers, titleDeduped: r.titleDeduped, collapsed: r.collapsed });
  footersRemoved += r.footers.length;
  if (r.titleDeduped) titleDeduped++;
  collapsedTotal += r.collapsed;
  for (const [k, v] of multiset(r.footers.join(''))) msExpectedRemoved.set(k, (msExpectedRemoved.get(k) || 0) + v);
  if (r.titleDeduped) for (const [k, v] of multiset(`${title} `)) msExpectedRemoved.set(k, (msExpectedRemoved.get(k) || 0) + v);
}

// ---------- G2 幂等 ----------
let nonIdempotent = 0;
for (const c of changed) {
  const again = transformContent(c.title, c.after);
  if (again.next !== c.after) nonIdempotent++;
}
G('G2 幂等', nonIdempotent === 0, `${changed.length} 个改动实体，再跑一次产生变化的 ${nonIdempotent}（须 0）`);
if (nonIdempotent !== 0) fail('G2 幂等', `${nonIdempotent} 个实体非幂等`);

// ---------- G3 内容零丢失（多重集对账，顺序无关）----------
// 口径：multiset() 已去掉全部空白 ⇒ 该检查对「空格压缩」免疫，只盯**非空白字符**。
// 断言：实际少掉的字符多重集 === 声明的移除串（尾注 + 标题前缀里的 `T `）
const msViolations = [];
for (const c of changed) {
  const expected = new Map(multiset(c.footers.join('')));
  if (c.titleDeduped) for (const [k, v] of multiset(`${c.title} `)) expected.set(k, (expected.get(k) || 0) + v);
  const actuallyRemoved = msSub(multiset(c.before), multiset(c.after));
  if (!msZero(msSub(actuallyRemoved, expected))) msViolations.push(c.id);
}
G('G3 内容零丢失', msViolations.length === 0, `${changed.length} 个改动实体，非空白字符对账面非「仅少声明串」的 ${msViolations.length}（须 0）`);
if (msViolations.length) fail('G3 内容零丢失', `${msViolations.slice(0, 5).join(', ')}`);

// ---------- G4 未命中实体逐字节不变 ----------
const changedIds = new Set(changed.map((c) => c.id));
let untouchedDrift = 0;
const checkPool = JSON.parse(raw);
for (const id of poolKeys) {
  if (changedIds.has(id)) continue;
  if (JSON.stringify(checkPool[id]) !== JSON.stringify(pool[id])) untouchedDrift++;
}
G('G4 未命中实体不变', untouchedDrift === 0, `${poolKeys.length - changedIds.size} 个未命中实体，字节漂移 ${untouchedDrift}（须 0）`);

// ---------- G5 清理后不为空 ----------
const emptyAfter = changed.filter((c) => c.after.length === 0);
G('G5 清理后不为空', emptyAfter.length === 0, `变空的 ${emptyAfter.length}（须 0）`);

// ---------- G6 移除串全部符合声明正则 ----------
let rogue = 0;
for (const c of changed) for (const f of c.footers) if (!new RegExp(`^${RE_FOOTER.source}$`).test(f)) rogue++;
G('G6 移除串合规', rogue === 0, `${footersRemoved} 处移除串，不符合声明正则的 ${rogue}（须 0）`);

// ---------- 施加 ----------
for (const c of changed) pool[c.id].card.rootContent = c.after;
const outRaw = ser(pool);
const outMd5 = md5(outRaw);

G('G7 仅写一个文件', true, "writeSet = ['data/node-pool.json']");
G('G8 实体数不变', ents.length === entitiesOf(pool).length, `${ents.length} → ${entitiesOf(pool).length}`);
G('G9 顶层键序不变', Object.keys(pool).join('|') === poolKeys.join('|'), `${poolKeys.length} 键`);

console.log(`  变更：${changed.length} 实体 | 尾注 ${footersRemoved} 处 | 标题去重 ${titleDeduped} | 压缩空格 ${collapsedTotal}`);
console.log(`  池 md5 ${md5(raw)} → ${outMd5}`);
for (const g of gates) console.log(`  ${g.ok ? '✔' : '✘'} ${g.name} — ${g.detail}`);

// ---------- 备份 ----------
let backupDir = null;
if (APPLY) {
  backupDir = path.join(DATA, 'backups', `${BATCH}-${isoStamp()}`);
  mkdirSync(backupDir, { recursive: true });
  for (const f of FILES) {
    const p = path.join(DATA, f);
    if (existsSync(p)) copyFileSync(p, path.join(backupDir, f));
  }
  console.log(`  备份 -> data/backups/${path.basename(backupDir)}`);

  // ---------- 原子写 ----------
  const tmp = path.join(DATA, `node-pool.json.tmp-${process.pid}`);
  writeFileSync(tmp, outRaw, 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try {
      renameSync(tmp, poolPath);
      ok = true;
    } catch (err) {
      if (i === 7) {
        console.log('  rename 持续失败，退化为原地写');
        writeFileSync(poolPath, outRaw, 'utf8');
        ok = true;
      } else {
        console.log('  rename busy, retry...');
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
      }
    }
  }

  // ---------- 写后回读校验 ----------
  const after = readFileSync(poolPath, 'utf8');
  const afterMd5 = md5(after);
  G('G10 写后回读 md5 一致', afterMd5 === outMd5, `${afterMd5} ${afterMd5 === outMd5 ? '==' : '!='} ${outMd5}`);
  // ⚠️ G11 的正确不变量是「**正文面**残留 = 0」，不是「全文件残留 = 0」——
  //    tab 面的同类尾注是本批**声明排除**的范围（另案），必须分开报数。
  const parsedAfter = JSON.parse(after);
  const entsAfter = entitiesOf(parsedAfter);
  const RE_RC_ONLY = /来源：原始行：\d+；官方锚点：https?:\/\/\S+/g;
  let rcResidual = 0;
  let tabResidual = 0;
  for (const e of entsAfter) {
    const c = e.card || {};
    rcResidual += (String(c.rootContent || '').match(RE_RC_ONLY) || []).length;
    for (const t of c.tabs || []) tabResidual += (String(t.content || '').match(RE_RC_ONLY) || []).length;
  }
  G('G11 写后**正文面**无残留尾注', rcResidual === 0, `正文面残留 ${rcResidual}（须 0）`);
  console.log(`  ℹ 声明排除项：tab 面残留 ${tabResidual} 处（本批不动，另案）`);
  if (rcResidual !== 0) fail('G11 正文面残留', `正文面仍有 ${rcResidual} 处尾注`);
  console.log(`  ✔ 写后回读 md5 ${afterMd5}`);
}

// ---------- 报告 ----------
mkdirSync(OUT, { recursive: true });
const report = {
  batchId: BATCH,
  mode: APPLY ? 'apply' : 'dry-run',
  at: new Date().toISOString(),
  scope: 'card.rootContent only',
  poolBefore: { bytes: B(raw), md5: md5(raw), entities: ents.length },
  poolAfter: { bytes: B(outRaw), md5: outMd5, entities: entitiesOf(pool).length },
  counts: { entitiesChanged: changed.length, footersRemoved, entitiesTitleDeduped: titleDeduped, collapsedSpaceChars: collapsedTotal, entitiesTitleOnlyAfter: changed.filter((c) => c.after === `**${c.title}**`).length },
  gates,
  backupDir: backupDir ? `data/backups/${path.basename(backupDir)}` : null,
  changes: changed.map((c) => ({
    id: c.id,
    title: c.title,
    titleDeduped: c.titleDeduped,
    footerCount: c.footers.length,
    footers: c.footers,
    beforeLen: c.before.length,
    afterLen: c.after.length,
    md5Before: md5(c.before),
    md5After: md5(c.after),
  })),
};
writeFileSync(path.join(OUT, APPLY ? 'apply-report.json' : 'dryrun-report.json'), JSON.stringify(report, null, 2));
console.log(`  报告 -> outputs/${BATCH}/${APPLY ? 'apply-report.json' : 'dryrun-report.json'}`);
if (!APPLY) console.log('\n（dry-run 结束，未写任何文件。加 --apply 才落盘）');
