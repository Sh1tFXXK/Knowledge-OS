import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
const qs = JSON.parse(readFileSync('data/questions.json', 'utf8'));
for (const id of ['concept_covering_index', 'demo_covering_index']) {
  const p = pool[id];
  console.log('=====', id, '|', p.label);
  for (const t of p.card.tabs) console.log('  [' + t.label + ']', JSON.stringify((t.content || '').slice(0, 350)));
}
for (const q of qs.filter(x => /覆盖索引|回表/.test(x.text))) {
  console.log('--- 题:', q.id, q.text, '| 挂:', q.relatedNodeId, '| 答案长:', (q.answer || '').length);
  console.log('   ', JSON.stringify((q.answer || '').slice(0, 250)));
}
