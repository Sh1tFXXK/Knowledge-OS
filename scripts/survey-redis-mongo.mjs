// 摸底：二、数据模型 下 Redis / MongoDB 双树全貌
import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const tree = JSON.parse(readFileSync('data/tree-data.json', 'utf8'));
const qs = JSON.parse(readFileSync('data/questions.json', 'utf8'));
let db = null;
(function w(n) { if (n.nodeRef === 'n_u4va719e' && !db) db = n; for (const c of (n.children || [])) w(c); })(tree);
let ch2 = null;
(function w(n) { if (n.name === '二、数据模型' && !ch2) ch2 = n; for (const c of (n.children || [])) w(c); })(db);

function treeStats(entry, label) {
  const flat = [];
  (function w(n) { flat.push(n); for (const c of (n.children || [])) w(c); })(entry);
  const withCard = flat.filter(n => { const p = pool[n.nodeRef]; return p && p.card && (p.card.tabs || []).reduce((s, t) => s + (t.content || '').length, 0) > 0; });
  const ids = new Set(flat.map(n => n.nodeRef));
  const qCount = qs.filter(q => q.relatedNodeId && ids.has(q.relatedNodeId)).length;
  console.log(`[${label}] ${entry.name} [${entry.nodeRef}] 节点:${flat.length} 有内容卡:${withCard.length} 关联题目:${qCount}`);
  (function d(n, depth) {
    const p = pool[n.nodeRef];
    const hasContent = p && p.card && (p.card.tabs || []).reduce((s, t) => s + (t.content || '').length, 0) > 0;
    console.log(' '.repeat(depth * 2) + n.name + ' [' + n.nodeRef + ']' + (hasContent ? ' ●' : ''));
    for (const c of (n.children || [])) d(c, depth + 1);
  })(entry, 1);
}

const nosql = (ch2.children || []).find(c => c.name === 'NoSQL');
for (const c of (nosql.children || [])) {
  if (/^(Redis|MongoDB)$/.test(c.name)) {
    console.log('');
    treeStats(c, c.name);
  }
}
// 同 id 集合交叠检查
const collect = (entry) => { const s = new Set(); (function w(n) { s.add(n.nodeRef); for (const c of (n.children || [])) w(c); })(entry); return s; };
const redis = (nosql.children || []).find(c => c.name === 'Redis');
const mongo = (nosql.children || []).find(c => c.name === 'MongoDB');
const rIds = collect(redis), mIds = collect(mongo);
console.log('\nRedis 内部重复 nodeRef:', [...rIds].filter(id => (function cnt(n) { let c = 0; (function w(x) { if (x.nodeRef === id) c++; for (const y of (x.children || [])) w(y); })(redis); return c; })() > 1));
console.log('MongoDB 内部重复 nodeRef:', [...mIds].filter(id => (function cnt(n) { let c = 0; (function w(x) { if (x.nodeRef === id) c++; for (const y of (x.children || [])) w(y); })(mongo); return c; })() > 1));
