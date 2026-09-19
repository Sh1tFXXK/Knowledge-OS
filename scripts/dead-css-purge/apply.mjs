#!/usr/bin/env node
/**
 * DEAD-CSS-PURGE — components.css 死规则清理
 * 判定（双保险）：
 *  1. class 在 src/**.(ts|tsx|js|jsx) 全文中零出现（整词 includes）
 *  2. 排除动态拼接风险：is-/leaf-/knowledge-os-/text-/link-/token-/mmd-svg- 前缀死 class 不删
 * 删除：规则的全部选择器 class 均确认死 → 整条删（含其后空行）。
 *       多行选择器组（`.a,⏎.dead {`）向后追溯组头，防悬空逗号。
 * 混合规则（活+死类组合）不删不裁剪（孤儿选择器无匹配，无害）。
 * 验证：花括号平衡 + 删后无纯死规则 + build/tsc/test/preview。
 * 用法: node scripts/dead-css-purge/apply.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const CSS_PATH = path.join(ROOT, 'src', 'styles', 'components.css');

let src = '';
const walkDir = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walkDir(p); else if (/\.(tsx?|jsx?)$/.test(f)) src += fs.readFileSync(p, 'utf8'); } };
walkDir(path.join(ROOT, 'src'));

const dynPrefix = new Set();
for (const m of src.matchAll(/[`'"]([\w-]+)-\$\{/g)) dynPrefix.add(m[1] + '-');
for (const m of src.matchAll(/[`'"]([\w-]+)-['"]\s*\+/g)) dynPrefix.add(m[1] + '-');
for (const m of src.matchAll(/[`'"](is-|status-|dc-|ec-|tree-|node-|question-)[`"]\s*\+/gi)) dynPrefix.add(m[1]);
const isRisky = (c) => [...dynPrefix].some(p => c.startsWith(p));

const css = fs.readFileSync(CSS_PATH, 'utf8');
const lines = css.split('\n');
const allCls = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][\w-]+)/g)) allCls.add(m[1]);
const deadSet = new Set();
for (const c of allCls) { if (!src.includes(c) && !isRisky(c)) deadSet.add(c); }

// ── 规则解析（选择器组感知）──
// 返回规则列表 {selStart, selEnd, bodyEnd, selText}，且互不重叠、按序
function parseRules(ls) {
  const rules = [];
  let i = 0;
  while (i < ls.length) {
    const line = ls[i];
    const hasBrace = /\{/.test(line);
    const startsSel = /^[.#\[:\w*][^{]*$/.test(line.trim()) || hasBrace;
    if (!startsSel || line.trim() === '' || line.trim().startsWith('/*') || line.trim().startsWith('*') || line.trim().startsWith('//')) { i++; continue; }
    // 组头回溯：前一个非空行以逗号结尾 → 本行是组延续，跳过（它属于更早开始的组，该组已在前面被记录）
    const prev = ls[i - 1];
    if (prev !== undefined && /,\s*$/.test(prev)) { i++; continue; }
    // 收集组直到含 { 的行
    let j = i, selText = '', found = false;
    while (j < ls.length && j - i < 8) {
      selText += ls[j] + '\n';
      if (/\{/.test(ls[j])) { found = true; break; }
      if (!/,\s*$/.test(ls[j])) break; // 组中断（无逗号且无花括号）→ 非法/注释，放弃
      j++;
    }
    if (!found) { i++; continue; }
    // 组头之前如果也是逗号结尾（说明我们落在组中段），跳过——上面 prev 检查已处理大部分；防御再查一次
    if (/,\s*$/.test(selText.split('\n')[0]) && i > 0 && /,\s*$/.test(ls[i - 1] || '')) { i++; continue; }
    // 找配对 }
    let depth = (selText.match(/\{/g) || []).length - (selText.match(/\}/g) || []).length;
    let k = j + 1;
    while (k < ls.length && depth > 0) { depth += (ls[k].match(/\{/g) || []).length - (ls[k].match(/\}/g) || []).length; k++; }
    if (depth !== 0) { i++; continue; } // 非常规结构，跳过不动
    rules.push({ selStart: i, bodyEnd: k - 1, selText: selText.trim() });
    i = k;
  }
  return rules;
}

const rules = parseRules(lines);
const deleteRanges = [];
for (const r of rules) {
  const clsInSel = [...r.selText.matchAll(/\.([a-zA-Z][\w-]+)/g)].map(m => m[1]);
  if (!(clsInSel.length > 0 && clsInSel.every(c => deadSet.has(c)))) continue;
  // 嵌套防护：区段全文（选择器+体）内所有 class 都必须死，防死父体内嵌活子规则被误删
  const rangeText = lines.slice(r.selStart, r.bodyEnd + 1).join('\n');
  const clsInRange = [...rangeText.matchAll(/\.([a-zA-Z][\w-]+)/g)].map(m => m[1]);
  const alien = clsInRange.filter(c => !deadSet.has(c));
  if (alien.length > 0) { console.log('  ⚠️ 跳过含活嵌套的规则 @' + (r.selStart + 1) + ': ' + [...new Set(alien)].slice(0, 5).join(',')); continue; }
  let end = r.bodyEnd;
  if (lines[end + 1] === '') end += 1;
  deleteRanges.push([r.selStart, end]);
}

let failures = 0;
const gate = (d, ok, r = '') => { if (!ok) failures++; console.log((ok ? '✓' : '✗') + ' ' + d + (r ? ' — ' + r : '')); };
const deadLineCount = deleteRanges.reduce((s, [a, b]) => s + (b - a + 1), 0);

console.log('\n== DEAD-CSS-PURGE ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
gate('G1 死 class(确认)=65', deadSet.size === 65, String(deadSet.size));
gate('G2 纯死规则=' + deleteRanges.length, deleteRanges.length >= 80, String(deleteRanges.length));
gate('G3 死行数=' + deadLineCount, deadLineCount >= 400, String(deadLineCount));

const keepSet = new Set();
for (const [a, b] of deleteRanges) for (let x = a; x <= b; x++) keepSet.add(x);
const kept = lines.filter((_, idx) => !keepSet.has(idx));

// 花括号平衡（删前=删后）
const bal = (t) => (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
gate('G4 花括号平衡守恒', bal(css) === bal(kept.join('\n')), bal(css) + '→' + bal(kept.join('\n')));
// 删后重解析：无纯死规则残留
const keptRules = parseRules(kept);
const remainDead = keptRules.filter(r => { const c = [...r.selText.matchAll(/\.([a-zA-Z][\w-]+)/g)].map(m => m[1]); return c.length > 0 && c.every(x => deadSet.has(x)); });
gate('G5 删后纯死规则=0', remainDead.length === 0, String(remainDead.length));
gate('G6 活体量守恒（' + kept.length + ' 行）', kept.length > 4500, String(kept.length));
// 死 class 在删后 CSS 中仅允许出现在混合选择器里
let mixed = 0;
for (const m of kept.join('\n').matchAll(/\.([a-zA-Z][\w-]+)/g)) { if (deadSet.has(m[1])) mixed++; }
console.log('  ℹ️ 混合选择器中死 class 残留（不删，无害）: ' + mixed);

if (failures > 0) { console.log('\n断言失败 ' + failures + ' 项，不写盘'); process.exit(1); }
if (!APPLY) {
  console.log('\n删除区段（行，1基）:');
  const segs = [];
  for (const [a, b] of deleteRanges) { if (segs.length && a <= segs[segs.length - 1][1] + 3) segs[segs.length - 1][1] = b; else segs.push([a, b]); }
  segs.forEach(([a, b]) => console.log('  ' + (a + 1) + '-' + (b + 1) + ' (' + (b - a + 1) + '行)'));
  console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。');
  process.exit(0);
}

const tmp = CSS_PATH + '.tmp-deadcss';
fs.writeFileSync(tmp, kept.join('\n'), 'utf8');
try { fs.renameSync(tmp, CSS_PATH); }
catch (e) {
  if (e.code === 'EPERM' || e.code === 'UNKNOWN' || String(e).includes('EPERM')) { fs.writeFileSync(CSS_PATH, kept.join('\n'), 'utf8'); try { fs.unlinkSync(tmp); } catch {} }
  else throw e;
}
console.log('\nAPPLY OK — components.css ' + lines.length + ' → ' + kept.length + ' 行（删 ' + (lines.length - kept.length) + ' 行，死 class ' + deadSet.size + ' 个）');
