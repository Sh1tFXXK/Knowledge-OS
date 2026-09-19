#!/usr/bin/env node
/**
 * TREEBIND-DANGLING-PURGE — 清除真悬挂 treebind 边（在案债务「treebind 18 条无法解析」）
 * 健壮解析（绕开冒号 id 拆分）：child=树中 nodeRef===e.target 且其父 nodeRef===e.source
 * 分类实测：2547 格式遗留有效 | 22 真悬挂（tgt 17 + src 5）| 84 过期父子记录（登记不删）
 * 处置：仅删 22 条真悬挂（端点实体已不存在，纯死边）；84 条另立批次。
 * 用法: node scripts/treebind-dangling-purge/apply.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const tree = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(fs.readFileSync(path.join(DATA, 'knowledge-edges.json'), 'utf8'));
const pool = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'));

const walk = (n, cb, p) => { cb(n, p); (n.children || []).forEach(c => walk(c, cb, n)); };
const byRef = new Map();
walk(tree, (n, p) => { if (!byRef.has(n.nodeRef)) byRef.set(n.nodeRef, []); byRef.get(n.nodeRef).push({ n, p }); });

let failures = 0;
const gate = (d, ok, r = '') => { if (!ok) failures++; console.log((ok ? '✓' : '✗') + ' ' + d + (r ? ' — ' + r : '')); };

// ── 分类 ──
const dangling = [];
let legacyValid = 0, expiredPair = 0;
for (const e of edges) {
  if (!/^treebind:/.test(e.id || '')) continue;
  let resolved = false;
  for (const { p } of byRef.get(e.target) || []) { if (p && p.nodeRef === e.source) { resolved = true; break; } }
  if (resolved) { legacyValid++; continue; }
  const tAlive = !!(pool[e.target] || byRef.has(e.target));
  const sAlive = !!(pool[e.source] || byRef.has(e.source));
  if (!tAlive || !sAlive) dangling.push(e);
  else expiredPair++;
}

console.log('\n== TREEBIND-DANGLING-PURGE ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
gate('G1 真悬挂=22（tgt17+src5）', dangling.length === 22, String(dangling.length));
gate('G2 格式遗留有效=2547', legacyValid === 2547, String(legacyValid));
gate('G3 过期父子记录=84（本批不动）', expiredPair === 84, String(expiredPair));
gate('G4 悬挂边均无池实体端点', dangling.every(e => !pool[e.target] || !pool[e.source]));
gate('G5 悬挂边均无树节点端点', dangling.every(e => {
  const tDead = !byRef.has(e.target) || !byRef.get(e.target).length;
  const sDead = !byRef.has(e.source) || !byRef.get(e.source).length;
  return !tAliveCheck(e.target) || !tAliveCheck(e.source);
  function tAliveCheck(ref) { const list = byRef.get(ref); return list && list.length > 0; }
}));

if (failures > 0) { console.log('\n前置断言失败，不写盘'); process.exit(1); }
console.log('  待删 ' + dangling.length + ' 条:');
dangling.forEach(e => console.log('    ' + e.id.slice(0, 78)));

if (!APPLY) { console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。'); process.exit(0); }

// 删除
const delIds = new Set(dangling.map(e => e.id));
for (let i = edges.length - 1; i >= 0; i--) if (delIds.has(edges[i].id)) edges.splice(i, 1);
// 断言
let remain = edges.filter(e => delIds.has(e.id)).length;
gate('G6 删后悬挂清零', remain === 0, String(remain));
gate('G7 边总数 ' + (2653 + 0) + '→' + edges.length + '（−22）', edges.length === 2653 - 22, String(edges.length));

function writeAtomic(fp, content) {
  const tmp = fp + '.tmp-tbpurge';
  fs.writeFileSync(tmp, content, 'utf8');
  try { fs.renameSync(tmp, fp); }
  catch (e) {
    if (e.code === 'EPERM' || e.code === 'UNKNOWN' || String(e).includes('EPERM')) { fs.writeFileSync(fp, content, 'utf8'); try { fs.unlinkSync(tmp); } catch {} }
    else throw e;
  }
}
writeAtomic(path.join(DATA, 'knowledge-edges.json'), JSON.stringify(edges, null, 2) + '\n');
console.log('\nAPPLY OK — knowledge-edges.json 落盘，真悬挂 treebind 清零');
