import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
for (const id of ['concept_composite_index', 'demo_composite_index']) {
  const p = pool[id];
  console.log('=====', id, '|', p.label);
  for (const t of p.card.tabs) console.log('  [' + t.label + ']', JSON.stringify((t.content || '').slice(0, 350)));
}
const qs = JSON.parse(readFileSync('data/questions.json', 'utf8'));
const q = qs.find(x => x.text.includes('联合索引是什么'));
console.log('=== 联合索引题答案:', JSON.stringify((q.answer || '(无)').slice(0, 250)));
let imgCount = 0;
for (const p of Object.values(pool)) {
  if (p.card && JSON.stringify(p.card).includes('![')) imgCount++;
}
console.log('卡内含 markdown 图片的节点数:', imgCount);
