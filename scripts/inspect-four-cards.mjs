// 读四张卡的完整内容与 vault 笔记结构
import { readFileSync } from 'fs';
const pool = JSON.parse(readFileSync('data/node-pool.json', 'utf8'));
for (const id of ['demo_redis', 'demo_mongodb', 'k_vault_redis_notes', 'k_vault_mongo_notes']) {
  const p = pool[id];
  console.log('=====', id, '|', p.label, '| role:', p.role || '?');
  for (const t of (p.card?.tabs || [])) console.log('  [' + t.label + ']', JSON.stringify((t.content || '').slice(0, 400)));
}
