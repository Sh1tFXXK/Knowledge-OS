// 摸底：19 个章节的结构与问题清单
import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/tree-data.json', 'utf8'));
let db = null;
(function w(n) { if (n.nodeRef === 'n_u4va719e' && !db) db = n; for (const c of (n.children || [])) w(c); })(tree);

const chapters = (db.children || []).filter(c => /^[一二三四五六七八九十]+、/.test(c.name) && c.name !== '十一、索引');
console.log('待整理章节数:', chapters.length, '\n');

for (const ch of chapters) {
  const flat = [];
  (function w(n, parent) { flat.push({ n, parent }); for (const c of (n.children || [])) w(c, n); })(ch, ch);
  // 一级子节点
  const top = (ch.children || []);
  const topInfo = top.map(t => {
    let cnt = 0; (function c2(x) { cnt++; for (const y of (x.children || [])) c2(y); })(t);
    return `${t.name}(${cnt})`;
  });
  // 同题多实例
  const multi = [];
  for (const x of flat) {
    const p = pool[x.n.nodeRef];
    if (p && String(p.id).startsWith('concept_')) {
      const insts = (x.n.children || []).map(c => pool[c.nodeRef]).filter(c => c && !String(c.id).startsWith('concept_') && c.status !== 'archived-redirect');
      if (insts.length > 1) multi.push(p.label + ' [' + insts.map(i => i.label).join(' | ') + ']');
    }
  }
  // 空薄卡
  let empty = 0, thin = 0;
  for (const x of flat) {
    const p = pool[x.n.nodeRef];
    if (!p || !p.card) { if (p) empty++; continue; }
    const def = p.card.tabs.find(t => t.id === 'def') || p.card.tabs[0];
    const len = def ? (def.content || '').length : 0;
    if (!def || !len) empty++; else if (len < 60) thin++;
  }
  // 重名
  const byLabel = {};
  for (const x of flat) { const l = (x.n.name || '').trim(); (byLabel[l] = byLabel[l] || []).push(x); }
  const dups = Object.entries(byLabel).filter(([l, xs]) => xs.length > 1).map(([l]) => l);
  console.log(`### ${ch.name} | 节点:${flat.length} | 一级:${topInfo.join(' / ')}`);
  if (multi.length) console.log('   同题多实例:', multi.slice(0, 4).join(' ;; ') + (multi.length > 4 ? ` 等${multi.length}组` : ''));
  if (dups.length) console.log('   重名:', dups.join(', '));
  if (empty || thin) console.log(`   空卡:${empty} 薄卡:${thin}`);
  console.log('');
}
