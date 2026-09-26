#!/usr/bin/env node
/**
 * STRIP-TAB-FOOTERS — tab 面注入尾注清理（正文面 strip-injected-artifacts 的同逻辑，作用域换 tab）
 * 实测：4073 tab / 命中 299 tab / 尾注 301 处 / 296 实体
 * 变换（逐 tab，仅当命中才改）：
 *   1) 剥尾注：/来源：原始行：\d+；官方锚点：https?:\/\/\S+/g 移除
 *   2) 收空白：仅命中 tab 做 / {2,}/g→' '（不动换行）+ trim，消化剥尾注残留双空格
 * 明确不做：
 *   - 不动 rootContent（正文面第 7 批已清）
 *   - 不做标题去重（标题注入只在正文面，tab 面无此形态）
 *   - 不动合法「来源」散文 / JDK 绝对路径形态（负对照保留）
 * 用法: node scripts/strip-tab-footers/apply.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const POOL_PATH = path.join(DATA, 'node-pool.json');

const RE_FOOTER = /来源：原始行：\d+；官方锚点：https?:\/\/\S+/g;
const RE_LOOSE = /来源[:：]|官方锚点[:：]/;

let failures = 0;
const gate = (d, ok, r = '') => { if (!ok) failures++; console.log((ok ? '✓' : '✗') + ' ' + d + (r ? ' — ' + r : '')); };

const pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));
const poolRaw = fs.readFileSync(POOL_PATH, 'utf8');

let totalTabs = 0, hitTabs = 0, footersRemoved = 0, affected = 0, spaceChars = 0;
const looseNotStripped = []; // 负对照：含「来源」但非注入形态
for (const [id, e] of Object.entries(pool)) {
  const tabs = (e.card && e.card.tabs) || [];
  let entHit = false;
  for (const t of tabs) {
    totalTabs++;
    const c = t.content || '';
    const m = c.match(RE_FOOTER);
    if (m) {
      let next = c.replace(RE_FOOTER, '');
      const beforeSpace = next;
      next = next.replace(/ {2,}/g, ' ').trim();
      spaceChars += beforeSpace.length - next.length;
      t.content = next;
      hitTabs++; footersRemoved += m.length; entHit = true;
    } else if (RE_LOOSE.test(c)) {
      looseNotStripped.push(id + '/' + (t.label || '?'));
    }
  }
  if (entHit) affected++;
}

console.log('\n== STRIP-TAB-FOOTERS ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
gate('G1 命中 tab=299', hitTabs === 299, '实际 ' + hitTabs);
gate('G2 尾注总数=301', footersRemoved === 301, '实际 ' + footersRemoved);
gate('G3 受影响实体=296', affected === 296, '实际 ' + affected);
console.log('  负对照（含「来源」但非注入形态，保持原样）: ' + looseNotStripped.length + ' tab');

// 变换后再扫：注入形态应清零
let remain = 0;
for (const e of Object.values(pool)) for (const t of (e.card && e.card.tabs) || []) { if (RE_FOOTER.test(t.content || '')) remain++; }
gate('G4 变换后注入尾注清零', remain === 0, '残留 ' + remain);

// 只动 tabs：rootContent / 实体数 / 结构不变（md5 粗检：实体集合与 rootContent 拼接不变）
const before = JSON.parse(poolRaw);
let entCountSame = Object.keys(before).length === Object.keys(pool).length;
let rcSame = true;
for (const id of Object.keys(pool)) {
  if ((before[id].card && before[id].card.rootContent) !== (pool[id].card && pool[id].card.rootContent)) { rcSame = false; break; }
}
gate('G5 实体数不变（' + Object.keys(pool).length + '）', entCountSame);
gate('G6 rootContent 零改动', rcSame);

if (failures > 0) { console.log('\n断言失败 ' + failures + ' 项，不写盘'); process.exit(1); }
if (!APPLY) { console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。'); process.exit(0); }

function writeAtomic(fp, content) {
  const tmp = fp + '.tmp-tabfooter';
  fs.writeFileSync(tmp, content, 'utf8');
  try { fs.renameSync(tmp, fp); }
  catch (e) {
    if (e.code === 'EPERM' || e.code === 'UNKNOWN' || String(e).includes('EPERM')) { fs.writeFileSync(fp, content, 'utf8'); try { fs.unlinkSync(tmp); } catch {} }
    else throw e;
  }
}
writeAtomic(POOL_PATH, JSON.stringify(pool, null, 2) + '\n');
console.log('\nAPPLY OK — node-pool.json 落盘：剥 ' + footersRemoved + ' 尾注 / ' + hitTabs + ' tab / ' + affected + ' 实体（收空白 ' + spaceChars + ' 字符）');
