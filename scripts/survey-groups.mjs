// 精确导出多实例组与重名详情
import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/tree-data.json', 'utf8'));
let db = null;
(function w(n) { if (n.nodeRef === 'n_u4va719e' && !db) db = n; for (const c of (n.children || [])) w(c); })(tree);

for (const ch of (db.children || []).filter(c => /^[一二三四五六七八九十]+、/.test(c.name) && c.name !== '十一、索引')) {
  const flat = [];
  (function w(n, parent) { flat.push({ n, parent }); for (const c of (n.children || [])) w(c, n); })(ch, ch);
  for (const x of flat) {
    const p = pool[x.n.nodeRef];
    if (p && String(p.id).startsWith('concept_')) {
      const insts = (x.n.children || []).map(c => ({ e: c, p: pool[c.nodeRef] })).filter(o => o.p && !String(o.p.id).startsWith('concept_') && o.p.status !== 'archived-redirect');
      if (insts.length > 1) {
        console.log('GROUP', p.id, p.label);
        for (const o of insts) {
          const def = (o.p.card?.tabs || []).find(t => t.id === 'def');
          console.log('   ', o.p.id, '|', JSON.stringify(o.p.label), '| role:' + (o.p.role || '?'), '| len:' + (def ? (def.content || '').length : -1));
          console.log('      ', JSON.stringify((def?.content || '').slice(0, 110)));
        }
      }
    }
  }
  // 重名条目
  const byLabel = {};
  for (const x of flat) { const l = (x.n.name || '').trim(); (byLabel[l] = byLabel[l] || []).push(x); }
  for (const [l, xs] of Object.entries(byLabel)) {
    if (xs.length > 1) {
      console.log('DUP-LABEL [' + ch.name + ']', JSON.stringify(l));
      for (const x of xs) {
        const p = pool[x.n.nodeRef];
        console.log('   ', x.n.id, '->', x.n.nodeRef, '|', p ? p.label + ' | ' + (p.card?.tabs?.map(t => t.label + ':' + (t.content || '').length).join(',')) : '无池卡', '| 父:', x.parent.name);
      }
    }
  }
  // 全 tab 空卡
  for (const x of flat) {
    const p = pool[x.n.nodeRef];
    if (!p) { console.log('NO-CARD [' + ch.name + ']', x.n.id, x.n.name); continue; }
    if (!p.card) { console.log('NO-CARD-OBJ [' + ch.name + ']', p.id, p.label); continue; }
    const total = (p.card.tabs || []).reduce((s, t) => s + (t.content || '').length, 0);
    if (total === 0) console.log('EMPTY-CARD [' + ch.name + ']', p.id, '|', p.label);
  }
}
// 视图 concept
const v = Object.values(pool).find(p => p.label === '视图' && String(p.id).startsWith('concept'));
console.log('视图 concept:', v ? v.id + ' | 卡: ' + JSON.stringify(v.card.tabs.map(t => t.label + ':' + (t.content || '').length)) : '未找到');
