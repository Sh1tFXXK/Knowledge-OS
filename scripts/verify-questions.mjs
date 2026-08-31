import { readFileSync } from 'fs';
const qs = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const idxQs = qs.filter(q => /索引/.test(q.text));
console.log('=== 索引题最终清单 (' + idxQs.length + ' 道) ===');
for (const q of idxQs) {
  const flag = (q.answered ? '已答' : '未答');
  const link = q.relatedNodeId ? (' -> ' + (pool[q.relatedNodeId]?.label || q.relatedNodeId)) : '';
  console.log('  [' + q.kind + '/' + q.difficulty + '/' + flag + ']', q.text + link);
}
let dangle = 0;
for (const q of qs) if (q.relatedNodeId && !pool[q.relatedNodeId]) dangle++;
const seen = new Map();
let dup = 0;
for (const q of qs) { const k = q.text.replace(/\s+/g, ''); if (seen.has(k)) dup++; seen.set(k, q.id); }
console.log('全局: 总题', qs.length, '| 重复文本', dup, '| 悬挂引用', dangle);
